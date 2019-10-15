import * as React from 'react'
import { observer } from 'mobx-react'

import { ASM_LANGUAGE_ID } from '../editor'
import { autorun } from 'mobx'

interface ICellPanelProps {
  idx: number
  previousIdx: number | null
  decoded: import('corewa-rs').DecodeResult
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

  idxDiff() {
    const previousIdx = this.props.previousIdx

    if (previousIdx === null) return null

    let diff = this.props.idx - previousIdx
    if (diff > 2048) diff -= 4096
    else if (diff < -2048) diff += 4096

    return diff >= 0 ? `(+${diff})` : `(${diff})`
  }

  render() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            Cell {this.props.idx}{' '}
            <span style={{ fontSize: '75%' }}>{this.idxDiff()}</span>
          </span>
          <button onClick={() => this.props.onDiscard()}>❌</button>
        </div>

        <div ref={this.editorContainer} />
      </div>
    )
  }
}

const cellString = (decoded: import('corewa-rs').DecodeResult) => {
  let str = decoded.to_string()
  let length = decoded.byte_size()

  if (length > 1) str += ` # ${length} bytes`

  return str
}
