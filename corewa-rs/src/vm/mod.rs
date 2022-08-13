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
use memory::{Memory, Owner};
use process::{Process, ProcessState};
use types::*;

use std::ffi::CStr;

use fxhash::FxHashSet as HashSet;

pub struct VirtualMachine {
    pub players: arrayvec::ArrayVec<Player, MAX_PLAYERS>,

    pub memory: Memory,
    pub processes: Vec<Process>,
    pub pid_pool: PidPool,

    pub last_lives: [u32; MAX_PLAYERS],

    pub cycles: u32,
    pub last_live_check: u32,
    pub check_interval: u32,
    pub live_count_since_last_check: u32,
    pub checks_without_cycle_decrement: u32,

    pub process_count_per_cells: [u32; MEM_SIZE],
    pub process_count_by_owner: [u32; MAX_PLAYERS],

    forks: Vec<Process>,
    live_ids: HashSet<PlayerId>,
}

impl VirtualMachine {
    pub fn new() -> Self {
        Self {
            players: arrayvec::ArrayVec::new(),

            memory: Memory::default(),
            processes: Vec::with_capacity(1 << 20),
            pid_pool: PidPool::default(),

            last_lives: [0; MAX_PLAYERS],

            cycles: 0,
            last_live_check: 0,
            check_interval: CHECK_INTERVAL,
            live_count_since_last_check: 0,
            checks_without_cycle_decrement: 0,

            process_count_per_cells: [0; MEM_SIZE],
            process_count_by_owner: [0; MAX_PLAYERS],

            forks: Vec::with_capacity(1 << 16),
            live_ids: HashSet::with_hasher(Default::default()),
        }
    }

    pub fn tick(&mut self) {
        if self.processes.is_empty() {
            return;
        }

        self.run_processes();
        self.memory.tick();
        self.cycles += 1;

        let should_live_check = self.cycles - self.last_live_check >= self.check_interval;

        if should_live_check {
            self.live_check()
        }
    }

    pub fn load_players(&mut self, players: &[(PlayerId, Vec<u8>)]) {
        let player_spacing = MEM_SIZE / players.len().max(1);
        for ((player_id, program), idx) in players.iter().zip(0..) {
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
            self.load_champion(champion, *player_id, idx, usize::from(idx) * player_spacing);
        }
    }

    fn load_champion(&mut self, champion: &[u8], player_id: PlayerId, owner: Owner, at: usize) {
        self.memory.write(at, champion, owner);

        let mut starting_process = Process::new(self.pid_pool.get(), owner, at.into());
        starting_process.registers[0] = player_id;

        self.processes.push(starting_process);
        self.last_lives[usize::from(owner)] = 0;
        self.process_count_per_cells[at] += 1;
        self.process_count_by_owner[usize::from(owner)] = 1;
    }

    fn run_processes(&mut self) {
        let forks = &mut self.forks;
        let live_ids = &mut self.live_ids;

        for process in self.processes.iter_mut().rev() {
            match process.state {
                // Attempt to read instruction
                ProcessState::Idle => {
                    if let Ok(op) = self.memory.decode_op(process.pc.addr()) {
                        let exec_at = self.cycles + op_spec(op).cycles - 1;
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
                                process,
                                forks,
                                cycle: self.cycles,
                                live_count: &mut self.live_count_since_last_check,
                                pid_pool: &mut self.pid_pool,
                                live_ids,
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

        for process in forks.iter_mut() {
            self.process_count_per_cells[process.pc.addr()] += 1;
            self.process_count_by_owner[usize::from(process.owner)] += 1;
        }

        self.processes.append(forks);

        for (idx, player) in self.players.iter().enumerate() {
            if live_ids.contains(&player.id) {
                self.last_lives[idx] = self.cycles;
            }
        }

        live_ids.clear();
    }

    fn live_check(&mut self) {
        let count_per_cells = &mut self.process_count_per_cells;
        let count_by_owner = &mut self.process_count_by_owner;

        let last_live_check = self.last_live_check;
        self.processes.retain(|process| {
            let killed = process.last_live_cycle <= last_live_check;
            if killed {
                count_per_cells[process.pc.addr()] -= 1;
                count_by_owner[usize::from(process.owner)] -= 1;
            }
            !killed
        });

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

impl Default for VirtualMachine {
    fn default() -> Self {
        Self::new()
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

    exec(instr, &mut ctx);
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
