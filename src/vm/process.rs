use super::types::{Pid, Process, Registers, ProcessState, ExecutionContext};
// use spec::OpSpec;
use super::memory::Memory;

// fn load_initial_op(pc: usize, mem: &Memory) -> ProcessState {
//     match mem.read_op(pc) {
//         Ok(op) => ProcessState::Executing { op, cycle_left: OpSpec::from(op).cycles },
//         _ => ProcessState::Idle
//     }
// }

impl Process {
    pub fn new(pid: Pid, pc: usize, mem: &Memory) -> Self {
        Self {
            pid,
            pc,
            registers: Registers::default(),
            carry: false,
            state: ProcessState::Idle, //load_initial_op(pc, mem),
            last_live_cycle: 0
        }
    }

    pub fn fork(pid: Pid, pc: usize, ctx: &ExecutionContext) -> Self {
        Self {
            pid,
            pc,
            registers: *ctx.registers,
            carry: *ctx.carry,
            state: ProcessState::Idle, //load_initial_op(pc, ctx.memory),
            last_live_cycle: ctx.cycle
        }
    }
}
