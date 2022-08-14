import { makeObservable, observable } from "mobx";

import { load, Namespaced, saveNamespaced } from "./persistent";

type Entries = Namespaced<"options">;

function loadValues(): Entries {
  return {
    "show-cell-values": load("options::show-cell-values") ?? false,
    "show-ups": load("options::show-ups") ?? false,
    "reg-values-radix": load("options::reg-values-radix") ?? 10,
    "instr-params-radix": load("options::instr-params-radix") ?? 10,
  };
}
export class Options {
  values = loadValues();

  constructor() {
    makeObservable(this, {
      values: observable,
    });
  }

  get<K extends keyof Entries>(key: K): Entries[K] {
    return this.values[key];
  }

  set<K extends keyof Entries>(key: K, value: Entries[K]) {
    this.values[key] = value;
    saveNamespaced("options", key, value);
  }
}
