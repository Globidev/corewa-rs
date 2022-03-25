import { observer } from "mobx-react-lite";
import { CorewarPlayer } from "../state/player";
import { formatNumber, remEuclid } from "../utils";

type Props = {
  player: CorewarPlayer;
};

export const PlayerIdInput = observer(({ player }: Props) => {
  const setId = (id: number) => player.setId(wrappingId(id));

  const increaseId = () => {
    const increased = remEuclid(player.id + 1, 0x1_0000_0000);
    setId(increased === 0 ? 1 : increased);
  };
  const decreaseId = () => {
    const decreased = remEuclid(player.id - 1, 0x1_0000_0000);
    setId(decreased === 0 ? 0xffff_ffff : decreased);
  };

  return (
    <div className="player-input-container">
      <div className="player-input-container-inner">
        <input
          className="player-input"
          type="text"
          size={10}
          value={formatNumber(player.id, 16)}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 16);
            if (!isNaN(parsed) && parsed < 2 ** 32) {
              setId(parsed);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => {
            if (e.deltaY < 0) {
              increaseId();
            } else if (e.deltaY > 0) {
              decreaseId();
            }
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              increaseId();
            } else if (e.key === "ArrowDown") {
              decreaseId();
            }
          }}
        />
        <div className="player-input-buttons">
          <button
            className="player-input-button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              increaseId();
              e.stopPropagation();
            }}
          >
            <UpArrow />
          </button>
          <button
            className="player-input-button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              decreaseId();
              e.stopPropagation();
            }}
          >
            <DownArrow />
          </button>
        </div>
      </div>
    </div>
  );
});

const UpArrow = () => (
  <svg viewBox="0 0 24 24">
    <path d="M24 22h-24l12-20z" />
  </svg>
);

const DownArrow = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 21l-12-18h24z" />
  </svg>
);

function wrappingId(num: number): number {
  if (num < -(2 ** 31)) {
    return num + 2 ** 32;
  } else if (num >= 2 ** 31) {
    return num - 2 ** 32;
  } else {
    return num;
  }
}
