import { observer } from "mobx-react-lite";

import { CorewarPlayer } from "../state/player";

import { PlayerColorInput } from "./player-color-input";
import { PlayerIdInput } from "./player-id-input";

import { contrastingColor, toCssColor } from "../utils";

type Props = {
  player: CorewarPlayer;
};

export const PlayerHeader = observer(({ player }: Props) => {
  return (
    <div className="player-header-container">
      <PlayerColorInput player={player} />
      <div
        className="player-header-name"
        style={{
          color: toCssColor(player.color),
          background: toCssColor(contrastingColor(player.color)),
        }}
      >
        {player.champion?.name ?? "Champion"}
      </div>
      <PlayerIdInput player={player} />
    </div>
  );
});
