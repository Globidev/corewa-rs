const IDENT_CHARS: &str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789";

type InputRange = ::std::ops::Range<usize>;

#[derive(Debug, Clone)]
pub struct Token {
    pub term: Term,
    pub range: InputRange
}

pub type TokenResult = Result<Token, LexerError>;

#[derive(Clone)]
pub struct Tokenizer<'a> {
    chars: std::iter::Peekable<std::str::CharIndices<'a>>,
    pub input: &'a str
}

impl Iterator for Tokenizer<'_> {
    type Item = TokenResult;

    fn next(&mut self) -> Option<Self::Item> {
        self.skip_while(|(_, c)| c.is_whitespace());

        self.chars.peek()
            .cloned()
            .map(|(idx, chr)| match chr {
                ':' => self.lex_label_use(idx),
                ',' => self.lex_single(Term::ParamSeparator, idx),
                '%' => self.lex_single(Term::DirectChar, idx),

                '.' => self.lex_directive(idx),
                '"' => self.lex_quoted_string(idx),
                '#' => self.lex_comment(idx),
                '-' => self.lex_negative_number(idx),

                c if c.is_digit(10)          => self.lex_number(idx),
                c if IDENT_CHARS.contains(c) => self.lex_ident(idx),

                _ => {
                    self.chars.next();
                    Err(LexerErrorKind::NoMatch.at(idx..idx+1))
                }
            })
    }
}

impl Tokenizer<'_> {
    pub fn new(input: &str) -> Tokenizer<'_> {
        Tokenizer {
            chars: input.char_indices().peekable(),
            input
        }
    }

    fn skip_while<F>(&mut self, skipper: F)
    where
        F: Fn(&(usize, char)) -> bool
    {
        while self.chars.peek()
                .map(|c| skipper(c))
                .unwrap_or(false)
        {
            self.chars.next();
        }
    }

    fn lex_label_use(&mut self, idx_start: usize) -> TokenResult {
        self.chars.next(); // consume
        match self.chars.peek().cloned() {
            Some((_, c)) if IDENT_CHARS.contains(c) => {
                self.skip_while(|&(_, c)| IDENT_CHARS.contains(c));
                Ok(Term::LabelUse.at(idx_start..self.peek_idx()))
            }
            _ => Err(LexerErrorKind::EmptyLabel.at(idx_start..idx_start+1))
        }
    }

    fn lex_single(&mut self, term: Term, idx_start: usize) -> TokenResult {
        self.chars.next(); // consume

        Ok(term.at(idx_start..self.peek_idx()))
    }

    fn lex_directive(&mut self, idx_start: usize)
        -> TokenResult
    {
        const DIRECTIVES: [(&str, Term); 3] = [
            (".name",    Term::ChampionNameCmd),
            (".comment", Term::ChampionCommentCmd),
            (".code",    Term::CodeCmd),
        ];

        let current_str = &self.input[idx_start..];
        let directive = DIRECTIVES.iter()
            .find(|&(cmd, _)| current_str.starts_with(cmd));

        match directive {
            None => {
                self.skip_while(|&(_, c)| c.is_whitespace());
                Err(LexerErrorKind::InvalidDirective.at(idx_start..self.peek_idx()))
            },
            Some((cmd, term)) => {
                let next = self.chars.by_ref().nth(cmd.len());
                let term = term.clone();

                match next {
                    Some((idx_end, chr)) if chr.is_whitespace() => {
                        Ok(term.at(idx_start..idx_end))
                    },
                    None => {
                        Ok(term.at(idx_start..self.input.len()))
                    },
                    _ => Err(LexerErrorKind::InvalidDirective.at(idx_start..idx_start+cmd.len()))
                }
            }
        }
    }

    fn lex_quoted_string(&mut self, idx_start: usize)
        -> TokenResult
    {
        self.chars.next(); // skip the start quote
        self.skip_while(|&(_, c)| c != '"');

        let token_result = self.chars.peek()
            .map(|(idx_end, _)| Term::QuotedString.at(idx_start+1..*idx_end))
            .ok_or_else(|| LexerErrorKind::UnclosedQuotedString.at(idx_start..self.peek_idx()));

        self.chars.next(); // skip the end quote
        token_result
    }

    fn lex_comment(&mut self, idx_start: usize)
        -> TokenResult
    {
        self.chars.by_ref().last(); // Consume everything

        Ok(Term::Comment.at(idx_start..self.input.len()))
    }

    fn lex_negative_number(&mut self, idx_start: usize)
        -> TokenResult
    {
        self.chars.next(); // consume -

        match self.chars.peek() {
            Some((_, c)) if c.is_digit(10) => self.lex_number(idx_start),
            _ => Err(LexerErrorKind::NoNumberAfterMinus.at(idx_start..idx_start+1))
        }
    }

    fn lex_number(&mut self, idx_start: usize)
        -> TokenResult
    {
        let (_, first_digit) = self.chars.next()
            .expect("Empty input while lexing number");

        let second_digit = self.chars.peek().map(|(_, c)| c);

        let base = match (first_digit, second_digit) {
            ('0', Some('x')) => {
                self.chars.next();
                NumberBase::Hexadecimal
            },
            ('0', Some('d')) => {
                self.chars.next();
                NumberBase::Decimal
            },
            _ => NumberBase::Decimal
        };

        self.skip_while(|(_, c)| c.is_digit(base.radix()));
        Ok(Term::Number { base }.at(idx_start..self.peek_idx()))
    }

    fn lex_ident(&mut self, idx_start: usize)
        -> TokenResult
    {
        self.skip_while(|&(_, c)| IDENT_CHARS.contains(c));

        let term = match self.chars.peek() {
            Some((_, ':')) => {
                self.chars.next();
                Term::LabelDef
            },
            _ => Term::Ident
        };

        Ok(term.at(idx_start..self.peek_idx()))
    }

    fn peek_idx(&mut self) -> usize {
        self.chars.peek()
            .map(|(idx, _)| *idx)
            .unwrap_or_else(|| self.input.len())
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Term {
    ChampionNameCmd,
    ChampionCommentCmd,
    CodeCmd,
    QuotedString,
    Comment,
    LabelDef,
    LabelUse,
    ParamSeparator,
    DirectChar,
    Number { base: NumberBase },
    Ident
}

#[derive(Debug, Clone, PartialEq)]
pub enum NumberBase {
    Decimal,
    Hexadecimal
}

impl NumberBase {
    pub fn radix(&self) -> u32 {
        match self {
            NumberBase::Decimal => 10,
            NumberBase::Hexadecimal => 16
        }
    }
}

#[derive(Debug, Clone)]
pub struct LexerError {
    pub kind: LexerErrorKind,
    pub at: InputRange
}

#[derive(Debug, Clone)]
pub enum LexerErrorKind {
    NoMatch,
    InvalidDirective,
    UnclosedQuotedString,
    NoNumberAfterMinus,
    InvalidNumberAfterBase,
    InvalidNumberBase(char),
    EmptyLabel
}

impl LexerErrorKind {
    fn at(self, at: InputRange) -> LexerError {
        LexerError { kind: self, at }
    }
}

impl Term {
    fn at(self, range: InputRange) -> Token {
        Token { term: self, range }
    }
}

use std::fmt;

impl fmt::Display for Term {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use self::Term::*;

        match self {
            ChampionNameCmd => write!(f, "Name directive"),
            ChampionCommentCmd => write!(f, "Comment directive"),
            CodeCmd => write!(f, "Code directive"),
            QuotedString => write!(f, "Quoted string"),
            Comment => write!(f, "Comment"),
            LabelDef => write!(f, "Label declaration"),
            LabelUse => write!(f, "Label reference"),
            ParamSeparator => write!(f, "Parameter separator"),
            DirectChar => write!(f, "Direct character"),
            Number { .. } => write!(f, "Number"),
            Ident => write!(f, "Identifier"),
        }
    }
}

impl fmt::Display for LexerErrorKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use self::LexerErrorKind::*;

        match self {
            NoMatch => write!(f, "No token matched"),
            InvalidDirective => write!(f, "Unknown directive"),
            UnclosedQuotedString => write!(f, "Missing end quote for string"),
            NoNumberAfterMinus => write!(f, "Missing number after minus sign"),
            InvalidNumberAfterBase => write!(f, "Invalid number"),
            InvalidNumberBase(invalid) => write!(f, "Invalid number base: {}", invalid),
            EmptyLabel => write!(f, "Missing label name"),
        }
    }
}
