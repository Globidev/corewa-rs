use wasm_bindgen::prelude::*;

pub mod types;
mod memory;
mod process;
mod instructions;

use self::types::*;
use std::mem;
use spec::*;

#[wasm_bindgen]
#[derive(Default)]
pub struct VirtualMachine {
    players: Vec<Player>,
    memory: memory::Memory,
    processes: Processes,
    pid_pool: u32,

    pub cycles: u32,
    pub last_live_check: u32,
    pub cycles_to_die: u32,
    pub live_count_since_last_check: u32,
    pub checks_without_cycle_decrement: u32,
}

#[wasm_bindgen]
impl VirtualMachine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            cycles_to_die: CYCLE_TO_DIE,
            ..Default::default()
        }
    }

    pub fn size(&self) -> usize {
        mem::size_of_val(&self.memory)
    }

    pub fn memory(&self) -> *const u8 {
        self.memory.as_ptr()
    }

    pub fn process_count(&self) -> usize {
        self.processes.len()
    }

    pub fn process_pc(&self, at: usize) -> usize {
        self.processes[at].pc
    }

    pub fn tick(&mut self) {
        let mut forks = Vec::new();
        for process in self.processes.iter_mut().rev() {
            // Attempt to read instructions
            if let ProcessState::Idle = process.state {
                match self.memory.read_op(process.pc) {
                    Ok(op) => {
                        let cycle_left = OpSpec::from(op).cycles;
                        process.state = ProcessState::Executing { cycle_left, op };
                    },
                    Err(e) => {
                        // super::log(&format!("{:?}", e));
                    }
                }
            }

            match process.state {
                ProcessState::Executing { cycle_left: 1, op } => {
                    let instr_result = self.memory.read_instr(op, process.pc);
                    match instr_result {
                        Ok(instr) => {
                            let execution_context = ExecutionContext {
                                memory: &mut self.memory,
                                pc: &mut process.pc,
                                registers: &mut process.registers,
                                carry: &mut process.carry,
                                last_live_cycle: &mut process.last_live_cycle,
                                forks: &mut forks,
                                cycle: self.cycles,
                                live_count: &mut self.live_count_since_last_check
                            };
                            execute_instr(&instr, execution_context);
                        },
                        Err(e) => {
                            // super::log(&format!("{:?}", e));
                        }
                    };
                    process.state = ProcessState::Idle;
                },

                ProcessState::Executing { cycle_left: ref mut n, .. } => {
                    *n -= 1;
                },

                ProcessState::Idle => {
                    process.pc = (process.pc + 1) % MEM_SIZE;
                }
            };
        }

        self.processes.append(&mut forks);
        self.cycles += 1;

        let last_live_check = self.last_live_check;
        let should_live_check = self.cycles - last_live_check >= self.cycles_to_die;
        if should_live_check {
            self.processes.retain(|process|
                process.last_live_cycle > last_live_check
            );

            if self.live_count_since_last_check >= NBR_LIVE {
                self.cycles_to_die = self.cycles_to_die.saturating_sub(CYCLE_DELTA);
                self.checks_without_cycle_decrement = 0;
            } else {
                self.checks_without_cycle_decrement += 1;
            }

            if self.checks_without_cycle_decrement >= MAX_CHECKS {
                self.cycles_to_die = self.cycles_to_die.saturating_sub(CYCLE_DELTA);
                self.checks_without_cycle_decrement = 0;
            }

            self.live_count_since_last_check = 0;
            self.last_live_check = self.cycles;
        }
    }
}

impl VirtualMachine {
    pub fn load_players(&mut self, players: &[(PlayerId, ByteCode)]) {
        let player_spacing = MEM_SIZE / players.len();
        for (i, (player_id, program)) in players.iter().enumerate() {
            let header_bytes = &program[..HEADER_SIZE];

            unsafe {
                #[allow(cast_ptr_alignment)] // ⚠ UB ?
                let header_ptr = header_bytes.as_ptr() as * const Header;

                self.players.push(Player {
                    id: *player_id,
                    name: from_nul_bytes(&(*header_ptr).prog_name),
                    comment: from_nul_bytes(&(*header_ptr).prog_comment)
                });
            };

            let champion = &program[HEADER_SIZE..];
            self.load_champion(champion, i * player_spacing);
        }
    }

    fn load_champion(&mut self, champion: ByteCode, at: usize) {
        self.memory.write(at, champion);

        let mut starting_process = Process::new(self.pid_pool, at);
        starting_process.registers[0] = 42;
        self.processes.push(starting_process);
        self.pid_pool += 1;
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
    *ctx.pc = (*ctx.pc + instr.byte_size) % MEM_SIZE;
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
