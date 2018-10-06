import { start } from "./main";
// import { init_wasm } from './corewar'

wasm_bindgen('corewar_bg.wasm')
  .then(start)
  .catch(console.error);

// @ts-ignore
if (module.hot) {
  // @ts-ignore
  module.hot.dispose(function () {
    console.warn('[hot] dispose')
    // clearInterval(incrementInterval)
    // module is about to be replaced
  });

  // @ts-ignore
  module.hot.accept(function () {
    console.warn('[hot] accept')
    // module or one of its dependencies was just updated
  });
}
