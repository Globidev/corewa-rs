import { useEffect, useRef } from "react";
import { observer, useLocalObservable } from "mobx-react-lite";
import { action, observe, reaction } from "mobx";

import { VirtualMachine } from "../virtual_machine";
import { PIXIRenderer, MARGIN, MEM_HEIGHT, MEM_WIDTH } from "../renderer";

import { ProcessPanel } from "./panels/process";
import { ControlPanel } from "./panels/control";
import { ResultsPanel } from "./panels/results";
import { StatePanel } from "./panels/state";
import { ContendersPanel } from "./panels/contenders";
import { CellPanel } from "./panels/cell";

import type { DecodeResult, ProcessCollection } from "corewa-rs";

type Selection = {
  decoded: DecodeResult;
  processes: ProcessCollection;
};

interface IVMProps {
  vm: VirtualMachine;
  onNewPlayerRequested: () => void;
  onHelpRequested: () => void;
}

export const VM = observer(
  ({ vm, onHelpRequested, onNewPlayerRequested }: IVMProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const selections = useLocalObservable(() => new Map<number, Selection>());
    const coverages = useLocalObservable(() => new Map<number, number>());

    const selectionAt = (idx: number) => {
      return {
        decoded: vm.engine.decode(idx),
        processes: vm.engine.processes_at(idx),
      };
    };

    const onNewClicked = () => {
      if (vm.playersById.size < 4) onNewPlayerRequested();
    };

    const draw = action((renderer: PIXIRenderer) => {
      const memory = vm.engine.memory();

      renderer.update({
        memory,
        selections: Array.from(selections).map(([idx, selection]) => ({
          idx,
          length: Math.max(selection.decoded.byte_size(), 1),
        })),
        playersById: vm.playersById,
      });

      const cellOwners = new Int32Array(
        vm.wasmMemory.buffer,
        memory.owners_ptr,
        4096
      );

      coverages.clear();
      cellOwners.forEach((owner) => {
        const previous = coverages.get(owner) ?? 0;
        coverages.set(owner, previous + 1);
      });
    });

    const discardSelection = action((idx: number) => {
      selections.delete(idx);
    });

    const clearSelections = action(() => {
      selections.clear();
    });

    const updateSelections = action(() => {
      selections.forEach((selection, idx) =>
        Object.assign(selection, selectionAt(idx))
      );
    });

    const toggleSelection = action((idx: number) => {
      if (selections.has(idx)) selections.delete(idx);
      else selections.set(idx, selectionAt(idx));
    });

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const renderer = new PIXIRenderer(
        {
          canvas,
          onCellClicked: (cellIdx, modifiers) => {
            if (!modifiers.ctrl) clearSelections();
            toggleSelection(cellIdx);
          },
          onLoad: () => {
            observe(vm, "cycles", (_) => {
              updateSelections();
              draw(renderer);
            });
            draw(renderer);
          },
        },
        vm.wasmMemory
      );

      reaction(
        () => selections.size,
        () => draw(renderer)
      );
    }, []);

    const helpButton = (
      <button className="ctrl-btn" onClick={onHelpRequested}>
        ❓
      </button>
    );

    const addPlayerButton = vm.playersById.size < 4 && (
      <button className="ctrl-btn" onClick={onNewClicked}>
        ➕
      </button>
    );

    const selectionsAsArray = Array.from(selections);
    const selectionPanels = selectionsAsArray.map(
      ([cellIdx, selection], idx) => (
        <div key={idx}>
          <hr />
          <CellPanel
            idx={cellIdx}
            previousIdx={idx > 0 ? selectionsAsArray[idx - 1][0] : null}
            decoded={selection.decoded}
            onDiscard={() => discardSelection(cellIdx)}
          />
          <div className="pad-top">
            <ProcessPanel processes={selection.processes} vm={vm} />
          </div>
        </div>
      )
    );

    const arena = (
      <canvas
        ref={canvasRef}
        width={MEM_WIDTH}
        height={MEM_HEIGHT}
        style={{
          margin: `${MARGIN}px ${MARGIN}px ${MARGIN}px ${MARGIN}px`,
          maxHeight: `${MEM_HEIGHT}px`,
          maxWidth: `${MEM_WIDTH}px`,
        }}
      />
    );

    return (
      <div id="vm-container">
        <div style={{ display: "flex" }}>
          <div className="pad-left pad-top panel-area">
            <div style={{ display: "flex" }}>
              {helpButton}
              {addPlayerButton}
            </div>
            <ControlPanel vm={vm} />
            {vm.matchResult && <ResultsPanel result={vm.matchResult} vm={vm} />}
            <hr />
            <StatePanel vm={vm} />
            <hr />
            <ContendersPanel vm={vm} coverages={coverages} />
            {selectionPanels}
          </div>
          {arena}
        </div>
      </div>
    );
  }
);
