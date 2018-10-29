use crate::vm::VirtualMachine;
use crate::vm::types::*;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Default)]
pub struct VMBuilder {
    players: Vec<(PlayerId, Vec<u8>)>
}

#[wasm_bindgen]
impl VMBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Default::default()
    }

    pub fn with_player(mut self, player_id: PlayerId, champion: Vec<u8>) -> VMBuilder {
        self.players.push((player_id, champion));
        self
    }

    pub fn finish(self) -> VirtualMachine {
        let mut vm = VirtualMachine::new();
        vm.load_players(&self.players);
        vm
    }
}
