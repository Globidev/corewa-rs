import * as React from 'react'
import { observer } from 'mobx-react'
import { observable, observe } from 'mobx'

import { VirtualMachine } from '../virtual_machine'
import { DecodeResult, ProcessCollection } from '../corewar'
import { PIXIRenderer, MARGIN, MEM_HEIGHT, MEM_WIDTH } from '../renderer'

import { ProcessPanel } from './panels/process'
import { ControlPanel } from './panels/control'
import { ResultsPanel } from './panels/results'
import { StatePanel } from './panels/state'
import { ContendersPanel } from './panels/contenders'

interface IVMProps {
  vm: VirtualMachine
  onNewPlayerRequested: () => void
  onHelpRequested: () => void
}

@observer
export class VM extends React.Component<IVMProps> {
  canvasRef = React.createRef<HTMLCanvasElement>()
  @observable
  selection: { idx: number; decoded: DecodeResult } | null = null
  @observable
  selectedProcesses: ProcessCollection | null = null

  coverages = new Map<number, number>()

  vm = this.props.vm

  componentDidMount() {
    const canvas = this.canvasRef.current

    if (canvas) {
      const renderer = new PIXIRenderer({
        canvas,
        onCellClicked: cellIdx => {
          this.updateSelection(cellIdx)
          this.draw(renderer)
        },
        onLoad: () => {
          this.draw(renderer)
        }
      })

      observe(this.vm, 'cycles', _ => {
        this.selectedProcesses = null
        if (this.selection) this.updateSelection(this.selection.idx)
        this.draw(renderer)
      })
    }
  }

  draw(renderer: PIXIRenderer) {
    const memory = this.vm.engine.memory()

    renderer.update({
      memory,
      selection: this.selection,
      playersById: this.vm.playersById
    })

    const cellOwners = new Int32Array(
      wasm_bindgen.wasm.memory.buffer,
      memory.owners_ptr,
      4096
    )

    this.coverages.clear()
    cellOwners.forEach(owner => {
      const previous = this.coverages.get(owner) || 0
      this.coverages.set(owner, previous + 1)
    })
  }

  updateSelection(idx: number) {
    this.selection = { idx, decoded: this.vm.engine.decode(idx) }
    this.selectedProcesses = this.vm.engine.processes_at(idx)
  }

  onNewClicked() {
    const vm = this.vm
    if (vm.playersById.size < 4) this.props.onNewPlayerRequested()
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

    const selectionInfo = this.selection && (
      <div>
        <hr />
        <div>Cell {this.selection.idx}</div>
        <div className="pad-top code">{this.selection.decoded.to_string()}</div>
      </div>
    )

    const processInfo = this.selectedProcesses && (
      <div className="pad-top">
        <ProcessPanel processes={this.selectedProcesses} vm={vm} />
      </div>
    )

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
        <div style={{ display: 'flex', height: '100%' }}>
          <div className="pad-left pad-top">
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
            {selectionInfo}
            {processInfo}
          </div>
          {arena}
        </div>
      </div>
    )
  }
}
