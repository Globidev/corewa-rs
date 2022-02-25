use super::{
    assembler::{Champion, ParsedInstruction},
    types::*,
};
use crate::spec::*;

use std::{
    collections::{hash_map::Entry, HashMap},
    io::{Error as IOError, Seek, SeekFrom, Write},
};

type CompileResult<T> = Result<T, CompileError>;

pub fn compile_champion(out: impl Write + Seek, mut champion: Champion) -> CompileResult<usize> {
    let mut state = State::new(out)?;

    for instr in champion.instructions.drain(..) {
        match instr {
            ParsedInstruction::Op(op) => state.write_op(op)?,
            ParsedInstruction::Label(label) => state.register_label(label)?,
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

    macro_rules! pcb {
        ($p1:expr) => {
            $p1.param_code() << 6
        };
        ($p1:expr, $p2:expr) => {
            $p1.param_code() << 6 | $p2.param_code() << 4
        };
        ($p1:expr, $p2:expr, $p3:expr) => {
            $p1.param_code() << 6 | $p2.param_code() << 4 | $p3.param_code() << 2
        };
    }

    match op {
        Ld(di, r) => pcb!(di, r),
        St(r, ri) => pcb!(r, ri),
        Add(r1, r2, r3) => pcb!(r1, r2, r3),
        Sub(r1, r2, r3) => pcb!(r1, r2, r3),
        And(a1, a2, r) => pcb!(a1, a2, r),
        Or(a1, a2, r) => pcb!(a1, a2, r),
        Xor(a1, a2, r) => pcb!(a1, a2, r),
        Ldi(a, rd, r) => pcb!(a, rd, r),
        Sti(r, a, rd) => pcb!(r, a, rd),
        Lld(di, r) => pcb!(di, r),
        Lldi(a, rd, r) => pcb!(a, rd, r),
        Aff(r) => pcb!(r),

        _ => unreachable!("has_pcb invariant broken!"),
    }
}

fn op_spec(op: &Op) -> OpSpec {
    use Op::*;

    let op_type = match op {
        Live(..) => OpType::Live,
        Ld(..) => OpType::Ld,
        St(..) => OpType::St,
        Add(..) => OpType::Add,
        Sub(..) => OpType::Sub,
        And(..) => OpType::And,
        Or(..) => OpType::Or,
        Xor(..) => OpType::Xor,
        Zjmp(..) => OpType::Zjmp,
        Ldi(..) => OpType::Ldi,
        Sti(..) => OpType::Sti,
        Fork(..) => OpType::Fork,
        Lld(..) => OpType::Lld,
        Lldi(..) => OpType::Lldi,
        Lfork(..) => OpType::Lfork,
        Aff(..) => OpType::Aff,
    };

    crate::spec::op_spec(op_type)
}

struct State<W> {
    out: W,
    size: usize,
    label_positions: HashMap<String, usize>,
    labels_to_fill: Vec<LabelPlaceholder>,
    current_op_pos: usize,
}

impl<W: Write + Seek> State<W> {
    fn new(mut out: W) -> CompileResult<Self> {
        out.seek(SeekFrom::Start(HEADER_SIZE as u64))?;
        Ok(Self {
            out,
            size: 0,
            label_positions: HashMap::new(),
            labels_to_fill: Vec::new(),
            current_op_pos: 0,
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
            }
            Entry::Vacant(entry) => {
                entry.insert(self.size);
                Ok(())
            }
        }
    }

    fn add_raw_code(&mut self, bytes: &[u8]) -> CompileResult<()> {
        self.write(bytes)
    }

    fn resolve_labels(&mut self) -> CompileResult<()> {
        for placeholder in &self.labels_to_fill {
            let position = *self
                .label_positions
                .get(&placeholder.name)
                .ok_or_else(|| CompileError::MissingLabel(placeholder.name.clone()))?;
            self.out.seek(SeekFrom::Start(
                (HEADER_SIZE + placeholder.write_pos) as u64,
            ))?;
            write_numeric(
                &mut self.out,
                ((position as isize) - (placeholder.op_pos as isize)) as u32,
                placeholder.size,
            )?;
        }

        Ok(())
    }

    fn write(&mut self, buf: &[u8]) -> CompileResult<()> {
        self.out.write_all(buf)?;
        self.size += buf.len();
        Ok(())
    }

    fn write_op(&mut self, op: Op) -> CompileResult<()> {
        let OpSpec {
            code,
            has_pcb,
            dir_size,
            ..
        } = op_spec(&op);

        self.current_op_pos = self.size;

        if has_pcb {
            self.write(&[code, pcb(&op)])?;
        } else {
            self.write(&[code])?;
        }

        self.write_params(op, dir_size)
    }

    fn write_params(&mut self, op: Op, dir_size: DirectSize) -> CompileResult<()> {
        use Op::*;

        macro_rules! w {
            (di:$di:expr) => { self.write_di($di, dir_size)? };
            (ri:$ri:expr) => { self.write_ri($ri)? };
            (rd:$rd:expr) => { self.write_rd($rd, dir_size)? };
            (reg:$reg:expr) => { self.write_reg($reg)? };
            (dir:$dir:expr) => { self.write_dir($dir, dir_size)? };
            (any:$any:expr) => { self.write_any($any, dir_size)? };
            ($($typ:tt:$exp:expr),*) => {{ $(w!($typ:$exp));* }}
        }

        match op {
            Live(d) => w!(dir: d),
            Ld(di, r) => w!(di: di, reg: r),
            St(r, ri) => w!(reg: r, ri: ri),
            Add(r1, r2, r3) => w!(reg: r1, reg: r2, reg: r3),
            Sub(r1, r2, r3) => w!(reg: r1, reg: r2, reg: r3),
            And(a1, a2, r) => w!(any: a1, any: a2, reg: r),
            Or(a1, a2, r) => w!(any: a1, any: a2, reg: r),
            Xor(a1, a2, r) => w!(any: a1, any: a2, reg: r),
            Zjmp(d) => w!(dir: d),
            Ldi(a, rd, r) => w!(any: a, rd: rd, reg: r),
            Sti(r, a, rd) => w!(reg: r, any: a, rd: rd),
            Fork(d) => w!(dir: d),
            Lld(di, r) => w!(di: di, reg: r),
            Lldi(a, rd, r) => w!(any: a, rd: rd, reg: r),
            Lfork(d) => w!(dir: d),
            Aff(r) => w!(reg: r),
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
                    size: dir_size as _,
                });
                self.write(match dir_size {
                    DirectSize::TwoBytes => &[0; 2],
                    DirectSize::FourBytes => &[0; 4],
                })
            }
            Direct::Numeric(n) => {
                self.size += write_numeric(&mut self.out, n as u32, dir_size as _)?;
                Ok(())
            }
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
            }
            Indirect::Numeric(n) => {
                self.size += write_numeric(&mut self.out, n as u32, IND_SIZE)?;
                Ok(())
            }
        }
    }

    fn write_rd(&mut self, rd: RegDir, dir_size: DirectSize) -> CompileResult<()> {
        match rd {
            RegDir::Reg(reg) => self.write_reg(reg),
            RegDir::Dir(dir) => self.write_dir(dir, dir_size),
        }
    }

    fn write_ri(&mut self, ri: RegInd) -> CompileResult<()> {
        match ri {
            RegInd::Reg(reg) => self.write_reg(reg),
            RegInd::Ind(ind) => self.write_ind(ind),
        }
    }

    fn write_di(&mut self, di: DirInd, dir_size: DirectSize) -> CompileResult<()> {
        match di {
            DirInd::Dir(dir) => self.write_dir(dir, dir_size),
            DirInd::Ind(ind) => self.write_ind(ind),
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

fn write_numeric(mut out: impl Write, n: u32, write_size: usize) -> CompileResult<usize> {
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
    size: usize,
}

const IND_SIZE: usize = 2;

impl Header {
    fn from_champion(champion: &Champion, prog_size: u32) -> CompileResult<Self> {
        let mut prog_name = [0; PROG_NAME_LENGTH + 1];
        let name = champion.name.as_bytes();
        prog_name
            .get_mut(..name.len())
            .ok_or(CompileError::ProgramNameTooLong(name.len()))?
            .copy_from_slice(name);

        let mut prog_comment = [0; PROG_COMMENT_LENGTH + 1];
        let comment = champion.comment.as_bytes();
        prog_comment
            .get_mut(..comment.len())
            .ok_or(CompileError::ProgramCommentTooLong(comment.len()))?
            .copy_from_slice(comment);

        Ok(Self {
            magic: COREWAR_MAGIC,
            prog_size,
            prog_name,
            prog_comment,
        })
    }

    fn write_packed_bytes(&self, mut out: impl Write) -> Result<(), IOError> {
        let magic_bytes = self.magic.to_be_bytes();
        let prog_size_bytes = self.prog_size.to_be_bytes();

        let parts = [
            &magic_bytes[..],
            &self.prog_name,
            &prog_size_bytes,
            &self.prog_comment,
        ];

        for part in &parts {
            out.write_all(part)?;
        }

        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CompileError {
    #[error(
        "The champion's name is too long: {0} bytes (maximum allowed is {})",
        PROG_COMMENT_LENGTH
    )]
    ProgramNameTooLong(usize),
    #[error(
        "The champion's comment is too long: {0} bytes (maximum allowed is {})",
        PROG_COMMENT_LENGTH
    )]
    ProgramCommentTooLong(usize),
    #[error(
        "The label '{0}' is missing. It is referenced in a parameter but has never been declared"
    )]
    MissingLabel(String),
    #[error("The label '{0}' has been declared multiple times. A label can only be declared once")]
    DuplicateLabel(String),
    #[error(
        "The champion's code is too big: {0} bytes (maximum allowed is {})",
        CHAMP_MAX_SIZE
    )]
    ProgramTooLong(usize),
    #[error("Unexpected IO error: {0}")]
    IOError(#[from] IOError),
}
