use super::types::{Pid, Process, Registers, ProcessState, ExecutionContext};

impl Process {
    pub fn new(pid: Pid, pc: usize) -> Self {
        Self {
            pid,
            pc,
            registers: Registers::default(),
            carry: false,
            state: ProcessState::Idle,
            last_live_cycle: 0
        }
    }

    pub fn fork(pid: Pid, pc: usize, ctx: &ExecutionContext) -> Self {
        Self {
            pid,
            pc,
            registers: *ctx.registers,
            carry: *ctx.carry,
            state: ProcessState::Idle,
            last_live_cycle: ctx.cycle
        }
    }
}
