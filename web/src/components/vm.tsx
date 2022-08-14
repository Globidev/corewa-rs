import { useEffect, useRef } from "react";
import { observer, useLocalObservable } from "mobx-react-lite";
import { action, reaction } from "mobx";

import { PIXIRenderer, MEM_HEIGHT, MEM_WIDTH } from "../renderer";

import { ControlPanel, CtrlBtn } from "./panels/control";
import { ResultsPanel } from "./panels/results";
import { StatePanel } from "./panels/state";
import { ContendersPanel } from "./panels/contenders";
import { Selection, SelectionsPanel } from "./panels/selections";

import { Game } from "../state/game";
import { DisplaySettingsPanel } from "./panels/display-settings";

import questionIcon from "../assets/question-mark-icon.png?url";
import addIcon from "../assets/add-icon.png?url";

interface IVMProps {
  game: Game;
  onNewPlayerRequested: () => void;
  onHelpRequested: () => void;
}

export const VM = observer(
  ({ game, onHelpRequested, onNewPlayerRequested }: IVMProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const selections = useLocalObservable(() => new Map<number, Selection>());

    const selectionAt = (idx: number) => {
      return {
        decoded: game.vm.engine.decode(idx),
        processes: game.vm.engine.processes_at(idx),
      };
    };

    const onNewClicked = () => {
      if (game.players.length < 4) onNewPlayerRequested();
    };

    const draw = action((renderer: PIXIRenderer) => {
      const memory = game.vm.engine.memory();

      const t0 = performance.now();

      renderer.update({
        showValues: game.options.get("show-cell-values"),
        memory,
        selections: Array.from(selections).map(([idx, selection]) => ({
          idx,
          length: Math.max(selection.decoded.byte_size(), 1),
        })),
        players: game.players,
      });

      const t1 = performance.now();

      console.debug(`render: ${(t1 - t0).toFixed(2)} ms`);
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
        },
        game.vm.wasmMemory
      );

      const disposer = reaction(
        () => [
          game.vm.engine,
          game.vm.cycles,
          game.options.get("show-cell-values"),
          selections.size,
        ],
        () => {
          updateSelections();
          draw(renderer);
        }
      );

      draw(renderer);

      return disposer;
    }, [canvasRef]);

    return (
      <div className="vm-container">
        <div className="vm-container-inner">
          <div className="vm-left-panel" style={{ maxHeight: MEM_HEIGHT }}>
            <div style={{ display: "flex" }}>
              <CtrlBtn
                onClick={onHelpRequested}
                iconSrc={questionIcon}
                data-tooltip="Documentation"
                className="tooltip-btm"
              />
              <CtrlBtn
                onClick={onNewClicked}
                disabled={game.players.length >= 4}
                iconSrc={addIcon}
                data-tooltip="Add player"
                className="tooltip-btm"
              />
              <div className="ups-counter">
                {game.options.get("show-ups") && (
                  <span>UPS: {game.vm.ups ?? "N/A"}</span>
                )}
              </div>
            </div>

            <ControlPanel vm={game.vm} />
            <DisplaySettingsPanel options={game.options} />
            {game.vm.matchResult && (
              <ResultsPanel result={game.vm.matchResult} />
            )}
            <StatePanel vm={game.vm} />
            <ContendersPanel game={game} />
            <SelectionsPanel game={game} selections={selections} />
          </div>

          <div className="vm-arena-container">
            <canvas ref={canvasRef} width={MEM_WIDTH} height={MEM_HEIGHT} />
          </div>
        </div>
      </div>
    );
  }
);
