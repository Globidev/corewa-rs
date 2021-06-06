import { ReactNode } from "react";
import { observer } from "mobx-react";

import { VirtualMachine } from "../../virtual_machine";

type ControlPanelProps = {
  vm: VirtualMachine;
};

export const ControlPanel = observer(({ vm }: ControlPanelProps) => (
  <div style={{ display: "flex" }}>
    <button className="ctrl-btn" onClick={() => vm.togglePlay()}>
      {vm.playing ? "⏸️" : "▶️"}
    </button>
    <button className="ctrl-btn" onClick={() => vm.stop()}>
      ⏹️
    </button>
    <button className="ctrl-btn" onClick={() => vm.step()}>
      ⏭️
    </button>
    <button className="ctrl-btn" onClick={() => vm.nextSpeed()}>
      ⏩ {vm.speed}x
    </button>
  </div>
));
