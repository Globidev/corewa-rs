import { start } from './main'
;(function() {
  if (wasm_bindgen.wasm) {
    start()
  } else {
    wasm_bindgen('./corewar_bg.wasm')
      .then(start)
      .catch(console.error)
  }
})()
