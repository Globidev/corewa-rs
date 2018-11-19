import * as React from 'react'
import { observer } from 'mobx-react'

import { DecodeResult } from '../../corewar'
import { ASM_LANGUAGE_ID } from '../editor'
import { autorun } from 'mobx'

interface ICellPanelProps {
  idx: number
  decoded: DecodeResult
  onDiscard: () => void
}

@observer
export class CellPanel extends React.Component<ICellPanelProps> {
  editorContainer = React.createRef<HTMLDivElement>()

  componentDidMount() {
    const container = this.editorContainer.current

    if (container) {
      const editor = CodeMirror(container, {
        value: cellString(this.props.decoded),
        theme: 'monokai',
        mode: ASM_LANGUAGE_ID,
        keyMap: 'sublime',
        readOnly: true
      })

      autorun(() => editor.setValue(cellString(this.props.decoded)))
    }
  }

  render() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Cell {this.props.idx}</span>
          <button onClick={() => this.props.onDiscard()}>❌</button>
        </div>

        <div ref={this.editorContainer} />
      </div>
    )
  }
}

const cellString = (decoded: DecodeResult) => {
  let str = decoded.to_string()
  let length = decoded.byte_size()

  if (length > 1) str += ` # ${length} bytes`

  return str
}
