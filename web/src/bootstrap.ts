// @ts-ignore
import { default as init } from './corewar'
import { start } from '.'

export function load_wasm(entrypoint: () => void) {
  return init('./corewar_bg.wasm')
    .then((module: any) => {
      // @ts-ignore
      window.wasm_memory = module.memory
      entrypoint()
    })
    .catch(console.error)
}

load_wasm(start)

// Disable Parcel's HMR
// @ts-ignore
if (module && module.hot) {
  // @ts-ignore
  module.hot.accept(() => location.reload())
}
