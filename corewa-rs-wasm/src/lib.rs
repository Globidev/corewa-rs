// #[wasm_bindgen] currently triggers this lint
#![allow(clippy::unused_unit)]

pub mod champion;
pub mod decoder;
pub mod language;
pub mod memory;
pub mod process;
pub mod vm;

mod utils;

#[wasm_bindgen::prelude::wasm_bindgen(start)]
pub fn main() {
    utils::set_panic_hook();
}
