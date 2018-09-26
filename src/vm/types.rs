use spec::{ParamType, OpType, MAX_PARAMS, REG_COUNT};

#[derive(Debug)]
pub struct Player {
    pub id: PlayerId,
    pub name: String,
    pub comment: String,
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
    Long
}

pub type Register = i32;
pub type Pid = u32;
pub type Registers = [Register; REG_COUNT];
pub type PlayerId = u16;
pub type ByteCode<'a> = &'a [u8];
