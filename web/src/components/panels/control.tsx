import { ButtonHTMLAttributes, FC } from "react";
import { observer } from "mobx-react-lite";

import { VirtualMachine } from "../../virtual_machine";

type ControlPanelProps = {
  vm: VirtualMachine;
};

export const ControlPanel = observer(({ vm }: ControlPanelProps) => {
  const CtrlBtn: FC<ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
    <button className="ctrl-btn" {...props} />
  );

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
