import "codemirror/keymap/sublime";

import "codemirror/addon/lint/lint";
import "codemirror/addon/hint/show-hint";

import "codemirror/lib/codemirror.css";
import "codemirror/theme/monokai.css";
import "codemirror/addon/lint/lint.css";
import "codemirror/addon/hint/show-hint.css";

import "../public/style.css";

import * as React from "react";
import { render } from "react-dom";

import { VirtualMachine } from "./virtual_machine";
import { CorewarLayout } from "./components/layout";

const App = () => <CorewarLayout vm={new VirtualMachine()} />;

function main() {
  const $root = document.getElementById("app");
  render(<App />, $root);
}

main();
