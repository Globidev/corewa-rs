import * as React from 'react'
import { ObservableVM } from './state'
import { observer } from 'mobx-react'
import { observe } from 'mobx'
import { VirtualMachine } from './corewar.d'

const BYTE_WIDTH = 20
const BYTE_HEIGHT = 13
const PADDING = 2

interface IVMProps {
  vm: ObservableVM
  onNewChampionRequested: (id: number) => void
}

@observer
export class VM extends React.Component<IVMProps> {
  canvasRef = React.createRef<HTMLCanvasElement>()

  constructor(props: IVMProps) {
    super(props)

    window.addEventListener('resize', this.resizeCanvas.bind(this), false)

    observe(props.vm, 'cycles', _ => {
      const canvas = this.canvasRef.current

      if (props.vm.vm && canvas) drawVm(props.vm.vm, canvas, props.vm.colors)
    })
  }

  componentDidMount() {
    this.resizeCanvas()
  }

  resizeCanvas() {
    const canvas = this.canvasRef.current

    if (canvas) {
      canvas.width = canvas.clientWidth
      const vm = this.props.vm

      if (vm.vm) {
        const height = ROWS
        canvas.height = height * BYTE_HEIGHT
        drawVm(vm.vm, canvas, vm.colors)
      } else {
        canvas.height = canvas.clientHeight
      }
    }
  }

  onNewClicked() {
    const vm = this.props.vm
    if (vm.players.size < 4) this.props.onNewChampionRequested(vm.nextChampionId())
  }

  render() {
    const vm = this.props.vm
    return (
      <div id="vm-container">
        <div style={{ display: 'flex' }}>
          {vm.players.size < 4 ? (
            <button onClick={this.onNewClicked.bind(this)}>➕</button>
          ) : null}
          <ControlPanel vm={vm} />
          <InfoPanel vm={vm} />
        </div>
        <canvas ref={this.canvasRef} id="canvas" style={{ marginTop: '50px' }} />
      </div>
    )
  }
}

@observer
class ControlPanel extends React.Component<{ vm: ObservableVM }> {
  render() {
    let cyclesInput =
      this.props.vm.cycles === null ? null : (
        <div className="info">
          <div>Cycles</div>
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
      <div style={{ display: 'flex' }}>
        <button onClick={() => this.props.vm.togglePlay()}>
          {this.props.vm.playing ? '⏸️' : '▶️'}️
        </button>
        <button onClick={() => this.props.vm.stop()}>⏹️</button>
        <button onClick={() => this.props.vm.step()}>⏭️</button>
        <button onClick={() => this.props.vm.nextSpeed()}>
          ⏩ {this.props.vm.speed}x
        </button>
        {cyclesInput}
      </div>
    )
  }
}

function vmInfo(vm: VirtualMachine) {
  return [
    ['Processes alive', vm.process_count()],
    ['Check interval', vm.cycles_to_die],
    ['Last check cycle', vm.last_live_check],
    ['Current live count', vm.live_count_since_last_check],
    ['Live checks passed', vm.checks_without_cycle_decrement]
  ]
}

@observer
class InfoPanel extends React.Component<{ vm: ObservableVM }> {
  render() {
    const info =
      this.props.vm.cycles !== null ? vmInfo(this.props.vm.vm as VirtualMachine) : []

    return (
      <div style={{ display: 'flex' }}>
        {info.map(([title, value]) => (
          <div key={title} className="info">
            <div>{title}</div>
            <div style={{ textAlign: 'center' }}>{value}</div>
          </div>
        ))}
      </div>
    )
  }
}

const ROWS = 64
const COLUMNS = 64

function drawVm(
  vm: VirtualMachine,
  canvas: HTMLCanvasElement,
  player_colors: Map<number, string>
) {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = 'bold 9pt Helvetica'

  const size = vm.size()

  for (let i = 0; i < vm.process_count(); ++i) {
    const pc = vm.process_pc(i)
    const x = pc % COLUMNS
    const y = Math.floor(pc / COLUMNS)

    ctx.fillStyle = '#FFFFFF80'
    ctx.fillRect(
      x * BYTE_WIDTH - PADDING,
      y * BYTE_HEIGHT + PADDING,
      BYTE_WIDTH - PADDING,
      BYTE_HEIGHT
    )
  }

  for (let i = 0; i < size; ++i) {
    const cell = vm.cell_at(i)
    const x = i % COLUMNS
    const y = Math.floor(i / COLUMNS)

    let byteText = cell.value.toString(16).toUpperCase()
    if (byteText.length < 2) byteText = `0${byteText}`

    let textColor =
      cell.owner !== undefined ? (player_colors.get(cell.owner) as string) : 'silver'
    ctx.fillStyle = textColor
    ctx.fillText(byteText, x * BYTE_WIDTH, (y + 1) * BYTE_HEIGHT, BYTE_WIDTH)
  }
}
