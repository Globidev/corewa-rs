macro_rules! sample {
    ($name:literal) => { &include_bytes!(concat!("samples/", $name, ".asm"))[..] }
}

mod lexer;
mod parser;
mod assembler;
