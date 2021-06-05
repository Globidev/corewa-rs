use derive_more::From;
use enum_dispatch::enum_dispatch;

use crate::spec::{DIR_PARAM_CODE, IND_PARAM_CODE, REG_PARAM_CODE};

#[derive(Debug, PartialEq, Eq)]
pub enum Op {
    Live(Direct),
    Ld(DirInd, Register),
    St(Register, RegInd),
    Add(Register, Register, Register),
    Sub(Register, Register, Register),
    And(AnyParam, AnyParam, Register),
    Or(AnyParam, AnyParam, Register),
    Xor(AnyParam, AnyParam, Register),
    Zjmp(Direct),
    Ldi(AnyParam, RegDir, Register),
    Sti(Register, AnyParam, RegDir),
    Fork(Direct),
    Lld(DirInd, Register),
    Lldi(AnyParam, RegDir, Register),
    Lfork(Direct),
    Aff(Register),
}

#[derive(Debug, PartialEq, Eq, From)]
pub struct Register(pub u8);

#[derive(Debug, PartialEq, Eq, From)]
pub enum Direct {
    Label(String),
    Numeric(i64),
}
#[derive(Debug, PartialEq, Eq, From)]
pub enum Indirect {
    Label(String),
    Numeric(i64),
}

#[enum_dispatch(ToParamCode)]
#[derive(Debug, PartialEq, Eq)]
pub enum RegDir {
    Reg(Register),
    Dir(Direct),
}

#[enum_dispatch(ToParamCode)]
#[derive(Debug, PartialEq, Eq)]
pub enum RegInd {
    Reg(Register),
    Ind(Indirect),
}

#[enum_dispatch(ToParamCode)]
#[derive(Debug, PartialEq, Eq)]
pub enum DirInd {
    Dir(Direct),
    Ind(Indirect),
}

#[enum_dispatch(ToParamCode)]
#[derive(Debug, PartialEq, Eq)]
pub enum AnyParam {
    Reg(Register),
    Dir(Direct),
    Ind(Indirect),
}

#[enum_dispatch::enum_dispatch]
pub trait ToParamCode {
    fn param_code(&self) -> u8;
}

impl ToParamCode for Register {
    fn param_code(&self) -> u8 {
        REG_PARAM_CODE
    }
}
impl ToParamCode for Direct {
    fn param_code(&self) -> u8 {
        DIR_PARAM_CODE
    }
}
impl ToParamCode for Indirect {
    fn param_code(&self) -> u8 {
        IND_PARAM_CODE
    }
}
