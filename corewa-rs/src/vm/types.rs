use crate::spec::{OpSpec, OpType, ParamType, MAX_PARAMS, REG_COUNT};
use std::fmt;

#[derive(Debug)]
pub struct Player {
    pub id: PlayerId,
    pub name: String,
    pub comment: String,
    pub size: usize,
}

#[derive(Debug)]
pub struct Instruction {
    pub kind: OpType,
    pub params: [Param; MAX_PARAMS],
    pub byte_size: usize,
}

#[derive(Debug, Default)]
pub struct Param {
    pub kind: ParamType,
    pub value: i32,
}

#[derive(Debug)]
pub enum OffsetType {
    Limited,
    Long,
}

pub type Register = i32;
pub type Pid = u32;
pub type Registers = [Register; REG_COUNT];
pub type PlayerId = i32;

impl fmt::Display for OpType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use OpType::*;

        let mnemonic = match self {
            Live => "live",
            Ld => "ld",
            St => "st",
            Add => "add",
            Sub => "sub",
            And => "and",
            Or => "or",
            Xor => "xor",
            Zjmp => "zjmp",
            Ldi => "ldi",
            Sti => "sti",
            Fork => "fork",
            Lld => "lld",
            Lldi => "lldi",
            Lfork => "lfork",
            Aff => "aff",
        };

        write!(f, "{}", mnemonic)
    }
}

impl fmt::Display for Param {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.kind {
            ParamType::Direct => write!(f, "%{}", self.value),
            ParamType::Indirect => write!(f, "{}", self.value),
            ParamType::Register => write!(f, "r{}", self.value),
        }
    }
}

impl fmt::Display for Instruction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let spec = OpSpec::from(self.kind);
        write!(f, "{} {}", self.kind, self.params[0])?;
        for i in 1..spec.param_count {
            write!(f, ", {}", self.params[i])?;
        }
        Ok(())
    }
}
