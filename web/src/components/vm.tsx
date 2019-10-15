import * as React from 'react'
import { observer } from 'mobx-react'
import { observable, observe, reaction } from 'mobx'

import { VirtualMachine } from '../virtual_machine'
import { PIXIRenderer, MARGIN, MEM_HEIGHT, MEM_WIDTH } from '../renderer'

import { ProcessPanel } from './panels/process'
import { ControlPanel } from './panels/control'
import { ResultsPanel } from './panels/results'
import { StatePanel } from './panels/state'
import { ContendersPanel } from './panels/contenders'
import { CellPanel } from './panels/cell'

interface IVMProps {
  vm: VirtualMachine
  onNewPlayerRequested: () => void
  onHelpRequested: () => void
}

type Selection = {
  decoded: import('corewa-rs').DecodeResult
  processes: import('corewa-rs').ProcessCollection
}

@observer
export class VM extends React.Component<IVMProps> {
  canvasRef = React.createRef<HTMLCanvasElement>()

  @observable
  selections = new Map<number, Selection>()

  coverages = new Map<number, number>()

  vm = this.props.vm

  componentDidMount() {
    const canvas = this.canvasRef.current

    if (canvas) {
      const renderer = new PIXIRenderer({
        canvas,
        onCellClicked: (cellIdx, modifiers) => {
          if (!modifiers.ctrl) this.selections.clear()
          this.toggleSelection(cellIdx)
        },
        onLoad: () => {
          observe(this.vm, 'cycles', _ => {
            this.updateSelections()
            this.draw(renderer)
          })
          this.draw(renderer)
        }
      })

      reaction(() => this.selections.size, () => this.draw(renderer))
    }
  }

  draw(renderer: PIXIRenderer) {
    const memory = this.vm.engine.memory()

    renderer.update({
      memory,
      selections: Array.from(this.selections).map(([idx, selection]) => ({
        idx,
        length: Math.max(selection.decoded.byte_size(), 1)
      })),
      playersById: this.vm.playersById
    })

    const cellOwners = new Int32Array(wasm_memory.buffer, memory.owners_ptr, 4096)

    this.coverages.clear()
    cellOwners.forEach(owner => {
      const previous = this.coverages.get(owner) || 0
      this.coverages.set(owner, previous + 1)
    })
  }

  selectionAt(idx: number) {
    return {
      decoded: this.vm.engine.decode(idx),
      processes: this.vm.engine.processes_at(idx)
    }
  }

  toggleSelection(idx: number) {
    if (this.selections.has(idx)) this.selections.delete(idx)
    else this.selections.set(idx, this.selectionAt(idx))
  }

  updateSelections() {
    this.selections.forEach((selection, idx) =>
      Object.assign(selection, this.selectionAt(idx))
    )
  }

  onNewClicked() {
    if (this.vm.playersById.size < 4) this.props.onNewPlayerRequested()
  }

  render() {
    const vm = this.vm

    const helpButton = (
      <button className="ctrl-btn" onClick={this.props.onHelpRequested.bind(this)}>
        ❓
      </button>
    )

    const addPlayerButton = vm.playersById.size < 4 && (
      <button className="ctrl-btn" onClick={this.onNewClicked.bind(this)}>
        ➕
      </button>
    )

    const selectionsAsArray = Array.from(this.selections)
    const selectionPanels = selectionsAsArray.map(([cellIdx, selection], idx) => (
      <div key={idx}>
        <hr />
        <CellPanel
          idx={cellIdx}
          previousIdx={idx > 0 ? selectionsAsArray[idx - 1][0] : null}
          decoded={selection.decoded}
          onDiscard={() => this.selections.delete(cellIdx)}
        />
        <div className="pad-top">
          <ProcessPanel processes={selection.processes} vm={vm} />
        </div>
      </div>
    ))

    const arena = (
      <canvas
        ref={this.canvasRef}
        width={MEM_WIDTH}
        height={MEM_HEIGHT}
        style={{
          margin: `${MARGIN}px ${MARGIN}px ${MARGIN}px ${MARGIN}px`,
          maxHeight: `${MEM_HEIGHT}px`,
          maxWidth: `${MEM_WIDTH}px`
        }}
      />
    )

    return (
      <div id="vm-container">
        <div style={{ display: 'flex' }}>
          <div className="pad-left pad-top panel-area">
            <div style={{ display: 'flex' }}>
              {helpButton}
              {addPlayerButton}
            </div>
            <ControlPanel vm={vm} />
            {vm.matchResult && <ResultsPanel result={vm.matchResult} vm={vm} />}
            <hr />
            <StatePanel vm={vm} />
            <hr />
            <ContendersPanel vm={vm} coverages={this.coverages} />
            {selectionPanels}
          </div>
          {arena}
        </div>
      </div>
    )
  }
}
