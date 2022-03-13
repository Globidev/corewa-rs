import { observer } from "mobx-react-lite";

import { VirtualMachine } from "../../state/vm";
import { Info, SectionTitle } from "./common";

type Props = {
  vm: VirtualMachine;
};

export const StatePanel = observer(({ vm }: Props) => {
  if (vm.cycles === undefined) return null;
  Number.MAX_VALUE;

  const engine = vm.engine,
    cycles = engine.cycles(),
    processes = engine.process_count(),
    interval = engine.check_interval(),
    lastLive = engine.last_live_check(),
    nextCheck = interval - (vm.cycles - lastLive),
    liveCount = engine.live_count_since_last_check(),
    checksPassed = engine.checks_without_cycle_decrement();

  const sections = [
    { title: "Processes", value: processes },
    { title: "Check interval", value: interval },
    { title: "Next check", value: nextCheck },
    { title: "Last check", value: lastLive },
    { title: "Live count", value: liveCount },
    { title: "Checks passed", value: checksPassed },
  ];

  return (
    <>
      <SectionTitle title="VM State" />
      <div className="state-panel">
        <Info title="Cycles">
          <input
            className="cycle-input"
            type="number"
            value={cycles}
            onChange={(ev) => vm.setCycle(parseInt(ev.target.value))}
            min={0}
            max={999_999}
          />
        </Info>

        {sections.map(({ title, value }) => (
          <Info key={title} title={title}>
            {value.toString().padStart(5, "\u00A0")}
          </Info>
        ))}
      </div>
    </>
  );
});
