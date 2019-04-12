use corewar::language::lexer::{Token, TokenResult, LexerErrorKind::*, NumberBase::*, Term::*};
use corewar::language;

fn tokens(input: &str) -> Vec<TokenResult> {
    language::lexer::Tokenizer::new(input)
        .collect()
}

fn tokens_ok(input: &str) -> Vec<Token> {
    tokens(input)
        .into_iter()
        .collect::<Result<_, _>>()
        .expect("Failed to tokenize")
}

#[test]
fn empty() {
    assert_eq!(tokens(""), [])
}

#[test]
fn name_directive() {
    assert_eq!(tokens_ok(r#".name "Hello""#), [
        ChampionNameCmd.at(0..5),
        QuotedString.at(7..12),
    ])
}

#[test]
fn comment_directive() {
    assert_eq!(tokens_ok(r#".comment "Hello""#), [
        ChampionCommentCmd.at(0..8),
        QuotedString.at(10..15),
    ])
}

#[test]
fn code_directive() {
    assert_eq!(tokens_ok(r#".code 0x42 1337 0d78"#), [
        CodeCmd.at(0..5),
        Number { base: Hexadecimal }.at(6..10),
        Number { base: Decimal }.at(11..15),
        Number { base: Decimal }.at(16..20),
    ])
}

#[test]
fn only_comment() {
    assert_eq!(tokens_ok(r#"# This is a comment"#), [
        Comment.at(0..19)
    ])
}

#[test]
fn comment_after_instruction() {
    assert_eq!(
        tokens_ok(r#"ld 42, r1 # This is a comment"#)[4],
        Comment.at(10..29)
    )
}

#[test]
fn label_def() {
    assert_eq!(tokens_ok("some_label123:"), [
        LabelDef.at(0..14)
    ]);
}

#[test]
fn label_use() {
    assert_eq!(tokens_ok("ld :some_label123, r1"), [
        Ident.at(0..2),
        LabelUse.at(3..17),
        ParamSeparator.at(17..18),
        Ident.at(19..21)
    ]);
}

#[test]
fn direct() {
    assert_eq!(tokens_ok("live %42"), [
        Ident.at(0..4),
        DirectChar.at(5..6),
        Number { base: Decimal }.at(6..8)
    ]);
}

#[test]
fn invalid_directive() {
    assert_eq!(tokens(".foo"), [
        Err(InvalidDirective.at(0..4))
    ])
}

#[test]
fn unclosed_quoted_string() {
    assert_eq!(tokens(r#".name "Hello"#), [
        Ok(ChampionNameCmd.at(0..5)),
        Err(UnclosedQuotedString.at(6..12))
    ])
}

#[test]
fn dangling_minus() {
    assert_eq!(tokens("fork %-"), [
        Ok(Ident.at(0..4)),
        Ok(DirectChar.at(5..6)),
        Err(NoNumberAfterMinus.at(6..7))
    ])
}

#[test]
fn empty_label_def() {
    assert_eq!(tokens(":"), [
        Err(EmptyLabel.at(0..1))
    ])
}

#[test]
fn empty_label_use() {
    assert_eq!(tokens("fork %:"), [
        Ok(Ident.at(0..4)),
        Ok(DirectChar.at(5..6)),
        Err(EmptyLabel.at(6..7))
    ])
}

#[test]
fn no_match() {
    assert_eq!(tokens("{[^"), [
        Err(NoMatch.at(0..1)),
        Err(NoMatch.at(1..2)),
        Err(NoMatch.at(2..3)),
    ])
}
