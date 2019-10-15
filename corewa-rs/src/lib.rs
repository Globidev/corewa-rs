#![feature(drain_filter)]
#![feature(test)]

#![warn(rust_2018_idioms)]

#[macro_use]
extern crate derive_more;

pub mod spec;
pub mod language;
pub mod vm;
