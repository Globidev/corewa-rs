import { champions } from './champions'

import * as React from 'react'
import { JsCompileError, Region } from './corewar'

interface IEditorProps {
  onCodeChanged: (code: CompiledChampion) => void
  onClosed: () => void
}

// Object.keys(champions).forEach(champName => {
//   try {
//     wasm_bindgen.compile_champion(champions[champName])
//   } catch (e) {
//     console.log(champName, e)
//   }
// })

// function randomChampion() {
//   const keys = Object.keys(champions)
//   const randomKey = keys[(keys.length * Math.random()) << 0]
//   return champions[randomKey]
// }

export class Editor extends React.Component<IEditorProps> {
  domContainer = React.createRef<HTMLDivElement>()
  debounceId: number = 0
  editor: CodeMirror.Editor | null = null

  componentDidMount() {
    const container = this.domContainer.current

    if (container) {
      // @ts-ignore
      const editor = CodeMirror(container, {
        lineNumbers: true,
        theme: 'monokai',
        // theme: '3024-night',
        mode: ASM_LANGUAGE_ID,
        // gutters: ['CodeMirror-lint-markers'],
        lint: {
          editor: this,
          lintOnChange: false
        },
        value: champions.zork,
        keyMap: 'sublime'
        // lintOnChange: false
      })
      // editor.performLint()

      // @ts-ignore
      editor.on('change', (_e, _ch) => {
        clearTimeout(this.debounceId)
        this.debounceId = window.setTimeout(
          editor.performLint.bind(editor),
          100
          // editor.getValue()
        )
      })

      // ?????
      setTimeout(() => {
        editor.refresh()
      }, 0)

      // this.compile(editor.getValue())

      this.editor = editor
    }
  }

  compile(code: string) {
    let champion = wasm_bindgen.compile_champion(code)
    this.props.onCodeChanged(champion)
  }

  componentWillUnmount() {
    this.props.onClosed()
  }

  render() {
    return (
      <div id="editor-container">
        <div style={{ display: 'flex' }}>
          <div>Load model: </div>
          <select
            defaultValue="zork"
            onChange={e => {
              if (this.editor) this.editor.setValue(champions[e.target.value])
            }}
          >
            {Object.keys(champions).map(ch => {
              return (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              )
            })}
          </select>
        </div>
        <div id="editor" ref={this.domContainer} />
      </div>
    )
  }
}

const ASM_LANGUAGE_ID = 'corewar-asm'

CodeMirror.registerHelper('lint', ASM_LANGUAGE_ID, function(
  code: string,
  opts: { editor: Editor }
) {
  try {
    opts.editor.compile(code)
    return []
  } catch (err) {
    const compileError = err as JsCompileError
    const region = compileError.region() as Region | null
    let [from_row, from_col, to_row, to_col] = (() => {
      if (region != null)
        return [
          region.from_row - 1,
          region.from_col,
          region.to_row - 1,
          region.to_col + 500
        ]
      else return [0, 0, 5000, 5000]
    })()

    return [
      {
        from: CodeMirror.Pos(from_row, from_col),
        to: CodeMirror.Pos(to_row, to_col),
        message: compileError.reason()
      }
    ]
  }
})

const ALL_KEYWORDS = [
  ['live', 'alive', '%0'],
  ['ld', 'load', '%0, r1'],
  ['st', 'store', 'r1, r2'],
  ['add', 'addition', 'r1, r2, r3'],
  ['sub', 'substraction', 'r1, r2, r3'],
  ['and', 'bit and', '*, *, r1'],
  ['or', 'bit or', '*, *, r1'],
  ['xor', 'bit xor', '*, *, r1'],
  ['zjmp', 'jump if zero', '%0'],
  ['ldi', 'load index', '*, r1, r2'],
  ['sti', 'store index', 'r1, *, r2'],
  ['fork', 'fork', '%0'],
  ['lld', 'long load', '%0, r1'],
  ['lldi', 'long load index', '*, r1, r2'],
  ['lfork', 'long fork', '%0'],
  ['aff', 'display', 'r1']
]

CodeMirror.defineMode(ASM_LANGUAGE_ID, function(_config, _parserConfig) {
  const lineCommentStartSymbol = '#'

  const directives = new Set(['.name', '.comment'])

  const KEYWORDS = new Set(ALL_KEYWORDS.map(([kw, ..._]) => kw))

  return {
    startState: function() {
      return {
        tokenize: null
      }
    },

    token: function(stream, state) {
      if (state.tokenize) {
        return state.tokenize(stream, state)
      }

      if (stream.eatSpace()) {
        return null
      }

      let ch = stream.next()

      if (ch == null) return null

      if (ch === lineCommentStartSymbol) {
        stream.skipToEnd()
        return 'comment'
      }

      if (ch === '%') {
        return 'attribute'
      }

      if (ch === '"') {
        stream.eatWhile(c => c != '"')
        return 'string'
      }

      if (ch === '.') {
        stream.eatWhile(/\w/)
        const cur = stream.current().toLowerCase()
        if (directives.has(cur)) return 'builtin'
      }

      if (ch === ':') {
        stream.eatWhile(/\w/)
        return 'tag'
      }

      if (ch === 'r') {
        stream.eatWhile(/\d/)
        const regNum = parseInt(stream.current().substr(1))
        if (regNum >= 1 && regNum <= 16) return 'def'
      }

      if (ch === '-') {
        if (stream.eat(/\d/)) {
          stream.eatWhile(/\d/)
          return 'number'
        }
      }

      if (/\d/.test(ch)) {
        stream.eatWhile(/\d/)
        return 'number'
      }

      if (/\w/.test(ch)) {
        stream.eatWhile(/\w/)
        if (stream.eat(':')) {
          return 'tag'
        } else {
          const cur = stream.current()
          if (KEYWORDS.has(cur)) return 'builtin'
        }
        return null
      }
    },

    lineComment: lineCommentStartSymbol
  }
})

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
