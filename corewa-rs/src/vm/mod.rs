pub mod decoder;
pub mod memory;
pub mod process;
pub mod types;

mod execution_context;
mod instructions;
mod program_counter;
mod wrapping_array;

use crate::spec::*;
use decoder::Decode;
use execution_context::ExecutionContext;
use memory::Memory;
use process::{Process, ProcessState};
use types::*;

use std::{
    collections::{HashMap, HashSet},
    ffi::CStr,
};

pub struct VirtualMachine {
    pub players: Vec<Player>,

    pub memory: Memory,
    pub processes: Vec<Process>,
    pub pid_pool: PidPool,

    pub last_lives: HashMap<PlayerId, u32>,

    pub cycles: u32,
    pub last_live_check: u32,
    pub check_interval: u32,
    pub live_count_since_last_check: u32,
    pub checks_without_cycle_decrement: u32,

    pub process_count_per_cells: [u32; MEM_SIZE],
    pub process_count_by_player_id: HashMap<PlayerId, u32>,
}

impl VirtualMachine {
    pub fn new() -> Self {
        Self {
            players: Vec::with_capacity(MAX_PLAYERS),

            memory: Memory::default(),
            processes: Vec::with_capacity(65536),
            pid_pool: PidPool::default(),

            last_lives: HashMap::with_capacity(MAX_PLAYERS),

            cycles: 0,
            last_live_check: 0,
            check_interval: CHECK_INTERVAL,
            live_count_since_last_check: 0,
            checks_without_cycle_decrement: 0,

            process_count_per_cells: [0; MEM_SIZE],
            process_count_by_player_id: HashMap::with_capacity(MAX_PLAYERS),
        }
    }

    pub fn tick(&mut self) {
        if self.processes.is_empty() {
            return;
        }

        let mut forks = Vec::with_capacity(8192);
        let mut lives = HashSet::new();

        for mut process in self.processes.iter_mut().rev() {
            match process.state {
                // Attempt to read instruction
                ProcessState::Idle => {
                    if let Ok(op) = self.memory.decode_op(process.pc.addr()) {
                        let exec_at = self.cycles + OpSpec::from(op).cycles - 1;
                        process.state = ProcessState::Executing { exec_at, op };
                    } else {
                        let pc_start = process.pc.addr();
                        process.pc.advance(1);
                        self.process_count_per_cells[pc_start] -= 1;
                        self.process_count_per_cells[process.pc.addr()] += 1;
                    }
                }
                // Execute
                ProcessState::Executing { exec_at, op } if exec_at == self.cycles => {
                    let pc_start = process.pc.addr();
                    match self.memory.decode_instr(op, pc_start) {
                        Ok(instr) => {
                            let execution_context = ExecutionContext {
                                memory: &mut self.memory,
                                process: &mut process,
                                forks: &mut forks,
                                cycle: self.cycles,
                                live_count: &mut self.live_count_since_last_check,
                                pid_pool: &mut self.pid_pool,
                                live_ids: &mut lives,
                            };
                            execute_instr(&instr, execution_context);
                        }
                        Err(_e) => {
                            process.pc.advance(1);
                        }
                    };
                    process.state = ProcessState::Idle;
                    self.process_count_per_cells[pc_start] -= 1;
                    self.process_count_per_cells[process.pc.addr()] += 1;
                }

                _ => (),
            };
        }

        self.memory.tick();

        for process in &forks {
            self.process_count_per_cells[process.pc.addr()] += 1;
            if let Some(count) = self.process_count_by_player_id.get_mut(&process.player_id) {
                *count += 1;
            }
        }

        self.processes.append(&mut forks);

        for player in &self.players {
            if lives.contains(&player.id) {
                self.last_lives.insert(player.id, self.cycles);
            }
        }

        self.cycles += 1;

        let last_live_check = self.last_live_check;
        let should_live_check = self.cycles - last_live_check >= self.check_interval;
        if should_live_check {
            let process_killed = self
                .processes
                .drain_filter(|process| process.last_live_cycle <= last_live_check);

            for process in process_killed {
                self.process_count_per_cells[process.pc.addr()] -= 1;
                if let Some(count) = self.process_count_by_player_id.get_mut(&process.player_id) {
                    *count -= 1;
                }
            }

            if self.live_count_since_last_check >= NBR_LIVE {
                self.check_interval = self.check_interval.saturating_sub(CYCLE_DELTA);
                self.checks_without_cycle_decrement = 0;
            } else {
                self.checks_without_cycle_decrement += 1;
            }

            if self.checks_without_cycle_decrement >= MAX_CHECKS {
                self.check_interval = self.check_interval.saturating_sub(CYCLE_DELTA);
                self.checks_without_cycle_decrement = 0;
            }

            self.live_count_since_last_check = 0;
            self.last_live_check = self.cycles;
        }
    }

    pub fn load_players(&mut self, players: &[(PlayerId, Vec<u8>)]) {
        let player_spacing = MEM_SIZE / players.len().max(1);
        for (i, (player_id, program)) in players.iter().enumerate() {
            let header_bytes = &program[..HEADER_SIZE];
            let header = Header::from_bytes(header_bytes);

            self.players.push(Player {
                id: *player_id,
                name: header
                    .name()
                    .to_owned()
                    .into_string()
                    .expect("Invalid UTF8 in program name"),
                comment: header
                    .comment()
                    .to_owned()
                    .into_string()
                    .expect("Invalid UTF8 in program comment"),
                size: program.len() - HEADER_SIZE,
            });

            let champion = &program[HEADER_SIZE..];
            self.load_champion(champion, *player_id, i * player_spacing);
        }
    }

    fn load_champion(&mut self, champion: &[u8], player_id: PlayerId, at: usize) {
        self.memory.write(at, champion, player_id);

        let mut starting_process = Process::new(self.pid_pool.get(), player_id, at.into());
        starting_process.registers[0] = player_id;
        self.processes.push(starting_process);
        self.last_lives.insert(player_id, 0);
        self.process_count_per_cells[at] += 1;
        self.process_count_by_player_id.insert(player_id, 1);
    }
}

fn execute_instr(instr: &Instruction, mut ctx: ExecutionContext<'_>) {
    use instructions::*;
    use OpType::*;

    let exec = match instr.kind {
        Live => exec_live,
        Ld => exec_ld,
        St => exec_st,
        Add => exec_add,
        Sub => exec_sub,
        And => exec_and,
        Or => exec_or,
        Xor => exec_xor,
        Zjmp => exec_zjmp,
        Ldi => exec_ldi,
        Sti => exec_sti,
        Fork => exec_fork,
        Lld => exec_lld,
        Lldi => exec_lldi,
        Lfork => exec_lfork,
        Aff => exec_aff,
    };

    exec(&instr, &mut ctx);
    ctx.process.pc.advance(instr.byte_size as isize);
}

impl Header {
    fn from_bytes(bytes: &[u8]) -> Self {
        use byteorder::{BigEndian, ReadBytesExt};
        use std::io::{Cursor, Read};

        let mut reader = Cursor::new(bytes);

        let magic = reader
            .read_u32::<BigEndian>()
            .expect("Failed to read Magic");

        let mut prog_name = [0; PROG_NAME_LENGTH + 1];
        reader
            .read_exact(&mut prog_name)
            .expect("Failed to read program name");

        let prog_size = reader
            .read_u32::<BigEndian>()
            .expect("Failed to read program size");

        let mut prog_comment = [0; PROG_COMMENT_LENGTH + 1];
        reader
            .read_exact(&mut prog_comment)
            .expect("Failed to read program name");

        Self {
            magic,
            prog_name,
            prog_size,
            prog_comment,
        }
    }

    fn name(&self) -> &CStr {
        let idx = self.prog_name.iter().position(|&b| b == 0).unwrap();
        CStr::from_bytes_with_nul(&self.prog_name[..idx + 1]).expect("Invalid program name")
    }

    fn comment(&self) -> &CStr {
        let idx = self.prog_comment.iter().position(|&b| b == 0).unwrap();

        CStr::from_bytes_with_nul(&self.prog_comment[..idx + 1]).expect("Invalid program comment")
    }
}

#[derive(Debug, Default)]
pub struct PidPool(Pid);

impl PidPool {
    pub fn get(&mut self) -> Pid {
        let next = self.0 + 1;
        std::mem::replace(&mut self.0, next)
    }
}
