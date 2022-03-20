import { observer } from "mobx-react-lite";

import S from "react-switch";

import { SectionTitle } from "./common";

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
    <>
      <SectionTitle title="Display settings" />
      <div>
        <label className="cell-values-switch">
          <span>Show cell values</span>
          <Switch
            checked={options.showCellValues}
            onChange={(checked) => options.setShowCellValues(checked)}
            checkedIcon={false}
            uncheckedIcon={false}
            height={20}
            width={40}
            handleDiameter={15}
            onColor="#81a1c1"
          />
        </label>
      </div>
      <div style={{ display: "flex" }}>
        <span>Register values</span>
        <div style={{ display: "flex" }}>
          <div>
            <label>Hex</label>
            <input
              type="radio"
              name="reg-value-base"
              checked={options.regValuesRadix === 16}
              onChange={(e) => {
                if (e.target.checked) {
                  options.setRegValuesRadix(16);
                }
              }}
            />
          </div>
          <div>
            <label>Dec</label>
            <input
              type="radio"
              name="reg-value-base"
              checked={options.regValuesRadix === 10}
              onChange={(e) => {
                if (e.target.checked) {
                  options.setRegValuesRadix(10);
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
});
