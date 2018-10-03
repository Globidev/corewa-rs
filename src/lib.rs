mod spec;
mod language;
pub mod vm;
pub mod ui;

mod utils;


extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn vm_from_code(input: &str) -> vm::VirtualMachine {
    utils::set_panic_hook();

    let parsed_champion = language::read_champion(input.as_bytes())
        .expect("TODO: Read error");

    let mut byte_code = Vec::new();
    language::write_champion(&mut byte_code, &parsed_champion)
        .expect("TODO: Write error");

    let mut vm = vm::VirtualMachine::new();

    let players = [
        (1, byte_code.as_slice()),
        (2, byte_code.as_slice()),
        (3, byte_code.as_slice()),
        (4, byte_code.as_slice()),
    ];

    vm.load_players(&players[..]);
    vm
}
