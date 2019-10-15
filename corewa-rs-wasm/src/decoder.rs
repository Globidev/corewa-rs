use corewa_rs::vm::types::*;
use corewa_rs::vm::memory::Memory;
use corewa_rs::vm::decoder::{Decode, InvalidOpCode, InstrDecodeError};
use corewa_rs::spec::*;

use wasm_bindgen::prelude::*;

use std::fmt;

#[wasm_bindgen]
pub struct DecodeResult(Result<Instruction, DecodeError>);

#[wasm_bindgen]
impl DecodeResult {
    pub fn byte_size(&self) -> usize {
        self.0.as_ref().map(|instr| instr.byte_size)
            .unwrap_or_else(DecodeError::byte_size)
    }

    pub fn to_string(&self) -> String {
        self.0.as_ref().map(ToString::to_string)
            .unwrap_or_else(ToString::to_string)
    }
}

impl DecodeResult {
    pub fn read(memory: &Memory, idx: usize) -> Self {
        DecodeResult(DecodeResult::read_result(memory, idx))
    }

    fn read_result(memory: &Memory, idx: usize) -> Result<Instruction, DecodeError> {
        let op = memory.decode_op(idx)
            .map_err(DecodeError::InvalidOp)?;

        memory.decode_instr(op, idx)
            .map_err(|err| DecodeError::OpOnly(op, err))
    }
}

enum DecodeError {
    OpOnly(OpType, InstrDecodeError),
    InvalidOp(InvalidOpCode)
}

impl DecodeError {
    fn byte_size(&self) -> usize {
        match self {
            DecodeError::OpOnly(..) => 1,
            DecodeError::InvalidOp(..) => 0
        }
    }
}

impl fmt::Display for DecodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DecodeError::OpOnly(op, err) => write!(f, "{} [{}]", op, err),
            DecodeError::InvalidOp(err) => write!(f, "{}", err)
        }
    }
}
