import * as types from './corewar.d'
import * as CodeMirrorObj from 'codemirror'

declare global {
  var CodeMirror: typeof CodeMirrorObj

  var wasm_bindgen: {
    compile_champion: typeof types.compile_champion
    (wasm_path: string): Promise<void>
    wasm: any
    VMBuilder: typeof types.VMBuilder
  }

  type CompiledChampion = Uint8Array
}
