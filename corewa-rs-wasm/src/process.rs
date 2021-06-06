use corewa_rs::{
    spec::*,
    vm::{
        process::{Process, ProcessState},
        types::*,
    },
};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct ProcessInfo {
    pub pid: Pid,
    pub player_id: PlayerId,
    pub pc: usize,
    pub zf: bool,
    pub last_live_cycle: u32,

    state: ProcessState,
    registers: Registers,
}

#[wasm_bindgen]
pub struct ExecutingState {
    op: OpType,
    pub exec_at: u32,
}

#[wasm_bindgen]
pub struct ProcessCollection {
    processes: Vec<ProcessInfo>,
}

impl ProcessInfo {
    pub fn from_process(process: &Process) -> Self {
        Self {
            pid: process.pid,
            player_id: process.player_id,
            pc: process.pc.addr(),
            registers: process.registers,
            zf: process.zf,
            last_live_cycle: process.last_live_cycle,
            state: process.state.clone(),
        }
    }
}

#[wasm_bindgen]
impl ProcessInfo {
    pub fn executing(&self) -> Option<ExecutingState> {
        match self.state {
            ProcessState::Idle => None,
            ProcessState::Executing { op, exec_at } => Some(ExecutingState { op, exec_at }),
        }
    }

    pub fn registers(&self) -> Vec<Register> {
        self.registers.to_vec()
    }
}

#[wasm_bindgen]
impl ExecutingState {
    pub fn op(&self) -> String {
        self.op.to_string()
    }
}

#[wasm_bindgen]
impl ProcessCollection {
    pub fn is_empty(&self) -> bool {
        self.processes.is_empty()
    }

    pub fn len(&self) -> usize {
        self.processes.len()
    }

    pub fn at(&self, idx: usize) -> ProcessInfo {
        self.processes[idx].clone()
    }
}

impl<'a, T: Iterator<Item = &'a Process>> From<T> for ProcessCollection {
    fn from(processes: T) -> Self {
        // TODO: Careful with many processes, might want to limit them
        let processes = processes.map(ProcessInfo::from_process).collect();

        Self { processes }
    }
}
