import { observer } from "mobx-react-lite";
import { Corewar } from "../../state/corewar";

import { toCssColor, Info } from "./common";

type Props = {
  corewar: Corewar;
  coverages: Map<number, number>;
};

export const ContendersPanel = observer(({ corewar, coverages }: Props) => {
  return (
    <div>
      <div>{corewar.players.length} contenders:</div>
      {corewar.players.map((player) => {
        const playerInfo = corewar.vm.engine.player_info(player.id);
        if (playerInfo === undefined) return undefined;

        const championInfo = corewar.vm.engine.champion_info(player.id);
        const coverage = coverages.get(player.id) || 0;

        const playerIdInput = (
          <input
            className="player-id-input"
            type="number"
            value={player.id}
            onChange={(ev) => {
              const newId = parseInt(ev.target.value);
              player.setId(newId);
            }}
          />
        );

        return (
          <details
            key={player.editorId}
            style={{ color: toCssColor(player.color) }}
          >
            <summary>{playerInfo.champion_name()}</summary>
            <Info title="Player ID">{playerIdInput}</Info>
            <Info title="Size">{playerInfo.champion_size}</Info>
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
