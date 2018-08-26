use lexer::{Token, Term, Tokenizer, LexerError};
use types::*;

use std::io::{Read, BufRead, BufReader};

pub fn parse(input: impl Read) -> Result<ParsedChampion, ParseError> {
    let mut parsed_lines = BufReader::new(input)
        .lines()
        .enumerate()
        .map(|(i, read_result)| {
            read_result
                .map_err(ParseError::IOError)
                .and_then(|s| parse_line(&s))
        });

    let builder = parsed_lines
        .try_fold(ParsedChampionBuilder::default(), |builder, line_result| {
            line_result.and_then(|parsed_line| {
                add_parsed_line(builder, parsed_line)
                    .map_err(ParseError::ChampionError)
            })
        })?;

    builder.finish()
        .map_err(ParseError::ChampionError)
}

use std::boxed::FnBox;

#[derive(Clone)]
struct Input<'a> {
    tokens: ::std::iter::Peekable<Tokenizer<'a>>,
    input: &'a str
}

type ParseResult<'a, T> = Result<(Input<'a>, T), ParseError>;

struct Parser<T> {
    run: Box<FnBox(Input) -> ParseResult<T>>
}

impl<T: 'static> Parser<T> {
    fn new(parse: impl FnOnce(Input) -> ParseResult<T> + 'static) -> Self {
        Self { run: Box::new(parse) }
    }

    fn parse(self, input: Input) -> ParseResult<T> {
        self.run.call_box((input,))
    }

    fn map<U: 'static>(self, f: impl FnOnce(T) -> U + 'static) -> Parser<U> {
        Parser::new(move |i|
            self.parse(i)
                .map(|(i, r)| (i, f(r)))
        )
    }

    fn bind<U: 'static>(self, f: impl FnOnce(T) -> Parser<U> + 'static) -> Parser<U> {
        Parser::new(move|i| {
            self.parse(i)
                .and_then(|(i, r)| f(r).parse(i))
        })
    }

    fn bind_ctx<U: 'static>(self, f: impl FnOnce(T, &Input) -> Parser<U> + 'static) -> Parser<U> {
        Parser::new(move|i| {
            self.parse(i)
                .and_then(|(i, r)| f(r, &i).parse(i))
        })
    }

    fn map_ctx<U: 'static>(self, f: impl FnOnce(T, &Input) -> U + 'static) -> Parser<U> {
        Parser::new(move |i|
            self.parse(i)
                .map(|(i, r)| { let x = f(r, &i); (i, x) })
        )
    }

    fn or(self, pb: Parser<T>) -> Parser<T> {
        Parser::new(move |i|
            self.parse(i.clone())
                .or_else(|_| pb.parse(i))
        )
    }

    fn and<U: 'static>(self, pu: Parser<U>) -> Parser<(T, U)> {
        Parser::new(move |i| {
            self.parse(i)
                .and_then(|(i, r1)| {
                    pu.parse(i)
                        .map(|(i, r2)| (i, (r1, r2)))
                })
        })
    }

    fn then<U: 'static>(self, pu: Parser<U>) -> Parser<U> {
        Parser::new(move |i| {
            self.parse(i)
                .and_then(|(i, _)| {
                    pu.parse(i)
                })
        })
    }

    fn followed<U: 'static>(self, pu: Parser<U>) -> Parser<T> {
        Parser::new(move |i| {
            self.parse(i)
                .and_then(|(i, r)| {
                    pu.parse(i).map(|(i, _)| (i, r))
                })
        })
    }
}

impl<T: 'static, U: 'static, F: 'static> ::std::ops::BitAnd<F> for Parser<T>
where
    F: FnOnce(T) -> U
{
    type Output = Parser<U>;

    fn bitand(self, f: F) -> Self::Output {
        self.map(f)
    }
}

impl<T: 'static> ::std::ops::BitOr for Parser<T> {
    type Output = Self;

    fn bitor(self, other: Self) -> Self {
        self.or(other)
    }
}

impl<T: 'static, U: 'static> ::std::ops::Add<Parser<U>> for Parser<T> {
    type Output = Parser<(T, U)>;

    fn add(self, other: Parser<U>) -> Self::Output {
        self.and(other)
    }
}

impl<T: 'static, U: 'static> ::std::ops::Rem<Parser<U>> for Parser<T> {
    type Output = Parser<(T, U)>;

    fn rem(self, other: Parser<U>) -> Self::Output {
        (self << is(Term::ParamSeparator)).and(other)
    }
}

impl<T: 'static, U: 'static> ::std::ops::Shr<Parser<U>> for Parser<T> {
    type Output = Parser<U>;

    fn shr(self, other: Parser<U>) -> Self::Output {
        self.then(other)
    }
}

impl<T: 'static, U: 'static> ::std::ops::Shl<Parser<U>> for Parser<T> {
    type Output = Parser<T>;

    fn shl(self, other: Parser<U>) -> Self::Output {
        self.followed(other)
    }
}

fn value<T: 'static>(t: impl FnOnce() -> T + 'static) -> Parser<T> {
    Parser::new(move |i| Ok((i, t())))
}

fn fail<T: 'static>(e: ParseError) -> Parser<T> {
    Parser::new(move |_| Err(e))
}

fn token() -> Parser<Token> {
    Parser::new(|mut i| {
        if i.tokens.peek().is_none() {
            Err(ParseError::ParserError(ParserError::Failed))
        } else {
            i.tokens.next().unwrap()
                .map(|r| (i, r)).map_err(ParseError::LexerError)
        }
    })
}

fn satisfy(f: impl FnOnce(&Token) -> bool + 'static) -> Parser<Token> {
    token().bind(move |b| {
        if f(&b) { value(move || b) }
        else     { fail(ParseError::ParserError(ParserError::Failed)) }
    })
}

fn is(t: Term) -> Parser<Token> {
    satisfy(move |tok| tok.term == t)
}

fn tok_string<'a>(tok: Token, ctx: &Input<'a>) -> String {
    String::from(&ctx.input[tok.range])
}

fn champion_name() -> Parser<String> {
    is(Term::ChampionNameCmd) >>
    is(Term::QuotedString).map_ctx(tok_string)
}

fn champion_comment() -> Parser<String> {
    is(Term::ChampionCommentCmd) >>
    is(Term::QuotedString).map_ctx(tok_string)
}

fn label() -> Parser<String> {
    is(Term::Ident).map_ctx(tok_string) <<
    is(Term::LabelChar)
}

fn label_param() -> Parser<String> {
    is(Term::LabelChar) >>
    is(Term::Ident).map_ctx(tok_string)
}

fn number() -> Parser<i32> {
    is(Term::Number).map_ctx(|tok, ctx| {
        ctx.input[tok.range].parse().expect("Overflow on i32")
    })
}

fn register() -> Parser<Register> {
    is(Term::Ident)
        .bind_ctx(|tok, ctx| {
            let as_str = &ctx.input[tok.range];
            let mut chars = as_str.chars();

            if let Some('r') = chars.next() {
                match chars.as_str().parse() {
                    Ok(x) if 1 <= x && x <= 16 => value(move || Register(x as u8)),
                    _ => fail(ParseError::ParserError(ParserError::Failed))
                }
            } else {
                fail(ParseError::ParserError(ParserError::Failed))
            }
        })
}

fn direct() -> Parser<Direct> {
    is(Term::DirectChar) >> (
        label_param() & Direct::Label
      | number() & Direct::Numeric
    )
}

fn indirect() -> Parser<Indirect> {
      label_param() & Indirect::Label
    | number() & Indirect::Numeric
}

fn reg_dir() -> Parser<RegDir> {
      register() & RegDir::Reg
    | direct() & RegDir::Dir
}

fn reg_ind() -> Parser<RegInd> {
      register() & RegInd::Reg
    | indirect() & RegInd::Ind
}

fn dir_ind() -> Parser<DirInd> {
      direct() & DirInd::Dir
    | indirect() & DirInd::Ind
}

fn any_param() -> Parser<AnyParam> {
      register() & AnyParam::Reg
    | direct() & AnyParam::Dir
    | indirect() & AnyParam::Ind
}

fn op() -> Parser<Op> {
    Parser::new(|i| {
        is(Term::Ident).parse(i)
            .and_then(|(i, tok)| {
                let as_str = &i.input[tok.range];
                println!("{}", as_str);

                let parser = match as_str {
                    "live"  => (direct()                              ) &               Op::Live,
                    "ld"    => (dir_ind()   % register()              ) & |(a, b)|      Op::Ld(a, b),
                    "st"    => (register()  % reg_ind()               ) & |(a, b)|      Op::St(a, b),
                    "add"   => (register()  % register() % register() ) & |((a, b), c)| Op::Add(a, b, c),
                    "sub"   => (register()  % register() % register() ) & |((a, b), c)| Op::Sub(a, b, c),
                    "and"   => (any_param() % any_param() % register()) & |((a, b), c)| Op::And(a, b, c),
                    "or"    => (any_param() % any_param() % register()) & |((a, b), c)| Op::Or(a, b, c),
                    "xor"   => (any_param() % any_param() % register()) & |((a, b), c)| Op::Xor(a, b, c),
                    "zjmp"  => (direct()                              ) &               Op::Zjmp,
                    "ldi"   => (any_param() % reg_dir() %   register()) & |((a, b), c)| Op::Ldi(a, b, c),
                    "sti"   => (register()  % any_param() % reg_dir() ) & |((a, b), c)| Op::Sti(a, b, c),
                    "fork"  => (direct()                              ) &               Op::Fork,
                    "lld"   => (dir_ind()   %  register()             ) & |(a, b)|      Op::Lld(a, b),
                    "lldi"  => (any_param() % reg_dir() % register()  ) & |((a, b), c)| Op::Lldi(a, b, c),
                    "lfork" => (direct()                              ) &               Op::Lfork,
                    "aff"   => (register()                            ) &               Op::Aff,

                    _ => return Err(ParseError::ParserError(ParserError::Failed))
                };

                parser.parse(i)
            })
    })
}

fn parse_line(input: &str) -> Result<ParsedLine, ParseError> {
    let mut tokens = Tokenizer::new(input).peekable();

    let parser = match tokens.peek() {
        None => return Ok(ParsedLine::Empty),
        Some(Err(e)) => return Err(ParseError::LexerError(e.clone())),

        Some(Ok(tok)) => match tok.term {
            Term::ChampionNameCmd    =>
                champion_name()     & ParsedLine::ChampionName,
            Term::ChampionCommentCmd =>
                champion_comment()  & ParsedLine::ChampionComment,
            Term::Ident              =>
                  ((label() + op()) & |(label, op)| ParsedLine::LabelAndOp(label, op))
                | label()           & ParsedLine::Label
                | op()              & ParsedLine::Op,

            Term::Comment => return Ok(ParsedLine::Empty),
            _             => return Err(ParseError::ParserError(ParserError::Unexpected(tok.clone()))),
        }
    };

    parser.parse(Input { tokens, input })
        .map(|(_, r)| r)
}

#[derive(Debug)]
pub enum ParsedLine {
    ChampionName(String),
    ChampionComment(String),
    Op(Op),
    Label(String),
    LabelAndOp(String, Op),
    Empty,
}

#[derive(Debug)]
pub enum ParsedInstruction {
    Label(String),
    Op(Op),
}

#[derive(Debug)]
pub struct ParsedChampion {
    pub name: String,
    pub comment: String,
    pub instructions: Vec<ParsedInstruction>
}

#[derive(Default)]
struct ParsedChampionBuilder {
    name: Option<String>,
    comment: Option<String>,
    instructions: Vec<ParsedInstruction>
}

impl ParsedChampionBuilder {
    fn with_name(self, name: String) -> Result<Self, ChampionError> {
        match self.name {
            Some(name) => Err(ChampionError::NameAlreadySet(name)),
            None       => Ok(Self { name: Some(name), ..self })
        }
    }

    fn with_comment(self, comment: String) -> Result<Self, ChampionError> {
        match self.comment {
            Some(comment) => Err(ChampionError::CommentAlreadySet(comment)),
            None          => Ok(Self { comment: Some(comment), ..self })
        }
    }

    fn add_label(mut self, label: String) -> Self {
        self.instructions.push(ParsedInstruction::Label(label));
        self
    }

    fn add_op(mut self, op: Op) -> Self {
        self.instructions.push(ParsedInstruction::Op(op));
        self
    }

    fn finish(self) -> Result<ParsedChampion, ChampionError> {
        match (self.name, self.comment) {
            (None, _) => Err(ChampionError::MissingName),
            (_, None) => Err(ChampionError::MissingComment),
            (Some(name), Some(comment)) => Ok(ParsedChampion {
                name, comment, instructions: self.instructions
            })
        }
    }
}

fn add_parsed_line(builder: ParsedChampionBuilder, parsed_line: ParsedLine)
    -> Result<ParsedChampionBuilder, ChampionError>
{
    use self::ParsedLine::*;

    match parsed_line {
        ChampionName(name)       => builder.with_name(name),
        ChampionComment(comment) => builder.with_comment(comment),

        Op(op)                => Ok(builder.add_op(op)),
        Label(label)          => Ok(builder.add_label(label)),
        LabelAndOp(label, op) => Ok(builder.add_label(label).add_op(op)),

        Empty => Ok(builder),
    }
}

#[derive(Debug)]
pub enum ParseError {
    IOError(::std::io::Error),
    LexerError(LexerError),
    ParserError(ParserError),
    ChampionError(ChampionError),
}

#[derive(Debug)]
pub enum ParserError {
    Failed,
    Unexpected(Token),
    Expected(Term),
    InvalidRegisterCount(i32),
}

#[derive(Debug)]
pub enum ChampionError {
    NameAlreadySet(String),
    CommentAlreadySet(String),
    MissingName,
    MissingComment,
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test() {
        let input = "r1";
        let tokens = Tokenizer::new(input).peekable();
        for t in tokens.clone() {
            println!("{:?}", t);
        }
        println!("{:?}", register().parse(Input { tokens, input }).map(|(_, r)| r));
        assert!(false);
    }
}
