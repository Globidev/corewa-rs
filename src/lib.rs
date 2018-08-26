#![feature(fnbox)]

mod lexer;
mod parser;
mod types;

use std::io::Read;

pub fn do_stuff(input: impl Read) -> Result<parser::ParsedChampion, parser::ParseError> {
    // BufReader::new(input)
    //     .lines()
    //     .for_each(|lr| {
    //         let input = lr.expect("read fail");
    //         let toks = lexer::Tokenizer::new(&input);
    //         for tok_result in toks {
    //             match tok_result {
    //                 Ok(tok) => print!("{:?}({}) ", tok.term, &input[tok.range]),
    //                 Err(e) => print!("{:?} ", e)
    //             }
    //         }
    //         print!("\n");
    //     })
    parser::parse(input)
}
