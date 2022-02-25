use corewa_rs::language::{
    lexer::Term::*,
    parser::{
        parse_line,
        ParseError::{self, *},
        ParsedLine::{self, *},
    },
    types::{Op::*, *},
};

fn parse_ok(input: &str) -> ParsedLine {
    parse_line(input).expect("Failed to parse")
}

fn parse_expect_err(input: &str, err: ParseError) {
    assert_eq!(parse_line(input), Err(err))
}

fn parse_test(input: &str, expected: ParsedLine) {
    assert_eq!(parse_ok(input), expected)
}

#[test]
fn empty() {
    parse_test("# nothing to see here", Empty)
}

#[test]
fn champion_name() {
    parse_test(
        r#".name "John Cena" # nice"#,
        ChampionName("John Cena".into()),
    )
}

#[test]
fn champion_comment() {
    parse_test(r#".comment "Amazin""#, ChampionComment("Amazin".into()))
}

#[test]
fn raw_code() {
    parse_test(".code 0x42 13 0d37", Code([0x42, 13, 37].to_vec()))
}

mod op {
    use super::*;

    macro_rules! test_ops {
        () => { };

        ($input:expr => $expected:expr, $($rest: tt)*) => {{
            parse_test($input, Op($expected));
            test_ops!($($rest)*);
        }};

        ($input:expr => $expected:expr) => {
            parse_test($input, Op($expected))
        }
    }

    #[test]
    fn live() {
        test_ops!(
            "live %42" => Live(42.into())
        )
    }

    #[test]
    fn ld() {
        test_ops!(
            "ld   %:here,  r6"  => Ld(Direct::Label("here".into()).into(), Register(6)),
            "ld   :there,  r12" => Ld(Indirect::Label("there".into()).into(), Register(12)),
        )
    }

    #[test]
    fn st() {
        test_ops!(
            "st   r7,  r1"    => St(Register(7), Register(1).into()),
            "st   r3,  :nice" => St(Register(3), Indirect::Label("nice".into()).into()),
        )
    }

    #[test]
    fn add() {
        test_ops!(
            "add r3, r6, r10" => Add(Register(3), Register(6), Register(10))
        )
    }

    #[test]
    fn sub() {
        test_ops!(
            "sub r2, r1, r13" => Sub(Register(2), Register(1), Register(13))
        )
    }

    #[test]
    fn and() {
        test_ops!(
            "and r5, r2, r8"       => And(Register(5).into(), Register(2).into(), Register(8)),
            "and r3, %1337, r7"    => And(Register(3).into(), Direct::Numeric(1337).into(), Register(7)),
            "and r14, 13, r11"     => And(Register(14).into(), Indirect::Numeric(13).into(), Register(11)),
            "and %42, 13, r14"     => And(Direct::Numeric(42).into(), Indirect::Numeric(13).into(), Register(14)),
            "and %1337, %:foo, r8" => And(Direct::Numeric(1337).into(), Direct::Label("foo".into()).into(), Register(8)),
            "and %:bar,:baz,r5"    => And(Direct::Label("bar".into()).into(), Indirect::Label("baz".into()).into(), Register(5)),
            "and :bar,r1,r8"       => And(Indirect::Label("bar".into()).into(), Register(1).into(), Register(8)),
            "and 7,%1337,r11"      => And(Indirect::Numeric(7).into(), Direct::Numeric(1337).into(), Register(11)),
            "and 42,666 ,r12"      => And(Indirect::Numeric(42).into(), Indirect::Numeric(666).into(), Register(12)),
        )
    }

    #[test]
    fn or() {
        test_ops!(
            "or r5, r2, r8"       => Or(Register(5).into(), Register(2).into(), Register(8)),
            "or r3, %1337, r7"    => Or(Register(3).into(), Direct::Numeric(1337).into(), Register(7)),
            "or r14, 13, r11"     => Or(Register(14).into(), Indirect::Numeric(13).into(), Register(11)),
            "or %42, 13, r14"     => Or(Direct::Numeric(42).into(), Indirect::Numeric(13).into(), Register(14)),
            "or %1337, %:foo, r8" => Or(Direct::Numeric(1337).into(), Direct::Label("foo".into()).into(), Register(8)),
            "or %:bar,:baz,r5"    => Or(Direct::Label("bar".into()).into(), Indirect::Label("baz".into()).into(), Register(5)),
            "or :bar,r1,r8"       => Or(Indirect::Label("bar".into()).into(), Register(1).into(), Register(8)),
            "or 7,%1337,r11"      => Or(Indirect::Numeric(7).into(), Direct::Numeric(1337).into(), Register(11)),
            "or 42,666 ,r12"      => Or(Indirect::Numeric(42).into(), Indirect::Numeric(666).into(), Register(12)),
        )
    }

    #[test]
    fn xor() {
        test_ops!(
            "xor r5, r2, r8"       => Xor(Register(5).into(), Register(2).into(), Register(8)),
            "xor r3, %1337, r7"    => Xor(Register(3).into(), Direct::Numeric(1337).into(), Register(7)),
            "xor r14, 13, r11"     => Xor(Register(14).into(), Indirect::Numeric(13).into(), Register(11)),
            "xor %42, 13, r14"     => Xor(Direct::Numeric(42).into(), Indirect::Numeric(13).into(), Register(14)),
            "xor %1337, %:foo, r8" => Xor(Direct::Numeric(1337).into(), Direct::Label("foo".into()).into(), Register(8)),
            "xor %:bar,:baz,r5"    => Xor(Direct::Label("bar".into()).into(), Indirect::Label("baz".into()).into(), Register(5)),
            "xor :bar,r1,r8"       => Xor(Indirect::Label("bar".into()).into(), Register(1).into(), Register(8)),
            "xor 7,%1337,r11"      => Xor(Indirect::Numeric(7).into(), Direct::Numeric(1337).into(), Register(11)),
            "xor 42,666 ,r12"      => Xor(Indirect::Numeric(42).into(), Indirect::Numeric(666).into(), Register(12)),
        )
    }

    #[test]
    fn zjmp() {
        test_ops!(
            "zjmp %10" => Zjmp(Direct::Numeric(10))
        )
    }

    #[test]
    fn ldi() {
        test_ops!(
            "ldi r1, r2, r3" => Ldi(Register(1).into(), Register(2).into(), Register(3)),
            "ldi r2, %1, r4" => Ldi(Register(2).into(), Direct::Numeric(1).into(), Register(4)),
            "ldi %-1, r2, r5" => Ldi(Direct::Numeric(-1).into(), Register(2).into(), Register(5)),
            "ldi %42, %42, r6" => Ldi(Direct::Numeric(42).into(), Direct::Numeric(42).into(), Register(6)),
            "ldi :foo, r2, r7" => Ldi(Indirect::Label("foo".into()).into(), Register(2).into(), Register(7)),
            "ldi 6, %1337, r8" => Ldi(Indirect::Numeric(6).into(), Direct::Numeric(1337).into(), Register(8)),
        )
    }

    #[test]
    fn sti() {
        test_ops!(
            "sti r3, r1, r2" => Sti(Register(3), Register(1).into(), Register(2).into()),
            "sti r4, r2, %1" => Sti(Register(4), Register(2).into(), Direct::Numeric(1).into()),
            "sti r5, %-1, r2" => Sti(Register(5), Direct::Numeric(-1).into(), Register(2).into()),
            "sti r6, %42, %42" => Sti(Register(6), Direct::Numeric(42).into(), Direct::Numeric(42).into()),
            "sti r7, :foo, r2" => Sti(Register(7), Indirect::Label("foo".into()).into(), Register(2).into()),
            "sti r8, 6, %1337" => Sti(Register(8), Indirect::Numeric(6).into(), Direct::Numeric(1337).into()),
        )
    }

    #[test]
    fn fork() {
        test_ops!(
            "fork %:start" => Fork(Direct::Label("start".into()))
        )
    }

    #[test]
    fn lld() {
        test_ops!(
            "lld   %:here,  r6"  => Lld(Direct::Label("here".into()).into(), Register(6)),
            "lld   :there,  r12" => Lld(Indirect::Label("there".into()).into(), Register(12)),
        )
    }

    #[test]
    fn lldi() {
        test_ops!(
            "lldi r1, r2, r3" => Lldi(Register(1).into(), Register(2).into(), Register(3)),
            "lldi r2, %1, r4" => Lldi(Register(2).into(), Direct::Numeric(1).into(), Register(4)),
            "lldi %-1, r2, r5" => Lldi(Direct::Numeric(-1).into(), Register(2).into(), Register(5)),
            "lldi %42, %42, r6" => Lldi(Direct::Numeric(42).into(), Direct::Numeric(42).into(), Register(6)),
            "lldi :foo, r2, r7" => Lldi(Indirect::Label("foo".into()).into(), Register(2).into(), Register(7)),
            "lldi 6, %1337, r8" => Lldi(Indirect::Numeric(6).into(), Direct::Numeric(1337).into(), Register(8)),
        )
    }

    #[test]
    fn lfork() {
        test_ops!(
            "lfork %666" => Lfork(666.into())
        )
    }

    #[test]
    fn aff() {
        test_ops!(
            "aff r12" => Aff(Register(12))
        )
    }
}

#[test]
fn label() {
    parse_test("loop:", Label("loop".into()))
}

#[test]
fn label_and_op() {
    parse_test(
        "loop: xor r2, r2, r2",
        LabelAndOp(
            "loop".into(),
            Xor(Register(2).into(), Register(2).into(), Register(2)),
        ),
    )
}

#[test]
fn remaining_input() {
    parse_expect_err("live %1 woops", RemainingInput(Ident.at(8..13)))
}

#[test]
fn unexpected() {
    parse_expect_err(":loop", Unexpected(LabelUse.at(0..5)))
}

#[test]
fn expected_but_got() {
    parse_expect_err("live wat", ExpectedButGot(DirectChar, Ident.at(5..8)))
}

#[test]
fn expected_but_got_eof() {
    parse_expect_err(".name ", ExpectedButGotEof(QuotedString))
}

#[test]
fn expected_one_of() {
    parse_expect_err(
        "ldi r1, :start, r1",
        ExpectedOneOf(vec![
            ExpectedButGot(Ident, LabelUse.at(8..14)),
            ExpectedButGot(DirectChar, LabelUse.at(8..14)),
        ]),
    )
}

#[test]
fn invalid_register_count() {
    parse_expect_err("aff r18", InvalidRegisterCount(18, Ident.at(4..7)))
}

#[test]
fn invalid_register_prefix() {
    parse_expect_err("aff g18", InvalidRegisterPrefix('g', Ident.at(4..7)))
}

#[test]
fn invalid_op_mnemonic() {
    parse_expect_err(
        "loop: wat 42",
        InvalidOpMnemonic("wat".into(), Ident.at(6..9)),
    )
}
