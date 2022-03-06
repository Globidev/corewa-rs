import "codemirror/keymap/sublime";

import "codemirror/addon/lint/lint";
import "codemirror/addon/hint/show-hint";

import "./style.css";

import { StrictMode } from "react";
import { render } from "react-dom";

import { Corewar } from "./state/corewar";
import { VirtualMachine } from "./state/vm";

import { CorewarLayout } from "./components/layout";

import FontFaceObserver from "fontfaceobserver";

import initWasm from "corewa-rs";

async function main() {
  const { memory } = await initWasm();

  // We preload fonts to avoid surprises when rendering text in the canvas
  await new FontFaceObserver("Roboto Mono").load().then(
    () => console.debug("Fonts loaded"),
    () => console.error("Fonts not loaded")
  );

  const vm = new VirtualMachine(memory);

  render(
    <StrictMode>
      <CorewarLayout corewar={new Corewar(vm)} />
    </StrictMode>,
    document.getElementById("app")
  );
}

main();
