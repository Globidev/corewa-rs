import "codemirror/keymap/sublime";

import "codemirror/addon/lint/lint";
import "codemirror/addon/hint/show-hint";

import "./style.css";

import { StrictMode } from "react";
import { render } from "react-dom";

import { VirtualMachine } from "./virtual_machine";
import { CorewarLayout } from "./components/layout";

import initWasm from "corewa-rs";

async function main() {
  const { memory } = await initWasm();

  render(
    <StrictMode>
      <CorewarLayout vm={new VirtualMachine()} wasmMemory={memory} />
    </StrictMode>,
    document.getElementById("app")
  );
}

main();
