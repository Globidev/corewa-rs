use crate::spec::OpType;
use super::execution_context::ExecutionContext;
use super::program_counter::ProgramCounter;
use super::types::{Pid, Registers, PlayerId};

#[derive(Debug)]
pub struct Process {
    pub pid: Pid,
    pub player_id: PlayerId,
    pub pc: ProgramCounter,
    pub registers: Registers,
    pub zf: bool,
    pub state: ProcessState,
    pub last_live_cycle: u32,
}

#[derive(Debug, Clone)]
pub enum ProcessState {
    Idle,
    Executing { op: OpType, cycle_left: u32 }
}

impl Process {
    pub fn new(pid: Pid, player_id: PlayerId, pc: ProgramCounter) -> Self {
        Self {
            pid,
            player_id,
            pc,
            registers: Registers::default(),
            zf: false,
            state: ProcessState::Idle,
            last_live_cycle: 0
        }
    }

    pub fn fork(pid: Pid, pc: ProgramCounter, ctx: &ExecutionContext) -> Self {
        Self {
            pid,
            player_id: ctx.player_id,
            pc,
            registers: *ctx.registers,
            zf: *ctx.zf,
            state: ProcessState::Idle,
            last_live_cycle: 0
        }
    }
}
