use crate::spec::*;
use super::types::*;
use super::wrapping_array::WrappingArray;

use std::{iter, mem};
use byteorder::{ByteOrder, BigEndian};

pub struct Memory {
    values: WrappingArray<u8>,
    ages: WrappingArray<u16>,
    owners: WrappingArray<PlayerId>
}

impl Default for Memory {
    fn default() -> Self {
        Self {
            values: iter::repeat(0).take(MEM_SIZE).collect(),
            ages: iter::repeat(1024).take(MEM_SIZE).collect(),
            owners: iter::repeat(0).take(MEM_SIZE).collect()
        }
    }
}

impl Memory {
    pub fn size(&self) -> usize {
        MEM_SIZE
    }

    pub fn values_ptr(&self) -> *const u8 {
        self.values.as_ptr()
    }

    pub fn ages_ptr(&self) -> *const u16 {
        self.ages.as_ptr()
    }

    pub fn owners_ptr(&self) -> *const PlayerId {
        self.owners.as_ptr()
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
                self[addr + 3]
            ])
        } else {
            BigEndian::read_i32(&self.values.as_slice()[addr..addr+4])
        }
    }

    pub fn read_i16(&self, addr: usize) -> i16 {
        if addr > MEM_SIZE - mem::size_of::<i16>() {
            i16::from_be_bytes([
                self[addr + 0],
                self[addr + 1]
            ])
        } else {
            BigEndian::read_i16(&self.values.as_slice()[addr..addr+2])
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

#[cfg(test)]
mod test {
    extern crate test;
    use super::*;

    #[bench]
    fn i32_reads(bencher: &mut test::Bencher) {
        let mut mem = Memory::default();

        mem.values.iter_mut().for_each(|x| *x = rand::random());

        bencher.iter(|| {
            (0..MEM_SIZE).fold(0, |h, idx| h ^ mem.read_i32(idx))
        })
    }

    #[bench]
    fn i16_reads(bencher: &mut test::Bencher) {
        let mut mem = Memory::default();

        mem.values.iter_mut().for_each(|x| *x = rand::random());

        bencher.iter(move || {
            (0..MEM_SIZE).fold(0, |h, idx| h ^ mem.read_i16(idx))
        })
    }
}
