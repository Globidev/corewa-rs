import * as wasm from "./corewar";
import { memory } from "./corewar_wasm";
import * as React from "react";
import { state, uiState } from "./state";
import { observer } from "mobx-react";
import { observe } from "mobx";

const BYTE_WIDTH = 20;
const BYTE_HEIGHT = 15;
const PADDING = 2;

@observer
export class VM extends React.Component {
  canvasRef = React.createRef<HTMLCanvasElement>();

  constructor(props) {
    super(props)

    window.addEventListener('resize', this.resizeCanvas.bind(this), false);

    observe(state, "vmCycles", _ => {
      const canvas = this.canvasRef.current;

      if (state.vm && canvas)
        drawVm(state.vm, canvas)
    })
  }

  componentDidMount() {
    this.resizeCanvas()
  }

  resizeCanvas() {
    const canvas = this.canvasRef.current;

    if (canvas) {
      canvas.width = canvas.clientWidth;
      const vm = state.vm;

      if (vm) {
        const lineLength = Math.floor(canvas.width / BYTE_WIDTH) - 1;
        const height = Math.round(vm.size() / lineLength);
        canvas.height = height * BYTE_HEIGHT;
        drawVm(vm, canvas);
      } else {
        canvas.height = canvas.clientHeight;
      }

      // editor.layout({
      //   width: DOM.editor.clientWidth,
      //   height: DOM.editor.clientHeight
      // })
    }
  }

  render() {
    return (
      <div id="vm-container" style={{ width: uiState.fullscreen ? '100%' : '50%' }}>
        <div style={{display:'flex'}}>
          <ControlPanel />
          <InfoPanel />
        </div>
        <canvas ref={this.canvasRef} id="canvas" style={{ marginTop: "50px" }}></canvas>
      </div>
    )
  }
}

@observer
class ControlPanel extends React.Component {
  render() {
    let cyclesInput = state.vmCycles === null
      ? null
      : (
        <div className="info">
          <div>Cycles</div>
          <input
            style={{ textAlign: "center" }}
            className="cycle-input"
            type="number"
            value={state.vmCycles}
            onChange={(ev) => state.setCycle(parseInt(ev.target.value))}>
          </input>
        </div>
      );

    return (
      <div style={{ display: "flex" }}>
        <button onClick={() => uiState.toggleFullscreen()}>🎦️</button>
        <button onClick={() => state.togglePlay()}>{state.playing ? '⏸️' : '▶️'}️</button>
        <button onClick={() => state.stop()}>⏹️</button>
        <button onClick={() => state.step()}>⏭️</button>
        <button onClick={() => state.nextSpeed()}>⏩ {state.speed}x</button>
        { cyclesInput }
      </div>
    )
  }
}

function vmInfo(vm: wasm.VirtualMachine) {
  return [
    ["Processes alive",    vm.process_count()],
    ["Check interval",     vm.cycles_to_die],
    ["Last check cycle",   vm.last_live_check],
    ["Current live count", vm.live_count_since_last_check],
    ["Live checks passed", vm.checks_without_cycle_decrement],
  ]
}

@observer
class InfoPanel extends React.Component {
  render() {
    const info = state.vmCycles !== null
      ? vmInfo(state.vm as wasm.VirtualMachine)
      : [];

    return (
      <div style={{ display: "flex" }}>
        {info.map(([title, value]) =>
          <div key={title} className="info">
            <div>{title}</div>
            <div style={{ textAlign: "center" }}>{value}</div>
          </div>
        )}
      </div>
    )
  }
}

const PLAYER_COLORS = [
  '#FFA517',
  '#7614CC',
  '#14CC57',
  '#1A2AFF',
]

function drawVm(vm: wasm.VirtualMachine, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 9pt Helvetica';

  const size = vm.size();
  // const mem = new Uint8Array(memory.buffer, vm.memory(), size);
  const lineLength = Math.floor(canvas.width / BYTE_WIDTH) - 1;

  for (let i = 0; i < vm.process_count(); ++i) {
    const pc = vm.process_pc(i)
    const x = pc % lineLength;
    const y = Math.floor(pc / lineLength);

    ctx.fillStyle = '#FFFFFF80';
    ctx.fillRect(
        x * BYTE_WIDTH - PADDING,
        y * BYTE_HEIGHT + PADDING,
        BYTE_WIDTH - PADDING,
        BYTE_HEIGHT
    );
  }

  for (let i = 0; i < size; ++i) {
    const cell = vm.cell_at(i);
    const x = i % lineLength;
    const y = Math.floor(i / lineLength);

    let byteText = cell.value.toString(16).toUpperCase();
    if (byteText.length < 2)
      byteText = `0${byteText}`;

    let textColor = cell.owner !== undefined ? PLAYER_COLORS[cell.owner-1] : 'silver';
    ctx.fillStyle = textColor;
    ctx.fillText(
        byteText,
        x * BYTE_WIDTH,
        (y + 1) * BYTE_HEIGHT,
        BYTE_WIDTH
    );
  }
}
