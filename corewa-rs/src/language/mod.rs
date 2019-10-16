pub mod assembler;
pub mod compiler;
pub mod lexer;
pub mod parser;
pub mod types;

pub use parser::error_range;

use assembler::{ChampionBuilder, Champion, AssembleError};
use compiler::{CompileError, compile_champion};
use parser::{ParseError, parse_line};

use std::io::{Read, Write, BufRead, BufReader, Cursor, Error as IOError};

pub fn read_champion(input: impl Read) -> Result<Champion, ReadError> {
    let numbered_lines = BufReader::new(input).lines().zip(1..);
    let mut champ_builder = ChampionBuilder::default();

    for (line_result, line_no) in numbered_lines {
        let parsed_line = parse_line(&line_result?)
            .map_err(|e| ReadError::ParseError(e, line_no))?;

        champ_builder.assemble(parsed_line)?;
    }

    Ok(champ_builder.finish()?)
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
