import * as types from './corewar.d';
import * as CodeMirrorObj from "codemirror";

declare global {
    var CodeMirror: typeof CodeMirrorObj;

    var wasm_bindgen: {
      vm_from_code: typeof types.vm_from_code,
      (wasm_path: string): Promise<any>
    }
}
