use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ChampionInfo {
    pub process_count: u32,
    pub last_live: u32,
}
