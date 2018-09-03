pub const COREWAR_MAGIC: u32 = 0x00EA_83F3;

pub const PROG_NAME_LENGTH: usize = 128;
pub const PROG_COMMENT_LENGTH: usize = 2048;

pub type ProgName = [u8; PROG_NAME_LENGTH + 1];
pub type ProgComment = [u8; PROG_COMMENT_LENGTH + 1];

#[repr(C)]
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
    Live, Ld, St, Add, Sub, And, Or, Xor, Zjmp, Ldi, Sti, Fork, Lld, Lldi,
    Lfork, Aff,
}

#[derive(Debug, Clone, Copy)]
pub enum ParamType {
    Register, Direct, Indirect
}

pub const T_REG: u8 = 1;
pub const T_DIR: u8 = 2;
pub const T_IND: u8 = 4;

impl From<OpType> for OpSpec {
    fn from(op_type: OpType) -> Self {
        use self::OpType::*;

        match op_type {
            Live =>  Self { code:1,  cycles: 10,   param_count: 1, param_masks: [T_DIR,             0,                 0          ], has_ocp: false, dir_size: DirectSize::FourBytes },
            Ld =>    Self { code:2,  cycles: 5,    param_count: 2, param_masks: [T_DIR|T_IND,       T_REG,             0          ], has_ocp: true,  dir_size: DirectSize::FourBytes },
            St =>    Self { code:3,  cycles: 5,    param_count: 2, param_masks: [T_REG,             T_REG|T_IND,       0          ], has_ocp: true,  dir_size: DirectSize::FourBytes },
            Add =>   Self { code:4,  cycles: 10,   param_count: 3, param_masks: [T_REG,             T_REG,             T_REG      ], has_ocp: true,  dir_size: DirectSize::FourBytes },
            Sub =>   Self { code:5,  cycles: 10,   param_count: 3, param_masks: [T_REG,             T_REG,             T_REG      ], has_ocp: true,  dir_size: DirectSize::FourBytes },
            And =>   Self { code:6,  cycles: 6,    param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG      ], has_ocp: true,  dir_size: DirectSize::FourBytes },
            Or =>    Self { code:7,  cycles: 6,    param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG      ], has_ocp: true,  dir_size: DirectSize::FourBytes },
            Xor =>   Self { code:8,  cycles: 6,    param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG      ], has_ocp: true,  dir_size: DirectSize::FourBytes },
            Zjmp =>  Self { code:9,  cycles: 20,   param_count: 1, param_masks: [T_DIR,             0,                 0          ], has_ocp: false, dir_size: DirectSize::TwoBytes },
            Ldi =>   Self { code:10, cycles: 25,   param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR,       T_REG      ], has_ocp: true,  dir_size: DirectSize::TwoBytes },
            Sti =>   Self { code:11, cycles: 25,   param_count: 3, param_masks: [T_REG,             T_REG|T_DIR|T_IND, T_REG|T_DIR], has_ocp: true,  dir_size: DirectSize::TwoBytes },
            Fork =>  Self { code:12, cycles: 800,  param_count: 1, param_masks: [T_DIR,             0,                 0          ], has_ocp: false, dir_size: DirectSize::TwoBytes },
            Lld =>   Self { code:13, cycles: 10,   param_count: 2, param_masks: [T_DIR|T_IND,       T_REG,             0          ], has_ocp: true,  dir_size: DirectSize::FourBytes },
            Lldi =>  Self { code:14, cycles: 50,   param_count: 3, param_masks: [T_REG|T_DIR|T_IND, T_REG|T_DIR,       T_REG      ], has_ocp: true,  dir_size: DirectSize::TwoBytes },
            Lfork => Self { code:15, cycles: 1000, param_count: 1, param_masks: [T_DIR,             0,                 0          ], has_ocp: false, dir_size: DirectSize::TwoBytes },
            Aff =>   Self { code:16, cycles: 2,    param_count: 1, param_masks: [T_REG,             0,                 0          ], has_ocp: true,  dir_size: DirectSize::FourBytes },
        }
    }
}
