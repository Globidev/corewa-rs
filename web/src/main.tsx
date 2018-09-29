import * as React from "react";
import { render } from "react-dom";
import { observer } from "mobx-react";

import { Editor } from './editor';
import { VM } from './vm';
import { state, uiState } from "./state";

@observer
class App extends React.Component {
  render() {
    return (
      <div id="main">
        { uiState.fullscreen ? null :
          <Editor onCodeChanged={(code) => state.compile(code)}/>
        }
        <VM />
      </div>
    )
  }
}

const $root = document.getElementById('app');
render(<App />, $root);
