use crate::spec::*;
use super::types::*;
use super::assembler::{Champion, ParsedInstruction};

use std::collections::{HashMap, hash_map::Entry};
use std::io::{Write, Seek, SeekFrom, Error as IOError};

type CompileResult<T> = Result<T, CompileError>;

pub fn compile_champion(out: impl Write + Seek, mut champion: Champion)
    -> CompileResult<usize>
{
    let mut state = State::new(out)?;

    for instr in champion.instructions.drain(..) {
        match instr {
            ParsedInstruction::Op(op)         => state.write_op(op)?,
            ParsedInstruction::Label(label)   => state.register_label(label)?,
            ParsedInstruction::RawCode(bytes) => state.add_raw_code(&bytes)?,
        }
    }

    state.write_header(&champion)?;
    state.resolve_labels()?;

    if state.size > CHAMP_MAX_SIZE {
        Err(CompileError::ProgramTooLong(state.size))
    } else {
        Ok(state.size)
    }
}

fn pcb(op: &Op) -> u8 {
    use Op::*;

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

        _ => unreachable!("has_pcb invariant broken!")
    }
}

fn op_spec(op: &Op) -> OpSpec {
    use Op::*;

    let op_type = match op {
        Live  (..) => OpType::Live,
        Ld    (..) => OpType::Ld,
        St    (..) => OpType::St,
        Add   (..) => OpType::Add,
        Sub   (..) => OpType::Sub,
        And   (..) => OpType::And,
        Or    (..) => OpType::Or,
        Xor   (..) => OpType::Xor,
        Zjmp  (..) => OpType::Zjmp,
        Ldi   (..) => OpType::Ldi,
        Sti   (..) => OpType::Sti,
        Fork  (..) => OpType::Fork,
        Lld   (..) => OpType::Lld,
        Lldi  (..) => OpType::Lldi,
        Lfork (..) => OpType::Lfork,
        Aff   (..) => OpType::Aff,
    };

    OpSpec::from(op_type)
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
        out.seek(SeekFrom::Start(HEADER_SIZE as u64))?;
        Ok(Self {
            out,
            size: 0,
            label_positions: HashMap::new(),
            labels_to_fill: Vec::new(),
            current_op_pos: 0
        })
    }

    fn write_header(&mut self, champion: &Champion) -> CompileResult<()> {
        let header = Header::from_champion(champion, self.size as u32)?;

        self.out.seek(SeekFrom::Start(0))?;
        header.write_packed_bytes(&mut self.out)?;

        Ok(())
    }

    fn register_label(&mut self, label: String) -> CompileResult<()> {
        match self.label_positions.entry(label) {
            Entry::Occupied(entry) => {
                let (label, _) = entry.remove_entry();
                Err(CompileError::DuplicateLabel(label))
            },
            Entry::Vacant(entry) => {
                entry.insert(self.size);
                Ok(())
            }
        }
    }

    fn add_raw_code(&mut self, bytes: &[u8]) -> CompileResult<()> {
        self.write(&bytes)
    }

    fn resolve_labels(&mut self) -> CompileResult<()> {
        for placeholder in &self.labels_to_fill {
            let position = *self.label_positions.get(&placeholder.name)
                .ok_or_else(|| CompileError::MissingLabel(placeholder.name.clone()))?;
            self.out.seek(SeekFrom::Start((HEADER_SIZE + placeholder.write_pos) as u64))?;
            write_numeric(&mut self.out, ((position as isize) - (placeholder.op_pos as isize)) as u32, placeholder.size)?;
        }

        Ok(())
    }

    fn write(&mut self, buf: &[u8]) -> CompileResult<()> {
        self.out.write_all(buf)?;
        self.size += buf.len();
        Ok(())
    }

    fn write_op(&mut self, op: Op) -> CompileResult<()> {
        let OpSpec { code, has_pcb, dir_size, .. } = op_spec(&op);

        self.current_op_pos = self.size;

        if has_pcb { self.write(&[code, pcb(&op)])?; }
        else       { self.write(&[code])?; }

        let size = match dir_size {
            DirectSize::TwoBytes => 2,
            DirectSize::FourBytes => 4,
        };
        self.write_params(op, size)
    }

    fn write_params(&mut self, op: Op, size: usize) -> CompileResult<()> {
        use Op::*;

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

    fn write_reg(&mut self, reg: Register) -> CompileResult<()> {
        self.write(&[reg.0])
    }

    fn write_dir(&mut self, dir: Direct, dir_size: DirectSize) -> CompileResult<()> {
        match dir {
            Direct::Label(label) => {
                self.labels_to_fill.push(LabelPlaceholder {
                    write_pos: self.size,
                    op_pos: self.current_op_pos,
                    name: label,
                    size: dir_size.into(),
                });
                self.write(match dir_size {
                    DirectSize::TwoBytes => &[0; 2],
                    DirectSize::FourBytes => &[0; 4],
                })
            },
            Direct::Numeric(n) => {
                self.size += write_numeric(&mut self.out, n as u32, dir_size.into())?;
                Ok(())
            },
        }
    }

    fn write_ind(&mut self, ind: Indirect) -> CompileResult<()> {
        match ind {
            Indirect::Label(label) => {
                self.labels_to_fill.push(LabelPlaceholder {
                    write_pos: self.size,
                    op_pos: self.current_op_pos,
                    name: label,
                    size: IND_SIZE,
                });
                self.write(&[0, 0])
            },
            Indirect::Numeric(n) => {
                self.size += write_numeric(&mut self.out, n as u32, IND_SIZE)?;
                Ok(())
            }
        }
    }

    fn write_rd(&mut self, rd: RegDir, dir_size: DirectSize) -> CompileResult<()> {
        match rd {
            RegDir::Reg(reg) => self.write_reg(reg),
            RegDir::Dir(dir) => self.write_dir(dir, dir_size)
        }
    }

    fn write_ri(&mut self, ri: RegInd) -> CompileResult<()> {
        match ri {
            RegInd::Reg(reg) => self.write_reg(reg),
            RegInd::Ind(ind) => self.write_ind(ind)
        }
    }

    fn write_di(&mut self, di: DirInd, dir_size: DirectSize) -> CompileResult<()> {
        match di {
            DirInd::Dir(dir) => self.write_dir(dir, dir_size),
            DirInd::Ind(ind) => self.write_ind(ind)
        }
    }

    fn write_any(&mut self, any: AnyParam, dir_size: DirectSize) -> CompileResult<()> {
        match any {
            AnyParam::Reg(reg) => self.write_reg(reg),
            AnyParam::Dir(dir) => self.write_dir(dir, dir_size),
            AnyParam::Ind(ind) => self.write_ind(ind),
        }
    }
}

fn write_numeric(mut out: impl Write, n: u32, write_size: usize)
    -> CompileResult<usize>
{
    let truncated = n << ((4 - write_size) * 8);
    let be_bytes = truncated.to_be_bytes();
    let bytes_to_write = &be_bytes[..write_size];

    out.write_all(bytes_to_write)?;
    Ok(bytes_to_write.len())
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
    fn from_champion(champion: &Champion, prog_size: u32)-> CompileResult<Self> {
        let mut prog_name = [0; PROG_NAME_LENGTH + 1];
        let name = champion.name.as_bytes();
        prog_name.get_mut(..name.len())
            .ok_or_else(|| CompileError::ProgramNameTooLong(name.len()))?
            .copy_from_slice(name);

        let mut prog_comment = [0; PROG_COMMENT_LENGTH + 1];
        let comment = champion.comment.as_bytes();
        prog_comment.get_mut(..comment.len())
            .ok_or_else(|| CompileError::ProgramCommentTooLong(comment.len()))?
            .copy_from_slice(comment);

        Ok(Self {
            magic: COREWAR_MAGIC,
            prog_size,
            prog_name,
            prog_comment
        })
    }

    fn write_packed_bytes(&self, mut out: impl Write) -> Result<(), IOError> {
        let magic_bytes = self.magic.to_be_bytes();
        let prog_size_bytes = self.prog_size.to_be_bytes();

        let parts = [
            &magic_bytes[..],
            &self.prog_name,
            &prog_size_bytes,
            &self.prog_comment
        ];

        for part in &parts {
            out.write_all(part)?;
        }

        Ok(())
    }
}

#[derive(Debug, From, Display)]
pub enum CompileError {
    #[display(fmt = "The champion's name is too long: {} bytes (maximum allowed is {})", _0, PROG_NAME_LENGTH)]
    ProgramNameTooLong(usize),
    #[display(fmt = "The champion's comment is too long: {} bytes (maximum allowed is {})", _0, PROG_COMMENT_LENGTH)]
    ProgramCommentTooLong(usize),
    #[display(fmt = "The label '{}' is missing. It is referenced in a parameter but has never been declared", _0)]
    MissingLabel(String),
    #[display(fmt = "The label '{}' has been declared multiple times. A label can only be declared once", _0)]
    DuplicateLabel(String),
    #[display(fmt = "The champion's code is too big: {} bytes (maximum allowed is {})", _0, CHAMP_MAX_SIZE)]
    ProgramTooLong(usize),
    #[display(fmt = "Unexpected IO error: {}", _0)]
    IOError(IOError),
}
