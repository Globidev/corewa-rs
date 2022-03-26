use std::iter::FromIterator;

use arrayvec::ArrayVec;
use corewa_rs::{
    spec::*,
    vm::{
        memory::Owner,
        process::{Process, ProcessState},
        types::*,
    },
};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct ProcessInfo {
    pub pid: Pid,
    pub owner: Owner,
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

const MAX_PROCESS_COLLECTION: usize = 32;

#[wasm_bindgen]
pub struct ProcessCollection {
    processes: ArrayVec<ProcessInfo, MAX_PROCESS_COLLECTION>,
    pub extra_len: usize,
}

impl ProcessInfo {
    pub fn from_process(process: &Process) -> Self {
        Self {
            pid: process.pid,
            owner: process.owner,
            pc: process.pc.addr(),
            registers: process.registers,
            zf: process.zf,
            last_live_cycle: process.last_live_cycle,
            state: process.state,
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

    pub fn visible_len(&self) -> usize {
        self.processes.len()
    }

    pub fn at(&self, idx: usize) -> ProcessInfo {
        self.processes[idx].clone()
    }
}

impl<'p> FromIterator<&'p Process> for ProcessCollection {
    fn from_iter<T: IntoIterator<Item = &'p Process>>(iter: T) -> Self {
        let mut iter = iter.into_iter();

        let processes = iter
            .by_ref()
            .map(ProcessInfo::from_process)
            .take(MAX_PROCESS_COLLECTION)
            .collect();

        Self {
            processes,
            extra_len: iter.count(),
        }
    }
}
