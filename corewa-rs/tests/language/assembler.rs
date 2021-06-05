use corewa_rs::language;

use language::{assembler::AssembleError::*, ReadError::AssembleError};

macro_rules! read_sample {
    ($name:literal) => {
        language::read_champion(sample!($name))
    };
}

#[test]
fn empty_champion() {
    assert!(read_sample!("empty").is_err());
}

#[test]
fn missing_name() {
    assert_matches!(
        read_sample!("missing_name"),
        Err(AssembleError(MissingName))
    );
}

#[test]
fn missing_comment() {
    assert_matches!(
        read_sample!("missing_comment"),
        Err(AssembleError(MissingComment))
    );
}

#[test]
fn duplicate_name() {
    assert_matches!(
        read_sample!("duplicate_name"),
        Err(AssembleError(NameAlreadySet(_)))
    );
}

#[test]
fn duplicate_comment() {
    assert_matches!(
        read_sample!("duplicate_comment"),
        Err(AssembleError(CommentAlreadySet(_)))
    );
}
