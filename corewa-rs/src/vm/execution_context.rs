use super::{process::Process, types::*, PidPool};
use crate::spec::ParamType;

use std::collections::HashSet;

pub struct ExecutionContext<'a> {
    pub memory: &'a mut super::memory::Memory,
    pub process: &'a mut Process,
    pub forks: &'a mut Vec<Process>,
    pub cycle: u32,
    pub live_count: &'a mut u32,
    pub pid_pool: &'a mut PidPool,
    pub live_ids: &'a mut HashSet<PlayerId>,
}

impl ExecutionContext<'_> {
    pub fn get_param(&self, param: &Param, offset_type: OffsetType) -> i32 {
        use ParamType::*;

        match param.kind {
            Register => self.process.registers[param.value as usize - 1],
            Direct => param.value,
            Indirect => {
                let at = self.process.pc.offset(param.value as isize, offset_type);
                self.memory.read_i32(at)
            }
        }
    }

    pub fn get_reg(&self, param: &Param) -> i32 {
        debug_assert_eq!(param.kind, ParamType::Register);
        self.process.registers[param.value as usize - 1]
    }

    pub fn set_reg(&mut self, param: &Param, value: i32) {
        debug_assert_eq!(param.kind, ParamType::Register);
        self.process.registers[param.value as usize - 1] = value;
    }
}
