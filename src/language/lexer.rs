const IDENT_CHARS: &str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789";

type InputRange = ::std::ops::Range<usize>;

#[derive(Debug, Clone)]
pub struct Token {
    pub term: Term,
    pub range: InputRange
}

pub type TokenResult = Result<Token, LexerError>;

use std::iter::Peekable;
use std::str::CharIndices;

#[derive(Clone)]
pub struct Tokenizer<'a> {
    chars: Peekable<CharIndices<'a>>,
    pub input: &'a str
}

impl<'a> Iterator for Tokenizer<'a> {
    type Item = TokenResult;

    fn next(&mut self) -> Option<Self::Item> {
        self.skip_while(|(_, c)| c.is_whitespace());

        self.chars.peek()
            .cloned()
            .map(|(idx, chr)| match chr {
                ':' => self.lex_label_use(idx),
                ',' => self.lex_single(Term::ParamSeparator, idx),
                '%' => self.lex_single(Term::DirectChar, idx),

                '.' => self.lex_command(idx),
                '"' => self.lex_quoted_string(idx),
                '#' => self.lex_comment(idx),
                '-' => self.lex_negative_number(idx),

                c if c.is_digit(10)          => self.lex_number(idx),
                c if IDENT_CHARS.contains(c) => self.lex_ident(idx),

                _ => {
                    self.chars.next();
                    Err(LexerErrorKind::NoMatch.at(idx))
                }
            })
    }
}

impl<'a> Tokenizer<'a> {
    pub fn new(input: &'a str) -> Self {
        Self {
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
            _ => Err(LexerErrorKind::EmptyLabel.at(idx_start))
        }
    }

    fn lex_single(&mut self, term: Term, idx_start: usize) -> TokenResult {
        self.chars.next(); // consume

        Ok(term.at(idx_start..self.peek_idx()))
    }

    fn lex_command(&mut self, idx_start: usize)
        -> TokenResult
    {
        const COMMANDS: [(&str, Term); 2] = [
            (".name",    Term::ChampionNameCmd),
            (".comment", Term::ChampionCommentCmd),
        ];

        let current_str = &self.input[idx_start..];
        let command = COMMANDS.iter()
            .find(|&(cmd, _)| current_str.starts_with(cmd));

        match command {
            None => {
                self.chars.next(); // consume .
                Err(LexerErrorKind::InvalidCommand.at(idx_start))
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
                    _ => Err(LexerErrorKind::InvalidCommand.at(idx_start))
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
            .ok_or_else(|| LexerErrorKind::UnclosedQuotedString.at(idx_start));

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

        match self.chars.next() {
            Some((_, c)) if c.is_digit(10) => self.lex_number(idx_start),
            _ => Err(LexerErrorKind::NoNumberAfterMinus.at(idx_start))
        }
    }

    fn lex_number(&mut self, idx_start: usize)
        -> TokenResult
    {
        self.skip_while(|(_, c)| c.is_digit(10));

        Ok(Term::Number.at(idx_start..self.peek_idx()))
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
    QuotedString,
    Comment,
    LabelDef,
    LabelUse,
    ParamSeparator,
    DirectChar,
    Number,
    Ident
}

#[derive(Debug, Clone)]
pub struct LexerError {
    kind: LexerErrorKind,
    at: usize
}

#[derive(Debug, Clone)]
enum LexerErrorKind {
    NoMatch,
    InvalidCommand,
    UnclosedQuotedString,
    NoNumberAfterMinus,
    EmptyLabel
}

impl LexerErrorKind {
    fn at(self, at: usize) -> LexerError {
        LexerError { kind: self, at }
    }
}

impl Term {
    fn at(self, range: InputRange) -> Token {
        Token { term: self, range }
    }
}
