import { observer } from "mobx-react-lite";

import S from "react-switch";

import { Panel } from "../panel";

import { Options } from "../../state/options";

// HACK: due to an issue with vite (actually rollup) and cjs modules with
// default exports, we resort to some hackery to resolve the module
// see https://github.com/vitejs/vite/issues/2139
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const Switch: typeof S = S.default ? S.default : S;

type Props = {
  options: Options;
};

export const DisplaySettingsPanel = observer(({ options }: Props) => {
  return (
    <Panel title="Display settings">
      <label className="option-switch">
        <span className="info">Show cell values</span>
        <Switch
          checked={options.get("show-cell-values")}
          onChange={(checked) => options.set("show-cell-values", checked)}
          checkedIcon={false}
          uncheckedIcon={false}
          height={20}
          width={40}
          handleDiameter={15}
          onColor="#81a1c1"
        />
      </label>

      <label className="option-switch">
        <span className="info">Show UPS</span>
        <Switch
          checked={options.get("show-ups")}
          onChange={(checked) => options.set("show-ups", checked)}
          checkedIcon={false}
          uncheckedIcon={false}
          height={20}
          width={40}
          handleDiameter={15}
          onColor="#81a1c1"
        />
      </label>

      <div className="radix-setting">
        <span className="info">Register values</span>
        <div style={{ display: "flex" }}>
          <div>
            <label>Hex</label>
            <input
              type="radio"
              name="reg-value-base"
              checked={options.get("reg-values-radix") === 16}
              onChange={(e) => {
                if (e.target.checked) {
                  options.set("reg-values-radix", 16);
                }
              }}
            />
          </div>
          <div>
            <label>Dec</label>
            <input
              type="radio"
              name="reg-value-base"
              checked={options.get("reg-values-radix") === 10}
              onChange={(e) => {
                if (e.target.checked) {
                  options.set("reg-values-radix", 10);
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="radix-setting">
        <span className="info">Instruction params</span>
        <div style={{ display: "flex" }}>
          <div>
            <label>Hex</label>
            <input
              type="radio"
              name="instr-params-base"
              checked={options.get("instr-params-radix") === 16}
              onChange={(e) => {
                if (e.target.checked) {
                  options.set("instr-params-radix", 16);
                }
              }}
            />
          </div>
          <div>
            <label>Dec</label>
            <input
              type="radio"
              name="instr-params-base"
              checked={options.get("instr-params-radix") === 10}
              onChange={(e) => {
                if (e.target.checked) {
                  options.set("instr-params-radix", 10);
                }
              }}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
});
