pub mod assembler;
pub mod compiler;
pub mod lexer;
pub mod parser;
pub mod types;

pub use parser::error_range;

use assembler::{AssembleError, Champion, ChampionBuilder};
use compiler::{compile_champion, CompileError};
use parser::{parse_line, ParseError};

use std::io::{BufRead, BufReader, Cursor, Error as IOError, Read, Write};

pub fn read_champion(input: impl Read) -> Result<Champion, ReadError> {
    let mut reader = BufReader::new(input);
    let mut buffer = String::with_capacity(128);
    let mut line_no = 1;

    let mut champ_builder = ChampionBuilder::default();

    while reader.read_line(&mut buffer)? > 0 {
        let parsed_line = parse_line(&buffer).map_err(|e| ReadError::ParseError(e, line_no))?;
        champ_builder.assemble(parsed_line)?;
        line_no += 1;
        buffer.clear();
    }

    Ok(champ_builder.finish()?)
}

pub fn write_champion(mut output: impl Write, champion: Champion) -> Result<usize, WriteError> {
    let mut seek_vec = Cursor::new(Vec::with_capacity(8192));

    compile_champion(&mut seek_vec, champion)?;

    let data = seek_vec.get_ref();
    output.write_all(data)?;
    Ok(data.len())
}

#[derive(Debug, thiserror::Error)]
pub enum ReadError {
    #[error("IO error while reading champion: {0}")]
    IOError(#[from] IOError),
    #[error("Parse error on line {1}: {0}")]
    ParseError(ParseError, usize),
    #[error("Error assembling champion: {0}")]
    AssembleError(#[from] AssembleError),
}

#[derive(Debug, thiserror::Error)]
pub enum WriteError {
    #[error("IO error while writing champion: {0}")]
    IOError(#[from] IOError),
    #[error("Error compiling champion: {0}")]
    CompileError(#[from] CompileError),
}
