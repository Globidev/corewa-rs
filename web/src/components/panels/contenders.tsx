import { observer } from "mobx-react-lite";

import { VirtualMachine } from "../../virtual_machine";
import { toCssColor, Info } from "./common";

type Props = {
  vm: VirtualMachine;
  coverages: Map<number, number>;
};

export const ContendersPanel = observer(({ vm, coverages }: Props) => {
  return (
    <div>
      <div>{vm.playersById.size} contenders:</div>
      {Array.from(vm.playersById.values()).map((player, i) => {
        if (vm.cycles === null) return null;

        const playerInfo = vm.engine.player_info(player.id);
        if (playerInfo === undefined) return undefined;

        const championInfo = vm.engine.champion_info(player.id);
        const coverage = coverages.get(player.id) || 0;

        const playerIdInput = (
          <input
            className="player-id-input"
            type="number"
            value={player.id}
            onChange={(ev) => {
              const newId = parseInt(ev.target.value);
              vm.changePlayerId(player.id, newId);
            }}
          />
        );

        return (
          <details key={i} style={{ color: toCssColor(player.color) }}>
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
