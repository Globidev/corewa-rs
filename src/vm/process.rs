use super::types::{Pid, Registers};
use super::execution_context::ExecutionContext;
use super::program_counter::ProgramCounter;
use spec::OpType;

#[derive(Debug)]
pub struct Process {
    pub pid: Pid,
    pub pc: ProgramCounter,
    pub registers: Registers,
    pub carry: bool,
    pub state: ProcessState,
    pub last_live_cycle: u32,
}

#[derive(Debug)]
pub enum ProcessState {
    Idle,
    Executing { op: OpType, cycle_left: u32 }
}

impl Process {
    pub fn new(pid: Pid, pc: ProgramCounter) -> Self {
        Self {
            pid,
            pc,
            registers: Registers::default(),
            carry: false,
            state: ProcessState::Idle,
            last_live_cycle: 0
        }
    }

    pub fn fork(pid: Pid, pc: ProgramCounter, ctx: &ExecutionContext) -> Self {
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
