use crate::spec::*;
use super::types::*;

use std::ops::Index;

pub trait Decodable: Index<usize, Output = u8> {
    fn read_i32(&self, at: usize) -> i32;
    fn read_i16(&self, at: usize) -> i16;
}

pub fn decode_op(source: &impl Decodable, idx: usize)
    -> Result<OpType, DecodeError>
{
    let op_code = source[idx];

    op_from_code(op_code)
        .ok_or_else(|| DecodeError::InvalidOpCode(op_code))
}

pub fn decode_instr(source: &impl Decodable, op: OpType, idx: usize)
    -> Result<Instruction, DecodeError>
{
    let op_spec = OpSpec::from(op);

    let (param_types, mut byte_size) = if op_spec.has_ocp {
        let ocp = source[idx + 1];
        (read_ocp_params(ocp, &op_spec)?, 2)
    } else {
        (params_from_unambiguous_masks(op_spec.param_masks), 1)
    };

    let mut params: [Param; MAX_PARAMS] = Default::default();

    for i in 0..op_spec.param_count {
        let param_type = param_types[i];
        let (param, size) = decode_param(
            source,
            param_type,
            idx + byte_size,
            &op_spec.dir_size
        )?;
        params[i] = param;
        byte_size += size
    }

    Ok(Instruction { kind: op, params, byte_size })
}

fn decode_param(source: &impl Decodable, kind: ParamType, idx: usize, dir_size: &DirectSize)
    -> Result<(Param, usize), DecodeError>
{
    use self::ParamType::*;

    let (value, size) = match (&kind, dir_size) {
        (Register, _) => {
            let reg = source[idx];
            match reg as usize {
                1 ... REG_COUNT => (i32::from(reg), 1),
                _ => return Err(DecodeError::InvalidRegNumber(reg))
            }
        },
        (Direct, DirectSize::FourBytes) => (source.read_i32(idx), 4),
        _ => (i32::from(source.read_i16(idx)), 2)
    };

    Ok((Param { kind, value }, size))
}

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
    -> Result<ParamTypes, DecodeError>
{
    let unused_mask = (1 << ((4 - op_spec.param_count) * 2)) - 1;

    if ocp & unused_mask != 0 {
        return Err(DecodeError::InvalidOCP(ocp))
    }

    let mut param_types = ParamTypes::default();

    for (i, (param_type_out, param_mask)) in param_types.iter_mut().take(op_spec.param_count)
        .zip(op_spec.param_masks.iter())
        .enumerate()
    {
        let shifted_bits = ocp >> (6 - 2 * i);
        let (param_type, bit) = read_type_and_bit(shifted_bits & 0b0000_0011)
            .ok_or_else(|| DecodeError::InvalidOCP(ocp))?;
        if param_mask & bit != bit {
            return Err(DecodeError::InvalidOCP(ocp))
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
    match code {
        1...16 => Some(unsafe { std::mem::transmute(code) }),
        _      => None
    }
}

#[derive(Debug)]
pub enum DecodeError {
    InvalidOpCode(u8),
    InvalidOCP(u8),
    InvalidRegNumber(u8),
}
