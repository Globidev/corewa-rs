use super::types::*;

use spec::*;
use std::mem;
use std::ops::Index;

pub struct Memory([u8; MEM_SIZE]);

impl Default for Memory {
    fn default() -> Self {
        Memory(unsafe { mem::zeroed() })
    }
}

impl Memory {
    pub fn size(&self) -> usize {
        mem::size_of_val(&self.0)
    }

    pub fn as_ptr(&self) -> *const u8 {
        self.0.as_ptr()
    }

    pub fn write(&mut self, at: usize, bytes: &[u8]) {
        let at = at % MEM_SIZE;
        if at + bytes.len() >= MEM_SIZE {
            let max_bytes = MEM_SIZE - at;
            self.0[at..at+max_bytes].copy_from_slice(&bytes[..max_bytes]);
            self.0[..bytes.len()-max_bytes].copy_from_slice(&bytes[max_bytes..]);
        } else {
            self.0[at..at+bytes.len()].copy_from_slice(bytes);
        }
    }

    pub fn read_instr(&self, idx: usize) -> Result<Instruction, ReadError> {
        let op_code = self[idx];

        let op = op_from_code(op_code)
            .ok_or_else(|| ReadError::InvalidOpCode(op_code))?;

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
            let (param, size) = self.read_param(
                param_type,
                idx + byte_size,
                &op_spec.dir_size
            )?;
            params[i] = param;
            byte_size += size
        }

        Ok(Instruction { kind: op, params, byte_size })
    }

    fn read_param(&self, kind: ParamType, idx: usize, dir_size: &DirectSize)
        -> Result<(Param, usize), ReadError>
    {
        use self::ParamType::*;

        let (value, size) = match (&kind, dir_size) {
            (Register, _) => {
                let reg = self[idx];
                match reg as usize {
                    1 ... REG_COUNT => (i32::from(reg), 1),
                    _ => return Err(ReadError::InvalidRegNumber(reg))
                }
            },
            (Direct, DirectSize::FourBytes) => (self.read_i32(idx), 4),
            _ => (i32::from(self.read_i16(idx)), 2)
        };

        Ok((Param { kind, value }, size))
    }

    pub fn read_i32(&self, addr: usize) -> i32 {
          (i32::from(self[addr    ]) << 24)
        + (i32::from(self[addr + 1]) << 16)
        + (i32::from(self[addr + 2]) << 8 )
        + (i32::from(self[addr + 3])      )
    }

    pub fn read_i16(&self, addr: usize) -> i16 {
          (i16::from(self[addr    ]) << 8)
        + (i16::from(self[addr + 1])     )
    }

    pub fn write_i32(&mut self, value: i32, at: usize) {
        let value_as_bytes: [u8; 4] = unsafe { mem::transmute(value.to_be()) };
        self.write(at, &value_as_bytes)
    }
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
    -> Result<ParamTypes, ReadError>
{
    let unused_mask = (4 - op_spec.param_count) as u8 * 0b100 - 1;

    if ocp & unused_mask != 0 {
        super::super::log("unused");
        return Err(ReadError::InvalidOCP(ocp))
    }

    let mut param_types = ParamTypes::default();

    for i in 0..op_spec.param_count {
        let shifted_bits = ocp >> (6 - 2 * i);
        let (param_type, mask) = match shifted_bits & 0b0000_0011 {
            REG_PARAM_CODE => (ParamType::Register, T_REG),
            DIR_PARAM_CODE => (ParamType::Direct, T_DIR),
            IND_PARAM_CODE => (ParamType::Indirect, T_IND),
            _  => return Err(ReadError::InvalidOCP(ocp))
        };
        if op_spec.param_masks[i] & mask != mask {
            super::super::log(&format!("mask: {}, pmask: {}", mask, op_spec.param_masks[i]));
            return Err(ReadError::InvalidOCP(ocp))
        }
        param_types[i] = param_type;
    }

    Ok(param_types)
}

fn op_from_code(code: u8) -> Option<OpType> {
    use self::OpType::*;

    let op = match code {
        1 =>  Live,
        2 =>  Ld,
        3 =>  St,
        4 =>  Add,
        5 =>  Sub,
        6 =>  And,
        7 =>  Or,
        8 =>  Xor,
        9 =>  Zjmp,
        10 => Ldi,
        11 => Sti,
        12 => Fork,
        13 => Lld,
        14 => Lldi,
        15 => Lfork,
        16 => Aff,
        _ => return None
    };

    Some(op)
}

impl Index<usize> for Memory {
    type Output = u8;

    fn index(&self, index: usize) -> &u8 {
        self.0.index(index % MEM_SIZE)
    }
}

#[derive(Debug)]
pub enum ReadError {
    InvalidOpCode(u8),
    InvalidOCP(u8),
    InvalidRegNumber(u8),
}
