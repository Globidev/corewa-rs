pub mod language;
pub mod vm;
pub mod bindings;
mod utils;
mod spec;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct Region {
    pub from_row: u32,
    pub from_col: u32,
    pub to_row: u32,
    pub to_col: u32,
}

impl Region {
    fn new(from_row: u32, from_col: u32, to_row: u32, to_col: u32) -> Self {
        Self { from_row, from_col, to_row, to_col }
    }
}

#[wasm_bindgen]
pub struct JsCompileError {
    region: Option<Region>,
    reason: String
}

#[wasm_bindgen]
impl JsCompileError {
    pub fn reason(&self) -> String {
        self.reason.clone()
    }

    pub fn region(&self) -> JsValue {
        self.region.clone()
            .map(JsValue::from)
            .unwrap_or(JsValue::NULL)
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
                let line = line as u32;
                let (col_start, opt_col_end) = language::error_range(&e);
                let region = Region::new(
                    line, col_start as u32,
                    line, opt_col_end.unwrap_or(20000) as u32
                );
                (Some(region), format!("{}", e))
            },
            language::ReadError::AssembleError(e) => {
                (None, format!("Error while assembling champion: {}", e))
            },
            language::ReadError::IOError(e) => {
                (None, format!("Unexpected IO error: {}", e))
            }
        };

        JsCompileError { region, reason }
    }
}

impl From<language::WriteError> for JsCompileError {
    fn from(err: language::WriteError) -> JsCompileError {
        let reason = match err {
            language::WriteError::CompileError(e) => {
                format!("Error while compiling champion: {}", e)
            },
            language::WriteError::IOError(e) => {
                format!("Unexpected IO error: {}", e)
            }
        };

        JsCompileError { region: None, reason }
    }
}
