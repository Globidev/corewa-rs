use super::types::*;
use crate::spec::*;

pub trait Read: std::ops::Index<usize, Output = u8> {
    fn read_i32(&self, at: usize) -> i32;
    fn read_i16(&self, at: usize) -> i16;
}

pub trait Decode: Read {
    fn decode_op(&self, idx: usize) -> Result<OpType, InvalidOpCode> {
        let op_code = self[idx];

        op_from_code(op_code).ok_or(InvalidOpCode(op_code))
    }

    fn decode_instr(&self, op: OpType, addr: usize) -> Result<Instruction, InstrDecodeError> {
        // Decode the operation's parameter types and start counting the
        // instruction's total byte size:
        // If the op has a pcb, decode it and start counting at 2 bytes:
        // op code and pcb each on one byte.
        // If the op has no pcb, then the parameter types are known and start
        // counting at 1 byte: op code on one byte.
        let op_spec = op_spec(op);

        let (param_types, mut instr_byte_size) = if op_spec.has_pcb {
            let pcb = self[addr + 1];
            (read_pcb_params(pcb, &op_spec)?, 2)
        } else {
            (params_from_unambiguous_masks(op_spec.param_masks), 1)
        };

        // Decode each parameter and compute the instruction's total byte size:
        // iterate `param_count` times and for each iteration, attempt to decode
        // a parameter of the previously computed type at an offset
        // corresponding to the currently accumulated instruction's byte size.
        // A succesful decoding will yield the parameter but also its byte size,
        // the latter will be used to increment the instruction's byte size.
        let mut params: [Param; MAX_PARAMS] = Default::default();

        for idx in 0..op_spec.param_count {
            let param_type = param_types[idx];
            let (param, param_byte_size) =
                self.decode_param(param_type, addr + instr_byte_size, &op_spec.dir_size)?;
            instr_byte_size += param_byte_size;
            params[idx] = param;
        }

        Ok(Instruction {
            kind: op,
            params,
            byte_size: instr_byte_size,
        })
    }

    fn decode_param(
        &self,
        kind: ParamType,
        addr: usize,
        dir_size: &DirectSize,
    ) -> Result<(Param, usize), InstrDecodeError> {
        use ParamType::*;

        let (value, size) = match (&kind, dir_size) {
            (Register, _) => {
                let reg = self[addr];
                match reg as usize {
                    1..=REG_COUNT => (i32::from(reg), 1),
                    _ => return Err(InstrDecodeError::InvalidRegNumber(reg)),
                }
            }
            (Direct, DirectSize::FourBytes) => (self.read_i32(addr), 4),
            _ => (i32::from(self.read_i16(addr)), 2),
        };

        Ok((Param { kind, value }, size))
    }
}

impl<T: Read> Decode for T {}

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
            _ => ParamType::default(),
        }
    }

    [
        to_param_type(masks[0]),
        to_param_type(masks[1]),
        to_param_type(masks[2]),
    ]
}

fn read_pcb_params(pcb: u8, op_spec: &OpSpec) -> Result<ParamTypes, InstrDecodeError> {
    // Validate the pcb structure:
    // there should be exactly one pair of bits for each parameter
    // additional bits are treated as errors, so we isolate them with a mask
    // since the pcb is big endian, there should be `param_count` leading pairs
    // of bits:
    // - a 1 param pcb should be 0bxx_00_00_00 (mask 0b00_11_11_11)
    // - a 2 param pcb should be 0bxx_xx_00_00 (mask 0b00_00_11_11)
    // - a 3 param pcb should be 0bxx_xx_xx_00 (mask 0b00_00_00_11)
    let unused_mask = 0b11_11_11_11 >> (op_spec.param_count * 2);

    if pcb & unused_mask != 0 {
        return Err(InstrDecodeError::InvalidPCB(pcb));
    }

    // Decode each parameter's type:
    // iterate `param_count` times and for each iteration, isolate the bit pair
    // of each parameter in the form 0b00_00_00_xx so that masking it with
    // 0b00_00_00_11 yields its value:
    // - 1st parameter 0bxx_øø_øø_00 has to be shifted 6 times
    // - 2nd parameter 0bøø_xx_øø_00 has to be shifted 4 times
    // - 3rd parameter 0bøø_øø_xx_00 has to be shifted 2 times
    // When the parameter is decoded, we also need to validate its value in the
    // operation's parameter mask.
    let mut param_types = ParamTypes::default();

    for (idx, param_type_slot) in param_types.iter_mut().enumerate().take(op_spec.param_count) {
        let param_bits = (pcb >> (6 - 2 * idx)) & 0b00_00_00_11;
        let (param_type, mask_flag) =
            read_type_and_mask_flag(param_bits).ok_or(InstrDecodeError::InvalidPCB(pcb))?;

        let param_mask = op_spec.param_masks[idx];
        if param_mask & mask_flag != mask_flag {
            return Err(InstrDecodeError::InvalidPCB(pcb));
        }

        *param_type_slot = param_type;
    }

    Ok(param_types)
}

fn read_type_and_mask_flag(param_code: u8) -> Option<(ParamType, u8)> {
    match param_code {
        REG_PARAM_CODE => Some((ParamType::Register, T_REG)),
        DIR_PARAM_CODE => Some((ParamType::Direct, T_DIR)),
        IND_PARAM_CODE => Some((ParamType::Indirect, T_IND)),
        _ => None,
    }
}

fn op_from_code(code: u8) -> Option<OpType> {
    use OpType::*;

    let op_type = match code {
        1 => Live,
        2 => Ld,
        3 => St,
        4 => Add,
        5 => Sub,
        6 => And,
        7 => Or,
        8 => Xor,
        9 => Zjmp,
        10 => Ldi,
        11 => Sti,
        12 => Fork,
        13 => Lld,
        14 => Lldi,
        15 => Lfork,
        16 => Aff,
        _ => return None,
    };

    Some(op_type)
}

#[derive(Debug, thiserror::Error)]
#[error("Invalid OP code: 0x{0:X}")]
pub struct InvalidOpCode(u8);

#[derive(Debug, thiserror::Error)]
pub enum InstrDecodeError {
    #[error("Invalid PCB: 0x{0:X}")]
    InvalidPCB(u8),
    #[error("Invalid register: {0}")]
    InvalidRegNumber(u8),
}
