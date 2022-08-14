import { observer } from "mobx-react-lite";

import { Panel } from "../panel";
import { Info } from "./common";

import { Game } from "../../state/game";
import { toCssColor, remEuclid, groupByKey } from "../../utils";

import firstPlaceIcon from "../../assets/first-place.png?url";
import secondPlaceIcon from "../../assets/second-place.png?url";
import thirdPlaceIcon from "../../assets/third-place.png?url";

import type { ChampionInfo } from "corewa-rs";

const ALL_MEDALS = [firstPlaceIcon, secondPlaceIcon, thirdPlaceIcon];

type Props = {
  game: Game;
};

type Contender = {
  player: Game["vm"]["players"][number];
  championInfo: ChampionInfo;
};

export const ContendersPanel = observer(({ game }: Props) => {
  const { players, coverages, engine } = game.vm;

  const fmtCoverage = (coverage: number) =>
    `${((coverage / 4096) * 100).toFixed(2)}%`;

  const contenders = players.map((player, idx) => ({
    player,
    championInfo: engine.champion_info(idx),
  }));

  const medals = medalsByPlayerIndex(contenders);

  return (
    <Panel title={`${players.length} contenders`}>
      <div className="coverage-container">
        {players.map((player, idx) => {
          const coverage = coverages.get(idx);

          return (
            <div
              key={player.id}
              style={{
                flexGrow: coverage,
                backgroundColor: toCssColor(player.color),
              }}
              data-tooltip={`${player.champion.name} (${fmtCoverage(
                coverage
              )})`}
            ></div>
          );
        })}
        <div
          style={{
            flexGrow: coverages.unowned,
            backgroundColor: "#404040",
          }}
          data-tooltip={`unowned (${fmtCoverage(coverages.unowned)})`}
        ></div>
      </div>

      {contenders.map(({ player, championInfo }, idx) => {
        const coverage = coverages.get(idx);

        const sections = [
          {
            title: "Player id",
            value: `0x${remEuclid(player.id, 0xffff_ffff)
              .toString(16)
              .toUpperCase()
              .padStart(8, "0")}`,
          },
          { title: "Code size", value: player.champion.codeSize },
          { title: "Coverage", value: fmtCoverage(coverage) },
          { title: "Processes", value: championInfo.process_count },
          { title: "Last live", value: championInfo.last_live },
        ];

        const medal = medals[idx];

        return (
          <details key={idx}>
            <summary style={{ color: toCssColor(player.color) }}>
              <span
                style={{
                  color: "#eeeeee",
                }}
              >
                {player.champion.name}
              </span>
              {medal && <img src={medal} className="icon-medal" />}
            </summary>

            <div className="spaced">
              {sections.map(({ title, value }) => (
                <Info key={title} title={title}>
                  {value.toString().padStart(6, "\u00A0")}
                </Info>
              ))}
            </div>
          </details>
        );
      })}
    </Panel>
  );
});

type Medal = string;

function medalsByPlayerIndex(contenders: Contender[]): (Medal | undefined)[] {
  const medalPool = [...ALL_MEDALS];

  // Sort contenders by their last live (if any)
  const lastLives = contenders
    .map(({ championInfo }, idx) => ({
      lastLive: championInfo.last_live,
      contenderIdx: idx,
    }))
    .filter(({ lastLive }) => lastLive !== 0)
    .sort((a, b) => b.lastLive - a.lastLive);

  // Group them by last live to handle draws
  const grouped = groupByKey(lastLives, ({ lastLive }) => lastLive);

  // Finally assign medals to groups
  const medalsByPlayer: (Medal | undefined)[] = contenders.map(() => undefined);
  for (const group of grouped) {
    const medal = medalPool[0];
    if (medal === undefined) {
      break;
    }

    for (const { contenderIdx } of group) {
      medalsByPlayer[contenderIdx] = medal;
    }

    medalPool.splice(0, group.length);
  }

  return medalsByPlayer;
}
