import * as CodeMirrorObj from 'codemirror'

declare global {
  var corewar: typeof import('corewa-rs');
  var wasm_memory: any;

  var CodeMirror: typeof CodeMirrorObj;
  type CompiledChampion = Uint8Array;
}

import { main } from "./index";

export async function loadWasm() {
  const corewar = await import('corewa-rs');
  const corewarBg = await import('../../corewa-rs-wasm/pkg/corewa_rs_wasm_bg');

  window.corewar = corewar;
  window.wasm_memory = corewarBg.memory;
}

loadWasm()
  .then(main);
