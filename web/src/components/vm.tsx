import * as React from 'react'
import { observer } from 'mobx-react'
import { observable, observe } from 'mobx'

import { VirtualMachine, Player, MatchResult } from '../virtual_machine'
import { VirtualMachine as VMEngine, PlayerInfo } from '../corewar'
import { DecodeResult, ProcessCollection, ExecutingState } from '../corewar'
import { PIXIRenderer, MARGIN, MEM_HEIGHT, MEM_WIDTH } from '../renderer'

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
    return (
      <div id="vm-container">
        <div style={{ display: 'flex', height: '100%' }}>
          <div className="pad-left pad-top">
            <div style={{ display: 'flex' }}>
              <button
                className="ctrl-btn"
                onClick={this.props.onHelpRequested.bind(this)}
              >
                ❓
              </button>
              {vm.playersById.size < 4 && (
                <button className="ctrl-btn" onClick={this.onNewClicked.bind(this)}>
                  ➕
                </button>
              )}
            </div>
            <ControlPanel vm={vm} />
            {vm.matchResult && <MatchResultDisplay result={vm.matchResult} vm={vm} />}
            <hr />
            <InfoPanel vm={vm} />
            <hr />
            <ContenderPanel vm={vm} coverages={this.coverages} />
            {this.selection && (
              <div>
                <hr />
                <div>Cell {this.selection.idx}</div>
                <div className="pad-top code">{this.selection.decoded.to_string()}</div>
              </div>
            )}
            {this.selectedProcesses && (
              <div className="pad-top">
                <ProcessInfoDisplay processes={this.selectedProcesses} vm={vm} />
              </div>
            )}
          </div>
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
        </div>
      </div>
    )
  }
}

function titledInfo(title: string, value: any) {
  return (
    <div className="pad-top" style={{ display: 'flex' }}>
      <div className="pad-left" style={{ minWidth: '80px' }}>
        {title}
      </div>
      <div className="code">{value}</div>
    </div>
  )
}

function toCssColor(color: number) {
  color >>>= 0
  const b = color & 0xff,
    g = (color & 0xff00) >>> 8,
    r = (color & 0xff0000) >>> 16
  return `rgb(${r}, ${g}, ${b})`
}

@observer
class ProcessInfoDisplay extends React.Component<{
  processes: ProcessCollection
  vm: VirtualMachine
}> {
  render() {
    const processes = this.props.processes
    const len = processes.len()

    const details = Array(Math.min(len, 32))
      .fill(0)
      .map((_, i) => {
        const process = processes.at(i)
        const state = process.executing() as ExecutingState | null
        const data = [
          titledInfo(
            'Player',
            <div
              style={{
                backgroundColor: toCssColor(
                  (this.props.vm.playersById.get(process.player_id) as Player).color
                )
              }}
            >
              {process.player_id}
            </div>
          ),
          titledInfo('Zero Flag', process.zf.toString()),
          titledInfo('Last live', process.last_live_cycle),
          titledInfo('State', state ? `${state.op()} (${state.cycle_left})` : 'Idle'),
          <details className="pad-left">
            <summary>Registers</summary>
            {Array.from(process.registers()).map((r, i) => (
              <div key={i} className="pad-left">
                {titledInfo(`r${i + 1}`, r)}
              </div>
            ))}
          </details>
        ]
        return (
          <details key={i} className="pad-left">
            <summary>PID {process.pid}</summary>
            {data.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </details>
        )
      })

    return len == 0 ? null : (
      <div>
        <details>
          <summary>
            {len} process
            {len >= 2 ? 'es' : ''}
          </summary>
          {details}
        </details>
      </div>
    )
  }
}

@observer
class MatchResultDisplay extends React.Component<{
  result: MatchResult
  vm: VirtualMachine
}> {
  render() {
    const result = this.props.result

    const nameSpans = result.map((p, i) => {
      const playerColor = (this.props.vm.playersById.get(p.id) as Player).color
      const color = toCssColor(playerColor)
      return (
        <span key={i} style={{ color }}>
          {p.champion_name()}
        </span>
      )
    })

    const joinedSpans = [nameSpans[0]]
    let i = 1
    for (; i < nameSpans.length - 1; ++i) {
      joinedSpans.push(<span key={`s${i}`}>, </span>)
      joinedSpans.push(nameSpans[i])
    }
    if (i < nameSpans.length) {
      joinedSpans.push(<span key={`s${i}`}> and </span>)
      joinedSpans.push(nameSpans[i])
    }

    return (
      <div>
        <hr />
        {result.length > 1 ? (
          <div>
            {'Draw between '}
            {joinedSpans}
          </div>
        ) : (
          <div>{joinedSpans} Wins</div>
        )}
      </div>
    )
  }
}

@observer
class ControlPanel extends React.Component<{ vm: VirtualMachine }> {
  render() {
    const vm = this.props.vm
    return (
      <div style={{ display: 'flex' }}>
        <button className="ctrl-btn" onClick={() => vm.togglePlay()}>
          {vm.playing ? '⏸️' : '▶️'}️
        </button>
        <button className="ctrl-btn" onClick={() => vm.stop()}>
          ⏹️
        </button>
        <button className="ctrl-btn" onClick={() => vm.step()}>
          ⏭️
        </button>
        <button className="ctrl-btn" onClick={() => vm.nextSpeed()}>
          ⏩ {vm.speed}x
        </button>
      </div>
    )
  }
}

function vmInfo(vm: VMEngine) {
  return [
    ['Processes', vm.process_count()],
    ['Check interval', vm.check_interval()],
    ['Next check', vm.check_interval() - (vm.cycles() - vm.last_live_check())],
    ['Last check', vm.last_live_check()],
    ['Live count', vm.live_count_since_last_check()],
    ['Checks passed', vm.checks_without_cycle_decrement()]
  ]
}

@observer
class InfoPanel extends React.Component<{ vm: VirtualMachine }> {
  render() {
    const info =
      this.props.vm.cycles !== null ? vmInfo(this.props.vm.engine as VMEngine) : []

    let cyclesInput =
      this.props.vm.cycles === null ? null : (
        <div className="pad-top" style={{ display: 'flex' }}>
          <div className="info-title">Cycles</div>
          <input
            style={{ textAlign: 'center' }}
            className="cycle-input"
            type="number"
            value={this.props.vm.cycles}
            onChange={ev => this.props.vm.setCycle(parseInt(ev.target.value))}
          />
        </div>
      )

    return (
      <div>
        {cyclesInput}
        {info.map(([title, value]) => (
          <div key={title} className="pad-top" style={{ display: 'flex' }}>
            <div className="info-title">{title}</div>
            <div className="code">{value}</div>
          </div>
        ))}
      </div>
    )
  }
}

@observer
class ContenderPanel extends React.Component<{
  vm: VirtualMachine
  coverages: Map<number, number>
}> {
  render() {
    const vm = this.props.vm
    return (
      <div>
        <div>{vm.playersById.size} contenders:</div>
        {Array.from(vm.playersById.values()).map((player, i) => {
          if (vm.cycles !== null && vm.engine) {
            let playerInfo = vm.engine.player_info(player.id) as PlayerInfo | null
            if (playerInfo === null) return null
            let championInfo = vm.engine.champion_info(player.id)
            const coverage = this.props.coverages.get(player.id) || 0
            return (
              <details key={i} style={{ color: toCssColor(player.color) }}>
                <summary>{playerInfo.champion_name()}</summary>
                {/* {titledInfo('Player ID', player.id)} */}
                <div className="pad-top" style={{ display: 'flex' }}>
                  <div className="pad-left" style={{ minWidth: '80px' }}>
                    Player ID
                  </div>
                  <div
                    className="code"
                    onClick={() => {
                      const newIdAsString = prompt('New id', player.id.toString())
                      if (newIdAsString) {
                        const newId = parseInt(newIdAsString)
                        vm.changePlayerId(player.id, newId)
                      }
                    }}
                  >
                    {player.id}
                  </div>
                </div>
                {titledInfo('Size', playerInfo.champion_size)}
                {titledInfo('Coverage', `${((coverage / 4096) * 100).toFixed(2)} %`)}
                {titledInfo('Processes', championInfo.process_count)}
                {titledInfo('Last live', championInfo.last_live)}
              </details>
            )
          } else {
            return null
          }
        })}
      </div>
    )
  }
}
