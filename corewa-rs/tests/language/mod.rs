macro_rules! sample {
    ($name:literal) => {
        &include_bytes!(concat!("samples/", $name, ".asm"))[..]
    };
}

mod assembler;
mod lexer;
mod parser;
