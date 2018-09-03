use wasm_bindgen::prelude::*;

pub mod types;
mod memory;
mod instructions;

use self::types::*;
use std::mem;
use spec::*;

#[wasm_bindgen]
#[derive(Default)]
pub struct VirtualMachine {
    pid_pool: u32,
    players: Vec<Player>,
    memory: memory::Memory,
    processes: Processes,
}

#[wasm_bindgen]
impl VirtualMachine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Default::default()
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
        for process in self.processes.iter_mut() {
            let next_state = match process.state {
                ProcessState::Idle => {
                    match self.memory.read_instr(process.pc).ok() {
                        Some(instr) => {
                            let cycle_left = OpSpec::from(instr.kind).cycles;
                            ProcessState::Executing { cycle_left, instr }
                        },
                        None => {
                            process.pc = (process.pc + 1) % MEM_SIZE;
                            ProcessState::Idle
                        }
                    }
                },
                ProcessState::Executing { cycle_left: 0, ref instr } => {
                    let execution_context = ExecutionContext {
                        memory: &mut self.memory,
                        pc: &mut process.pc,
                        registers: &mut process.registers,
                        carry: &mut process.carry,
                        forks: &mut forks,
                    };
                    execute_instr(instr, execution_context);
                    ProcessState::Idle
                },
                ProcessState::Executing { cycle_left: ref mut n, .. } => {
                    *n -= 1;
                    continue
                }
            };

            process.state = next_state;
        }

        self.processes.append(&mut forks);
    }
}

impl VirtualMachine {
    pub fn load_players(&mut self, players: &[(PlayerId, ByteCode)]) {
        let player_spacing = MEM_SIZE / players.len();
        for (i, (player_id, program)) in players.iter().enumerate() {
            let header_bytes = &program[..HEADER_SIZE];

            unsafe {
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

        self.processes.push(Process {
            pid: self.pid_pool,
            pc: at,
            registers: Registers::default(),
            carry: false,
            state: ProcessState::Idle,
        });
        self.pid_pool += 1;
    }
}

fn execute_instr(instr: &Instruction, mut context: ExecutionContext) {
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

    exec(instr, &mut context);
    *context.pc = (*context.pc + instr.byte_size) % MEM_SIZE;
    // match instr {
    //     Live(Dir4(n)) => {
    //         *process.pc += 5;
    //     },
    //     //
    //     Zjmp(Dir2(n)) => {
    //         let new_pc = *process.pc as i64 + *n as i64;
    //         *process.pc = (new_pc % MEM_SIZE as i64) as usize;
    //     },
    //     //
    //     Fork(Dir2(n)) => {
    //         // let new_pc = *process.pc as i64 + n;
    //         // *process.pc = (new_pc % MEM_SIZE as i64) as usize;

    //         processes.push(Process {
    //             champion_id: 0,
    //             pid: 1,
    //             pc: *process.pc + *n as usize,
    //             registers: Registers::default(),
    //             carry: false,
    //             state: ProcessState::Idle,
    //         });
    //         *process.pc += 3;
    //     },
    //     _ => ()
    // }
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
