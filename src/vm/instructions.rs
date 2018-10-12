use super::types::*;
use super::execution_context::ExecutionContext;
use super::process::Process;
use spec::{MEM_SIZE, ParamType};

pub fn exec_live(instr: &Instruction, ctx: &mut ExecutionContext) {
    let player_id = instr.params[0].value;

    *ctx.live_count += 1;
    *ctx.last_live_cycle = ctx.cycle;
    ctx.live_ids.push(player_id);
}

pub fn exec_ld(instr: &Instruction, ctx: &mut ExecutionContext) {
    let value_to_load = ctx.get_param(&instr.params[0], OffsetType::Limited);
    *ctx.zf = value_to_load == 0;
    ctx.registers[instr.params[1].value as usize - 1] = value_to_load;
}

pub fn exec_st(instr: &Instruction, ctx: &mut ExecutionContext) {
    let value_to_store = ctx.get_param(&instr.params[0], OffsetType::Limited);
    let dest_param = &instr.params[1];
    match dest_param.kind {
        ParamType::Register => ctx.registers[dest_param.value as usize - 1] = value_to_store,
        ParamType::Indirect => ctx.memory.write_i32(
            value_to_store,
            ctx.player_id,
            ctx.pc.offset(dest_param.value as isize, OffsetType::Limited),
        ),
        _ => unreachable!("St Param #2 invariant broken")
    }
}

pub fn exec_add(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.registers[instr.params[0].value as usize - 1];
    let rhs = ctx.registers[instr.params[1].value as usize - 1];
    let result = lhs + rhs;
    *ctx.zf = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_sub(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.registers[instr.params[0].value as usize - 1];
    let rhs = ctx.registers[instr.params[1].value as usize - 1];
    let result = lhs - rhs;
    *ctx.zf = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_and(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0], OffsetType::Limited);
    let rhs = ctx.get_param(&instr.params[1], OffsetType::Limited);
    let result = lhs & rhs;
    *ctx.zf = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_or(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0], OffsetType::Limited);
    let rhs = ctx.get_param(&instr.params[1], OffsetType::Limited);
    let result = lhs | rhs;
    *ctx.zf = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_xor(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0], OffsetType::Limited);
    let rhs = ctx.get_param(&instr.params[1], OffsetType::Limited);
    let result = lhs ^ rhs;
    *ctx.zf = result == 0;
    ctx.registers[instr.params[2].value as usize - 1] = result;
}

pub fn exec_zjmp(instr: &Instruction, ctx: &mut ExecutionContext) {
    if !*ctx.zf { return }

    // Negating the instruction jump
    let offset = instr.params[0].value as isize - instr.byte_size as isize;
    ctx.pc.advance(offset)
}

pub fn exec_ldi(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0], OffsetType::Limited);
    let rhs = ctx.get_param(&instr.params[1], OffsetType::Limited);
    let addr = ((lhs + rhs) as isize % MEM_SIZE as isize) + MEM_SIZE as isize;
    let value = ctx.memory.read_i32(addr as usize);
    ctx.registers[instr.params[2].value as usize - 1] = value;
}

pub fn exec_sti(instr: &Instruction, ctx: &mut ExecutionContext) {
    let value = ctx.registers[instr.params[0].value as usize - 1];
    let lhs = ctx.get_param(&instr.params[1], OffsetType::Limited);
    let rhs = ctx.get_param(&instr.params[2], OffsetType::Limited);
    let offset = lhs + rhs;
    ctx.memory.write_i32(value, ctx.player_id, ctx.pc.offset(offset as isize, OffsetType::Limited));
}

pub fn exec_fork(instr: &Instruction, ctx: &mut ExecutionContext) {
    let forked_pc = ctx.pc.offset(instr.params[0].value as isize, OffsetType::Limited);

    let child_process = Process::fork(ctx.pid_pool.get(), forked_pc.into(), ctx);
    ctx.forks.push(child_process);
}

pub fn exec_lld(instr: &Instruction, ctx: &mut ExecutionContext) {
    let value_to_load = ctx.get_param(&instr.params[0], OffsetType::Long);
    *ctx.zf = value_to_load == 0;
    ctx.registers[instr.params[1].value as usize - 1] = value_to_load;
}

pub fn exec_lldi(instr: &Instruction, ctx: &mut ExecutionContext) {
    let lhs = ctx.get_param(&instr.params[0], OffsetType::Long);
    let rhs = ctx.get_param(&instr.params[1], OffsetType::Long);
    let addr = ((lhs + rhs) as isize % MEM_SIZE as isize) + MEM_SIZE as isize;
    let value = ctx.memory.read_i32(addr as usize);
    *ctx.zf = value == 0;
    ctx.registers[instr.params[2].value as usize - 1] = value;
}

pub fn exec_lfork(instr: &Instruction, ctx: &mut ExecutionContext) {
    let forked_pc = ctx.pc.offset(instr.params[0].value as isize, OffsetType::Long);

    let child_process = Process::fork(ctx.pid_pool.get(), forked_pc.into(), ctx);
    ctx.forks.push(child_process);
}

pub fn exec_aff(_instr: &Instruction, _ctx: &mut ExecutionContext) {

}
