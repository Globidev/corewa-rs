use wasm_bindgen::prelude::*;

use crate::vm::types::{Player, PlayerId};

#[wasm_bindgen]
pub struct PlayerInfo {
    pub id: PlayerId,
    pub champion_size: usize,
    champion_name: String,
    champion_comment: String,
}

impl PlayerInfo {
    pub fn from_player(player: &Player) -> Self {
        Self {
            id: player.id,
            champion_size: player.size,
            champion_name: player.name.clone(),
            champion_comment: player.comment.clone(),
        }
    }
}

#[wasm_bindgen]
impl PlayerInfo {
    pub fn champion_name(&self) -> String {
        self.champion_name.clone()
    }

    pub fn champion_comment(&self) -> String {
        self.champion_comment.clone()
    }
}
