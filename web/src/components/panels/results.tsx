import { observer } from "mobx-react-lite";

import { MatchResult } from "../../state/vm";
import { toCssColor } from "../../utils";
import { SectionTitle } from "./common";

type Props = {
  result: MatchResult;
  playerColors: number[];
};

export const ResultsPanel = observer(({ result, playerColors }: Props) => {
  const nameSpans = result.map((p, i) => {
    const color = toCssColor(playerColors[p.id]);
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
      <SectionTitle title="Match results" />
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
