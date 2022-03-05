import type { IJsonModel } from "flexlayout-react";

type Storage = {
  "ui::layout": IJsonModel;
};

export function save<K extends keyof Storage>(key: K, value: Storage[K]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function load<K extends keyof Storage>(key: K): Storage[K] | undefined {
  const item = localStorage.getItem(key);

  if (item === null) {
    return undefined;
  }

  return JSON.parse(item);
}
