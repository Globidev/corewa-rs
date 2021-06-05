#![allow(clippy::identity_op)]

use super::{types::*, wrapping_array::WrappingArray};
use crate::spec::*;

use byteorder::{BigEndian, ByteOrder};
use std::{iter, mem};

pub struct Memory {
    pub values: WrappingArray<u8>,
    pub ages: WrappingArray<u16>,
    pub owners: WrappingArray<PlayerId>,
}

impl Default for Memory {
    fn default() -> Self {
        Self {
            values: iter::repeat(0).take(MEM_SIZE).collect(),
            ages: iter::repeat(1024).take(MEM_SIZE).collect(),
            owners: iter::repeat(0).take(MEM_SIZE).collect(),
        }
    }
}

impl Memory {
    pub fn size(&self) -> usize {
        MEM_SIZE
    }

    pub fn tick(&mut self) {
        for age in self.ages.iter_mut() {
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
            BigEndian::read_i32(&self.values.as_slice()[addr..addr + 4])
        }
    }

    pub fn read_i16(&self, addr: usize) -> i16 {
        if addr > MEM_SIZE - mem::size_of::<i16>() {
            i16::from_be_bytes([self[addr + 0], self[addr + 1]])
        } else {
            BigEndian::read_i16(&self.values.as_slice()[addr..addr + 2])
        }
    }

    pub fn write_i32(&mut self, value: i32, owner: PlayerId, at: usize) {
        let value_as_bytes = value.to_be_bytes();

        self.write(at, &value_as_bytes, owner)
    }
}

use std::ops::Index;

impl Index<usize> for Memory {
    type Output = u8;

    fn index(&self, index: usize) -> &u8 {
        self.values.index(index)
    }
}

impl super::decoder::Read for Memory {
    fn read_i16(&self, at: usize) -> i16 {
        self.read_i16(at)
    }

    fn read_i32(&self, at: usize) -> i32 {
        self.read_i32(at)
    }
}
