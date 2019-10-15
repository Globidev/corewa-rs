use crate::spec::*;
use super::types::*;

use std::ops::Index;

pub trait Read: Index<usize, Output = u8> {
    fn read_i32(&self, at: usize) -> i32;
    fn read_i16(&self, at: usize) -> i16;
}

pub trait Decode: Read {
    fn decode_op(&self, idx: usize) -> Result<OpType, InvalidOpCode> {
        let op_code = self[idx];

        op_from_code(op_code)
            .ok_or_else(|| InvalidOpCode(op_code))
    }

    fn decode_instr(&self, op: OpType, idx: usize)
        -> Result<Instruction, InstrDecodeError>
    {
        let op_spec = OpSpec::from(op);

        let (param_types, mut byte_size) = if op_spec.has_ocp {
            let ocp = self[idx + 1];
            (read_ocp_params(ocp, &op_spec)?, 2)
        } else {
            (params_from_unambiguous_masks(op_spec.param_masks), 1)
        };

        let mut params: [Param; MAX_PARAMS] = Default::default();

        for i in 0..op_spec.param_count {
            let param_type = param_types[i];
            let (param, size) = self.decode_param(
                param_type,
                idx + byte_size,
                &op_spec.dir_size
            )?;
            params[i] = param;
            byte_size += size
        }

        Ok(Instruction { kind: op, params, byte_size })
    }

    fn decode_param(&self, kind: ParamType, idx: usize, dir_size: &DirectSize)
        -> Result<(Param, usize), InstrDecodeError>
    {
        use ParamType::*;

        let (value, size) = match (&kind, dir_size) {
            (Register, _) => {
                let reg = self[idx];
                match reg as usize {
                    1..=REG_COUNT => (i32::from(reg), 1),
                    _ => return Err(InstrDecodeError::InvalidRegNumber(reg))
                }
            },
            (Direct, DirectSize::FourBytes) => (self.read_i32(idx), 4),
            _ => (i32::from(self.read_i16(idx)), 2)
        };

        Ok((Param { kind, value }, size))
    }
}

impl<T: Read> Decode for T { }

type ParamTypes = [ParamType; MAX_PARAMS];

impl Default for ParamType {
    fn default() -> Self {
        ParamType::Register
    }
}

fn params_from_unambiguous_masks(masks: [u8; MAX_PARAMS]) -> ParamTypes {
    fn to_param_type(mask: u8) -> ParamType {
        match mask {
            T_REG => ParamType::Register,
            T_DIR => ParamType::Direct,
            T_IND => ParamType::Indirect,
            _     => ParamType::default(),
        }
    }

    [
        to_param_type(masks[0]),
        to_param_type(masks[1]),
        to_param_type(masks[2]),
    ]
}

fn read_ocp_params(ocp: u8, op_spec: &OpSpec)
    -> Result<ParamTypes, InstrDecodeError>
{
    let unused_mask = (1 << ((4 - op_spec.param_count) * 2)) - 1;

    if ocp & unused_mask != 0 {
        return Err(InstrDecodeError::InvalidOCP(ocp))
    }

    let mut param_types = ParamTypes::default();

    for (i, (param_type_out, param_mask)) in param_types.iter_mut().take(op_spec.param_count)
        .zip(op_spec.param_masks.iter())
        .enumerate()
    {
        let shifted_bits = ocp >> (6 - 2 * i);
        let (param_type, bit) = read_type_and_bit(shifted_bits & 0b0000_0011)
            .ok_or_else(|| InstrDecodeError::InvalidOCP(ocp))?;
        if param_mask & bit != bit {
            return Err(InstrDecodeError::InvalidOCP(ocp))
        }
        *param_type_out = param_type;
    }

    Ok(param_types)
}

fn read_type_and_bit(param_code: u8) -> Option<(ParamType, u8)> {
    match param_code {
        REG_PARAM_CODE => Some((ParamType::Register, T_REG)),
        DIR_PARAM_CODE => Some((ParamType::Direct, T_DIR)),
        IND_PARAM_CODE => Some((ParamType::Indirect, T_IND)),
        _ => None
    }
}

fn op_from_code(code: u8) -> Option<OpType> {
    let op_type = match code {
        1 => OpType::Live,
        2 => OpType::Ld,
        3 => OpType::St,
        4 => OpType::Add,
        5 => OpType::Sub,
        6 => OpType::And,
        7 => OpType::Or,
        8 => OpType::Xor,
        9 => OpType::Zjmp,
        10 => OpType::Ldi,
        11 => OpType::Sti,
        12 => OpType::Fork,
        13 => OpType::Lld,
        14 => OpType::Lldi,
        15 => OpType::Lfork,
        16 => OpType::Aff,
        _ => return None
    };

    Some(op_type)
}

#[derive(Debug)]
pub struct InvalidOpCode(u8);

#[derive(Debug)]
pub enum InstrDecodeError {
    InvalidOCP(u8),
    InvalidRegNumber(u8),
}

use std::fmt;

impl fmt::Display for InstrDecodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use InstrDecodeError::*;

        match self {
            InvalidOCP(byte) => write!(f, "Invalid PCB: 0x{:X}", byte),
            InvalidRegNumber(byte) => write!(f, "Invalid register: {}", byte),
        }
    }
}

impl fmt::Display for InvalidOpCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Invalid OP code: 0x{:X}", self.0)
    }
}
