mod lexer;
// mod parser;

use std::io::{Read, BufRead, BufReader};

pub fn do_stuff(input: impl Read) {
    BufReader::new(input)
        .lines()
        .for_each(|lr| {
            let input = lr.expect("read fail");
            let toks = lexer::Tokenizer::new(&input);
            for tok_result in toks {
                match tok_result {
                    Ok(tok) => print!("{:?}({}) ", tok.term, &input[tok.range]),
                    Err(e) => print!("{:?} ", e)
                }
            }
            print!("\n");
        })
}
