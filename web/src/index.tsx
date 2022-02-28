import "codemirror/keymap/sublime";

import "codemirror/addon/lint/lint";
import "codemirror/addon/hint/show-hint";

import "./style.css";

import { StrictMode } from "react";
import { render } from "react-dom";

import { Corewar } from "./state/corewar";
import { VirtualMachine } from "./state/vm";

import { CorewarLayout } from "./components/layout";

import initWasm from "corewa-rs";

async function main() {
  const { memory } = await initWasm();

  const vm = new VirtualMachine(memory);

  render(
    <StrictMode>
      <CorewarLayout corewar={new Corewar(vm)} />
    </StrictMode>,
    document.getElementById("app")
  );
}

main();
