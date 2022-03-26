use super::{
    execution_context::ExecutionContext,
    memory::Owner,
    program_counter::ProgramCounter,
    types::{Pid, Registers},
};
use crate::spec::OpType;

#[derive(Debug)]
pub struct Process {
    pub pid: Pid,
    pub owner: Owner,
    pub pc: ProgramCounter,
    pub registers: Registers,
    pub zf: bool,
    pub state: ProcessState,
    pub last_live_cycle: u32,
}
#[derive(Debug, Clone, Copy)]
pub enum ProcessState {
    Idle,
    Executing { op: OpType, exec_at: u32 },
}

impl Process {
    pub fn new(pid: Pid, owner: Owner, pc: ProgramCounter) -> Self {
        Self {
            pid,
            owner,
            pc,
            registers: Registers::default(),
            zf: false,
            state: ProcessState::Idle,
            last_live_cycle: 0,
        }
    }

    pub fn fork(pid: Pid, pc: ProgramCounter, ctx: &ExecutionContext<'_>) -> Self {
        Self {
            pid,
            owner: ctx.process.owner,
            pc,
            registers: ctx.process.registers,
            zf: ctx.process.zf,
            state: ProcessState::Idle,
            last_live_cycle: 0,
        }
    }
}
