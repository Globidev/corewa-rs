use super::{parser::ParsedLine, types::Op};

#[derive(Debug)]
pub struct Champion {
    pub name: String,
    pub comment: String,
    pub instructions: Vec<ParsedInstruction>,
}

#[derive(Default)]
pub struct ChampionBuilder {
    name: Option<String>,
    comment: Option<String>,
    instructions: Vec<ParsedInstruction>,
}

impl ChampionBuilder {
    fn with_name(&mut self, name: String) -> AssembleResult<&mut Self> {
        match self.name.take() {
            Some(name) => Err(AssembleError::NameAlreadySet(name)),
            None => {
                self.name = Some(name);
                Ok(self)
            }
        }
    }

    fn with_comment(&mut self, comment: String) -> AssembleResult<&mut Self> {
        match self.comment.take() {
            Some(comment) => Err(AssembleError::CommentAlreadySet(comment)),
            None => {
                self.comment = Some(comment);
                Ok(self)
            }
        }
    }

    fn add_instr(&mut self, instr_data: impl Into<ParsedInstruction>) -> &mut Self {
        self.instructions.push(instr_data.into());
        self
    }

    pub fn assemble(&mut self, parsed_line: ParsedLine) -> AssembleResult<&mut Self> {
        use ParsedLine::*;

        match parsed_line {
            ChampionName(name) => self.with_name(name),
            ChampionComment(comment) => self.with_comment(comment),

            Code(bytes) => Ok(self.add_instr(bytes)),
            Op(op) => Ok(self.add_instr(op)),
            Label(label) => Ok(self.add_instr(label)),
            LabelAndOp(label, op) => Ok(self.add_instr(label).add_instr(op)),

            Empty => Ok(self),
        }
    }

    pub fn finish(self) -> AssembleResult<Champion> {
        match (self.name, self.comment) {
            (None, _) => Err(AssembleError::MissingName),
            (_, None) => Err(AssembleError::MissingComment),
            (Some(name), Some(comment)) => Ok(Champion {
                name,
                comment,
                instructions: self.instructions,
            }),
        }
    }
}

type AssembleResult<T> = Result<T, AssembleError>;

#[derive(Debug, derive_more::From)]
pub enum ParsedInstruction {
    Label(String),
    Op(Op),
    RawCode(Vec<u8>),
}

#[derive(Debug, thiserror::Error)]
pub enum AssembleError {
    #[error("Duplicate '.name' directive: the champion was already named '{0}'")]
    NameAlreadySet(String),
    #[error("Duplicate '.comment' directive: the champion already had a comment '{0}'")]
    CommentAlreadySet(String),
    #[error("The champion is missing a '.name' directive")]
    MissingName,
    #[error("The champion is missing a '.comment' directive")]
    MissingComment,
}
