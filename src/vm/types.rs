use spec::{ParamType, OpType, MAX_PARAMS, REG_COUNT};

#[derive(Debug)]
pub struct Player {
    pub id: PlayerId,
    pub name: String,
    pub comment: String,
}

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

#[derive(Debug)]
pub struct Instruction {
    pub kind: OpType,
    pub params: [Param; MAX_PARAMS],
    pub byte_size: usize,
}

#[derive(Debug)]
#[derive(Default)]
pub struct Param {
    pub kind: ParamType,
    pub value: i32,
}

pub struct ExecutionContext<'a> {
    pub memory: &'a mut super::memory::Memory,
    pub pc: &'a mut ProgramCounter,
    pub registers: &'a mut Registers,
    pub carry: &'a mut bool,
    pub last_live_cycle: &'a mut u32,
    pub forks: &'a mut Processes,
    pub cycle: u32,
    pub live_count: &'a mut u32,
}

pub type Register = i32;
pub type Pid = u32;
pub type Registers = [Register; REG_COUNT];
pub type PlayerId = u16;
pub type ProgramCounter = usize;
pub type Processes = Vec<Process>;
pub type ByteCode<'a> = &'a [u8];
