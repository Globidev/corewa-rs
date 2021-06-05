#![allow(clippy::identity_op)]

use super::{types::*, wrapping_array::WrappingArray};
use crate::spec::*;

use byteorder::{BigEndian, ByteOrder};
use std::mem;

pub struct Memory<const LEN: usize> {
    pub values: WrappingArray<u8, LEN>,
    pub ages: WrappingArray<u16, LEN>,
    pub owners: WrappingArray<PlayerId, LEN>,
}

impl Default for Memory<MEM_SIZE> {
    fn default() -> Self {
        Self {
            values: [0; MEM_SIZE].into(),
            ages: [1024; MEM_SIZE].into(),
            owners: [0; MEM_SIZE].into(),
        }
    }
}

impl<const LEN: usize> Memory<LEN> {
    pub fn size(&self) -> usize {
        MEM_SIZE
    }

    pub fn tick(&mut self) {
        for age in self.ages.inner_mut() {
            *age = age.saturating_sub(1)
        }
    }

    pub fn write(&mut self, at: usize, bytes: &[u8], owner: PlayerId) {
        for (i, byte) in bytes.iter().enumerate() {
            self.values[at + i] = *byte;
            self.ages[at + i] = 1024;
            self.owners[at + i] = owner
        }
    }

    pub fn read_i32(&self, addr: usize) -> i32 {
        if addr > MEM_SIZE - mem::size_of::<i32>() {
            i32::from_be_bytes([
                self[addr + 0],
                self[addr + 1],
                self[addr + 2],
                self[addr + 3],
            ])
        } else {
            BigEndian::read_i32(&self.values.inner()[addr..addr + 4])
        }
    }

    pub fn read_i16(&self, addr: usize) -> i16 {
        if addr > MEM_SIZE - mem::size_of::<i16>() {
            i16::from_be_bytes([self[addr + 0], self[addr + 1]])
        } else {
            BigEndian::read_i16(&self.values.inner()[addr..addr + 2])
        }
    }

    pub fn write_i32(&mut self, value: i32, owner: PlayerId, at: usize) {
        let value_as_bytes = value.to_be_bytes();

        self.write(at, &value_as_bytes, owner)
    }
}

impl<const LEN: usize> std::ops::Index<usize> for Memory<LEN> {
    type Output = u8;

    fn index(&self, index: usize) -> &u8 {
        self.values.index(index)
    }
}

impl<const LEN: usize> super::decoder::Read for Memory<LEN> {
    fn read_i16(&self, at: usize) -> i16 {
        self.read_i16(at)
    }

    fn read_i32(&self, at: usize) -> i32 {
        self.read_i32(at)
    }
}
