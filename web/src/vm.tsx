import * as React from 'react'
import { state, uiState, ObservableVM } from './state'
import { observer } from 'mobx-react'
import { observe } from 'mobx'
import { VirtualMachine } from './corewar.d'

const BYTE_WIDTH = 20
const BYTE_HEIGHT = 13
const PADDING = 2

interface IVMProps {
  vm: ObservableVM
  // visible: boolean
}

@observer
export class VM extends React.Component<IVMProps> {
  canvasRef = React.createRef<HTMLCanvasElement>()

  constructor(props) {
    super(props)

    window.addEventListener('resize', this.resizeCanvas.bind(this), false)

    observe(props.vm, 'cycles', _ => {
      const canvas = this.canvasRef.current

      if (props.vm.vm && canvas) drawVm(props.vm.vm, canvas)
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
        drawVm(vm.vm, canvas)
      } else {
        canvas.height = canvas.clientHeight
      }
    }
  }

  render() {
    return (
      <div id="vm-container">
        <div style={{ display: 'flex' }}>
          <ControlPanel vm={this.props.vm} />
          <InfoPanel vm={this.props.vm} />
        </div>
        <canvas ref={this.canvasRef} id="canvas" style={{ marginTop: '50px' }} />
      </div>
    )
  }
}

@observer
class ControlPanel extends React.Component<IVMProps> {
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
class InfoPanel extends React.Component<IVMProps> {
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

const PLAYER_COLORS = ['#FFA517', '#7614CC', '#14CC57', '#1A2AFF']

const ROWS = 64
const COLUMNS = 64

function drawVm(vm: VirtualMachine, canvas: HTMLCanvasElement) {
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

    let textColor = cell.owner !== undefined ? PLAYER_COLORS[cell.owner - 1] : 'silver'
    ctx.fillStyle = textColor
    ctx.fillText(byteText, x * BYTE_WIDTH, (y + 1) * BYTE_HEIGHT, BYTE_WIDTH)
  }
}
