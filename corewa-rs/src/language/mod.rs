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
    let numbered_lines = BufReader::new(input).lines().zip(1..);
    let mut champ_builder = ChampionBuilder::default();

    for (line_result, line_no) in numbered_lines {
        let parsed_line =
            parse_line(&line_result?).map_err(|e| ReadError::ParseError(e, line_no))?;

        champ_builder.assemble(parsed_line)?;
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

#[derive(Debug, From, Display)]
pub enum ReadError {
    IOError(IOError),
    #[display(fmt = "Parse error on line {}: {}", _1, _0)]
    ParseError(ParseError, usize),
    AssembleError(AssembleError),
}

#[derive(Debug, From, Display)]
pub enum WriteError {
    IOError(IOError),
    CompileError(CompileError),
}
