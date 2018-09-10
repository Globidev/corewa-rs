import * as wasm from "./corewar";
import { memory } from "./corewar_wasm";
import * as monaco from 'monaco-editor';

monaco.languages.register({ id: 'corewar_asm' });

const ALL_KEYWORDS = [
  ["live", "alive", "%0"],
  ["ld", "load", "%0, r1"],
  ["st", "store", "r1, r2"],
  ["add", "addition", "r1, r2, r3"],
  ["sub", "substraction", "r1, r2, r3"],
  ["and", "bit and", "*, *, r1"],
  ["or", "bit or", "*, *, r1"],
  ["xor", "bit xor", "*, *, r1"],
  ["zjmp", "jump if zero", "%0"],
  ["ldi", "load index", "*, r1, r2"],
  ["sti", "store index", "r1, *, r2"],
  ["fork", "fork", "%0"],
  ["lld", "long load", "%0, r1"],
  ["lldi", "long load index", "*, r1, r2"],
  ["lfork", "long fork", "%0"],
  ["aff", "display", "r1"],
];

// Register a tokens provider for the language
monaco.languages.setMonarchTokensProvider('corewar_asm', {
  // Set defaultToken to invalid to see what you do not tokenize yet
  // defaultToken: 'invalid',

  // @ts-ignore
  keywords: ALL_KEYWORDS.map(([kw, ..._]) => kw),

  commands: [
    '.name', '.comment'
  ],

  // C# style strings
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // labels
      [/[a-z0-9A-Z_]+:/, 'regexp'],
      [/:[a-z0-9A-Z_]+/, 'regexp'],

      // keywords and commands
      [/[a-z_$][\w$^:]*/, { cases: { '@keywords': 'keyword' } }],
      [/\.[a-z]*/, { cases: { '@commands': 'keyword' } }],

      // whitespace
      { include: '@whitespace' },

      // numbers
      [/-?\d+/, 'number'],

      // delimiter: after number because of .\d floats
      [/[,]/, 'delimiter'],

      // strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

      // characters
      [/'[^\\']'/, 'string'],
      [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
      [/'/, 'string.invalid']
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/#.*/, 'comment']
    ],
  },
});

const keywordCompletionItems = ALL_KEYWORDS.map(([kw, desc, params]) => ({
  label: kw,
  kind: monaco.languages.CompletionItemKind.Keyword,
  documentation: desc,
  insertText: `${kw} ${params}`
}))

monaco.languages.registerCompletionItemProvider('corewar_asm', {
  provideCompletionItems: function (model, position) {
    // find out if we are completing a property in the 'dependencies' object.
    // var textUntilPosition = model.getValueInRange({startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column});
    // var match = textUntilPosition.match(/"dependencies"\s*:\s*{\s*("[^"]*"\s*:\s*"[^"]*"\s*,\s*)*("[^"]*)?$/);
    // if (match) {
    //     return createDependencyProposals();
    // }
    // return [];
    return keywordCompletionItems;
  }
});

const editor = monaco.editor.create(document.getElementById('editor'), {
  value: [
    '# Live  ( T_DIR,             0,                 0           ), // Cycles: 10   ',
    '# Ld    ( T_DIR|T_IND,       T_REG,             0           ), // Cycles: 5    ',
    '# St    ( T_REG,             T_REG|T_IND,       0           ), // Cycles: 5    ',
    '# Add   ( T_REG,             T_REG,             T_REG       ), // Cycles: 10   ',
    '# Sub   ( T_REG,             T_REG,             T_REG       ), // Cycles: 10   ',
    '# And   ( T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG       ), // Cycles: 6    ',
    '# Or    ( T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG       ), // Cycles: 6    ',
    '# Xor   ( T_REG|T_DIR|T_IND, T_REG|T_DIR|T_IND, T_REG       ), // Cycles: 6    ',
    '# Zjmp  ( T_DIR,             0,                 0           ), // Cycles: 20   ',
    '# Ldi   ( T_REG|T_DIR|T_IND, T_REG|T_DIR,       T_REG       ), // Cycles: 25   ',
    '# Sti   ( T_REG,             T_REG|T_DIR|T_IND, T_REG|T_DIR ), // Cycles: 25   ',
    '# Fork  ( T_DIR,             0,                 0           ), // Cycles: 800  ',
    '# Lld   ( T_DIR|T_IND,       T_REG,             0           ), // Cycles: 10   ',
    '# Lldi  ( T_REG|T_DIR|T_IND, T_REG|T_DIR,       T_REG       ), // Cycles: 50   ',
    '# Lfork ( T_DIR,             0,                 0           ), // Cycles: 1000 ',
    '# Aff   ( T_REG,             0,                 0           ), // Cycles: 2    ',
    '',
    '.name "zork"',
    '.comment "I\'M ALIIIIVE"',
    '',
    'l2:		sti r1, %:live, %1',
    '		and r1, %0, r1',
    '',
    'live:	live %1',
    '		zjmp %:live',
  ].join('\n'),
  language: 'corewar_asm',
  theme: 'vs-dark'
});

let decorations = []
export function error_at(what, line, from, to) {
  console.log(line)
  decorations = editor.deltaDecorations(decorations, [
    { range: new monaco.Range(line,from,line,to), options: { isWholeLine: true, inlineClassName: 'error', hoverMessage:{value: what} }},
  ]);
}

let vm = null;
let debounceId = null;
let animationId = null;
let playing = false;

const BYTE_WIDTH = 20;
const BYTE_HEIGHT = 15;

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
const ChecksWithoutCycleDecrement = document.getElementById('info-checks-without-cycle-decrement');

playButton.onclick = (e) => {
  if (playing) stop();
  else play();
}

stepButton.onclick = (e) => {
  if (playing) stop();

  if (vm) tick();
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

  for (let i = 0; i < 25000; ++i)
    vm.tick();

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
  canvas.width = window.innerWidth;
  if (vm) {
    const lineLength = Math.floor(canvas.width / BYTE_WIDTH) - 1;
    const height = Math.round(vm.size() / lineLength);
    canvas.height = height * BYTE_WIDTH;
  } else {
    canvas.height = window.innerHeight / 2;
  }

  if (vm) drawVm(vm);
}

compileChampion();

function drawVm(vm) {
  cycleCounter.innerHTML = `Cycle: ${vm.cycles}`;
  cycleToDie.innerHTML = `Cycles to die: ${vm.cycles_to_die}`;
  processCounter.innerHTML = `Processes alive: ${vm.process_count()}`
  lastLiveCheck.innerHTML = `Last check cycle: ${vm.last_live_check}`
  liveCountSinceLastCheck.innerHTML = `Live count since last check: ${vm.live_count_since_last_check}`
  ChecksWithoutCycleDecrement.innerHTML = `Checks without decrements: ${vm.checks_without_cycle_decrement}`

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 8pt Helvetica';

  const size = vm.size();
  //@ts-ignore
  const mem = new Uint8Array(memory.buffer, vm.memory(), size);
  const lineLength = Math.floor(canvas.width / BYTE_WIDTH) - 1;

  for (let i = 0; i < vm.process_count(); ++i) {
    const pc = vm.process_pc(i)
    const x = pc % lineLength;
    const y = Math.floor(pc / lineLength);

    ctx.fillStyle = 'blue';
    ctx.fillRect(x * BYTE_WIDTH, y * BYTE_HEIGHT + 2, 15, BYTE_HEIGHT);
  }

  for (let i = 0; i < size; ++i) {
    const byte = mem[i];
    const x = i % lineLength;
    const y = Math.floor(i / lineLength);

    let byteText = byte.toString(16).toUpperCase();
    if (byteText.length < 2)
      byteText = `0${byteText}`;

    let textColor = byte != 0 ? 'lime' : 'silver';
    ctx.fillStyle = textColor;
    ctx.fillText(byteText, x * BYTE_WIDTH, (y + 1) * BYTE_HEIGHT, BYTE_WIDTH);
  }
}
