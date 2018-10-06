import * as React from "react";
import { render } from "react-dom";
import { observer } from "mobx-react";

import { Editor } from './editor';
import { VM } from './vm';
import { state, uiState } from "./state";

@observer
class App extends React.Component {
  render() {
    console.log('rendered')
    return (
      <div id="main">
        <Editor onCodeChanged={(code) => state.compile(code)} visible={!uiState.fullscreen}/>
        <VM />
      </div>
    )
  }
}

export function start() {
  const $root = document.getElementById('app');
  render(<App />, $root);
}
