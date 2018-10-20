mod assembler;
mod compiler;
mod lexer;
mod parser;
mod types;

use self::assembler::{ChampionBuilder, Champion, AssembleError, assemble_line};
use self::compiler::{CompileError, compile_champion};
use self::parser::{ParseError, parse_line};

pub use self::parser::error_range;

use std::io::{Read, Write, BufRead, BufReader, Cursor, Error as IOError};

pub fn read_champion(input: impl Read)
    -> Result<assembler::Champion, ReadError>
{
    let mut parsed_lines = BufReader::new(input)
        .lines()
        .enumerate()
        .map(|(line_no, read_result)| {
            let line = read_result
                .map_err(ReadError::IOError)?;

            parse_line(&line)
                .map_err(|e| ReadError::ParseError(e, line_no + 1))
        });

    let champion_assembler = parsed_lines
        .try_fold(ChampionBuilder::default(), |builder, line_result| {
            line_result.and_then(|parsed_line| {
                assemble_line(builder, parsed_line)
                    .map_err(ReadError::AssembleError)
            })
        })?;

    champion_assembler.finish()
        .map_err(ReadError::AssembleError)
}

pub fn write_champion(mut output: impl Write, champion: &Champion)
    -> Result<(), WriteError>
{
    let mut seek_vec = Cursor::new(Vec::with_capacity(8192));

    compile_champion(&mut seek_vec, &champion)
        .map_err(WriteError::CompileError)?;

    output.write_all(&seek_vec.into_inner())
        .map_err(WriteError::IOError)
}

#[derive(Debug)]
pub enum ReadError {
    IOError(IOError),
    ParseError(ParseError, usize),
    AssembleError(AssembleError),
}

#[derive(Debug)]
pub enum WriteError {
    IOError(IOError),
    CompileError(CompileError),
}
