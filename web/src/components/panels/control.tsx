import { ButtonHTMLAttributes } from "react";
import { observer } from "mobx-react-lite";

import { VirtualMachine } from "../../state/vm";

type ControlPanelProps = {
  vm: VirtualMachine;
};

export const ControlPanel = observer(({ vm }: ControlPanelProps) => {
  return (
    <div style={{ display: "flex" }}>
      <CtrlBtn onClick={() => vm.togglePlay()}>
        {vm.playing ? "⏸️" : "▶️"}
      </CtrlBtn>
      <CtrlBtn onClick={() => vm.stop()}>⏹️</CtrlBtn>
      <CtrlBtn onClick={() => vm.step()}>⏭️</CtrlBtn>
      <CtrlBtn onClick={() => vm.nextSpeed()}>⏩ {vm.speed}x</CtrlBtn>
    </div>
  );
});

const CtrlBtn = (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className="ctrl-btn" {...props} />
);
