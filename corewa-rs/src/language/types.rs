use crate::spec::*;

#[derive(Debug, PartialEq, Eq)]
pub enum Op {
    Live  ( Direct                       ),
    Ld    ( DirInd,   Register           ),
    St    ( Register, RegInd             ),
    Add   ( Register, Register, Register ),
    Sub   ( Register, Register, Register ),
    And   ( AnyParam, AnyParam, Register ),
    Or    ( AnyParam, AnyParam, Register ),
    Xor   ( AnyParam, AnyParam, Register ),
    Zjmp  ( Direct                       ),
    Ldi   ( AnyParam, RegDir,   Register ),
    Sti   ( Register, AnyParam, RegDir   ),
    Fork  ( Direct                       ),
    Lld   ( DirInd,   Register           ),
    Lldi  ( AnyParam, RegDir,   Register ),
    Lfork ( Direct                       ),
    Aff   ( Register                     ),
}

#[derive(Debug, PartialEq, Eq, From)]
pub struct Register(pub u8);

#[derive(Debug, PartialEq, Eq, From)]
pub enum Direct {
    Label(String),
    Numeric(i64)
}
#[derive(Debug, PartialEq, Eq, From)]
pub enum Indirect {
    Label(String),
    Numeric(i64)
}

#[derive(Debug, PartialEq, Eq, From)]
pub enum RegDir {
    Reg(Register),
    Dir(Direct)
}

#[derive(Debug, PartialEq, Eq, From)]
pub enum RegInd {
    Reg(Register),
    Ind(Indirect)
}

#[derive(Debug, PartialEq, Eq, From)]
pub enum DirInd {
    Dir(Direct),
    Ind(Indirect)
}

#[derive(Debug, PartialEq, Eq, From)]
pub enum AnyParam {
    Reg(Register),
    Dir(Direct),
    Ind(Indirect)
}

pub trait ToParamCode {
    fn param_code(&self) -> u8;
}

impl ToParamCode for Register { fn param_code(&self) -> u8 { REG_PARAM_CODE } }
impl ToParamCode for Direct   { fn param_code(&self) -> u8 { DIR_PARAM_CODE } }
impl ToParamCode for Indirect { fn param_code(&self) -> u8 { IND_PARAM_CODE } }

impl ToParamCode for RegDir {
    fn param_code(&self) -> u8 {
        match self {
            RegDir::Reg(r) => r.param_code(),
            RegDir::Dir(d) => d.param_code(),
        }
    }
}

impl ToParamCode for RegInd {
    fn param_code(&self) -> u8 {
        match self {
            RegInd::Reg(r) => r.param_code(),
            RegInd::Ind(i) => i.param_code(),
        }
    }
}

impl ToParamCode for DirInd {
    fn param_code(&self) -> u8 {
        match self {
            DirInd::Dir(d) => d.param_code(),
            DirInd::Ind(i) => i.param_code(),
        }
    }
}

impl ToParamCode for AnyParam {
    fn param_code(&self) -> u8 {
        match self {
            AnyParam::Reg(r) => r.param_code(),
            AnyParam::Dir(d) => d.param_code(),
            AnyParam::Ind(i) => i.param_code(),
        }
    }
}
