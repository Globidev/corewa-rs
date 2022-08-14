import { action, makeObservable, observable } from "mobx";

import { load, save } from "./persistent";
import { Radix } from "../utils";

export class Options {
  showCellValues = load("options::show-cell-values") ?? false;
  regValuesRadix = load("options::reg-values-radix") ?? 10;
  showUps = load("options::show-ups") ?? false;

  constructor() {
    makeObservable(this, {
      showCellValues: observable,
      regValuesRadix: observable,
      showUps: observable,

      setShowCellValues: action,
      setRegValuesRadix: action,
      setShowUps: action,
    });
  }

  setShowCellValues(show: boolean) {
    this.showCellValues = show;
    save("options::show-cell-values", this.showCellValues);
  }

  setRegValuesRadix(radix: Radix) {
    this.regValuesRadix = radix;
    save("options::reg-values-radix", this.regValuesRadix);
  }

  setShowUps(show: boolean) {
    this.showUps = show;
    save("options::show-ups", this.showUps);
  }
}
