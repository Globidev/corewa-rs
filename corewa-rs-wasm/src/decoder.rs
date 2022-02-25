use corewa_rs::{
    spec::*,
    vm::{
        decoder::{Decode, InstrDecodeError, InvalidOpCode},
        memory::Memory,
        types::*,
    },
};

use wasm_bindgen::prelude::*;

use std::fmt;

#[wasm_bindgen]
pub struct DecodeResult(Result<Instruction, DecodeError>);

#[wasm_bindgen]
impl DecodeResult {
    pub fn byte_size(&self) -> usize {
        self.0
            .as_ref()
            .map(|instr| instr.byte_size)
            .unwrap_or_else(DecodeError::byte_size)
    }

    #[allow(clippy::inherent_to_string)]
    pub fn to_string(&self) -> String {
        self.0
            .as_ref()
            .map(ToString::to_string)
            .unwrap_or_else(ToString::to_string)
    }
}

impl DecodeResult {
    pub fn read(memory: &Memory<MEM_SIZE>, idx: usize) -> Self {
        Self(Self::read_result(memory, idx))
    }

    fn read_result(memory: &Memory<MEM_SIZE>, idx: usize) -> Result<Instruction, DecodeError> {
        let op = memory.decode_op(idx).map_err(DecodeError::InvalidOp)?;

        memory
            .decode_instr(op, idx)
            .map_err(|err| DecodeError::OpOnly(op, err))
    }
}

enum DecodeError {
    OpOnly(OpType, InstrDecodeError),
    InvalidOp(InvalidOpCode),
}

impl DecodeError {
    fn byte_size(&self) -> usize {
        match self {
            Self::OpOnly(..) => 1,
            Self::InvalidOp(..) => 0,
        }
    }
}

impl fmt::Display for DecodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::OpOnly(op, err) => write!(f, "{} [{}]", op, err),
            Self::InvalidOp(err) => write!(f, "{}", err),
        }
    }
}
