pub const COREWAR_MAGIC: u32 = 0x00EA_83F3;

pub const PROG_NAME_LENGTH: usize = 128;
pub const PROG_COMMENT_LENGTH: usize = 2048;

pub type ProgName = [u8; PROG_NAME_LENGTH + 1];
pub type ProgComment = [u8; PROG_COMMENT_LENGTH + 1];

#[repr(packed)]
pub struct Header {
    pub magic: u32,
    pub prog_name: ProgName,
    pub prog_size: u32,
    pub prog_comment: ProgComment,
}

pub const HEADER_SIZE: usize = ::std::mem::size_of::<Header>();

pub const REG_PARAM_CODE: u8 = 0b01;
pub const DIR_PARAM_CODE: u8 = 0b10;
pub const IND_PARAM_CODE: u8 = 0b11;

pub const MAX_PLAYERS: usize = 4;

pub const MEM_SIZE: usize = 4096;
pub const IDX_MOD: usize = MEM_SIZE / 8;
pub const CHAMP_MAX_SIZE: usize = MEM_SIZE / 6;

pub const CHECK_INTERVAL: u32 = 1536;
pub const CYCLE_DELTA: u32 = 50;
pub const NBR_LIVE: u32 = 21;
pub const MAX_CHECKS: u32 = 10;

pub const REG_COUNT: usize = 16;
pub const MAX_PARAMS: usize = 3;

#[derive(Debug)]
pub struct OpSpec {
    pub code: u8,
    pub cycles: u32,
    pub param_count: usize,
    pub param_masks: [u8; MAX_PARAMS],
    pub has_pcb: bool,
    pub dir_size: DirectSize,
}

#[derive(Debug, Clone, Copy)]
pub enum DirectSize {
    TwoBytes = 2,
    FourBytes = 4,
}

#[derive(Debug, Clone, Copy, derive_more::Display)]
pub enum OpType {
    Live = 1,
    Ld,
    St,
    Add,
    Sub,
    And,
    Or,
    Xor,
    Zjmp,
    Ldi,
    Sti,
    Fork,
    Lld,
    Lldi,
    Lfork,
    Aff,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ParamType {
    Register,
    Direct,
    Indirect,
}

pub const T_REG: u8 = 1;
pub const T_DIR: u8 = 2;
pub const T_IND: u8 = 4;

pub const fn op_spec(op_type: OpType) -> OpSpec {
    use DirectSize::*;
    use OpType::*;

    let code = op_type as u8;

    match op_type {
        Live => OpSpec {
            code,
            cycles: 10,
            param_count: 1,
            param_masks: [T_DIR, 0, 0],
            has_pcb: false,
            dir_size: FourBytes,
        },
        Ld => OpSpec {
            code,
            cycles: 5,
            param_count: 2,
            param_masks: [T_DIR | T_IND, T_REG, 0],
            has_pcb: true,
            dir_size: FourBytes,
        },
        St => OpSpec {
            code,
            cycles: 5,
            param_count: 2,
            param_masks: [T_REG, T_REG | T_IND, 0],
            has_pcb: true,
            dir_size: FourBytes,
        },
        Add => OpSpec {
            code,
            cycles: 10,
            param_count: 3,
            param_masks: [T_REG, T_REG, T_REG],
            has_pcb: true,
            dir_size: FourBytes,
        },
        Sub => OpSpec {
            code,
            cycles: 10,
            param_count: 3,
            param_masks: [T_REG, T_REG, T_REG],
            has_pcb: true,
            dir_size: FourBytes,
        },
        And => OpSpec {
            code,
            cycles: 6,
            param_count: 3,
            param_masks: [T_REG | T_DIR | T_IND, T_REG | T_DIR | T_IND, T_REG],
            has_pcb: true,
            dir_size: FourBytes,
        },
        Or => OpSpec {
            code,
            cycles: 6,
            param_count: 3,
            param_masks: [T_REG | T_DIR | T_IND, T_REG | T_DIR | T_IND, T_REG],
            has_pcb: true,
            dir_size: FourBytes,
        },
        Xor => OpSpec {
            code,
            cycles: 6,
            param_count: 3,
            param_masks: [T_REG | T_DIR | T_IND, T_REG | T_DIR | T_IND, T_REG],
            has_pcb: true,
            dir_size: FourBytes,
        },
        Zjmp => OpSpec {
            code,
            cycles: 20,
            param_count: 1,
            param_masks: [T_DIR, 0, 0],
            has_pcb: false,
            dir_size: TwoBytes,
        },
        Ldi => OpSpec {
            code,
            cycles: 25,
            param_count: 3,
            param_masks: [T_REG | T_DIR | T_IND, T_REG | T_DIR, T_REG],
            has_pcb: true,
            dir_size: TwoBytes,
        },
        Sti => OpSpec {
            code,
            cycles: 25,
            param_count: 3,
            param_masks: [T_REG, T_REG | T_DIR | T_IND, T_REG | T_DIR],
            has_pcb: true,
            dir_size: TwoBytes,
        },
        Fork => OpSpec {
            code,
            cycles: 800,
            param_count: 1,
            param_masks: [T_DIR, 0, 0],
            has_pcb: false,
            dir_size: TwoBytes,
        },
        Lld => OpSpec {
            code,
            cycles: 10,
            param_count: 2,
            param_masks: [T_DIR | T_IND, T_REG, 0],
            has_pcb: true,
            dir_size: FourBytes,
        },
        Lldi => OpSpec {
            code,
            cycles: 50,
            param_count: 3,
            param_masks: [T_REG | T_DIR | T_IND, T_REG | T_DIR, T_REG],
            has_pcb: true,
            dir_size: TwoBytes,
        },
        Lfork => OpSpec {
            code,
            cycles: 1000,
            param_count: 1,
            param_masks: [T_DIR, 0, 0],
            has_pcb: false,
            dir_size: TwoBytes,
        },
        Aff => OpSpec {
            code,
            cycles: 2,
            param_count: 1,
            param_masks: [T_REG, 0, 0],
            has_pcb: true,
            dir_size: FourBytes,
        },
    }
}
