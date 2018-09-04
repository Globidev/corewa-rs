use super::types::*;
use spec::{MEM_SIZE, ParamType, IDX_MOD};

fn offseted_pc(pc: usize, offset: i32) -> usize {
    let offset = offset % IDX_MOD as i32;
    (pc as i32 + MEM_SIZE as i32 + offset) as usize
}

fn offseted_pc_long(pc: usize, offset: i32) -> usize {
    let offset = offset as i32;
    (pc as i32 + MEM_SIZE as i32 + offset) as usize
}

impl<'a> ExecutionContext<'a> {
    fn get_param(&self, param: &Param) -> i32 {
        use self::ParamType::*;

        match param.kind {
            Register => self.registers[param.value as usize - 1],
            Direct   => param.value,
            Indirect => self.memory.read_i32(offseted_pc(*self.pc, param.value))
        }
    }

    fn get_long_param(&self, param: &Param) -> i32 {
        use self::ParamType::*;

        match param.kind {
            Register => self.registers[param.value as usize - 1],
            Direct   => param.value,
            Indirect => self.memory.read_i32(offseted_pc_long(*self.pc, param.value))
        }
    }
}

pub fn exec_live(instr: &Instruction, ctx: &mut ExecutionContext) {
    *ctx.live_count += 1;
    *ctx.last_live_cycle = ctx.cycle;
    // TODO: player at param 0 lives
}

pub fn exec_ld(instr: &Instruction, ctx: &mut ExecutionContext) {
    let value_to_load = ctx.get_param(&instr.params[0]);
    *ctx.carry = value_to_load == 0;
    ctx.registers[instr.params[1].value as usize - 1] = value_to_load;
}

pub fn exec_st(instr: &Instruction, ctx: &mut ExecutionContext) {
    let value_to_store = ctx.get_param(&instr.params[0]);
    let dest_param = &instr.params[1];
    match dest_param.kind {
        ParamType::Register => ctx.registers[dest_param.value as usize - 1] = value_to_store,
        ParamType::Indirect => ctx.memory.write_i32(
            value_to_store,
            offseted_pc(*ctx.pc, dest_param.value)
        ),
        _ => unreachable!("St Param #2 invariant broken")
    }
}

pub fn exec_add(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.registers[instr.params[0].value as usize - 1];
    let rhs = ctx.registers[instr.params[1].value as usize - 1];
    let result = lhs + rhs;
    *ctx.carry = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_sub(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.registers[instr.params[0].value as usize - 1];
    let rhs = ctx.registers[instr.params[1].value as usize - 1];
    let result = lhs - rhs;
    *ctx.carry = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_and(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0]);
    let rhs = ctx.get_param(&instr.params[1]);
    let result = lhs & rhs;
    *ctx.carry = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_or(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0]);
    let rhs = ctx.get_param(&instr.params[1]);
    let result = lhs | rhs;
    *ctx.carry = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_xor(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0]);
    let rhs = ctx.get_param(&instr.params[1]);
    let result = lhs ^ rhs;
    *ctx.carry = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_zjmp(instr: &Instruction, ctx: &mut ExecutionContext) {
    if !*ctx.carry { return }

    let offset = instr.params[0].value;
    let mut new_pc = *ctx.pc as i32 + offset;
    new_pc -= instr.byte_size as i32; // Negating the instruction jump
    new_pc += MEM_SIZE as i32; // Avoiding negative pc values
    *ctx.pc = new_pc as usize;
}

pub fn exec_ldi(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0]);
    let rhs = ctx.get_param(&instr.params[1]);
    let addr = ((lhs + rhs) % MEM_SIZE as i32) + MEM_SIZE as i32;
    let value = ctx.memory.read_i32(addr as usize);
    ctx.registers[instr.params[2].value as usize - 1] = value;
}

pub fn exec_sti(instr: &Instruction, ctx: &mut ExecutionContext) {
    let value = ctx.registers[instr.params[0].value as usize - 1];
    let lhs = ctx.get_param(&instr.params[1]);
    let rhs = ctx.get_param(&instr.params[2]);
    let addr = ((lhs + rhs) % MEM_SIZE as i32) + MEM_SIZE as i32;
    ctx.memory.write_i32(value, addr as usize);
}

pub fn exec_fork(instr: &Instruction, ctx: &mut ExecutionContext) {
    let forked_pc = offseted_pc(*ctx.pc, instr.params[0].value);
    ctx.forks.push(Process {
        pid: 1,
        pc: forked_pc,
        registers: *ctx.registers,
        carry: *ctx.carry,
        state: ProcessState::Idle,
        last_live_cycle: ctx.cycle
    });
}

pub fn exec_lld(instr: &Instruction, ctx: &mut ExecutionContext) {
    let value_to_load = ctx.get_long_param(&instr.params[0]);
    *ctx.carry = value_to_load == 0;
    ctx.registers[instr.params[1].value as usize - 1] = value_to_load;
}

pub fn exec_lldi(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_long_param(&instr.params[0]);
    let rhs = ctx.get_long_param(&instr.params[1]);
    let addr = ((lhs + rhs) % MEM_SIZE as i32) + MEM_SIZE as i32;
    let value = ctx.memory.read_i32(addr as usize);
    *ctx.carry = value == 0;
    ctx.registers[instr.params[2].value as usize - 1] = value;
}

pub fn exec_lfork(instr: &Instruction, ctx: &mut ExecutionContext) {
    let forked_pc = offseted_pc_long(*ctx.pc, instr.params[0].value);
    ctx.forks.push(Process {
        pid: 1,
        pc: forked_pc,
        registers: *ctx.registers,
        carry: *ctx.carry,
        state: ProcessState::Idle,
        last_live_cycle: ctx.cycle
    });
}

pub fn exec_aff(instr: &Instruction, ctx: &mut ExecutionContext) {

}
