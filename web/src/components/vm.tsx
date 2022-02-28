import { useEffect, useRef } from "react";
import { observer, useLocalObservable } from "mobx-react-lite";
import { action, IReactionDisposer, reaction } from "mobx";

import { PIXIRenderer, MARGIN, MEM_HEIGHT, MEM_WIDTH } from "../renderer";

import { ProcessPanel } from "./panels/process";
import { ControlPanel } from "./panels/control";
import { ResultsPanel } from "./panels/results";
import { StatePanel } from "./panels/state";
import { ContendersPanel } from "./panels/contenders";
import { CellPanel } from "./panels/cell";

import type { DecodeResult, ProcessCollection } from "corewa-rs";
import { Corewar } from "../state/corewar";

type Selection = {
  decoded: DecodeResult;
  processes: ProcessCollection;
};

interface IVMProps {
  corewar: Corewar;
  onNewPlayerRequested: () => void;
  onHelpRequested: () => void;
}

export const VM = observer(
  ({ corewar, onHelpRequested, onNewPlayerRequested }: IVMProps) => {
    console.log("VM render");
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const selections = useLocalObservable(() => new Map<number, Selection>());
    const coverages = useLocalObservable(() => new Map<number, number>());

    const selectionAt = (idx: number) => {
      return {
        decoded: corewar.vm.engine.decode(idx),
        processes: corewar.vm.engine.processes_at(idx),
      };
    };

    const onNewClicked = () => {
      if (corewar.players.length < 4) onNewPlayerRequested();
    };

    const draw = action((renderer: PIXIRenderer) => {
      const memory = corewar.vm.engine.memory();

      renderer.update({
        memory,
        selections: Array.from(selections).map(([idx, selection]) => ({
          idx,
          length: Math.max(selection.decoded.byte_size(), 1),
        })),
        playerColors: corewar.playerColors,
      });

      const cellOwners = new Int32Array(
        corewar.vm.wasmMemory.buffer,
        memory.owners_ptr,
        4096
      );

      coverages.clear();
      cellOwners.forEach((owner) => {
        const previous = coverages.get(owner) ?? 0;
        coverages.set(owner, previous + 1);
      });
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

      let disposer: IReactionDisposer | undefined;

      const renderer = new PIXIRenderer(
        {
          canvas,
          onCellClicked: (cellIdx, modifiers) => {
            if (!modifiers.ctrl) clearSelections();
            toggleSelection(cellIdx);
          },
          onLoad: () => {
            disposer = reaction(
              () => [corewar.vm.engine, corewar.vm.cycles, selections.size],
              () => {
                updateSelections();
                draw(renderer);
              }
            );
            draw(renderer);
          },
        },
        corewar.vm.wasmMemory
      );

      return () => disposer?.();
    }, [canvasRef]);

    const helpButton = (
      <button className="ctrl-btn" onClick={onHelpRequested}>
        ❓
      </button>
    );

    const addPlayerButton = corewar.players.length < 4 && (
      <button className="ctrl-btn" onClick={onNewClicked}>
        ➕
      </button>
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
            <ControlPanel vm={corewar.vm} />
            {corewar.vm.matchResult && (
              <ResultsPanel
                result={corewar.vm.matchResult}
                playerColors={corewar.playerColors}
              />
            )}
            <hr />
            <StatePanel vm={corewar.vm} />
            <hr />
            <ContendersPanel corewar={corewar} coverages={coverages} />
            <SelectionPanels corewar={corewar} selections={selections} />
          </div>
          {arena}
        </div>
      </div>
    );
  }
);

const SelectionPanels = observer(
  ({
    corewar,
    selections,
  }: {
    corewar: Corewar;
    selections: Map<number, Selection>;
  }) => {
    const discardSelection = action((idx: number) => {
      selections.delete(idx);
    });

    const selectionsAsArray = Array.from(selections);
    const panels = selectionsAsArray.map(([cellIdx, selection], idx) => (
      <div key={cellIdx}>
        <hr />
        <CellPanel
          idx={cellIdx}
          previousIdx={idx > 0 ? selectionsAsArray[idx - 1][0] : null}
          decoded={selection.decoded}
          onDiscard={() => discardSelection(cellIdx)}
        />
        <div className="pad-top">
          <ProcessPanel
            processes={selection.processes}
            cycles={corewar.vm.cycles}
            playerColors={corewar.playerColors}
          />
        </div>
      </div>
    ));

    return <>{panels}</>;
  }
);
