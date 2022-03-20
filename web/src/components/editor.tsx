import { useEffect, useRef } from "react";
import CodeMirror from "codemirror";

import { observer } from "mobx-react-lite";

import { CompileError } from "corewa-rs";
import { CorewarPlayer } from "../state/player";
import { champions } from "../assets/champions";
import { toCssColor } from "../utils";
import { autorun } from "mobx";

type Props = {
  player: CorewarPlayer;
  onChanged: (_: { color: number; code: string; playerId: number }) => void;
};

export const Editor = observer(({ player, onChanged }: Props) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorChangedDebounceHandle = useRef<number>();
  const colorChangedDebounceHandle = useRef<number>();
  const editor = useRef<CodeMirror.Editor>();

  useEffect(() => {
    const editorContainer = editorContainerRef.current;

    if (editorContainer) {
      const newEditor = CodeMirror(editorContainer, {
        lineNumbers: true,
        theme: "nord",
        mode: ASM_LANGUAGE_ID,
        lint: {
          lintOnChange: false,
          options: {
            player,
          },
        },
        value: player.code,
        keyMap: "sublime",
        extraKeys: { "Ctrl-Space": "autocomplete" },
      });

      newEditor.on("change", (_e, _ch) => {
        clearTimeout(editorChangedDebounceHandle.current);
        editorChangedDebounceHandle.current = setTimeout(
          () => newEditor.performLint(),
          100
        );
      });

      editor.current = newEditor;
    }

    return () => player.delete();
  }, [editorContainerRef, player]);

  useEffect(() => {
    const updateDisposer = autorun(() => {
      onChanged({
        playerId: player.id,
        color: player.color,
        code: player.code,
      });
    });

    return updateDisposer;
  }, [player]);

  return (
    <div className="editor-container">
      <div style={{ display: "flex" }}>
        <select
          onChange={(e) => {
            const championCode = (champions as { [_: string]: string })[
              e.target.value
            ];
            editor.current?.setValue(championCode ?? player.code);
          }}
          value="load"
        >
          <option value="load">Load Model…</option>
          {Object.keys(champions).map((ch) => {
            return (
              <option key={ch} value={ch}>
                {ch}
              </option>
            );
          })}
        </select>
        <div style={{ flexGrow: 1 }}>
          <input
            type="color"
            value={toCssColor(player.color)}
            onChange={(e) => {
              const cssColor = e.target.value;
              clearTimeout(colorChangedDebounceHandle.current);
              colorChangedDebounceHandle.current = setTimeout(() => {
                const color = parseInt(cssColor.slice(1), 16);
                player.setColor(color);
              }, 100);
            }}
          />
        </div>
        <input
          type="number"
          value={player.id}
          onChange={(e) => player.setId(e.target.valueAsNumber)}
        />
      </div>
      <div className="editor" ref={editorContainerRef} />
    </div>
  );
});

export const ASM_LANGUAGE_ID = "corewar-asm";

CodeMirror.registerHelper(
  "lint",
  ASM_LANGUAGE_ID,
  (code: string, { player }: { player: CorewarPlayer }) => {
    try {
      player.compile(code);
      return [];
    } catch (err) {
      if (!(err instanceof CompileError)) return;

      const region = err.region();
      const [from_row, from_col, to_row, to_col] = region
        ? [
            region.from_row - 1,
            region.from_col,
            region.to_row - 1,
            region.to_col,
          ]
        : [0, 0, 5000, 5000];

      return [
        {
          from: CodeMirror.Pos(from_row, from_col),
          to: CodeMirror.Pos(to_row, from_col == to_col ? to_col + 1 : to_col),
          message: err.reason(),
        },
      ];
    }
  }
);

CodeMirror.registerHelper(
  "hint",
  ASM_LANGUAGE_ID,
  function (_editor: CodeMirror.Doc, _opts: unknown) {
    // const cursor = editor.getCursor();
    // return {
    //   list: ['st r1, 42', 'd', 'efghij', 'kl'],
    //   from: CodeMirror.Pos(cursor.line, 0),
    //   to: CodeMirror.Pos(cursor.line, 10)
    // }
  }
);

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

const COMMENT_CHAR = "#";

CodeMirror.defineMode(ASM_LANGUAGE_ID, function (_config, _parserConfig) {
  const lineCommentStartSymbol = COMMENT_CHAR;

  const directives = new Set([".name", ".comment", ".code"]);

  const KEYWORDS = new Set(ALL_KEYWORDS.map(([kw, ..._]) => kw));

  return {
    startState: function () {
      return {
        tokenize: null,
      };
    },

    token: function (stream, state) {
      if (state.tokenize) {
        return state.tokenize(stream, state);
      }

      if (stream.eatSpace()) {
        return null;
      }

      const ch = stream.next();

      if (ch == null) return null;

      if (ch === lineCommentStartSymbol) {
        stream.skipToEnd();
        return "comment";
      }

      if (ch === "%") {
        return "attribute";
      }

      if (ch === '"') {
        stream.eatWhile((c) => c != '"');
        return "string";
      }

      if (ch === ".") {
        stream.eatWhile(/\w/);
        const cur = stream.current().toLowerCase();
        if (directives.has(cur)) return "builtin";
      }

      if (ch === ":") {
        stream.eatWhile(/\w/);
        return "tag";
      }

      if (ch === "r") {
        stream.eatWhile(/\d/);
        const next = stream.peek();
        if (!next || !/\w/.test(next)) {
          const regNum = parseInt(stream.current().substr(1));
          if (regNum >= 1 && regNum <= 16) return "def";
        }
      }

      if (ch === "-") {
        const next = stream.eat(/\d/);
        if (next) {
          if (next == "0") {
            if (tokenizePrefixedNumber(stream)) return "number";
          }
          stream.eatWhile(/\d/);
          return "number";
        }
      }

      if (ch === "0") {
        if (tokenizePrefixedNumber(stream)) return "number";
      }

      if (/\d/.test(ch)) {
        stream.eatWhile(/\d/);
        return "number";
      }

      if (/\w/.test(ch)) {
        stream.eatWhile(/\w/);
        if (stream.eat(":")) {
          return "tag";
        } else {
          const cur = stream.current();
          if (KEYWORDS.has(cur)) return "builtin";
        }
        return null;
      }
    },

    lineComment: lineCommentStartSymbol,
  };
});

function tokenizePrefixedNumber(stream: CodeMirror.StringStream) {
  const next = stream.peek();
  if (next) {
    switch (next) {
      case "d":
        stream.next();
        stream.eatWhile(/\d/);
        return "number";
      case "x":
        stream.next();
        stream.eatWhile(/[0-9a-fA-F]/);
        return "number";
    }
  }
  return null;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
const WHITESPACES =
  " \f\n\r\t\v\u00a0\u1680\u2000\u2028\u2029\u202f\u205f\u3000\ufeff";
const isWhitespace = (ch: string) => WHITESPACES.includes(ch);

type ToggleComment =
  | { kind: "insert"; col: number }
  | { kind: "remove"; col: number; length: number };

function toggleLineComment(line: string): ToggleComment {
  const chars = line[Symbol.iterator]();

  let byteIndex = 0;
  let currentChar = chars.next();
  // Skip whitespaces and keep track of the byte index
  while (isWhitespace(currentChar.value)) {
    byteIndex += currentChar.value.length;
    currentChar = chars.next();
  }

  const columnStart = byteIndex;
  // We need to either comment or uncomment depending on the next char
  if (currentChar.value == COMMENT_CHAR) {
    let removeLen = COMMENT_CHAR.length;
    // Remove one eventual additional whitespace
    currentChar = chars.next();
    if (isWhitespace(currentChar.value)) removeLen += currentChar.value.length;

    return { kind: "remove", col: columnStart, length: removeLen };
  } else {
    return { kind: "insert", col: columnStart };
  }
}

CodeMirror.defineExtension(
  "toggleComment",
  function (this: CodeMirror.Editor, _options: unknown) {
    const selections = this.listSelections();

    const selectedLineNumbers = selections.reduce((nums, selection) => {
      let [low, high] = [selection.anchor.line, selection.head.line];
      if (low > high) [low, high] = [high, low];
      for (let i = low; i <= high; ++i) nums.add(i);
      return nums;
    }, new Set<number>());

    selectedLineNumbers.forEach((lineNum) => {
      const line = this.getLine(lineNum);
      const toggle = toggleLineComment(line);
      const fromPos = CodeMirror.Pos(lineNum, toggle.col);
      switch (toggle.kind) {
        case "remove": {
          const toPos = CodeMirror.Pos(lineNum, toggle.col + toggle.length);
          this.replaceRange("", fromPos, toPos);

          break;
        }

        case "insert":
          this.replaceRange(COMMENT_CHAR + " ", fromPos);
          break;
      }
    });
  }
);
