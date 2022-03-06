import { observer } from "mobx-react-lite";

import { VirtualMachine } from "../../state/vm";
import { Info } from "./common";

type Props = {
  vm: VirtualMachine;
};

export const StatePanel = observer(({ vm }: Props) => {
  if (vm.cycles === undefined) return null;

  const engine = vm.engine,
    cycles = engine.cycles(),
    processes = engine.process_count(),
    interval = engine.check_interval(),
    lastLive = engine.last_live_check(),
    nextCheck = interval - (vm.cycles - lastLive),
    liveCount = engine.live_count_since_last_check(),
    checksPassed = engine.checks_without_cycle_decrement();

  return (
    <div className="state-panel">
      <Info title="Cycles">
        <input
          className="cycle-input"
          type="number"
          value={cycles}
          onChange={(ev) => vm.setCycle(parseInt(ev.target.value))}
        />
      </Info>
      <Info title="Processes">{processes}</Info>
      <Info title="Check interval">{interval}</Info>
      <Info title="Next check">{nextCheck}</Info>
      <Info title="Last check">{lastLive}</Info>
      <Info title="Live count">{liveCount}</Info>
      <Info title="Checks passed">{checksPassed}</Info>
    </div>
  );
});
