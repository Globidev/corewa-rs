import { observer } from "mobx-react-lite";

import { VirtualMachine, MatchResult } from "../../virtual_machine";
import { toCssColor } from "./common";

type Props = {
  result: MatchResult;
  vm: VirtualMachine;
};

export const ResultsPanel = observer(({ result, vm }: Props) => {
  const nameSpans = result.map((p, i) => {
    const playerColor = vm.playersById.get(p.id)!.color; // Not having the player entry would mean an invariant is broken
    const color = toCssColor(playerColor);
    return (
      <span key={i} style={{ color }}>
        {p.champion_name()}
      </span>
    );
  });

  const joinedSpans = [nameSpans[0]];
  let i = 1;
  for (; i < nameSpans.length - 1; ++i) {
    joinedSpans.push(<span key={`s${i}`}>, </span>);
    joinedSpans.push(nameSpans[i]);
  }
  if (i < nameSpans.length) {
    joinedSpans.push(<span key={`s${i}`}> and </span>);
    joinedSpans.push(nameSpans[i]);
  }

  return (
    <div>
      <hr />
      {result.length > 1 ? (
        <div>
          {"Draw between "}
          {joinedSpans}
        </div>
      ) : (
        <div>{joinedSpans} Wins</div>
      )}
    </div>
  );
});
