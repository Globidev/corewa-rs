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
        .map_err(|e| {
            match e {
                language::ReadError::ParseError(e, line) => {
                    JsValue::from(JsCompileError {
                        from_row: line as u32,
                        from_col: 0,
                        to_row: line as u32,
                        to_col: 10,
                        reason: format!("{:?}", e),
                    })
                },
                language::ReadError::AssembleError(e) => {
                    JsValue::NULL
                },
                language::ReadError::IOError(e) => {
                    JsValue::NULL
                }
            }
        })?;

    let mut byte_code = Vec::new();
    language::write_champion(&mut byte_code, &parsed_champion)
        .expect("TODO: Write error");

    Ok(byte_code)
}
