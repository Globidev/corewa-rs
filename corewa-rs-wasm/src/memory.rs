use wasm_bindgen::prelude::*;

use corewa_rs::vm::memory::{Owner, NO_OWNER};

#[wasm_bindgen]
pub struct Memory {
    pub values_ptr: *const u8,
    pub ages_ptr: *const u16,
    pub owners_ptr: *const Owner,
    pub pc_count_ptr: *const u32,
}

#[wasm_bindgen]
impl Memory {
    #[wasm_bindgen(js_name = unownedId)]
    pub fn unowned_id() -> Owner {
        NO_OWNER
    }
}
