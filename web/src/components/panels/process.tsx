import { observer } from "mobx-react-lite";

import { Info } from "./common";

import type { ProcessCollection } from "corewa-rs";

import { contrastingColor, formatNumber, Radix, toCssColor } from "../../utils";
import { Game } from "../../state/game";

type Props = {
  processes: ProcessCollection;
  game: Game;
};

export const ProcessPanel = observer(({ processes, game }: Props) => {
  const visibleLen = processes.visible_len();

  if (visibleLen === 0) return null;

  const details = [...Array(visibleLen).keys()].map((idx) => {
    const process = processes.at(idx);
    const state = process.executing();
    const player = game.vm.players[process.owner];

    if (!player) {
      console.error("Invariant broken: process has an invalid owner");
      return null;
    }

    const coloredPlayer = (
      <div
        style={{
          color: toCssColor(player.color),
        }}
      >
        {player.champion.name}
      </div>
    );

    return (
      <details key={idx} className="pad-left">
        <summary>PID {process.pid}</summary>
        <div className="spaced">
          <Info title="Player" theme={contrastingColor(player.color)}>
            {coloredPlayer}
          </Info>
          <Info title="Zero Flag">{process.zf.toString()}</Info>
          <Info title="Last live">{process.last_live_cycle}</Info>
          <Info title="State">
            {state
              ? `${state.op()} (${state.exec_at - game.vm.cycles + 1})`
              : "Idle"}
          </Info>
        </div>
        <Registers
          registers={process.registers()}
          radix={game.options.get("reg-values-radix")}
        />
      </details>
    );
  });

  const len = visibleLen + processes.extra_len;

  return (
    <div>
      <details>
        <summary>
          {len} process
          {len >= 2 ? "es" : ""}
        </summary>
        {details}
        {len > visibleLen ? `and ${len - visibleLen} more…` : null}
      </details>
    </div>
  );
});

const Registers = ({
  registers,
  radix,
}: {
  registers: Int32Array;
  radix: Radix;
}) => {
  const registerGroups = [];

  const values = registers.values();
  let item = values.next();
  let start = 0;

  while (item.done === false) {
    const grpStart = start + 1;
    const grpValue = item.value;

    item = values.next();
    while (item.value === grpValue) {
      start += 1;
      item = values.next();
    }

    registerGroups.push([grpStart, start + 1, grpValue] as const);
    start += 1;
  }

  return (
    <details className="pad-left">
      <summary>Registers</summary>
      <div className="spaced">
        {registerGroups.map(([start, end, value]) => {
          const title = start === end ? `r${start}` : `r${start}-${end}`;
          return (
            <Info title={title} key={title}>
              {formatNumber(value, radix)}
            </Info>
          );
        })}
      </div>
    </details>
  );
};
