import * as React from 'react'

import { champions } from '../assets/champions'
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
        keyMap: 'sublime',
        extraKeys: { 'Ctrl-Space': 'autocomplete' }
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
    let champion = corewar.compile_champion(code)
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

export const ASM_LANGUAGE_ID = 'corewar-asm'

CodeMirror.registerHelper('lint', ASM_LANGUAGE_ID, function (
  code: string,
  opts: { editor: Editor }
) {
  try {
    opts.editor.compile(code)
    return []
  } catch (err) {
    opts.editor.props.onCodeChanged(code, null)
    const compileError = err as import('corewa-rs').CompileError
    const region = compileError.region() as import('corewa-rs').Region | null
    let [from_row, from_col, to_row, to_col] = (() => {
      if (region != null)
        return [region.from_row - 1, region.from_col, region.to_row - 1, region.to_col]
      else return [0, 0, 5000, 5000]
    })()

    if (from_col == to_col)++to_col

    return [
      {
        from: CodeMirror.Pos(from_row, from_col),
        to: CodeMirror.Pos(to_row, to_col),
        message: compileError.reason()
      }
    ]
  }
})

CodeMirror.registerHelper('hint', ASM_LANGUAGE_ID, function (
  editor: CodeMirror.Doc,
  _opts: any
) {
  //@ts-ignore
  const cursor = editor.getCursor()

  // console.log(cursor)
  // return {
  //   list: ['st r1, 42', 'd', 'efghij', 'kl'],
  //   from: CodeMirror.Pos(cursor.line, 0),
  //   to: CodeMirror.Pos(cursor.line, 10)
  // }
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

const COMMENT_CHAR = '#'

CodeMirror.defineMode(ASM_LANGUAGE_ID, function (_config, _parserConfig) {
  const lineCommentStartSymbol = COMMENT_CHAR

  const directives = new Set(['.name', '.comment', '.code'])

  const KEYWORDS = new Set(ALL_KEYWORDS.map(([kw, ..._]) => kw))

  return {
    startState: function () {
      return {
        tokenize: null
      }
    },

    token: function (stream, state) {
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
        const next = stream.eat(/\d/)
        if (next) {
          if (next == '0') {
            if (tokenizePrefixedNumber(stream)) return 'number'
          }
          stream.eatWhile(/\d/)
          return 'number'
        }
      }

      if (ch === '0') {
        if (tokenizePrefixedNumber(stream)) return 'number'
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

function tokenizePrefixedNumber(stream: CodeMirror.StringStream) {
  const next = stream.peek()
  if (next) {
    switch (next) {
      case 'd':
        stream.next()
        stream.eatWhile(/\d/)
        return 'number'
      case 'x':
        stream.next()
        stream.eatWhile(/[0-9a-fA-F]/)
        return 'number'
    }
  }
  return null
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
const WHITESPACES = ' \f\n\r\t\v\u00a0\u1680\u2000\u2028\u2029\u202f\u205f\u3000\ufeff'
const isWhitespace = (ch: string) => WHITESPACES.includes(ch)

type ToggleComment =
  | { kind: 'insert'; col: number }
  | { kind: 'remove'; col: number; length: number }

function toggleLineComment(line: string): ToggleComment {
  const chars = line[Symbol.iterator]()

  let byteIndex = 0
  let currentChar = chars.next()
  // Skip whitespaces and keep track of the byte index
  while (isWhitespace(currentChar.value)) {
    byteIndex += currentChar.value.length
    currentChar = chars.next()
  }

  const columnStart = byteIndex
  // We need to either comment or uncomment depending on the next char
  if (currentChar.value == COMMENT_CHAR) {
    let removeLen = COMMENT_CHAR.length
    // Remove one eventual additional whitespace
    currentChar = chars.next()
    if (isWhitespace(currentChar.value)) removeLen += currentChar.value.length

    return { kind: 'remove', col: columnStart, length: removeLen }
  } else {
    return { kind: 'insert', col: columnStart }
  }
}

CodeMirror.defineExtension('toggleComment', function (
  this: CodeMirror.Doc,
  _options: any
) {
  const document = this,
    selections = document.listSelections()

  const selectedLineNumbers = selections.reduce((nums, selection) => {
    let [low, high] = [selection.anchor.line, selection.head.line]
    if (low > high) [low, high] = [high, low]
    for (let i = low; i <= high; ++i) nums.add(i)
    return nums
  }, new Set<number>())

  selectedLineNumbers.forEach(lineNum => {
    const line = document.getLine(lineNum)
    const toggle = toggleLineComment(line)
    const fromPos = CodeMirror.Pos(lineNum, toggle.col)
    switch (toggle.kind) {
      case 'remove':
        const toPos = CodeMirror.Pos(lineNum, toggle.col + toggle.length)
        document.replaceRange('', fromPos, toPos)
        break
      case 'insert':
        document.replaceRange(COMMENT_CHAR + ' ', fromPos)
        break
    }
  })
})
