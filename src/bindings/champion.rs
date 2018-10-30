use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ChampionInfo {
    pub process_count: usize,
    pub last_live: u32
}
