use crate::spec::*;
use super::types::*;
use super::wrapping_array::WrappingArray;

pub struct Memory {
    values: WrappingArray<u8>,
    owners: WrappingArray<PlayerId>
}

impl Default for Memory {
    fn default() -> Self {
        Self {
            values: WrappingArray::with_size(MEM_SIZE),
            owners: WrappingArray::repeat(MEM_SIZE, -1)
        }
    }
}

impl Memory {
    pub fn size(&self) -> usize {
        MEM_SIZE
    }

    pub fn cell_values(&self) -> *const u8 {
        self.values.as_ptr()
    }

    pub fn cell_owners(&self) -> *const PlayerId {
        self.owners.as_ptr()
    }

    pub fn write(&mut self, at: usize, bytes: &[u8], owner: PlayerId) {
        for (i, byte) in bytes.iter().enumerate() {
            self.values[at + i] = *byte;
            self.owners[at + i] = owner
        }
    }

    pub fn read_i32(&self, addr: usize) -> i32 {
          (i32::from(self[addr    ]) << 24)
        + (i32::from(self[addr + 1]) << 16)
        + (i32::from(self[addr + 2]) << 8 )
        + (i32::from(self[addr + 3])      )
    }

    pub fn read_i16(&self, addr: usize) -> i16 {
          (i16::from(self[addr    ]) << 8)
        + (i16::from(self[addr + 1])     )
    }

    pub fn write_i32(&mut self, value: i32, owner: PlayerId, at: usize) {
        let value_as_bytes: [u8; 4] = unsafe { std::mem::transmute(value.to_be()) };

        for (i, byte) in value_as_bytes.iter().enumerate() {
            self.values[at + i] = *byte;
            self.owners[at + i] = owner;
        }
    }
}

use std::ops::Index;

impl Index<usize> for Memory {
    type Output = u8;

    fn index(&self, index: usize) -> &u8 {
        self.values.index(index % MEM_SIZE)
    }
}

impl super::decoder::Decodable for Memory {
    fn read_i16(&self, at: usize) -> i16 {
        self.read_i16(at)
    }

    fn read_i32(&self, at: usize) -> i32 {
        self.read_i32(at)
    }
}
