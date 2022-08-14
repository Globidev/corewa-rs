import { action } from "mobx";
import { observer } from "mobx-react-lite";

import { Game } from "../../state/game";
import { CellPanel } from "./cell";
import { Panel } from "../panel";
import { ProcessPanel } from "./process";

import { DecodeResult, DecodeResultFormat, ProcessCollection } from "corewa-rs";

export type Selection = {
  decoded: DecodeResult;
  processes: ProcessCollection;
};

type Props = {
  game: Game;
  selections: Map<number, Selection>;
};

export const SelectionsPanel = observer(({ game, selections }: Props) => {
  const discardSelection = action((idx: number) => {
    selections.delete(idx);
  });

  const cellFormat = {
    10: DecodeResultFormat.Decimal,
    16: DecodeResultFormat.Hexadecimal,
  }[game.options.get("instr-params-radix")];

  const selectionsAsArray = Array.from(selections);
  const selectionWidgets = selectionsAsArray.map(
    ([cellIdx, selection], idx) => (
      <div key={cellIdx}>
        <CellPanel
          idx={cellIdx}
          previousIdx={idx > 0 ? selectionsAsArray[idx - 1][0] : null}
          decoded={selection.decoded}
          format={cellFormat}
          onDiscard={() => discardSelection(cellIdx)}
        />
        <div className="pad-top">
          <ProcessPanel processes={selection.processes} game={game} />
        </div>
      </div>
    )
  );

  const showHowToTip = selections.size === 0;
  const showAddMoreTip = selections.size === 1;

  return (
    <Panel title="Selections">
      <div className="selections-container">
        {selectionWidgets}
        {showAddMoreTip && (
          <div className="add-more-selections-tip">
            Ctrl + click to add more selections
          </div>
        )}
      </div>
      {showHowToTip && (
        <div className="empty-selections-tip">
          Click on a cell to inspect bytecode and processes
        </div>
      )}
    </Panel>
  );
});
