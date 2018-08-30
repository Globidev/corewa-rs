mod types;
mod lexer;
mod parser;
mod assembler;
mod compiler;

use std::io::{Read, BufRead, BufReader, Error as IOError};

use parser::{parse_line, ParseError};
use assembler::{ChampionBuilder, Champion, AssembleError, assemble_line};
use compiler::write_champion;

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

pub fn dump_champion(champion: Champion) {
    use std::io::*;

    let mut seek_vec = Cursor::new(Vec::with_capacity(8192));
    write_champion(&mut seek_vec, &champion);
    stdout().write_all(&seek_vec.into_inner());
}


#[derive(Debug)]
pub enum ReadError {
    IOError(IOError),
    ParseError(ParseError, usize),
    AssembleError(AssembleError),
}
