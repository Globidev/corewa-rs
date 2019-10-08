pub mod assembler;
pub mod compiler;
pub mod lexer;
pub mod parser;
pub mod types;

use self::assembler::{ChampionBuilder, Champion, AssembleError, assemble_line};
use self::compiler::{CompileError, compile_champion};
use self::parser::{ParseError, parse_line};

pub use self::parser::error_range;

use std::io::{Read, Write, BufRead, BufReader, Cursor, Error as IOError};

pub fn read_champion(input: impl Read) -> Result<Champion, ReadError> {
    let mut parsed_lines = BufReader::new(input)
        .lines()
        .enumerate()
        .map(|(line_no, read_result)| {
            let line = read_result?;

            parse_line(&line)
                .map_err(|e| ReadError::ParseError(e, line_no + 1))
        });

    let champion_assembler = parsed_lines
        .try_fold(ChampionBuilder::default(), |builder, line_result| {
            let parsed_line = line_result?;

            Ok::<_, ReadError>(assemble_line(builder, parsed_line)?)
        })?;

    Ok(champion_assembler.finish()?)
}

pub fn write_champion(mut output: impl Write, champion: &Champion)
    -> Result<(), WriteError>
{
    let mut seek_vec = Cursor::new(Vec::with_capacity(8192));

    compile_champion(&mut seek_vec, &champion)?;

    Ok(output.write_all(&seek_vec.into_inner())?)
}

#[derive(Debug, From)]
pub enum ReadError {
    IOError(IOError),
    ParseError(ParseError, usize),
    AssembleError(AssembleError),
}

#[derive(Debug, From)]
pub enum WriteError {
    IOError(IOError),
    CompileError(CompileError),
}
