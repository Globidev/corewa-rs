pub mod decoder;
pub mod memory;
pub mod process;
pub mod types;

mod execution_context;
mod instructions;
mod program_counter;
mod wrapping_array;

use crate::spec::*;
use self::execution_context::ExecutionContext;
use self::process::{Process, ProcessState};
use self::memory::Memory;
use self::types::*;

use std::collections::HashMap;

// #[derive(Default)]
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

    // TODO:
    //   - Processes (or process count) per memory cell
    pub process_count_per_cells: [u32; MEM_SIZE],
    //   - Processes (or process count) per champion ?
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

            process_count_per_cells: [0; MEM_SIZE]
        }
    }

    pub fn tick(&mut self) {
        if self.processes.is_empty() { return }

        use self::decoder::{decode_op, decode_instr};

        let mut forks = Vec::with_capacity(8192);
        let mut lives = linked_hash_set::LinkedHashSet::new();

        for process in self.processes.iter_mut().rev() {
            // Attempt to read instructions
            if let ProcessState::Idle = process.state {
                if let Ok(op) = decode_op(&self.memory, *process.pc) {
                    let cycle_left = OpSpec::from(op).cycles;
                    process.state = ProcessState::Executing { cycle_left, op };
                }
            }

            match process.state {
                ProcessState::Executing { cycle_left: 1, op } => {
                    match decode_instr(&self.memory, op, *process.pc) {
                        Ok(instr) => {
                            let execution_context = ExecutionContext {
                                memory: &mut self.memory,
                                player_id: process.player_id,
                                pc: &mut process.pc,
                                registers: &mut process.registers,
                                zf: &mut process.zf,
                                last_live_cycle: &mut process.last_live_cycle,
                                forks: &mut forks,
                                cycle: self.cycles,
                                live_count: &mut self.live_count_since_last_check,
                                pid_pool: &mut self.pid_pool,
                                live_ids: &mut lives
                            };
                            execute_instr(&instr, execution_context);
                        },
                        Err(_e) => {
                            process.pc.advance(1)
                        }
                    };
                    process.state = ProcessState::Idle;
                },

                ProcessState::Executing { cycle_left: ref mut n, .. } => {
                    *n -= 1;
                },

                ProcessState::Idle => {
                    process.pc.advance(1)
                }
            };
        }

        self.memory.tick();

        self.processes.append(&mut forks);

        let cycle = self.cycles;
        let last_lives = &mut self.last_lives;
        self.players.iter().for_each(|p| {
            if lives.contains(&p.id) {
                last_lives.insert(p.id, cycle);
            }
        });

        self.cycles += 1;

        let last_live_check = self.last_live_check;
        let should_live_check = self.cycles - last_live_check >= self.check_interval;
        if should_live_check {
            self.processes.retain(|process|
                process.last_live_cycle > last_live_check
            );

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
        let player_spacing = MEM_SIZE / ::std::cmp::max(1, players.len());
        for (i, (player_id, program)) in players.iter().enumerate() {
            let header_bytes = &program[..HEADER_SIZE];

            unsafe {
                let header_ptr = header_bytes.as_ptr() as * const Header;

                self.players.push(Player {
                    id: *player_id,
                    name: from_nul_bytes(&(*header_ptr).prog_name),
                    comment: from_nul_bytes(&(*header_ptr).prog_comment),
                    size: program.len() - HEADER_SIZE
                });
            };

            let champion = &program[HEADER_SIZE..];
            self.load_champion(champion, *player_id, i * player_spacing);
        }
    }

    fn load_champion(&mut self, champion: &[u8], player_id: PlayerId, at: usize) {
        self.memory.write(at, champion, player_id);

        let mut starting_process = Process::new(self.pid_pool.get(), player_id, at.into());
        starting_process.registers[0] = player_id;
        self.processes.push(starting_process);
    }
}

fn execute_instr(instr: &Instruction, mut ctx: ExecutionContext) {
    use self::OpType::*;
    use self::instructions::*;

    let exec = match instr.kind {
        Live  => exec_live,
        Ld    => exec_ld,
        St    => exec_st,
        Add   => exec_add,
        Sub   => exec_sub,
        And   => exec_and,
        Or    => exec_or,
        Xor   => exec_xor,
        Zjmp  => exec_zjmp,
        Ldi   => exec_ldi,
        Sti   => exec_sti,
        Fork  => exec_fork,
        Lld   => exec_lld,
        Lldi  => exec_lldi,
        Lfork => exec_lfork,
        Aff   => exec_aff,
    };

    exec(&instr, &mut ctx);
    ctx.pc.advance(instr.byte_size as isize);
}

fn from_nul_bytes(bytes: &[u8]) -> String {
    use std::str::from_utf8;

    let nul = bytes.iter()
        .position(|c| *c == 0)
        .expect("String not null terminated!");

    let as_str = from_utf8(&bytes[..nul])
        .expect("Invalid UTF8 string");

    String::from(as_str)
}

#[derive(Debug, Default)]
pub struct PidPool(Pid);

impl PidPool {
    pub fn get(&mut self) -> Pid {
        let next = self.0 + 1;
        std::mem::replace(&mut self.0, next)
    }
}
