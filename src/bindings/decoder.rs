use crate::vm::types::*;
use crate::vm::memory::Memory;
use crate::vm::decoder::{decode_op, decode_instr, InvalidOpCode, InstrDecodeError};
use crate::spec::*;

use wasm_bindgen::prelude::*;

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
        let op = decode_op(memory, idx)
            .map_err(DecodeError::InvalidOp)?;

        decode_instr(memory, op, idx)
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

use std::fmt;

impl fmt::Display for DecodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DecodeError::OpOnly(op, err) => write!(f, "{} [{}]", op, err),
            DecodeError::InvalidOp(err) => write!(f, "{}", err)
        }
    }
}

impl fmt::Display for Instruction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let spec = OpSpec::from(self.kind);
        write!(f, "{} {}", self.kind, self.params[0])?;
        for i in 1..spec.param_count {
            write!(f, ", {}", self.params[i])?;
        }
        Ok(())
    }
}

impl fmt::Display for OpType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use self::OpType::*;

        let mnemonic = match self {
            Live  => "live",
            Ld    => "ld",
            St    => "st",
            Add   => "add",
            Sub   => "sub",
            And   => "and",
            Or    => "or",
            Xor   => "xor",
            Zjmp  => "zjmp",
            Ldi   => "ldi",
            Sti   => "sti",
            Fork  => "fork",
            Lld   => "lld",
            Lldi  => "lldi",
            Lfork => "lfork",
            Aff   => "aff",
        };

        write!(f, "{}", mnemonic)
    }
}

impl fmt::Display for Param {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.kind {
            ParamType::Direct => write!(f, "%{}", self.value),
            ParamType::Indirect => write!(f, "{}", self.value),
            ParamType::Register => write!(f, "r{}", self.value),
        }
    }
}
