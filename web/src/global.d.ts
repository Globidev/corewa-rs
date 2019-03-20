import * as types from './corewar.d'
import * as CodeMirrorObj from 'codemirror'

declare global {
  var wasm_memory: any

  var CodeMirror: typeof CodeMirrorObj
  type CompiledChampion = Uint8Array
}
