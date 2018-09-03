use super::types::*;
use spec::MEM_SIZE;

pub fn exec_live(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_ld(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_st(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_add(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_sub(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_and(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_or(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_xor(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_zjmp(instr: &Instruction, context: &mut ExecutionContext) {
    let offset = instr.params[0].value;
    let mut new_pc = *context.pc as i32 + offset;
    new_pc -= instr.byte_size as i32; // Negating the instruction jump
    new_pc += MEM_SIZE as i32; // Avoiding negative pc values
    *context.pc = new_pc as usize;
}

pub fn exec_ldi(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_sti(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_fork(instr: &Instruction, context: &mut ExecutionContext) {
    let n = instr.params[0].value;
    context.forks.push(Process {
        pid: 1,
        pc: (*context.pc as i32 + n + MEM_SIZE as i32) as usize % MEM_SIZE,
        registers: Registers::default(),
        carry: false,
        state: ProcessState::Idle,
    });
}

pub fn exec_lld(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_lldi(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_lfork(instr: &Instruction, context: &mut ExecutionContext) {

}

pub fn exec_aff(instr: &Instruction, context: &mut ExecutionContext) {

}
