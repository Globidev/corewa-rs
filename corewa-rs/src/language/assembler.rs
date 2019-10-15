use super::parser::ParsedLine;
use super::types::*;

#[derive(Debug)]
pub struct Champion {
    pub name: String,
    pub comment: String,
    pub instructions: Vec<ParsedInstruction>
}

#[derive(Default)]
pub struct ChampionBuilder {
    name: Option<String>,
    comment: Option<String>,
    instructions: Vec<ParsedInstruction>
}

pub fn assemble_line(builder: ChampionBuilder, parsed_line: ParsedLine)
    -> Result<ChampionBuilder, AssembleError>
{
    use ParsedLine::*;

    match parsed_line {
        ChampionName(name)       => builder.with_name(name),
        ChampionComment(comment) => builder.with_comment(comment),
        Code(bytes)              => Ok(builder.add_bytes(bytes)),

        Op(op)                => Ok(builder.add_op(op)),
        Label(label)          => Ok(builder.add_label(label)),
        LabelAndOp(label, op) => Ok(builder.add_label(label).add_op(op)),

        Empty => Ok(builder),
    }
}

impl ChampionBuilder {
    fn with_name(self, name: String) -> Result<Self, AssembleError> {
        match self.name {
            Some(name) => Err(AssembleError::NameAlreadySet(name)),
            None       => Ok(Self { name: Some(name), ..self })
        }
    }

    fn with_comment(self, comment: String) -> Result<Self, AssembleError> {
        match self.comment {
            Some(comment) => Err(AssembleError::CommentAlreadySet(comment)),
            None          => Ok(Self { comment: Some(comment), ..self })
        }
    }

    fn add_bytes(mut self, bytes: Vec<u8>) -> Self {
        self.instructions.push(ParsedInstruction::RawCode(bytes));
        self
    }

    fn add_label(mut self, label: String) -> Self {
        self.instructions.push(ParsedInstruction::Label(label));
        self
    }

    fn add_op(mut self, op: Op) -> Self {
        self.instructions.push(ParsedInstruction::Op(op));
        self
    }

    pub fn finish(self) -> Result<Champion, AssembleError> {
        match (self.name, self.comment) {
            (None, _) => Err(AssembleError::MissingName),
            (_, None) => Err(AssembleError::MissingComment),
            (Some(name), Some(comment)) => Ok(Champion {
                name, comment, instructions: self.instructions
            })
        }
    }
}

#[derive(Debug)]
pub enum ParsedInstruction {
    Label(String),
    Op(Op),
    RawCode(Vec<u8>)
}

#[derive(Debug, Display)]
pub enum AssembleError {
    #[display(fmt = "Duplicate '.name' directive: the champion was already named '{}'", _0)]
    NameAlreadySet(String),
    #[display(fmt = "Duplicate '.comment' directive: the champion already had a comment '{}'", _0)]
    CommentAlreadySet(String),
    #[display(fmt = "The champion is missing a '.name' directive")]
    MissingName,
    #[display(fmt = "The champion is missing a '.comment' directive")]
    MissingComment,
}
