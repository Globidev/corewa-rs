import * as React from 'react'
import { VirtualMachine, Player, MatchResult } from './virtual_machine'
import { VirtualMachine as VMEngine } from './corewar'
import { observer } from 'mobx-react'
import { observe, observable } from 'mobx'
import { DecodeResult, ProcessCollection, ExecutingState } from './corewar.d'
import { Arena } from './arena'

interface IVMProps {
  vm: VirtualMachine
  onNewPlayerRequested: () => void
  onHelpRequested: () => void
}

@observer
export class VM extends React.Component<IVMProps> {
  arenaRef = React.createRef<Arena>()
  @observable
  selection: { idx: number; decoded: DecodeResult } | null = null
  @observable
  selectedProcesses: ProcessCollection | null = null

  coverages = new Map<number, number>()

  constructor(props: IVMProps) {
    super(props)

    observe(props.vm, 'cycles', _ => {
      this.selectedProcesses = null
      if (this.selection && props.vm.engine != null)
        this.updateSelection(this.selection.idx)
      else this.selection = null
      this.draw()
    })
  }

  draw() {
    // console.time('draw')
    const renderer = this.arenaRef.current
    const vm = this.props.vm
    const engine = vm.engine

    if (engine && renderer) {
      const memory = engine.memory()

      renderer.update({
        memory,
        selection: this.selection,
        playersById: vm.playersById
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
    // console.timeEnd('draw')
  }

  updateSelection(idx: number) {
    let engine = this.props.vm.engine
    if (engine) {
      this.selection = { idx, decoded: engine.decode(idx) }
      this.selectedProcesses = engine.processes_at(idx)
      this.draw()
    }
  }

  componentDidMount() {
    this.draw()
  }

  onNewClicked() {
    const vm = this.props.vm
    if (vm.playersById.size < 4) this.props.onNewPlayerRequested()
  }

  render() {
    const vm = this.props.vm
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
              {vm.playersById.size < 4 ? (
                <button className="ctrl-btn" onClick={this.onNewClicked.bind(this)}>
                  ➕
                </button>
              ) : null}
            </div>
            <ControlPanel vm={vm} />
            {vm.matchResult !== null ? (
              <MatchResultDisplay result={vm.matchResult} vm={vm} />
            ) : null}
            <hr />
            <InfoPanel vm={vm} />
            <hr />
            <ContenderPanel vm={vm} coverages={this.coverages} />
            {this.selection ? (
              <div>
                <hr />
                <div>Cell {this.selection.idx}</div>
                <div className="pad-top code">{this.selection.decoded.to_string()}</div>
              </div>
            ) : null}
            {this.selectedProcesses ? (
              <div className="pad-top">
                <ProcessInfoDisplay processes={this.selectedProcesses} vm={vm} />
              </div>
            ) : null}
          </div>
          <Arena ref={this.arenaRef} onCellClicked={this.updateSelection.bind(this)} />
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
      joinedSpans.push(<span>, </span>)
      joinedSpans.push(nameSpans[i])
    }
    if (i < nameSpans.length) {
      joinedSpans.push(<span> and </span>)
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
            let playerInfo = vm.engine.player_info(i)
            let championInfo = vm.engine.champion_info(player.id)
            const coverage = this.props.coverages.get(player.id) || 0
            return (
              <details key={i} style={{ color: toCssColor(player.color) }}>
                <summary>{playerInfo.champion_name()}</summary>
                {titledInfo('Player ID', player.id)}
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
