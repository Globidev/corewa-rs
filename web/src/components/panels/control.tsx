import * as React from "react";
import { observer } from "mobx-react";

import { VirtualMachine } from "../../virtual_machine";

interface IControlPanelProps {
  vm: VirtualMachine;
}

@observer
export class ControlPanel extends React.Component<IControlPanelProps> {
  render() {
    const vm = this.props.vm;

    return (
      <div style={{ display: "flex" }}>
        <Button onClick={() => vm.togglePlay()}>
          {vm.playing ? "⏸️" : "▶️"}
        </Button>
        <Button onClick={() => vm.stop()}>⏹️</Button>
        <Button onClick={() => vm.step()}>⏭️</Button>
        <Button onClick={() => vm.nextSpeed()}>⏩ {vm.speed}x</Button>
      </div>
    );
  }
}

interface IButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
}

const Button = ({ onClick, children }: IButtonProps) => (
  <button className="ctrl-btn" onClick={onClick}>
    {children}
  </button>
);
