import { champions } from './champions'

import * as React from 'react'
import { CompileError, Region } from './corewar'
import { observer } from 'mobx-react'

interface IEditorProps {
  config: any
  onCodeChanged: (code: string, champion: CompiledChampion | null) => void
  onClosed: () => void
}

function randomChampionName() {
  const keys = Object.keys(champions)
  return keys[(keys.length * Math.random()) << 0]
}

@observer
export class Editor extends React.Component<IEditorProps> {
  domContainer = React.createRef<HTMLDivElement>()
  debounceId: number = 0
  editor: CodeMirror.Editor | null = null
  initialChampion = randomChampionName()

  componentDidMount() {
    const container = this.domContainer.current
    const initialText = this.props.config.code || null

    if (container) {
      //  @ts-ignore
      const editor = CodeMirror(container, {
        lineNumbers: true,
        theme: 'monokai',
        mode: ASM_LANGUAGE_ID,
        lint: {
          editor: this,
          lintOnChange: false
        },
        value: initialText !== null ? initialText : champions[this.initialChampion],
        keyMap: 'sublime'
      })

      // @ts-ignore
      editor.on('change', (_e, _ch) => {
        clearTimeout(this.debounceId)
        this.debounceId = window.setTimeout(editor.performLint.bind(editor), 100)
      })

      // ?????
      setTimeout(() => {
        editor.refresh()
      }, 0)

      this.editor = editor
    }
  }

  compile(code: string) {
    let champion = wasm_bindgen.compile_champion(code)
    this.props.onCodeChanged(code, champion)
  }

  componentWillUnmount() {
    this.props.onClosed()
  }

  render() {
    return (
      <div className="editor-container">
        <div style={{ display: 'flex' }}>
          <div>Load model: </div>
          <select
            defaultValue={
              this.props.config.code !== undefined ? 'Custom' : this.initialChampion
            }
            onChange={e => {
              if (this.editor)
                this.editor.setValue(
                  champions[e.target.value] || this.props.config.code || ''
                )
            }}
          >
            {Object.keys(champions).map(ch => {
              return (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              )
            })}
            <option value="Custom">Custom</option>
          </select>
        </div>
        <div className="editor" ref={this.domContainer} />
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
    opts.editor.props.onCodeChanged(code, null)
    const compileError = err as CompileError
    const region = compileError.region() as Region | null
    let [from_row, from_col, to_row, to_col] = (() => {
      if (region != null)
        return [region.from_row - 1, region.from_col, region.to_row - 1, region.to_col]
      else return [0, 0, 5000, 5000]
    })()

    if (from_col == to_col) ++to_col

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
        const next = stream.peek()
        if (!next || !/\w/.test(next)) {
          const regNum = parseInt(stream.current().substr(1))
          if (regNum >= 1 && regNum <= 16) return 'def'
        }
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
