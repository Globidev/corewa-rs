#![allow(clippy::range_plus_one)] // This lint is kind of confusing and breaks consistency here

const IDENT_CHARS: &str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789";

type InputRange = ::std::ops::Range<usize>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Token {
    pub term: Term,
    pub range: InputRange,
}

pub type TokenResult = Result<Token, LexerError>;

#[derive(Clone)]
pub struct Tokenizer<'a> {
    chars: std::iter::Peekable<std::str::CharIndices<'a>>,
    pub input: &'a str,
}

impl Iterator for Tokenizer<'_> {
    type Item = TokenResult;

    fn next(&mut self) -> Option<Self::Item> {
        self.skip_while(|(_, c)| c.is_whitespace());

        self.chars.peek().cloned().map(|(idx, chr)| match chr {
            ':' => self.lex_label_use(idx),
            ',' => self.lex_single(Term::ParamSeparator, idx),
            '%' => self.lex_single(Term::DirectChar, idx),

            '.' => self.lex_directive(idx),
            '"' => self.lex_quoted_string(idx),
            '#' => self.lex_comment(idx),
            '-' => self.lex_negative_number(idx),

            c if c.is_digit(10) => self.lex_number(idx),
            c if IDENT_CHARS.contains(c) => self.lex_ident(idx),

            _ => {
                self.chars.next();
                Err(LexerErrorKind::NoMatch.at(idx..idx + 1))
            }
        })
    }
}

impl Tokenizer<'_> {
    pub fn new(input: &str) -> Tokenizer<'_> {
        Tokenizer {
            chars: input.char_indices().peekable(),
            input,
        }
    }

    fn skip_while<F>(&mut self, skipper: F)
    where
        F: Fn(&(usize, char)) -> bool,
    {
        while self.chars.peek().map_or(false, &skipper) {
            self.chars.next();
        }
    }

    fn lex_label_use(&mut self, idx_start: usize) -> TokenResult {
        self.chars.next(); // consume
        match self.chars.peek() {
            Some((_, c)) if IDENT_CHARS.contains(*c) => {
                self.skip_while(|&(_, c)| IDENT_CHARS.contains(c));
                Ok(Term::LabelUse.at(idx_start..self.peek_idx()))
            }
            _ => Err(LexerErrorKind::EmptyLabel.at(idx_start..idx_start + 1)),
        }
    }

    fn lex_single(&mut self, term: Term, idx_start: usize) -> TokenResult {
        self.chars.next(); // consume

        Ok(term.at(idx_start..self.peek_idx()))
    }

    fn lex_directive(&mut self, idx_start: usize) -> TokenResult {
        const DIRECTIVES: [(&str, Term); 3] = [
            (".name", Term::ChampionNameCmd),
            (".comment", Term::ChampionCommentCmd),
            (".code", Term::CodeCmd),
        ];

        let current_str = &self.input[idx_start..];
        let directive = DIRECTIVES
            .iter()
            .find(|&(cmd, _)| current_str.starts_with(cmd));

        match directive {
            None => {
                self.skip_while(|&(_, c)| !c.is_whitespace());
                Err(LexerErrorKind::InvalidDirective.at(idx_start..self.peek_idx()))
            }
            Some((cmd, term)) => {
                let next = self.chars.by_ref().nth(cmd.len());
                let term = term.clone();

                match next {
                    Some((idx_end, chr)) if chr.is_whitespace() => Ok(term.at(idx_start..idx_end)),
                    None => Ok(term.at(idx_start..self.input.len())),
                    _ => Err(LexerErrorKind::InvalidDirective.at(idx_start..idx_start + cmd.len())),
                }
            }
        }
    }

    fn lex_quoted_string(&mut self, idx_start: usize) -> TokenResult {
        self.chars.next(); // skip the start quote
        self.skip_while(|&(_, c)| c != '"');

        let token_result = self
            .chars
            .peek()
            .map(|(idx_end, _)| Term::QuotedString.at(idx_start + 1..*idx_end))
            .ok_or_else(|| LexerErrorKind::UnclosedQuotedString.at(idx_start..self.peek_idx()));

        self.chars.next(); // skip the end quote
        token_result
    }

    fn lex_comment(&mut self, idx_start: usize) -> TokenResult {
        self.chars.by_ref().last(); // Consume everything

        Ok(Term::Comment.at(idx_start..self.input.len()))
    }

    fn lex_negative_number(&mut self, idx_start: usize) -> TokenResult {
        self.chars.next(); // consume -

        match self.chars.peek() {
            Some((_, c)) if c.is_digit(10) => self.lex_number(idx_start),
            _ => Err(LexerErrorKind::NoNumberAfterMinus.at(idx_start..idx_start + 1)),
        }
    }

    fn lex_number(&mut self, idx_start: usize) -> TokenResult {
        let (_, first_digit) = self.chars.next().expect("Empty input while lexing number");

        let second_digit = self.chars.peek().map(|(_, c)| c);

        let base = match (first_digit, second_digit) {
            ('0', Some('x')) => {
                self.chars.next();
                NumberBase::Hexadecimal
            }
            ('0', Some('d')) => {
                self.chars.next();
                NumberBase::Decimal
            }
            _ => NumberBase::Decimal,
        };

        self.skip_while(|(_, c)| c.is_digit(base.radix()));
        Ok(Term::Number { base }.at(idx_start..self.peek_idx()))
    }

    fn lex_ident(&mut self, idx_start: usize) -> TokenResult {
        self.skip_while(|&(_, c)| IDENT_CHARS.contains(c));

        let term = match self.chars.peek() {
            Some((_, ':')) => {
                self.chars.next();
                Term::LabelDef
            }
            _ => Term::Ident,
        };

        Ok(term.at(idx_start..self.peek_idx()))
    }

    fn peek_idx(&mut self) -> usize {
        self.chars
            .peek()
            .map(|(idx, _)| *idx)
            .unwrap_or_else(|| self.input.len())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, derive_more::Display)]
pub enum Term {
    #[display(fmt = "Name directive")]
    ChampionNameCmd,
    #[display(fmt = "Comment directive")]
    ChampionCommentCmd,
    #[display(fmt = "Code directive")]
    CodeCmd,
    #[display(fmt = "Quoted string")]
    QuotedString,
    #[display(fmt = "Comment")]
    Comment,
    #[display(fmt = "Label declaration")]
    LabelDef,
    #[display(fmt = "Label reference")]
    LabelUse,
    #[display(fmt = "Parameter separator")]
    ParamSeparator,
    #[display(fmt = "Direct character")]
    DirectChar,
    #[display(fmt = "Number")]
    Number { base: NumberBase },
    #[display(fmt = "Identifier")]
    Ident,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NumberBase {
    Decimal,
    Hexadecimal,
}

impl NumberBase {
    pub fn radix(&self) -> u32 {
        match self {
            NumberBase::Decimal => 10,
            NumberBase::Hexadecimal => 16,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("{kind} at [{}..{})", .at.start, .at.end)]
pub struct LexerError {
    pub kind: LexerErrorKind,
    pub at: InputRange,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum LexerErrorKind {
    #[error("No token matched")]
    NoMatch,
    #[error("Unknown directive")]
    InvalidDirective,
    #[error("Missing end quote for string")]
    UnclosedQuotedString,
    #[error("Missing number after minus sign")]
    NoNumberAfterMinus,
    #[error("Invalid number")]
    InvalidNumberAfterBase,
    #[error("Invalid number base: {0}")]
    InvalidNumberBase(char),
    #[error("Missing label name")]
    EmptyLabel,
}

impl LexerErrorKind {
    pub fn at(self, at: InputRange) -> LexerError {
        LexerError { kind: self, at }
    }
}

impl Term {
    pub fn at(self, range: InputRange) -> Token {
        Token { term: self, range }
    }
}
