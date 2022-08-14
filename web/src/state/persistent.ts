import type { IJsonModel } from "flexlayout-react";
import { Radix } from "../utils";

export type Storage = {
  "ui::layout": IJsonModel;

  "options::show-cell-values": boolean;
  "options::show-ups": boolean;
  "options::reg-values-radix": Radix;
  "options::instr-params-radix": Radix;
};

export function save<K extends keyof Storage>(key: K, value: Storage[K]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function saveNamespaced<N extends string, K extends keyof Namespaced<N>>(
  ns: N,
  key: K,
  value: Namespaced<N>[K]
) {
  localStorage.setItem(`${ns}::${key}`, JSON.stringify(value));
}

export function load<K extends keyof Storage>(key: K): Storage[K] | undefined {
  const item = localStorage.getItem(key);

  if (item === null) {
    return undefined;
  }

  return JSON.parse(item);
}

export type Namespaced<N extends string> = {
  [K in StripPrefix<N, keyof Storage>]: `${N}::${K}` extends keyof Storage
    ? Storage[`${N}::${K}`]
    : never;
};

type StripPrefix<P extends string, Src> = Src extends `${P}::${infer S}`
  ? S
  : never;
