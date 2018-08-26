use lexer::{Token, TokenResult};

fn parse_champion_name(tokens: &mut impl Iterator<Item = TokenResult>)
    -> Result<ParsedLine, LineError>
{
    if let Some(Ok(Token { term: Term::QuotedString, range })) = tokens.next() {
        Ok(ParsedLine::ChampionName("lol".to_string()))
    } else {
        Err(LineError::LexerError)
    }
}

fn parse_champion_comment(tokens: &mut impl Iterator<Item = TokenResult>)
    -> Result<ParsedLine, LineError>
{
    Err(LineError::LexerError)
}

fn parse_line(input: &str) -> Result<ParsedLine, LineError> {
    let mut tokens = lexer::Tokenizer::new(input);

    match tokens.next() {
        None => Ok(ParsedLine::Empty),
        Some(Err(e)) => Err(LineError::LexerError),
        Some(Ok(tok)) => {
            match tok.term {
                Term::ChampionNameCmd => parse_champion_name(&mut tokens),
                Term::ChampionCommentCmd => parse_champion_comment(&mut tokens),
                _ => Err(LineError::LexerError)
            }
        }
    }
}

use std::io::{Read, BufRead, BufReader};

pub fn parse(input: impl Read) -> Result<ParsedChampion, ParseError> {
    use self::ParsedLine::*;

    let mut parsed_lines = BufReader::new(input)
        .lines()
        .enumerate()
        .map(|(i, read_result)| {
            read_result
                .map_err(ParseError::IOError)
                .and_then(|s| parse_line(&s)
                    .map_err(|e| ParseError::LineError(e, i + 1))
                )
        });

    let builder = parsed_lines
        .try_fold(ParsedChampionBuilder::default(), |builder, line_result| {
            line_result.and_then(|parsed_line| {
                match parsed_line {
                    ChampionName(name) => builder.with_name(name),
                    ChampionComment(comment) => builder.with_comment(comment),
                    Label(label) => Ok(builder.add_instruction(ParsedInstruction::Label(label))),
                    LabelAndOp(label, op) => Ok(
                        builder
                            .add_instruction(ParsedInstruction::Label(label))
                            .add_instruction(ParsedInstruction::Op(op))
                    ),
                    Op(op) => Ok(builder.add_instruction(ParsedInstruction::Op(op))),
                    Empty => Ok(builder),
                }.map_err(ParseError::ChampionError)
            })
        })?;

    builder.finish()
        .map_err(ParseError::ChampionError)
}

#[derive(Debug)]
pub enum ParsedLine {
    ChampionName(String),
    ChampionComment(String),
    Label(String),
    LabelAndOp(String, Op),
    Op(Op),
    Empty,
}

#[derive(Debug)]
pub enum ParsedInstruction {
    Label(String),
    Op(Op),
}

#[derive(Debug)]
pub struct ParsedChampion {
    pub name: String,
    pub comment: String,
    pub instructions: Vec<ParsedInstruction>
}

#[derive(Default)]
struct ParsedChampionBuilder {
    name: Option<String>,
    comment: Option<String>,
    instructions: Vec<ParsedInstruction>
}

impl ParsedChampionBuilder {
    fn with_name(self, name: String) -> Result<Self, ChampionError> {
        match self.name {
            Some(name) => Err(ChampionError::NameAlreadySet(name)),
            None       => Ok(Self { name: Some(name), ..self })
        }
    }

    fn with_comment(self, comment: String) -> Result<Self, ChampionError> {
        match self.comment {
            Some(comment) => Err(ChampionError::CommentAlreadySet(comment)),
            None          => Ok(Self { comment: Some(comment), ..self })
        }
    }

    fn add_instruction(mut self, instr: ParsedInstruction) -> Self {
        self.instructions.push(instr);
        self
    }

    fn finish(self) -> Result<ParsedChampion, ChampionError> {
        match (self.name, self.comment) {
            (None, _) => Err(ChampionError::MissingName),
            (_, None) => Err(ChampionError::MissingComment),
            (Some(name), Some(comment)) => Ok(ParsedChampion {
                name, comment, instructions: self.instructions
            })
        }
    }
}

#[derive(Debug)]
pub enum ParseError {
    IOError(::std::io::Error),
    LineError(LineError, usize),
    ChampionError(ChampionError),
}

#[derive(Debug)]
pub enum ChampionError {
    NameAlreadySet(String),
    CommentAlreadySet(String),
    MissingName,
    MissingComment,
}
