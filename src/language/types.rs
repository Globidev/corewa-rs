#[derive(Debug)]
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

#[derive(Debug)]
pub struct Register(pub u8);

#[derive(Debug)]
pub enum Direct {
    Label(String),
    Numeric(i64)
}
#[derive(Debug)]
pub enum Indirect {
    Label(String),
    Numeric(i64)
}

#[derive(Debug)]
pub enum RegDir {
    Reg(Register),
    Dir(Direct)
}

#[derive(Debug)]
pub enum RegInd {
    Reg(Register),
    Ind(Indirect)
}

#[derive(Debug)]
pub enum DirInd {
    Dir(Direct),
    Ind(Indirect)
}

#[derive(Debug)]
pub enum AnyParam {
    Reg(Register),
    Dir(Direct),
    Ind(Indirect)
}
