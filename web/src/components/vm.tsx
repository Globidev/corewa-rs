import { useEffect, useRef } from "react";
import { observer, useLocalObservable } from "mobx-react-lite";
import { action, reaction } from "mobx";

import { PIXIRenderer, MEM_HEIGHT, MEM_WIDTH } from "../renderer";

import { ControlPanel } from "./panels/control";
import { ResultsPanel } from "./panels/results";
import { StatePanel } from "./panels/state";
import { ContendersPanel } from "./panels/contenders";
import { Selection, SelectionsPanel } from "./panels/selections";

import { Corewar } from "../state/corewar";
import { DisplaySettingsPanel } from "./panels/display-settings";

interface IVMProps {
  corewar: Corewar;
  onNewPlayerRequested: () => void;
  onHelpRequested: () => void;
}

export const VM = observer(
  ({ corewar, onHelpRequested, onNewPlayerRequested }: IVMProps) => {
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

      const t0 = performance.now();
      renderer.update({
        showValues: corewar.options.showCellValues,
        memory,
        selections: Array.from(selections).map(([idx, selection]) => ({
          idx,
          length: Math.max(selection.decoded.byte_size(), 1),
        })),
        playerColors: corewar.playerColors,
      });

      const t1 = performance.now();
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
      const t2 = performance.now();

      console.log(`render: ${(t1 - t0).toFixed(2)} ms`);
      console.log(`cellOwners: ${(t2 - t1).toFixed(2)} ms`);
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
            // if (!modifiers.ctrl) clearSelections();
            toggleSelection(cellIdx);
          },
        },
        corewar.vm.wasmMemory
      );

      const disposer = reaction(
        () => [
          corewar.vm.engine,
          corewar.vm.cycles,
          corewar.options.showCellValues,
          selections.size,
        ],
        () => {
          updateSelections();
          draw(renderer);
        }
      );

      draw(renderer);

      return () => disposer();
    }, [canvasRef]);

    return (
      <div className="vm-container">
        <div className="vm-container-inner">
          <div className="vm-left-panel" style={{ maxHeight: MEM_HEIGHT }}>
            <div style={{ display: "flex" }}>
              <button className="ctrl-btn" onClick={onHelpRequested}>
                ❓
              </button>
              <button
                className="ctrl-btn"
                onClick={onNewClicked}
                disabled={corewar.players.length >= 4}
              >
                ➕
              </button>
            </div>

            <ControlPanel vm={corewar.vm} />

            {corewar.vm.matchResult && (
              <ResultsPanel
                result={corewar.vm.matchResult}
                playerColors={corewar.playerColors}
              />
            )}

            <DisplaySettingsPanel options={corewar.options} />
            <StatePanel vm={corewar.vm} />
            <ContendersPanel corewar={corewar} coverages={coverages} />
            <SelectionsPanel corewar={corewar} selections={selections} />
          </div>

          <div className="vm-arena-container">
            <canvas ref={canvasRef} width={MEM_WIDTH} height={MEM_HEIGHT} />
          </div>
        </div>
      </div>
    );
  }
);
