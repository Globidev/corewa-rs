extern crate web_sys;

use super::vm::VirtualMachine;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

const BYTE_WIDTH: u32 = 20;
const BYTE_HEIGHT: u32 = 15;

#[wasm_bindgen]
pub fn render_on_canvas(vm: &VirtualMachine, canvas: &web_sys::HtmlCanvasElement) {
    let ctx = canvas.get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<web_sys::CanvasRenderingContext2d>()
        .unwrap();

    let width = f64::from(canvas.width());
    let height = f64::from(canvas.height());

    ctx.clear_rect(0., 0., width, height);
    ctx.set_fill_style(&JsValue::from("#111111"));
    ctx.fill_rect(0., 0., width, height);
    ctx.set_font("bold 9pt Helvetica");

    let line_length = (width / f64::from(BYTE_WIDTH)).floor() as u32 + 1;

    ctx.set_fill_style(&JsValue::from("#FFD20A80"));
    for process in vm.processes() {
        let pc = *process.pc as u32;
        let x = pc % line_length;
        let y = pc / line_length;

        ctx.fill_rect(
            (x * BYTE_WIDTH) as f64 - 2.,
            (y * BYTE_HEIGHT) as f64 + 2.,
            BYTE_WIDTH as f64 - 2.,
            BYTE_WIDTH as f64
        );
    }

    for (i, cell) in vm.cells().iter().enumerate() {
        let x = i as u32 % line_length;
        let y = i as u32 / line_length;

        let byte_text = format!("{:02X}", cell);
        let text_color = if *cell != 0 { "#FFA517" } else { "silver" };
        ctx.set_fill_style(&JsValue::from(text_color));
        ctx.fill_text_with_max_width(&byte_text,
            (x * BYTE_WIDTH) as f64,
            ((y + 1) * BYTE_HEIGHT) as f64,
            BYTE_WIDTH as f64
        ).unwrap();
    }
}


// function drawVm(vm: wasm.VirtualMachine, canvas: HTMLCanvasElement) {
//   const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   ctx.fillStyle = '#111111';
//   ctx.fillRect(0, 0, canvas.width, canvas.height);
//   ctx.font = 'bold 9pt Helvetica';

//   const size = vm.size();
//   const mem = new Uint8Array(memory.buffer, vm.memory(), size);
//   const lineLength = Math.floor(canvas.width / BYTE_WIDTH) - 1;

//   for (let i = 0; i < vm.process_count(); ++i) {
//     const pc = vm.process_pc(i)
//     const x = pc % lineLength;
//     const y = Math.floor(pc / lineLength);

//     ctx.fillStyle = '#FFD20A80';
//     ctx.fillRect(x * BYTE_WIDTH - 2, y * BYTE_HEIGHT + 2, BYTE_WIDTH - 2, BYTE_HEIGHT);
//   }

//   for (let i = 0; i < size; ++i) {
//     const byte = mem[i];
//     const x = i % lineLength;
//     const y = Math.floor(i / lineLength);

//     let byteText = byte.toString(16).toUpperCase();
//     if (byteText.length < 2)
//       byteText = `0${byteText}`;

//     let textColor = byte != 0 ? '#FFA517' : 'silver';
//     ctx.fillStyle = textColor;
//     ctx.fillText(byteText, x * BYTE_WIDTH, (y + 1) * BYTE_HEIGHT, BYTE_WIDTH);
//   }
// }
