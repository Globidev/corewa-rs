import * as monaco from 'monaco-editor';
import * as React from "react";

interface IEditorProps {
  onCodeChanged: (code: string) => void;
}

export class Editor extends React.Component<IEditorProps> {
  domContainer = React.createRef<HTMLDivElement>();
  debounceId: number;

  componentDidMount() {
    if (this.domContainer.current) {
      const editor = monaco.editor.create(this.domContainer.current, {
        value: DEFAULT_TEXT,
        language: ASM_LANGUAGE_ID,
        theme: 'vs-dark'
      });

      editor.getModel().onDidChangeContent(e => {
        clearTimeout(this.debounceId);
        this.debounceId = window.setTimeout(
          this.props.onCodeChanged, 500, editor.getValue()
        );
      });

      this.props.onCodeChanged(editor.getValue());
    }
  }

  render() {
    return (
      <div id="editor-container">
        <div id="editor" ref={this.domContainer}></div>
      </div>
    )
  }
}

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

const ASM_LANGUAGE_ID = 'corewar-asm';

const ASM_TOKEN_PROVIDER: monaco.languages.IMonarchLanguage = {
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
    // @ts-ignore
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
};

const DEFAULT_TEXT = [
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
].join('\n');

function setupLanguage() {
    monaco.languages.register({ id: ASM_LANGUAGE_ID });

    monaco.languages.setMonarchTokensProvider(ASM_LANGUAGE_ID, ASM_TOKEN_PROVIDER);
}

setupLanguage()

// const keywordCompletionItems = ALL_KEYWORDS.map(([kw, desc, params]) => ({
//   label: kw,
//   kind: monaco.languages.CompletionItemKind.Keyword,
//   documentation: desc,
//   insertText: `${kw} ${params}`
// }))

// monaco.languages.registerCompletionItemProvider('corewar_asm', {
//   provideCompletionItems: function (model, position) {
//     // find out if we are completing a property in the 'dependencies' object.
//     // var textUntilPosition = model.getValueInRange({startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column});
//     // var match = textUntilPosition.match(/"dependencies"\s*:\s*{\s*("[^"]*"\s*:\s*"[^"]*"\s*,\s*)*("[^"]*)?$/);
//     // if (match) {
//     //     return createDependencyProposals();
//     // }
//     // return [];
//     return keywordCompletionItems;
//   }
// });

