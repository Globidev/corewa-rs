import "codemirror/keymap/sublime";

import "codemirror/addon/lint/lint";
import "codemirror/addon/hint/show-hint";

import "../public/style.css";

import { StrictMode } from "react";
import { render } from "react-dom";

import { VirtualMachine } from "./virtual_machine";
import { CorewarLayout } from "./components/layout";

const App = () => <CorewarLayout vm={new VirtualMachine()} />;

render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById("app")
);
