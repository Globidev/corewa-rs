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

pub const REG_PARAM_CODE: u8 = 1;
pub const DIR_PARAM_CODE: u8 = 2;
pub const IND_PARAM_CODE: u8 = 3;

pub const MAX_PLAYERS: usize = 4;

pub const MEM_SIZE: usize = 4096;
pub const IDX_MOD: usize = MEM_SIZE / 8;
pub const CHAMP_MAX_SIZE: usize = MEM_SIZE / 6;

pub const CYCLE_TO_DIE: u32 = 1536;
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
    pub has_ocp: bool,
    pub dir_size: DirectSize
}

#[derive(Debug)]
pub enum DirectSize {
    TwoBytes,
    FourBytes
}

#[derive(Debug, Clone, Copy)]
pub enum OpType {
    Live = 1, Ld, St, Add, Sub, And, Or, Xor, Zjmp, Ldi, Sti, Fork, Lld, Lldi,
    Lfork, Aff,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ParamType {
    Register, Direct, Indirect
}

pub const T_REG: u8 = 1;
pub const T_DIR: u8 = 2;
pub const T_IND: u8 = 4;

impl From<OpType> for OpSpec {
    fn from(op_type: OpType) -> Self {
        use self::OpType::*;
        use self::DirectSize::*;

        let code = op_type as u8;

        match op_type {
            Live =>  Self { code,  cycles: 10,   param_count: 1, param_masks: [T_DIR,             0,                 0          ], has_ocp: false, dir_size: FourBytes },
            Ld =>    Self { code,  cycles: 5,    param_count: 2, param_masks: [T_DIR|T_IND,       T_REG,             0          ], has_ocp: true,  dir_size: FourBytes },
            St =>    Self { code,  cycles: 5,    param_count: 2, param_masks: [T_REG,             T_REG|T_IND,       0          ], has_ocp: true,  dir_size: FourBytes },
            Add =>   Self { code,  cycles: 10,   param_count: 3, param_masks: [T_REG,             T_REG,             T_REG      ], has_ocp: true,  dir_size: FourBytes },
            Sub =>   Self { code,  cycles: 10,   param_count: 3, param_masks: [T_REG,             T_REG,             T_REG      ], has_ocp: true,  dir_size: FourBytes },
            And =>   Self { code,  cycles: 6,    param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG      ], has_ocp: true,  dir_size: FourBytes },
            Or =>    Self { code,  cycles: 6,    param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG      ], has_ocp: true,  dir_size: FourBytes },
            Xor =>   Self { code,  cycles: 6,    param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG      ], has_ocp: true,  dir_size: FourBytes },
            Zjmp =>  Self { code,  cycles: 20,   param_count: 1, param_masks: [T_DIR,             0,                 0          ], has_ocp: false, dir_size: TwoBytes },
            Ldi =>   Self { code,  cycles: 25,   param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR,       T_REG      ], has_ocp: true,  dir_size: TwoBytes },
            Sti =>   Self { code,  cycles: 25,   param_count: 3, param_masks: [T_REG,             T_REG|T_DIR|T_IND, T_REG|T_DIR], has_ocp: true,  dir_size: TwoBytes },
            Fork =>  Self { code,  cycles: 800,  param_count: 1, param_masks: [T_DIR,             0,                 0          ], has_ocp: false, dir_size: TwoBytes },
            Lld =>   Self { code,  cycles: 10,   param_count: 2, param_masks: [T_DIR|T_IND,       T_REG,             0          ], has_ocp: true,  dir_size: FourBytes },
            Lldi =>  Self { code,  cycles: 50,   param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR,       T_REG      ], has_ocp: true,  dir_size: TwoBytes },
            Lfork => Self { code,  cycles: 1000, param_count: 1, param_masks: [T_DIR,             0,                 0          ], has_ocp: false, dir_size: TwoBytes },
            Aff =>   Self { code,  cycles: 2,    param_count: 1, param_masks: [T_REG,             0,                 0          ], has_ocp: true,  dir_size: FourBytes },
        }
    }
}
