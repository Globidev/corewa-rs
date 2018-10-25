use crate::spec::ParamType;
use super::PidPool;
use super::process::Process;
use super::program_counter::ProgramCounter;
use super::types::*;

pub struct ExecutionContext<'a> {
    pub memory: &'a mut super::memory::Memory,
    pub player_id: PlayerId,
    pub pc: &'a mut ProgramCounter,
    pub registers: &'a mut Registers,
    pub zf: &'a mut bool,
    pub last_live_cycle: &'a mut u32,
    pub forks: &'a mut Vec<Process>,
    pub cycle: u32,
    pub live_count: &'a mut u32,
    pub pid_pool: &'a mut PidPool,
    pub live_ids: &'a mut linked_hash_set::LinkedHashSet<PlayerId>
}

impl<'a> ExecutionContext<'a> {
    pub fn get_param(&self, param: &Param, offset_type: OffsetType) -> i32 {
        use self::ParamType::*;

        match param.kind {
            Register => self.registers[param.value as usize - 1],
            Direct   => param.value,
            Indirect => {
                let at = self.pc.offset(param.value as isize, offset_type);
                self.memory.read_i32(at)
            }
        }
    }

    pub fn get_reg(&self, param: &Param) -> i32 {
        debug_assert_eq!(param.kind, ParamType::Register);
        self.registers[param.value as usize - 1]
    }

    pub fn set_reg(&mut self, param: &Param, value: i32) {
        debug_assert_eq!(param.kind, ParamType::Register);
        self.registers[param.value as usize - 1] = value;
    }
}
