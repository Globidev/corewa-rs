import {
  action,
  autorun,
  IObservableArray,
  makeObservable,
  observable,
} from "mobx";

import { compile_champion } from "corewa-rs";

import { load, save } from "./persistent";
import { VirtualMachine } from "./vm";

import { champions } from "../assets/champions";

const PLAYER_COLORS = [0x0fd5ff, 0xffa517, 0x7649cc, 0x14cc57];
const DEFAULT_CHAMPIONS = <const>[
  "sweepmaster",
  "kappa",
  "helltrain",
  "justin_bee",
];

export class Corewar {
  players: IObservableArray<CorewarPlayer> = observable([]);
  playerColors: number[] = [];

  constructor(public vm: VirtualMachine) {
    makeObservable(this, {
      playerColors: false,

      getPlayer: action.bound,
      removePlayer: action.bound,
      loadPlayers: action.bound,
    });

    this.loadPlayers();

    autorun(
      () => {
        const vmPlayers = this.players
          .filter(
            (p): p is Required<CorewarPlayer> =>
              p.compiledChampion !== undefined
          )
          .map((p) => ({
            id: p.id,
            champion: p.compiledChampion,
          }));
        this.vm.setPlayers(vmPlayers);
        this.memoizePlayerColors();
      },
      {
        name: "update vm players",
        delay: 500,
      }
    );

    autorun(
      () => {
        const data = this.players.map((p) => ({
          code: p.code,
          id: p.id,
          editorId: p.editorId,
        }));
        save("data::players", data);
      },
      {
        name: "save player data",
        delay: 1_000,
      }
    );
  }

  loadPlayers() {
    const savedPlayers = load("data::players") ?? [];

    for (const { code, id, editorId } of savedPlayers) {
      const color = PLAYER_COLORS[this.players.length];
      this.players.push(new CorewarPlayer(code, id, color, editorId, this));
    }
  }

  memoizePlayerColors() {
    const colorsById = [];

    for (const player of this.players) {
      colorsById[player.id] = player.color;
    }

    this.playerColors = colorsById;
  }

  nextEditorId(): number {
    const maxId = Math.max(...this.players.map((p) => p.editorId));
    return maxId + 1;
  }

  getPlayer(editorId: number): CorewarPlayer {
    const player = this.players.find((p) => p.editorId === editorId);
    if (player !== undefined) {
      return player;
    }

    const newPlayer = new CorewarPlayer(
      champions[DEFAULT_CHAMPIONS[this.players.length]],
      this.randomPlayerId(),
      PLAYER_COLORS[this.players.length],
      editorId,
      this
    );
    this.players.push(newPlayer);
    return newPlayer;
  }

  removePlayer(player: CorewarPlayer) {
    this.players.remove(player);
  }

  randomPlayerId() {
    let id = undefined;

    do {
      const randomIds = new Int32Array(8);
      crypto.getRandomValues(randomIds);
      id = randomIds.find(
        (n) => n != 0 && !this.players.some((p) => p.id === n)
      );
    } while (id === undefined);

    return id;
  }
}

export class CorewarPlayer {
  compiledChampion?: Uint8Array;

  constructor(
    public code: string,
    public id: number,
    public color: number,
    public editorId: number,
    public store: Corewar
  ) {
    makeObservable(this, {
      code: observable,
      compiledChampion: observable,
      color: observable,
      id: observable,
      store: false,

      compile: action.bound,
      delete: action.bound,
      setId: action.bound,
    });
  }

  compile(newCode: string) {
    this.code = newCode;
    this.compiledChampion = compile_champion(newCode);
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
}
