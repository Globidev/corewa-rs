use crate::vm::types::*;
use crate::vm::decoder;
use crate::vm::VirtualMachine;
use crate::spec::*;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct DecodeResult {
    instr: Instruction
}

#[wasm_bindgen]
impl DecodeResult {
    pub fn byte_size(&self) -> usize {
        self.instr.byte_size
    }

    pub fn to_string(&self) -> String {
        self.instr.to_string()
    }
}

#[wasm_bindgen]
pub fn decode_op(vm: &VirtualMachine, at: usize) -> Result<DecodeResult, JsValue> {
    let mem = vm.memory();
    let op = decoder::decode_op(mem, at).map_err(|_| JsValue::NULL)?;
    let instr = decoder::decode_instr(mem, op, at).map_err(|_| JsValue::NULL)?;

    Ok(DecodeResult { instr })
}

use std::fmt;

impl fmt::Display for Instruction {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let spec = OpSpec::from(self.kind);
        write!(f, "{} {}", self.kind, self.params[0])?;
        for i in 1..spec.param_count {
            write!(f, ", {}", self.params[i])?;
        }
        Ok(())
    }
}

impl fmt::Display for OpType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
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
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let prefix = match self.kind {
            ParamType::Direct => "%",
            ParamType::Indirect => "",
            ParamType::Register => "r"
        };

        write!(f, "{}{}", prefix, self.value)
    }
}
