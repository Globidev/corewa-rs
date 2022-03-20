use corewa_rs::vm::{types::*, VirtualMachine as VMImpl};

use super::{
    champion::ChampionInfo, decoder::DecodeResult, memory::Memory, process::ProcessCollection,
};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct VirtualMachine(VMImpl);

#[wasm_bindgen]
impl VirtualMachine {
    pub fn cycles(&self) -> u32 {
        self.0.cycles
    }

    pub fn last_live_check(&self) -> u32 {
        self.0.last_live_check
    }

    pub fn check_interval(&self) -> u32 {
        self.0.check_interval
    }

    pub fn live_count_since_last_check(&self) -> u32 {
        self.0.live_count_since_last_check
    }

    pub fn checks_without_cycle_decrement(&self) -> u32 {
        self.0.checks_without_cycle_decrement
    }

    pub fn tick(&mut self) -> bool {
        self.0.tick();
        self.0.processes.is_empty()
    }

    pub fn process_count(&self) -> usize {
        self.0.processes.len()
    }

    pub fn player_count(&self) -> usize {
        self.0.players.len()
    }

    pub fn champion_info(&self, player_id: PlayerId) -> ChampionInfo {
        ChampionInfo {
            process_count: *self
                .0
                .process_count_by_player_id
                .get(&player_id)
                .unwrap_or(&0),
            last_live: *self.0.last_lives.get(&player_id).unwrap_or(&0),
        }
    }

    pub fn processes_at(&self, idx: usize) -> ProcessCollection {
        let cell_processes = self.0.processes.iter().filter(|p| p.pc.addr() == idx);

        cell_processes.collect()
    }

    pub fn decode(&self, idx: usize) -> DecodeResult {
        DecodeResult::read(&self.0.memory, idx)
    }

    pub fn memory(&self) -> Memory {
        let mem = &self.0.memory;

        Memory {
            values_ptr: mem.values.as_ptr(),
            ages_ptr: mem.ages.as_ptr(),
            owners_ptr: mem.owners.as_ptr(),
            pc_count_ptr: self.0.process_count_per_cells.as_ptr(),
        }
    }
}

#[wasm_bindgen]
pub struct VMBuilder {
    players: Vec<(PlayerId, Vec<u8>)>,
}

#[wasm_bindgen]
impl VMBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            players: Vec::with_capacity(4),
        }
    }

    pub fn with_player(mut self, player_id: PlayerId, champion: Vec<u8>) -> VMBuilder {
        self.players.push((player_id, champion));
        self
    }

    pub fn finish(self) -> VirtualMachine {
        let mut vm = VMImpl::new();
        vm.load_players(&self.players);
        VirtualMachine(vm)
    }
}

impl Default for VMBuilder {
    fn default() -> Self {
        Self::new()
    }
}
