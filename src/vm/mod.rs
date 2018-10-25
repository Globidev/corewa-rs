pub mod memory;
pub mod types;
mod decoder;
mod execution_context;
mod instructions;
mod process;
mod program_counter;
mod wrapping_array;

use crate::spec::*;
use self::execution_context::ExecutionContext;
use self::process::{Process, ProcessState};
use self::types::*;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Default)]
pub struct VMBuilder {
    players: Vec<(PlayerId, Vec<u8>)>
}

#[wasm_bindgen]
impl VMBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Default::default()
    }

    pub fn with_player(mut self, player_id: PlayerId, champion: Vec<u8>) -> VMBuilder {
        self.players.push((player_id, champion));
        self
    }

    pub fn finish(self) -> VirtualMachine {
        let mut vm = VirtualMachine::new();
        vm.load_players(&self.players);
        vm
    }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct VirtualMachine {
    players: Vec<Player>,
    memory: memory::Memory,
    processes: Vec<Process>,
    pid_pool: PidPool,
    last_live_id: Option<PlayerId>,

    pub cycles: u32,
    pub last_live_check: u32,
    pub cycles_to_die: u32,
    pub live_count_since_last_check: u32,
    pub checks_without_cycle_decrement: u32,
}

#[wasm_bindgen]
impl VirtualMachine {
    pub fn process_pcs(&self) -> Vec<u32> {
        let mut v = vec![0; MEM_SIZE];
        self.processes.iter().for_each(|p| v[*p.pc] += 1);
        v
    }

    pub fn cell_values(&self) -> *const u8 {
        self.memory.cell_values()
    }

    pub fn cell_owners(&self) -> *const PlayerId {
        self.memory.cell_owners()
    }

    pub fn size(&self) -> usize {
        self.memory.size()
    }

    pub fn process_count(&self) -> usize {
        self.processes.len()
    }

    pub fn winner(&self) -> Option<String> {
        self.last_live_id.and_then(|id| {
            self.players.iter().find(|p| p.id == id)
                .map(|p| format!("{} ({})", p.name, p.id))
        })
    }

    pub fn player_count(&self) -> usize {
        self.players.len()
    }

    pub fn player_id(&self, at: usize) -> PlayerId {
        self.players[at].id
    }

    pub fn tick(&mut self) -> bool {
        use self::decoder::{decode_op, decode_instr};

        let mut forks = Vec::with_capacity(8192);
        let mut lives = linked_hash_set::LinkedHashSet::new();

        for process in self.processes.iter_mut().rev() {
            // Attempt to read instructions
            if let ProcessState::Idle = process.state {
                match decode_op(&self.memory, *process.pc) {
                    Ok(op) => {
                        let cycle_left = OpSpec::from(op).cycles;
                        process.state = ProcessState::Executing { cycle_left, op };
                    },
                    Err(e) => {
                    }
                }
            }

            match process.state {
                ProcessState::Executing { cycle_left: 1, op } => {
                    let instr_result = decode_instr(&self.memory, op, *process.pc);
                    match instr_result {
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
                        Err(e) => {
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

        self.cycles += 1;

        self.processes.append(&mut forks);
        let last_valid_live = lives.iter().rfind(|id|
            self.players.iter().any(|p| p.id == **id)
        );
        if let Some(live_id) = last_valid_live {
            self.last_live_id = Some(*live_id)
        }

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

        self.process_count() == 0
    }
}

impl VirtualMachine {
    pub fn new() -> Self {
        Self {
            cycles_to_die: CYCLE_TO_DIE,
            ..Default::default()
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
                    comment: from_nul_bytes(&(*header_ptr).prog_comment)
                });
            };

            let champion = &program[HEADER_SIZE..];
            self.load_champion(champion, *player_id, i * player_spacing);
        }
    }

    fn load_champion(&mut self, champion: ByteCode, player_id: PlayerId, at: usize) {
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
