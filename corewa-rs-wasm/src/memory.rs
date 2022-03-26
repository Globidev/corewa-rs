use wasm_bindgen::prelude::*;

use corewa_rs::vm::memory::Owner;

#[wasm_bindgen]
pub struct Memory {
    pub values_ptr: *const u8,
    pub ages_ptr: *const u16,
    pub owners_ptr: *const Owner,
    pub pc_count_ptr: *const u32,
}
