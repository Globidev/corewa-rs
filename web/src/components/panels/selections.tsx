import { action } from "mobx";
import { observer } from "mobx-react-lite";

import { Corewar } from "../../state/corewar";
import { CellPanel } from "./cell";
import { ProcessPanel } from "./process";

import type { DecodeResult, ProcessCollection } from "corewa-rs";

export type Selection = {
  decoded: DecodeResult;
  processes: ProcessCollection;
};

export const SelectionPanels = observer(
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
