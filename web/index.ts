import * as wasm from "./corewar";
import { memory } from "./corewar_wasm";
import { createCorewarEditor } from './editor';



// let decorations = []
// export function error_at(what, line, from, to) {
//   console.log(line)
//   decorations = editor.deltaDecorations(decorations, [
//     { range: new monaco.Range(line,from,line,to), options: { isWholeLine: true, inlineClassName: 'error', hoverMessage:{value: what} }},
//   ]);
// }

let vm = null;
let debounceId = null;
let animationId = null;
let playing = false;
let fullscreen = false;

const editorContainer = document.getElementById('editor');
const editor = createCorewarEditor(editorContainer);

const BYTE_WIDTH = 20;
const BYTE_HEIGHT = 15;

const fullscreenButton = document.getElementById('fullscreen');
const playButton = document.getElementById('play');
const stepButton = document.getElementById('step');
const resetButton = document.getElementById('reset');
const canvas = <HTMLCanvasElement>document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const cycleCounter = document.getElementById('info-cycle');
const cycleToDie = document.getElementById('info-cycle-to-die');
const processCounter = document.getElementById('info-process-count');
const lastLiveCheck = document.getElementById('info-last-live-check');
const liveCountSinceLastCheck = document.getElementById('info-live-count-since-last-check');
const checksWithoutCycleDecrement = document.getElementById('info-checks-without-cycle-decrement');

playButton.onclick = (e) => {
  if (playing) stop();
  else play();
}

stepButton.onclick = (e) => {
  if (playing) stop();

  if (vm) tick();
}

fullscreenButton.onclick = (e) => {
  let container = document.getElementById('editor-container');
  if (!fullscreen) {
    container.style.display = "none";
    document.getElementById('vm').style.width = '100%';
  } else {
    container.style.display = '';
    document.getElementById('vm').style.width = '50%';
  }

  fullscreen = !fullscreen;
  resizeCanvas();
}

resetButton.onclick = (e) => {
  reset()
}

editor.getModel().onDidChangeContent(e => {
  clearTimeout(debounceId);
  cancelAnimationFrame(animationId);
  debounceId = setTimeout(compileChampion, 500);
})

function stop() {
  cancelAnimationFrame(animationId);
  playing = false;
  playButton.innerText = '▶️'
}

function play() {
  if (vm) {
    playing = true;
    playButton.innerText = '⏸️'
    renderLoop()
  }
}

function reset() {
  const input = editor.getValue();
  vm = wasm.vm_from_code(input);

  drawVm(vm);
}

function tick() {
  vm.tick();
  drawVm(vm);
}

function compileChampion() {
  stop();
  reset();
  resizeCanvas();
}

function renderLoop() {
  tick();
  animationId = requestAnimationFrame(renderLoop);
}

window.addEventListener('resize', resizeCanvas, false);

function resizeCanvas() {
  canvas.width = canvas.clientWidth;

  if (vm) {
    const lineLength = Math.floor(canvas.width / BYTE_WIDTH) - 1;
    const height = Math.round(vm.size() / lineLength);
    canvas.height = height * BYTE_HEIGHT;
  } else {
    canvas.height = canvas.clientHeight;
  }

  if (vm) drawVm(vm);

  editor.layout({ width: editorContainer.clientWidth, height: editorContainer.clientHeight })
}

compileChampion();

function drawVm(vm) {
  cycleCounter.innerHTML = `Cycle ${vm.cycles}`;
  cycleToDie.innerHTML = `Cycles to die ${vm.cycles_to_die}`;
  processCounter.innerHTML = `Processes alive ${vm.process_count()}`
  lastLiveCheck.innerHTML = `Last check cycle ${vm.last_live_check}`
  liveCountSinceLastCheck.innerHTML = `Live count since last check ${vm.live_count_since_last_check}`
  checksWithoutCycleDecrement.innerHTML = `Checks without decrements ${vm.checks_without_cycle_decrement}`

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 9pt Helvetica';

  const size = vm.size();
  //@ts-ignore
  const mem = new Uint8Array(memory.buffer, vm.memory(), size);
  const lineLength = Math.floor(canvas.width / BYTE_WIDTH) - 1;

  for (let i = 0; i < vm.process_count(); ++i) {
    const pc = vm.process_pc(i)
    const x = pc % lineLength;
    const y = Math.floor(pc / lineLength);

    ctx.fillStyle = 'yellow';
    ctx.fillRect(x * BYTE_WIDTH + 10.5, y * BYTE_HEIGHT + 2, BYTE_WIDTH - 2, BYTE_HEIGHT);
  }

  for (let i = 0; i < size; ++i) {
    const byte = mem[i];
    const x = i % lineLength;
    const y = Math.floor(i / lineLength);

    let byteText = byte.toString(16).toUpperCase();
    if (byteText.length < 2)
      byteText = `0${byteText}`;

    let textColor = byte != 0 ? 'orange' : 'silver';
    ctx.fillStyle = textColor;
    ctx.fillText(byteText, x * BYTE_WIDTH + 10.5, (y + 1) * BYTE_HEIGHT, BYTE_WIDTH);
  }
}
