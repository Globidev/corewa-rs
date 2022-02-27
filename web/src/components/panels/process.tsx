import { observer } from "mobx-react-lite";

import { VirtualMachine } from "../../virtual_machine";
import { toCssColor, Info } from "./common";

import type { ProcessCollection } from "corewa-rs";

const MAX_PROCESS_DISPLAYED = 32;

type Props = {
  processes: ProcessCollection;
  vm: VirtualMachine;
};

export const ProcessPanel = observer(({ processes, vm }: Props) => {
  const len = processes.len();

  if (len === 0) return null;

  const details = Array(Math.min(len, MAX_PROCESS_DISPLAYED))
    .fill(0)
    .map((_, i) => {
      const process = processes.at(i);
      const state = process.executing();
      const playerColor = vm.playersById.get(process.player_id)!.color;

      const coloredPlayerId = (
        <div
          style={{
            backgroundColor: toCssColor(playerColor),
          }}
        >
          {process.player_id}
        </div>
      );

      const registers = (
        <details className="pad-left">
          <summary>Registers</summary>
          {Array.from(process.registers()).map((r, i) => (
            <Info title={`r${i + 1}`} minWidth={50} key={i}>
              {r}
            </Info>
          ))}
        </details>
      );

      return (
        <details key={i} className="pad-left">
          <summary>PID {process.pid}</summary>
          <Info title="Player">{coloredPlayerId}</Info>
          <Info title="Zero Flag">{process.zf.toString()}</Info>
          <Info title="Last live">{process.last_live_cycle}</Info>
          <Info title="State">
            {state
              ? `${state.op()} (${state.exec_at - vm.cycles! + 1})`
              : "Idle"}
          </Info>
          {registers}
        </details>
      );
    });

  return (
    <div>
      <details>
        <summary>
          {len} process
          {len >= 2 ? "es" : ""}
        </summary>
        {details}
      </details>
    </div>
  );
});
