import { observer } from "mobx-react-lite";

import { Panel } from "../panel";
import { Info } from "./common";

import { Game } from "../../state/game";
import { toCssColor, remEuclid } from "../../utils";

type Props = {
  game: Game;
  coverages: Map<number, number>;
};

export const ContendersPanel = observer(({ game, coverages }: Props) => {
  const players = game.vm.players;

  const playerCoverage = players.reduce(
    (s, p) => s + (coverages.get(p.id) ?? 0),
    0
  );

  return (
    <Panel title={`${players.length} contenders`}>
      <div className="coverage-container">
        {players.map((player) => {
          const coverage = coverages.get(player.id) ?? 0;

          return (
            <div
              key={player.id}
              style={{
                flexGrow: coverage,
                backgroundColor: toCssColor(player.color),
              }}
            ></div>
          );
        })}
        <div
          style={{
            flexGrow: 4096 - playerCoverage,
            backgroundColor: "#404040",
          }}
        ></div>
      </div>

      {players.map((player, idx) => {
        const championInfo = game.vm.engine.champion_info(player.id);
        const coverage = coverages.get(player.id) ?? 0;

        const sections = [
          {
            title: "Player id",
            value: `0x${remEuclid(player.id, 0xffff_ffff)
              .toString(16)
              .toUpperCase()
              .padStart(8, "0")}`,
          },
          { title: "Code size", value: player.champion.codeSize },
          {
            title: "Coverage",
            value: `${((coverage / 4096) * 100).toFixed(2)}%`,
          },
          { title: "Processes", value: championInfo.process_count },
          { title: "Last live", value: championInfo.last_live },
        ];

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
