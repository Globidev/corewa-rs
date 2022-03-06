import { observer } from "mobx-react-lite";

import { Info } from "./common";

import { Corewar } from "../../state/corewar";
import { toCssColor } from "../../utils";

type Props = {
  corewar: Corewar;
  coverages: Map<number, number>;
};

export const ContendersPanel = observer(({ corewar, coverages }: Props) => {
  return (
    <div>
      <div>{corewar.players.length} contenders:</div>
      {corewar.players.map((player, idx) => {
        const playerInfo = corewar.vm.engine.player_info(player.id);

        if (playerInfo === undefined) {
          return undefined;
        }

        const championInfo = corewar.vm.engine.champion_info(player.id);
        const coverage = coverages.get(player.id) ?? 0;

        return (
          <details key={idx} style={{ color: toCssColor(player.color) }}>
            <summary>
              <span
                style={{
                  color: "#eeeeee",
                }}
              >
                {playerInfo?.champion_name()}
              </span>
            </summary>

            <Info title="Player ID">{player.id}</Info>
            <Info title="Size">{playerInfo?.champion_size}</Info>
            <Info title="Coverage">{`${((coverage / 4096) * 100).toFixed(
              2
            )} %`}</Info>
            <Info title="Processes">{championInfo.process_count}</Info>
            <Info title="Last live">{championInfo.last_live}</Info>
          </details>
        );
      })}
    </div>
  );
});
