import * as React from "react";
import { observer } from "mobx-react";

import { VirtualMachine } from "../../virtual_machine";
import { Info } from "./common";

interface IStatePanelProps {
  vm: VirtualMachine;
}

@observer
export class StatePanel extends React.Component<IStatePanelProps> {
  render() {
    const vm = this.props.vm;

    if (vm.cycles === null) return null;

    const engine = vm.engine,
      cycles = engine.cycles(),
      processes = engine.process_count(),
      interval = engine.check_interval(),
      lastLive = engine.last_live_check(),
      nextCheck = interval - (vm.cycles - lastLive),
      liveCount = engine.live_count_since_last_check(),
      checksPassed = engine.checks_without_cycle_decrement();

    return (
      <div>
        <StateInfo title="Cycles">
          <input
            className="cycle-input"
            type="number"
            value={cycles}
            onChange={(ev) => vm.setCycle(parseInt(ev.target.value))}
          />
        </StateInfo>
        <StateInfo title="Processes">{processes}</StateInfo>
        <StateInfo title="Check interval">{interval}</StateInfo>
        <StateInfo title="Next check">{nextCheck}</StateInfo>
        <StateInfo title="Last check">{lastLive}</StateInfo>
        <StateInfo title="Live count">{liveCount}</StateInfo>
        <StateInfo title="Checks passed">{checksPassed}</StateInfo>
      </div>
    );
  }
}

interface IStateInfoProps {
  title: string;
  children: React.ReactNode;
}

const StateInfo = ({ title, children }: IStateInfoProps) => (
  <Info title={title} minWidth={100}>
    {children}
  </Info>
);
