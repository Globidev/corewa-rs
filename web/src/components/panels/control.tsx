import { ButtonHTMLAttributes } from "react";
import { observer } from "mobx-react-lite";

import { VirtualMachine } from "../../state/vm";

import playIcon from "../../assets/play-icon.png?url";
import pauseIcon from "../../assets/pause-icon.png?url";
import stopIcon from "../../assets/stop-icon.png?url";
import nextIcon from "../../assets/next-icon.png?url";
import fastForwardIcon from "../../assets/fast-forward-icon.png?url";

type ControlPanelProps = {
  vm: VirtualMachine;
};

export const ControlPanel = observer(({ vm }: ControlPanelProps) => {
  return (
    <div style={{ display: "flex" }}>
      <CtrlBtn
        onClick={() => vm.togglePlay()}
        iconSrc={vm.playing ? pauseIcon : playIcon}
        data-tooltip={vm.playing ? "Pause" : "Play"}
      />
      <CtrlBtn
        onClick={() => vm.stop()}
        iconSrc={stopIcon}
        data-tooltip="Stop"
      />
      <CtrlBtn
        onClick={() => vm.step()}
        iconSrc={nextIcon}
        data-tooltip="Next cycle"
      />
      <CtrlBtn
        onClick={() => vm.nextSpeed()}
        iconSrc={fastForwardIcon}
        data-tooltip="Faster"
      >
        <span>&nbsp;{vm.speed}x</span>
      </CtrlBtn>
    </div>
  );
});

export const CtrlBtn = (
  props: ButtonHTMLAttributes<HTMLButtonElement> & { iconSrc: string }
) => {
  const { children, iconSrc, className, ...btnProps } = props;
  return (
    <button className={`ctrl-btn ${className ?? ""}`} {...btnProps}>
      <div className="ctrl-btn-inner">
        <img className="ctrl-icon" src={iconSrc} />
        {children}
      </div>
    </button>
  );
};
