import { makeObservable, observable, action } from "mobx";

import { compile_champion } from "corewa-rs";

import { Game } from "./game";

export class CorewarPlayer {
  champion?: {
    name: string;
    comment: string;
    byteCode: Uint8Array;
    codeSize: number;
  };

  constructor(
    public code: string,
    public id: number,
    public color: number,
    public store: Game
  ) {
    makeObservable(this, {
      code: observable,
      champion: observable,
      color: observable,
      id: observable,
      store: false,

      compile: action.bound,
      delete: action.bound,
      setId: action.bound,
      setColor: action.bound,
    });
  }

  compile(newCode: string) {
    this.code = newCode;
    this.champion = undefined;

    const champion = compile_champion(newCode);

    this.champion = {
      name: champion.name(),
      comment: champion.comment(),
      byteCode: champion.byte_code(),
      codeSize: champion.code_size,
    };
  }

  delete() {
    this.store.removePlayer(this);
  }

  setId(newId: number) {
    // Already taken
    if (this.store.players.some((p) => p.id === newId)) return;
    // Must not be NaN, must be non zero and must fit on a signed 32bit integer
    if (
      Number.isNaN(newId) ||
      newId == 0 ||
      newId < -(2 ** 31) ||
      newId >= 2 ** 31
    )
      return;

    this.id = newId;
  }

  setColor(color: number) {
    this.color = color;
  }

  isReady(): this is PlayerReady {
    return this.champion !== undefined;
  }
}

export type PlayerReady = Required<CorewarPlayer>;
