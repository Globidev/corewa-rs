import * as types from './corewar.d'
import * as CodeMirrorObj from 'codemirror'

interface Constructable<T> {
  new (): T
}

declare global {
  var CodeMirror: typeof CodeMirrorObj

  var wasm_bindgen: {
    compile_champion: typeof types.compile_champion
    (wasm_path: string): Promise<any>
    wasm: any
    VMBuilder: Constructable<types.VMBuilder>
  }

  type CompiledChampion = Uint8Array
}
