import { useEffect, useRef, useState } from "react";
import CodeMirror from "codemirror";

import { ASM_LANGUAGE_ID } from "../editor";

import type { DecodeResult } from "corewa-rs";

type Props = {
  idx: number;
  previousIdx: number | null;
  decoded: DecodeResult;
  onDiscard: () => void;
};

export const CellPanel = ({ idx, previousIdx, decoded, onDiscard }: Props) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<CodeMirror.Editor | null>(null);

  const idxDiff = () => {
    if (previousIdx === null) return null;

    let diff = idx - previousIdx;
    if (diff > 2048) diff -= 4096;
    else if (diff < -2048) diff += 4096;

    return diff >= 0 ? `(+${diff})` : `(${diff})`;
  };

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const editor = CodeMirror(container, {
      theme: "nord",
      mode: ASM_LANGUAGE_ID,
      keyMap: "sublime",
      readOnly: true,
    });

    setEditor(editor);
  }, [editorContainerRef]);

  useEffect(() => {
    if (editor) {
      editor.setValue(cellString(decoded));
    }
  }, [editor, decoded]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>
          Cell {idx} <span style={{ fontSize: "75%" }}>{idxDiff()}</span>
        </span>
        <button onClick={onDiscard}>❌</button>
      </div>

      <div ref={editorContainerRef} />
    </div>
  );
};

const cellString = (decoded: DecodeResult) => {
  let str = decoded.to_string();
  const length = decoded.byte_size();

  if (length > 1) str += ` # ${length} bytes`;

  return str;
};
