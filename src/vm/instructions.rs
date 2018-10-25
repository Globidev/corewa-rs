use crate::spec::ParamType;
use super::execution_context::ExecutionContext;
use super::process::Process;
use super::types::*;

pub fn exec_live(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [player_id_p, _, _] = &instr.params;

    *ctx.live_count += 1;
    *ctx.last_live_cycle = ctx.cycle;
    ctx.live_ids.insert(player_id_p.value);
}

pub fn exec_ld(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [src_p, dst_p, _] = &instr.params;

    let value_to_load = ctx.get_param(src_p, OffsetType::Limited);
    ctx.set_reg(dst_p, value_to_load);

    *ctx.zf = value_to_load == 0;
}

pub fn exec_st(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [src_p, dst_p, _] = &instr.params;

    let value_to_store = ctx.get_reg(src_p);
    match dst_p.kind {
        ParamType::Register => ctx.set_reg(dst_p, value_to_store),
        ParamType::Indirect => ctx.memory.write_i32(
            value_to_store,
            ctx.player_id,
            ctx.pc.offset(dst_p.value as isize, OffsetType::Limited),
        ),
        _ => unreachable!("St Param #2 invariant broken")
    }
}

pub fn exec_add(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_reg(lhs_p);
    let rhs = ctx.get_reg(rhs_p);
    let result = lhs + rhs;
    ctx.set_reg(dst_p, result);

    *ctx.zf = result == 0;
}

pub fn exec_sub(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_reg(lhs_p);
    let rhs = ctx.get_reg(rhs_p);
    let result = lhs - rhs;
    ctx.set_reg(dst_p, result);

    *ctx.zf = result == 0;
}

pub fn exec_and(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let result = lhs & rhs;
    ctx.set_reg(dst_p, result);

    *ctx.zf = result == 0;
}

pub fn exec_or(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let result = lhs | rhs;
    ctx.set_reg(dst_p, result);

    *ctx.zf = result == 0;
}

pub fn exec_xor(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let result = lhs ^ rhs;
    ctx.set_reg(dst_p, result);

    *ctx.zf = result == 0;
}

pub fn exec_zjmp(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [offset_p, _, _] = &instr.params;

    if !*ctx.zf { return }
    // Negating the instruction jump
    let offset = offset_p.value as isize - instr.byte_size as isize;
    let limited_offset = ctx.pc.offset(offset, OffsetType::Limited);
    *ctx.pc = limited_offset.into();
}

pub fn exec_ldi(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let addr = (lhs + rhs) as isize;
    let value = ctx.memory.read_i32(ctx.pc.offset(addr, OffsetType::Limited));
    ctx.set_reg(dst_p, value)
}

pub fn exec_sti(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [src_p, lhs_p, rhs_p] = &instr.params;

    let value = ctx.get_reg(src_p);
    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let offset = lhs + rhs;
    ctx.memory.write_i32(value, ctx.player_id, ctx.pc.offset(offset as isize, OffsetType::Limited));
}

pub fn exec_fork(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [offset_p, _, _] = &instr.params;

    let forked_pc = ctx.pc.offset(offset_p.value as isize, OffsetType::Limited);
    let child_process = Process::fork(ctx.pid_pool.get(), forked_pc.into(), ctx);
    ctx.forks.push(child_process);
}

pub fn exec_lld(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [src_p, dst_p, _] = &instr.params;

    let value_to_load = ctx.get_param(src_p, OffsetType::Long);
    ctx.set_reg(dst_p, value_to_load);

    *ctx.zf = value_to_load == 0;
}

pub fn exec_lldi(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Long);
    let rhs = ctx.get_param(rhs_p, OffsetType::Long);
    let addr = (lhs + rhs) as isize;
    let value = ctx.memory.read_i32(ctx.pc.offset(addr, OffsetType::Long));
    ctx.set_reg(dst_p, value);

    *ctx.zf = value == 0;
}

pub fn exec_lfork(instr: &Instruction, ctx: &mut ExecutionContext) {
    let [offset_p, _, _] = &instr.params;

    let forked_pc = ctx.pc.offset(offset_p.value as isize, OffsetType::Long);
    let child_process = Process::fork(ctx.pid_pool.get(), forked_pc.into(), ctx);
    ctx.forks.push(child_process);
}

pub fn exec_aff(_instr: &Instruction, _ctx: &mut ExecutionContext) {

}
