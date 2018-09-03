use super::types::*;
use super::assembler::{Champion, ParsedInstruction};
use spec::{self, Header};

use std::io::{Write, Seek, SeekFrom, Error as IOError};
use std::mem;

use std::collections::HashMap;

type CompileResult<T> = Result<T, CompileError>;

pub fn compile_champion<W: Write + Seek>(out: &mut W, champion: &Champion)
    -> CompileResult<usize>
{
    let mut state = State::new(out)?;

    for instr in &champion.instructions {
        match instr {
            ParsedInstruction::Op(op)       => state.write_op(op)?,
            ParsedInstruction::Label(label) => state.register_label(label)?
        }
    }

    state.write_header(champion)?;
    state.resolve_labels()?;

    Ok(state.size)
}

fn ocp(op: &Op) -> u8 {
    use self::Op::*;
    use spec::{REG_PARAM_CODE, DIR_PARAM_CODE, IND_PARAM_CODE};

    let combine1 = |a|       a << 6;
    let combine2 = |a, b|    a << 6 | b << 4;
    let combine3 = |a, b, c| a << 6 | b << 4 | c << 2;

    let rd_code = |rd| match rd {
        &RegDir::Dir (..) => DIR_PARAM_CODE,
        RegDir::Reg (..) => REG_PARAM_CODE,
    };

    let ri_code = |ri| match ri {
        &RegInd::Reg (..) => REG_PARAM_CODE,
        RegInd::Ind (..) => IND_PARAM_CODE,
    };

    let di_code = |di| match di {
        &DirInd::Dir (..) => DIR_PARAM_CODE,
        DirInd::Ind (..) => IND_PARAM_CODE,
    };

    let any_code = |any| match any {
        &AnyParam::Reg (..) => REG_PARAM_CODE,
        AnyParam::Dir (..) => DIR_PARAM_CODE,
        AnyParam::Ind (..) => IND_PARAM_CODE,
    };

    match op {
        Ld    ( di,   _        ) => combine2(di_code(di),    REG_PARAM_CODE,               ),
        St    ( _,    ri       ) => combine2(REG_PARAM_CODE, ri_code(ri),                  ),
        Add   ( _,    _,    _  ) => combine3(REG_PARAM_CODE, REG_PARAM_CODE, REG_PARAM_CODE),
        Sub   ( _,    _,    _  ) => combine3(REG_PARAM_CODE, REG_PARAM_CODE, REG_PARAM_CODE),
        And   ( any1, any2, _  ) => combine3(any_code(any1), any_code(any2), REG_PARAM_CODE),
        Or    ( any1, any2, _  ) => combine3(any_code(any1), any_code(any2), REG_PARAM_CODE),
        Xor   ( any1, any2, _  ) => combine3(any_code(any1), any_code(any2), REG_PARAM_CODE),
        Ldi   ( any,  rd,   _  ) => combine3(any_code(any),  rd_code(rd),    REG_PARAM_CODE),
        Sti   ( _,    any,  rd ) => combine3(REG_PARAM_CODE, any_code(any),  rd_code(rd)   ),
        Lld   ( di,   _        ) => combine2(di_code(di),    REG_PARAM_CODE,               ),
        Lldi  ( any,  rd,    _ ) => combine3(any_code(any),  rd_code(rd),    REG_PARAM_CODE),
        Aff   ( _              ) => combine1(REG_PARAM_CODE,                               ),

        _ => unreachable!("has_ocp invariant broken!")
    }
}

struct OpAttributes {
    code: u8,
    has_ocp: bool,
    dir_size: usize
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
    fn new(mut out: W) -> CompileResult<Self> {
        out.seek(SeekFrom::Start(mem::size_of::<Header>() as u64))?;
        Ok(Self {
            out,
            size: 0,
            label_positions: HashMap::new(),
            labels_to_fill: Vec::new(),
            current_op_pos: 0
        })
    }

    fn write_header(&mut self, champion: &Champion) -> CompileResult<()> {
        let header = Header::new(champion, self.size as u32)?;

let header_data = {
    let raw_header = &header as *const Header;
    let header_len = mem::size_of::<Header>();
    unsafe { ::std::slice::from_raw_parts(raw_header as *const u8, header_len) }
};

        self.out.seek(SeekFrom::Start(0))?;
        self.out.write_all(header_data)?;

        Ok(())
    }

    fn register_label(&mut self, label: &str) -> CompileResult<()> {
        self.label_positions.insert(String::from(label), self.size)
            .map(|_| Err(CompileError::DuplicateLabel(String::from(label))))
            .unwrap_or_else(|| Ok(()))
    }

    fn resolve_labels(&mut self) -> CompileResult<()> {
        for placeholder in &self.labels_to_fill {
            let position = *self.label_positions.get(&placeholder.name)
                .ok_or_else(|| CompileError::MissingLabel(placeholder.name.clone()))?;
            self.out.seek(SeekFrom::Start((mem::size_of::<spec::Header>() + placeholder.write_pos) as u64))?;
            write_numeric(&mut self.out, ((position as isize) - (placeholder.op_pos as isize)) as u32, placeholder.size)?;
        }

        Ok(())
    }

    fn write(&mut self, buf: &[u8]) -> CompileResult<()> {
        self.size += self.out.write(buf)?;
        Ok(())
    }

    fn write_op(&mut self, op: &Op) -> CompileResult<()> {
        let OpAttributes { code, has_ocp, dir_size } = op_attribute(op);

        self.current_op_pos = self.size;

        if has_ocp { self.write(&[code, ocp(op)])?; }
        else       { self.write(&[code])?; }

        self.write_params(&op, dir_size)
    }

    fn write_params(&mut self, op: &Op, size: usize) -> CompileResult<()> {
        use self::Op::*;

        match op {
            Live  ( dir,             ) => { self.write_dir(dir, size)?                                                         },
            Ld    ( di,   reg,       ) => { self.write_di(di, size)?;    self.write_reg(reg)?                                  },
            St    ( reg,  ri,        ) => { self.write_reg(reg)?;        self.write_ri(ri)?                                    },
            Add   ( reg1, reg2, reg3 ) => { self.write_reg(reg1)?;       self.write_reg(reg2)?;       self.write_reg(reg3)?    },
            Sub   ( reg1, reg2, reg3 ) => { self.write_reg(reg1)?;       self.write_reg(reg2)?;       self.write_reg(reg3)?    },
            And   ( any1, any2, reg  ) => { self.write_any(any1, size)?; self.write_any(any2, size)?; self.write_reg(reg)?     },
            Or    ( any1, any2, reg  ) => { self.write_any(any1, size)?; self.write_any(any2, size)?; self.write_reg(reg)?     },
            Xor   ( any1, any2, reg  ) => { self.write_any(any1, size)?; self.write_any(any2, size)?; self.write_reg(reg)?     },
            Zjmp  ( dir,             ) => { self.write_dir(dir, size)?;                                                        },
            Ldi   ( any,  rd,   reg  ) => { self.write_any(any, size)?;  self.write_rd(rd, size)?;    self.write_reg(reg)?     },
            Sti   ( reg,  any,  rd   ) => { self.write_reg(reg)?;        self.write_any(any, size)?;  self.write_rd(rd, size)? },
            Fork  ( dir,             ) => { self.write_dir(dir, size)?                                                         },
            Lld   ( di,   reg,       ) => { self.write_di(di, size)?;    self.write_reg(reg)?                                  },
            Lldi  ( any,  rd,   reg  ) => { self.write_any(any, size)?;  self.write_rd(rd, size)?;    self.write_reg(reg)?     },
            Lfork ( dir,             ) => { self.write_dir(dir, size)?                                                         },
            Aff   ( reg,             ) => { self.write_reg(reg)?                                                               },
        };

        Ok(())
    }

    fn write_reg(&mut self, reg: &Register) -> CompileResult<()> {
        self.write(&[reg.0])
    }

    fn write_dir(&mut self, dir: &Direct, size: usize) -> CompileResult<()> {
        match dir {
            Direct::Label(label) => {
                self.labels_to_fill.push(LabelPlaceholder {
                    write_pos: self.size,
                    op_pos: self.current_op_pos,
                    name: label.clone(),
                    size: size,
                });
                self.write(&::std::iter::repeat(0).take(size).collect::<Vec<_>>())
            },
            Direct::Numeric(n)   => {
                self.size += write_numeric(&mut self.out, *n as u32, size)?;
                Ok(())
            },
        }
    }

    fn write_ind(&mut self, ind: &Indirect) -> CompileResult<()> {
        match ind {
            Indirect::Label(label) => {
                self.labels_to_fill.push(LabelPlaceholder {
                    write_pos: self.size,
                    op_pos: self.current_op_pos,
                    name: label.clone(),
                    size: IND_SIZE,
                });
                self.write(&[0, 0])
            },
            Indirect::Numeric(n)   => {
                self.size += write_numeric(&mut self.out, *n as u32, IND_SIZE)?;
                Ok(())
            }
        }
    }

    fn write_rd(&mut self, rd: &RegDir, size: usize) -> CompileResult<()> {
        match rd {
            RegDir::Reg(reg) => self.write_reg(reg),
            RegDir::Dir(dir) => self.write_dir(dir, size)
        }
    }

    fn write_ri(&mut self, ri: &RegInd) -> CompileResult<()> {
        match ri {
            RegInd::Reg(reg) => self.write_reg(reg),
            RegInd::Ind(ind) => self.write_ind(ind)
        }
    }

    fn write_di(&mut self, di: &DirInd, size: usize) -> CompileResult<()> {
        match di {
            DirInd::Dir(dir) => self.write_dir(dir, size),
            DirInd::Ind(ind) => self.write_ind(ind)
        }
    }

    fn write_any(&mut self, any: &AnyParam, size: usize) -> CompileResult<()> {
        match any {
            AnyParam::Reg(reg) => self.write_reg(reg),
            AnyParam::Dir(dir) => self.write_dir(dir, size),
            AnyParam::Ind(ind) => self.write_ind(ind),
        }
    }
}

fn write_numeric(out: &mut impl Write, n: u32, size: usize)
    -> CompileResult<usize>
{
    let as_be = n.to_be() >> ((4 - size) * 8);
    let as_array: [u8; 4] = unsafe { mem::transmute(as_be) };

    Ok(out.write(&as_array[..size])?)
}

#[derive(Debug)]
struct LabelPlaceholder {
    write_pos: usize,
    op_pos: usize,
    name: String,
    size: usize
}

const IND_SIZE: usize = 2;

impl Header {
    fn new(champion: &Champion, prog_size: u32)-> CompileResult<Self> {
        let mut header: Self = unsafe { mem::zeroed() };

        header.magic = spec::COREWAR_MAGIC.to_be();
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
    ProgramCommentTooLong(usize),
    MissingLabel(String),
    DuplicateLabel(String),
    IOError(IOError),
}

impl From<IOError> for CompileError {
    fn from(err: IOError) -> Self {
        CompileError::IOError(err)
    }
}
