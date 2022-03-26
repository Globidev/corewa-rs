use super::{execution_context::ExecutionContext, process::Process, types::*};
use crate::spec::ParamType;

pub fn exec_live(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [player_id_p, _, _] = &instr.params;

    *ctx.live_count += 1;
    ctx.process.last_live_cycle = ctx.cycle;
    ctx.live_ids.insert(player_id_p.value);
}

pub fn exec_ld(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [src_p, dst_p, _] = &instr.params;

    let value_to_load = ctx.get_param(src_p, OffsetType::Limited);
    ctx.set_reg(dst_p, value_to_load);

    ctx.process.zf = value_to_load == 0;
}

pub fn exec_st(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [src_p, dst_p, _] = &instr.params;

    let value_to_store = ctx.get_reg(src_p);
    match dst_p.kind {
        ParamType::Register => ctx.set_reg(dst_p, value_to_store),
        ParamType::Indirect => ctx.memory.write_i32(
            value_to_store,
            ctx.process.owner,
            ctx.process
                .pc
                .offset(dst_p.value as isize, OffsetType::Limited),
        ),
        _ => unreachable!("St Param #2 invariant broken"),
    }
}

pub fn exec_add(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_reg(lhs_p);
    let rhs = ctx.get_reg(rhs_p);
    let result = lhs.wrapping_add(rhs);
    ctx.set_reg(dst_p, result);

    ctx.process.zf = result == 0;
}

pub fn exec_sub(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_reg(lhs_p);
    let rhs = ctx.get_reg(rhs_p);
    let result = lhs.wrapping_sub(rhs);
    ctx.set_reg(dst_p, result);

    ctx.process.zf = result == 0;
}

pub fn exec_and(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let result = lhs & rhs;
    ctx.set_reg(dst_p, result);

    ctx.process.zf = result == 0;
}

pub fn exec_or(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let result = lhs | rhs;
    ctx.set_reg(dst_p, result);

    ctx.process.zf = result == 0;
}

pub fn exec_xor(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let result = lhs ^ rhs;
    ctx.set_reg(dst_p, result);

    ctx.process.zf = result == 0;
}

pub fn exec_zjmp(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [offset_p, _, _] = &instr.params;

    if !ctx.process.zf {
        return;
    }
    let jumped_offet = ctx
        .process
        .pc
        .offset(offset_p.value as isize, OffsetType::Limited);
    ctx.process.pc = jumped_offet.into();
    // Negating the instruction jump
    ctx.process.pc.advance(-(instr.byte_size as isize))
}

pub fn exec_ldi(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let addr = (lhs + rhs) as isize;
    let value = ctx
        .memory
        .read_i32(ctx.process.pc.offset(addr, OffsetType::Limited));
    ctx.set_reg(dst_p, value)
}

pub fn exec_sti(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [src_p, lhs_p, rhs_p] = &instr.params;

    let value = ctx.get_reg(src_p);
    let lhs = ctx.get_param(lhs_p, OffsetType::Limited);
    let rhs = ctx.get_param(rhs_p, OffsetType::Limited);
    let offset = lhs + rhs;
    ctx.memory.write_i32(
        value,
        ctx.process.owner,
        ctx.process.pc.offset(offset as isize, OffsetType::Limited),
    );
}

pub fn exec_fork(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [offset_p, _, _] = &instr.params;

    let forked_pc = ctx
        .process
        .pc
        .offset(offset_p.value as isize, OffsetType::Limited);
    let child_process = Process::fork(ctx.pid_pool.get(), forked_pc.into(), ctx);
    ctx.forks.push(child_process);
}

pub fn exec_lld(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [src_p, dst_p, _] = &instr.params;

    let value_to_load = ctx.get_param(src_p, OffsetType::Long);
    ctx.set_reg(dst_p, value_to_load);

    ctx.process.zf = value_to_load == 0;
}

pub fn exec_lldi(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [lhs_p, rhs_p, dst_p] = &instr.params;

    let lhs = ctx.get_param(lhs_p, OffsetType::Long);
    let rhs = ctx.get_param(rhs_p, OffsetType::Long);
    let addr = (lhs + rhs) as isize;
    let value = ctx
        .memory
        .read_i32(ctx.process.pc.offset(addr, OffsetType::Long));
    ctx.set_reg(dst_p, value);

    ctx.process.zf = value == 0;
}

pub fn exec_lfork(instr: &Instruction, ctx: &mut ExecutionContext<'_>) {
    let [offset_p, _, _] = &instr.params;

    let forked_pc = ctx
        .process
        .pc
        .offset(offset_p.value as isize, OffsetType::Long);
    let child_process = Process::fork(ctx.pid_pool.get(), forked_pc.into(), ctx);
    ctx.forks.push(child_process);
}

pub fn exec_aff(_instr: &Instruction, _ctx: &mut ExecutionContext<'_>) {}
