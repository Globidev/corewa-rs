use spec::{MEM_SIZE, IDX_MOD};
use super::types::OffsetType;
use std::convert::From;
use std::ops::Deref;

#[derive(Debug, Default)]
pub struct ProgramCounter(usize);

fn mem_offset(at: usize, offset: isize) -> usize {
    (at as isize + offset + MEM_SIZE as isize) as usize % MEM_SIZE
}

impl ProgramCounter {
    pub fn advance(&mut self, offset: isize) {
        self.0 = mem_offset(self.0, offset);
    }

    pub fn offset(&self, offset: isize, offset_type: OffsetType) -> usize {
        let reach = match offset_type {
            OffsetType::Limited => IDX_MOD,
            OffsetType::Long    => MEM_SIZE
        };
        let offset = offset % reach as isize;
        mem_offset(self.0, offset)
    }
}

impl From<usize> for ProgramCounter {
    fn from(offset: usize) -> Self {
        ProgramCounter(offset)
    }
}

impl Deref for ProgramCounter {
    type Target = usize;

    fn deref(&self) -> &usize {
        &self.0
    }
}
