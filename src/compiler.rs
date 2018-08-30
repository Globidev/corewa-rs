use types::*;
use assembler::{Champion, ParsedInstruction};

use std::io::{Write, Seek, SeekFrom, Result as IOResult};
use std::mem;

use std::collections::HashMap;

pub fn write_champion<W: Write + Seek>(out: &mut W, champion: &Champion)
    -> Result<usize, CompileError>
{
    let mut state = State::new(out);

    for instr in &champion.instructions {
        match instr {
            ParsedInstruction::Op(op)       => { state.write_op(op); },
            ParsedInstruction::Label(label) => state.register_label(label)
        }
    }

    state.write_header(champion);
    state.resolve_labels();

    Ok(0)
}

fn ocp(op: &Op) -> u8 {
    use self::Op::*;

    let combine2 = |a, b|    a << 6 | b << 4;
    let combine3 = |a, b, c| a << 6 | b << 4 | c << 2;

    let rd_code = |rd| match rd {
        &RegDir::Dir (..) => DIR_PARAM_CODE,
        &RegDir::Reg (..) => REG_PARAM_CODE,
    };

    let ri_code = |ri| match ri {
        &RegInd::Reg (..) => REG_PARAM_CODE,
        &RegInd::Ind (..) => IND_PARAM_CODE,
    };

    let di_code = |di| match di {
        &DirInd::Dir (..) => DIR_PARAM_CODE,
        &DirInd::Ind (..) => IND_PARAM_CODE,
    };

    let any_code = |any| match any {
        &AnyParam::Reg (..) => REG_PARAM_CODE,
        &AnyParam::Dir (..) => DIR_PARAM_CODE,
        &AnyParam::Ind (..) => IND_PARAM_CODE,
    };

    match op {
        Ld    ( di,   _        ) => combine2(di_code(di),    REG_PARAM_CODE                ),
        St    ( _,    ri       ) => combine2(REG_PARAM_CODE, ri_code(ri)                   ),
        Add   ( _,    _,    _  ) => combine3(REG_PARAM_CODE, REG_PARAM_CODE, REG_PARAM_CODE),
        Sub   ( _,    _,    _  ) => combine3(REG_PARAM_CODE, REG_PARAM_CODE, REG_PARAM_CODE),
        And   ( any1, any2, _  ) => combine3(any_code(any1), any_code(any2), REG_PARAM_CODE),
        Or    ( any1, any2, _  ) => combine3(any_code(any1), any_code(any2), REG_PARAM_CODE),
        Xor   ( any1, any2, _  ) => combine3(any_code(any1), any_code(any2), REG_PARAM_CODE),
        Ldi   ( any,  rd,   _  ) => combine3(any_code(any),  rd_code(rd),    REG_PARAM_CODE),
        Sti   ( _,    any,  rd ) => combine3(REG_PARAM_CODE, any_code(any),  rd_code(rd)   ),
        Lld   ( di,   _        ) => combine2(di_code(di),    REG_PARAM_CODE                ),
        Lldi  ( any,  rd,    _ ) => combine3(any_code(any),  rd_code(rd),    REG_PARAM_CODE),
        Aff   ( _              ) => REG_PARAM_CODE << 6,

        _ => unreachable!("has_ocp invariant broken!")
    }
}

struct OpAttributes {
    code: u8,
    has_ocp: bool,
    dir_size: u8
}

fn op_attribute(op: &Op) -> OpAttributes {
    use self::Op::*;

    match op {
        Live  (..) => OpAttributes { code: 1,  has_ocp: false, dir_size: 4 },
        Ld    (..) => OpAttributes { code: 2,  has_ocp: true,  dir_size: 4 },
        St    (..) => OpAttributes { code: 3,  has_ocp: true,  dir_size: 4 },
        Add   (..) => OpAttributes { code: 4,  has_ocp: true,  dir_size: 4 },
        Sub   (..) => OpAttributes { code: 5,  has_ocp: true,  dir_size: 4 },
        And   (..) => OpAttributes { code: 6,  has_ocp: true,  dir_size: 4 },
        Or    (..) => OpAttributes { code: 7,  has_ocp: true,  dir_size: 4 },
        Xor   (..) => OpAttributes { code: 8,  has_ocp: true,  dir_size: 4 },
        Zjmp  (..) => OpAttributes { code: 9,  has_ocp: false, dir_size: 2 },
        Ldi   (..) => OpAttributes { code: 10, has_ocp: true,  dir_size: 2 },
        Sti   (..) => OpAttributes { code: 11, has_ocp: true,  dir_size: 2 },
        Fork  (..) => OpAttributes { code: 12, has_ocp: false, dir_size: 2 },
        Lld   (..) => OpAttributes { code: 13, has_ocp: true,  dir_size: 4 },
        Lldi  (..) => OpAttributes { code: 14, has_ocp: true,  dir_size: 2 },
        Lfork (..) => OpAttributes { code: 15, has_ocp: false, dir_size: 2 },
        Aff   (..) => OpAttributes { code: 16, has_ocp: true,  dir_size: 4 },
    }
}

struct State<W> {
    out: W,
    size: usize,
    label_positions: HashMap<String, usize>,
    labels_to_fill: Vec<LabelPlaceholder>,
    current_op_pos: usize
}

impl<W: Write + Seek> State<W> {
    fn new(mut out: W) -> Self {
        out.seek(SeekFrom::Start(mem::size_of::<Header>() as u64));
        Self {
            out,
            size: 0,
            label_positions: HashMap::new(),
            labels_to_fill: Vec::new(),
            current_op_pos: 0
        }
    }

    fn write_header(&mut self, champion: &Champion) {
        // eprintln!("{:?}", self.size);
        // eprintln!("{:?}", self.size as u32);
        let header = Header::new(champion, self.size as u32).expect("TODO: err handling");

        // eprintln!("{:?}", &header.prog_name[0..129]);

        let header_data = {
            let raw_header = &header as *const Header;
            let header_len = mem::size_of::<Header>();
            unsafe { ::std::slice::from_raw_parts(raw_header as *const u8, header_len) }
        };

        self.out.seek(SeekFrom::Start(0));
        self.out.write(header_data);
    }

    fn register_label(&mut self, label: &str) {
        self.label_positions.insert(String::from(label), self.size);
    }

    fn resolve_labels(&mut self) {
        // eprintln!("{:?}", self.labels_to_fill);
        // eprintln!("{:?}", self.label_positions);
        for placeholder in &self.labels_to_fill {
            let position = *self.label_positions.get(&placeholder.name).expect("TODO: err");
            self.out.seek(SeekFrom::Start((mem::size_of::<Header>() + placeholder.write_pos) as u64));
            // self.write_numeric(position as u32, placeholder.size as u8);
            // eprintln!("{:?} {:?} {:?}", position, placeholder.op_pos, ((position as isize) - (placeholder.op_pos as isize)) as u32);
            let as_be = (((position as isize) - (placeholder.op_pos as isize)) as u32).to_be() >> (4 - placeholder.size) * 8;
            let as_array: [u8; 4] = unsafe { mem::transmute(as_be) };
            self.out.write(&as_array[..placeholder.size]);
        }
    }

    fn write(&mut self, buf: &[u8]) -> IOResult<usize> {
        let written = self.out.write(buf)?;
        self.size += written;
        Ok(written)
    }

    fn write_op(&mut self, op: &Op) -> Result<usize, CompileError> {
        let OpAttributes { code, has_ocp, dir_size } = op_attribute(op);

        self.current_op_pos = self.size;

        if has_ocp { self.write(&[code, ocp(op)]); }
        else       { self.write(&[code]); }

        self.write_params(&op, dir_size)
    }

    fn write_params(&mut self, op: &Op, dir_size: u8)
        -> Result<usize, CompileError>
    {
        use self::Op::*;

        let r = match op {
            Live  ( dir                 ) => self.write_dir(dir, dir_size),
            Ld    ( di,   reg           ) => {
                self.write_di(di, dir_size);
                self.write_reg(reg);
            },
            St    ( reg, ri             ) => {
                self.write_reg(reg);
                self.write_ri(ri);
            },
            Add   ( reg1, reg2, reg3 ) => {
                self.write_reg(reg1);
                self.write_reg(reg2);
                self.write_reg(reg3);
            },
            Sub   ( reg1, reg2, reg3 ) => {
                self.write_reg(reg1);
                self.write_reg(reg2);
                self.write_reg(reg3);
            },
            And   ( any1, any2, reg ) => {
                self.write_any(any1, dir_size);
                self.write_any(any2, dir_size);
                self.write_reg(reg);
            },
            Or    ( any1, any2, reg ) => {
                self.write_any(any1, dir_size);
                self.write_any(any2, dir_size);
                self.write_reg(reg);
            },
            Xor   ( any1, any2, reg ) => {
                self.write_any(any1, dir_size);
                self.write_any(any2, dir_size);
                self.write_reg(reg);
            },
            Zjmp  ( dir                       ) => {
                self.write_dir(dir, dir_size)
            },
            Ldi   ( any, rd,   reg ) => {
                self.write_any(any, dir_size);
                self.write_rd(rd, dir_size);
                self.write_reg(reg);
            },
            Sti   ( reg, any, rd   ) => {
                self.write_reg(reg);
                self.write_any(any, dir_size);
                self.write_rd(rd, dir_size);
            },
            Fork  ( dir                       ) => {
                self.write_dir(dir, dir_size)
            },
            Lld   ( di,   reg           ) => {
                self.write_di(di, dir_size);
                self.write_reg(reg);
            },
            Lldi  ( any, rd,   reg ) => {
                self.write_any(any, dir_size);
                self.write_rd(rd, dir_size);
                self.write_reg(reg);
            },
            Lfork ( dir                       ) => {
                self.write_dir(dir, dir_size);
            },
            Aff   ( reg                     ) => {
                self.write_reg(reg);
            },
        };

        Ok(0)
    }

    fn write_reg(&mut self, reg: &Register) {
        self.write(&[reg.0]);
    }

    fn write_dir(&mut self, dir: &Direct, size: u8) {
        match dir {
            Direct::Label(label) => {
                self.labels_to_fill.push(LabelPlaceholder {
                    write_pos: self.size,
                    op_pos: self.current_op_pos,
                    name: label.clone(),
                    size: size as usize,
                });
                self.write(&::std::iter::repeat(0).take(size as usize).collect::<Vec<_>>());
            },
            Direct::Numeric(n)   => self.write_numeric(*n as u32, size),
        }
    }

    fn write_ind(&mut self, ind: &Indirect) {
        match ind {
            Indirect::Label(label) => {
                self.labels_to_fill.push(LabelPlaceholder {
                    write_pos: self.size,
                    op_pos: self.current_op_pos,
                    name: label.clone(),
                    size: IND_SIZE as usize,
                });
                self.write(&[0, 0]);
            },
            Indirect::Numeric(n)   => self.write_numeric(*n as u32, IND_SIZE),
        }
    }

    fn write_rd(&mut self, rd: &RegDir, size: u8) {
        match rd {
            RegDir::Reg(reg) => self.write_reg(reg),
            RegDir::Dir(dir) => self.write_dir(dir, size)
        }
    }

    fn write_ri(&mut self, ri: &RegInd) {
        match ri {
            RegInd::Reg(reg) => self.write_reg(reg),
            RegInd::Ind(ind) => self.write_ind(ind)
        }
    }

    fn write_di(&mut self, di: &DirInd, size: u8) {
        match di {
            DirInd::Dir(dir) => self.write_dir(dir, size),
            DirInd::Ind(ind) => self.write_ind(ind)
        }
    }

    fn write_any(&mut self, any: &AnyParam, size: u8) {
        match any {
            AnyParam::Reg(reg) => self.write_reg(reg),
            AnyParam::Dir(dir) => self.write_dir(dir, size),
            AnyParam::Ind(ind) => self.write_ind(ind),
        }
    }

    fn write_numeric(&mut self, n: u32, size: u8) {
        let as_be = n.to_be() >> (4 - size) * 8;
        let as_array: [u8; 4] = unsafe { mem::transmute(as_be) };
        self.write(&as_array[..size as usize]);
    }
}

#[derive(Debug)]
struct LabelPlaceholder {
    write_pos: usize,
    op_pos: usize,
    name: String,
    size: usize
}

const COREWAR_MAGIC: u32 = 0x00EA83F3;
const PROG_NAME_LENGTH: usize = 128;
const PROG_COMMENT_LENGTH: usize = 2048;

const REG_PARAM_CODE: u8 = 1;
const DIR_PARAM_CODE: u8 = 2;
const IND_PARAM_CODE: u8 = 3;

const REG_SIZE: u8 = 1;
const IND_SIZE: u8 = 2;

type ProgName = [u8; PROG_NAME_LENGTH + 1];
type ProgComment = [u8; PROG_COMMENT_LENGTH + 1];

#[repr(C)]
struct Header {
    magic: u32,
    prog_name: ProgName,
    prog_size: u32,
    prog_comment: ProgComment,
}

impl Header {
    fn new(champion: &Champion, prog_size: u32)
        -> Result<Self, CompileError>
    {
        let mut header: Self = unsafe { mem::zeroed() };

        header.magic = COREWAR_MAGIC.to_be();
        header.prog_size = prog_size.to_be();

        let name = champion.name.as_bytes();
        header.prog_name.get_mut(..name.len())
            .ok_or_else(|| CompileError::ProgramNameTooLong(name.len()))?
            .copy_from_slice(name);

        let comment = champion.comment.as_bytes();
        header.prog_comment.get_mut(..comment.len())
            .ok_or_else(|| CompileError::ProgramCommentTooLong(comment.len()))?
            .copy_from_slice(comment);

        Ok(header)
    }
}

#[derive(Debug)]
pub enum CompileError {
    ProgramNameTooLong(usize),
    ProgramCommentTooLong(usize)
}