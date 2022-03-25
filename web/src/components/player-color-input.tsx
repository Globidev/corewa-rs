import { observer } from "mobx-react-lite";

import { CorewarPlayer } from "../state/player";

import { toCssColor, useDebouncer } from "../utils";

type Props = {
  player: CorewarPlayer;
};

export const PlayerColorInput = observer(({ player }: Props) => {
  const scheduleColorChange = useDebouncer(100, (cssColor: string) => {
    const color = parseInt(cssColor.slice(1), 16);
    player.setColor(color);
  });

  return (
    <input
      key={player.id}
      type="color"
      value={toCssColor(player.color)}
      onChange={(e) => scheduleColorChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    />
  );
});
