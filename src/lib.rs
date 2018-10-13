pub mod language;
pub mod vm;
mod utils;
mod spec;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct JsCompileError {
    pub from_row: u32,
    pub from_col: u32,
    pub to_row: u32,
    pub to_col: u32,
    reason: String
}

#[wasm_bindgen]
impl JsCompileError {
    pub fn reason(&self) -> String {
        self.reason.clone()
    }
}

#[wasm_bindgen]
pub fn compile_champion(input: &str) -> Result<Vec<u8>, JsValue> {
    utils::set_panic_hook();

    let parsed_champion = language::read_champion(input.as_bytes())
        .map_err(|err| JsCompileError::from(err))?;

    let mut byte_code = Vec::new();

    language::write_champion(&mut byte_code, &parsed_champion)
        .map_err(|err| JsCompileError::from(err))?;

    Ok(byte_code)
}

impl From<language::ReadError> for JsCompileError {
    fn from(err: language::ReadError) -> JsCompileError {
        let (region, reason) = match err {
            language::ReadError::ParseError(e, line) => {
                ((line as u32, 0, line as u32, 10), format!("{:?}", e))
            },
            language::ReadError::AssembleError(e) => {
                ((1, 0, 1, 100), format!("Error while assembling champion: {:?}", e))
            },
            language::ReadError::IOError(e) => {
                ((1, 0, 1, 100), format!("Unexpected IO error: {}", e))
            }
        };

        let (from_row, from_col, to_row, to_col) = region;

        JsCompileError { from_row, from_col, to_row, to_col, reason }
    }
}

impl From<language::WriteError> for JsCompileError {
    fn from(err: language::WriteError) -> JsCompileError {
        let reason = match err {
            language::WriteError::CompileError(e) => {
                format!("Error while compiling champion: {:?}", e)
            },
            language::WriteError::IOError(e) => {
                format!("Unexpected IO error: {}", e)
            }
        };

        JsCompileError { from_row: 1, from_col: 0, to_row: 1, to_col: 100, reason }
    }
}
