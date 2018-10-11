use super::lexer::{Token, Term, Tokenizer, TokenResult, LexerError};
use super::types::*;

mod combinator;
use self::combinator::*;

#[derive(Debug)]
pub enum ParsedLine {
    ChampionName(String),
    ChampionComment(String),
    Op(Op),
    Label(String),
    LabelAndOp(String, Op),
    Empty,
}

pub fn parse_line(input: &str) -> Result<ParsedLine, ParseError> {
    let mut tokens = TokenStream::new(input);

    let first_tok = match tokens.peek() {
        None             => return Ok(ParsedLine::Empty),
        Some(tok_result) => tok_result.clone().map_err(ParseError::LexerError)?
    };

    let parse_result = match first_tok.term {
        Term::ChampionNameCmd => {
            champion_name(&mut tokens)
                .map(ParsedLine::ChampionName)
        },
        Term::ChampionCommentCmd => {
            champion_comment(&mut tokens)
                .map(ParsedLine::ChampionComment)
        },
        Term::LabelDef => {
            label.and(op.optional())
                .map(|(label, opt_op)| match opt_op {
                    None => ParsedLine::Label(label),
                    Some(op) => ParsedLine::LabelAndOp(label, op)
                })
                .parse(&mut tokens)
        },
        Term::Ident => {
            op(&mut tokens)
                .map(ParsedLine::Op)
        },
        Term::Comment => return Ok(ParsedLine::Empty),
        _             => return Err(ParseError::Unexpected(first_tok)),
    }?;

    // Remaining input besides comments => Error
    match tokens.peek() {
        None | Some(Ok(Token { term: Term::Comment, .. })) => Ok(parse_result),
        Some(Ok(token))      => Err(ParseError::RemainingInput(token.clone())),
        Some(Err(lex_error)) => Err(ParseError::LexerError(lex_error.clone()))
    }
}

type ParseResult<T> = Result<T, ParseError>;

fn champion_name(input: &mut TokenStream) -> ParseResult<String> {
    input.next(Term::ChampionNameCmd)?;
    input.next(Term::QuotedString).map(String::from)
}

fn champion_comment(input: &mut TokenStream) -> ParseResult<String> {
    input.next(Term::ChampionCommentCmd)?;
    input.next(Term::QuotedString).map(String::from)
}

fn label(input: &mut TokenStream) -> ParseResult<String> {
    input.next(Term::LabelDef)
        .map(|label_str| String::from(&label_str[..label_str.len() - 1]))
}

fn label_param(input: &mut TokenStream) -> ParseResult<String> {
    input.next(Term::LabelUse)
        .map(|label_str| String::from(&label_str[1..]))
}

fn number(input: &mut TokenStream) -> ParseResult<i64> {
    let number_as_str = input.next(Term::Number)?;
    number_as_str.parse().map_err(ParseError::ParseIntError)
}

fn register(input: &mut TokenStream) -> ParseResult<Register> {
    let reg_str = input.next(Term::Ident)?;
    let mut chars = reg_str.chars();

    let first_char = chars.next().ok_or(ParseError::MissingRegisterPrefix)?;
    let reg_num: i64 = chars.as_str().parse()
        .map_err(ParseError::ParseIntError)?;

    match (first_char, reg_num) {
        ('r', x) if 1 <= x && x <= 16 => Ok(Register(reg_num as u8)),
        ('r', x) => Err(ParseError::InvalidRegisterCount(x)),
        (c,   _) => Err(ParseError::InvalidRegisterPrefix(c)),
    }
}

fn direct(input: &mut TokenStream) -> ParseResult<Direct> {
    input.next(Term::DirectChar)?;
    label_param.map(Direct::Label)
        .or(number.map(Direct::Numeric))
        .map_err(expected_either)
        .parse(input)
}

fn indirect(input: &mut TokenStream) -> ParseResult<Indirect> {
    label_param.map(Indirect::Label)
        .or(number.map(Indirect::Numeric))
        .map_err(expected_either)
        .parse(input)
}

fn reg_dir(input: &mut TokenStream) -> ParseResult<RegDir> {
    register.map(RegDir::Reg)
        .or(direct.map(RegDir::Dir))
        .map_err(expected_either)
        .parse(input)
}

fn reg_ind(input: &mut TokenStream) -> ParseResult<RegInd> {
    register.map(RegInd::Reg)
        .or(indirect.map(RegInd::Ind))
        .map_err(expected_either)
        .parse(input)
}

fn dir_ind(input: &mut TokenStream) -> ParseResult<DirInd> {
    direct.map(DirInd::Dir)
        .or(indirect.map(DirInd::Ind))
        .map_err(expected_either)
        .parse(input)
}

fn any_param(input: &mut TokenStream) -> ParseResult<AnyParam> {
    register.map(AnyParam::Reg)
        .or(direct.map(AnyParam::Dir))
        .or(indirect.map(AnyParam::Ind))
        .map_err(|((e1, e2), e3)| ParseError::ExpectedOneOf(vec![e1, e2, e3]))
        .parse(input)
}

fn op(input: &mut TokenStream) -> ParseResult<Op> {
    macro_rules! parse_op {
        ( $op:expr, $p:expr $(,$ps:expr )* ) => {
            Ok($op(
                $p(input)?
                $(, { input.next(Term::ParamSeparator)?; $ps(input)? })*
            ))
        };
    }

    let mnemonic = input.next(Term::Ident)?;

    match mnemonic {
        "live"  => parse_op!( Op::Live,  direct                         ),
        "ld"    => parse_op!( Op::Ld,    dir_ind,   register            ),
        "st"    => parse_op!( Op::St,    register,  reg_ind             ),
        "add"   => parse_op!( Op::Add,   register,  register,  register ),
        "sub"   => parse_op!( Op::Sub,   register,  register,  register ),
        "and"   => parse_op!( Op::And,   any_param, any_param, register ),
        "or"    => parse_op!( Op::Or,    any_param, any_param, register ),
        "xor"   => parse_op!( Op::Xor,   any_param, any_param, register ),
        "zjmp"  => parse_op!( Op::Zjmp,  direct                         ),
        "ldi"   => parse_op!( Op::Ldi,   any_param, reg_dir,   register ),
        "sti"   => parse_op!( Op::Sti,   register,  any_param, reg_dir  ),
        "fork"  => parse_op!( Op::Fork,  direct                         ),
        "lld"   => parse_op!( Op::Lld,   dir_ind,   register            ),
        "lldi"  => parse_op!( Op::Lldi,  any_param, reg_dir,   register ),
        "lfork" => parse_op!( Op::Lfork, direct                         ),
        "aff"   => parse_op!( Op::Aff,   register                       ),

        _ => Err(ParseError::InvalidOpMnemonic(String::from(mnemonic)))
    }
}

#[derive(Clone)]
struct TokenStream<'a> {
    tokens: ::std::iter::Peekable<Tokenizer<'a>>,
    input: &'a str
}

impl<'a> TokenStream<'a> {
    fn new(input: &'a str) -> Self {
        Self {
            tokens: Tokenizer::new(input).peekable(),
            input
        }
    }

    fn peek(&mut self) -> Option<&TokenResult> {
        self.tokens.peek()
    }

    fn next(&mut self, term: Term) -> ParseResult<&'a str> {
        let token_result = self.tokens
            .next()
            .ok_or_else(|| ParseError::ExpectedButGotEof(term.clone()))?;

        let token = token_result.map_err(ParseError::LexerError)?;

        if token.term == term {
            Ok(&self.input[token.range])
        } else {
            Err(ParseError::ExpectedButGot(term, token))
        }
    }
}

#[derive(Debug)]
pub enum ParseError {
    RemainingInput(Token),
    LexerError(LexerError),
    Unexpected(Token),
    ExpectedButGot(Term, Token),
    ExpectedButGotEof(Term),
    ExpectedOneOf(Vec<ParseError>),
    InvalidRegisterCount(i64),
    InvalidRegisterPrefix(char),
    MissingRegisterPrefix,
    ParseIntError(::std::num::ParseIntError),
    InvalidOpMnemonic(String),
}

fn expected_either((e1, e2): (ParseError, ParseError)) -> ParseError {
    ParseError::ExpectedOneOf(vec![e1, e2])
}
