import { observer } from "mobx-react-lite";

import { Panel } from "../panel";

import { MatchResult } from "../../state/vm";
import { toCssColor } from "../../utils";

type Props = {
  result: MatchResult;
};

export const ResultsPanel = observer(({ result }: Props) => {
  const nameSpans = result.map((player, i) => {
    const color = toCssColor(player.color);
    return (
      <span key={i} style={{ color }}>
        {player.champion.name}
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
    <Panel title="Match results">
      {result.length > 1 ? (
        <div>
          {"Draw between "}
          {joinedSpans}
        </div>
      ) : (
        <div>{joinedSpans} Wins 🎉</div>
      )}
    </Panel>
  );
});
