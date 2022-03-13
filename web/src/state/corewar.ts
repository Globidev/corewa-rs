import { action, autorun, makeObservable, observable } from "mobx";

import { compile_champion } from "corewa-rs";

import { VirtualMachine } from "./vm";

import { champions } from "../assets/champions";

const PLAYER_COLORS = [0x81a1c1, 0xb48ead, 0xa3be8c, 0xbf616a];
const DEFAULT_CHAMPIONS = <const>[
  "sweepmaster",
  "kappa",
  "helltrain",
  "justin_bee",
];

export class Corewar {
  players = observable<CorewarPlayer>([]);
  playerColors: number[] = [];

  constructor(public vm: VirtualMachine) {
    makeObservable(this, {
      playerColors: false,

      getPlayer: action.bound,
      removePlayer: action.bound,
    });

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
      }
    );
  }

  memoizePlayerColors() {
    const colorsById = [];

    for (const player of this.players) {
      colorsById[player.id] = player.color;
    }

    this.playerColors = colorsById;
  }

  getPlayer(id: number): CorewarPlayer | undefined {
    const player = this.players.find((p) => p.id === id);
    if (player !== undefined) {
      return player;
    }
  }

  createPlayer(id: number, code?: string, color?: number): CorewarPlayer {
    const player = this.getPlayer(id);
    if (player !== undefined) {
      return player;
    }

    const newPlayer = new CorewarPlayer(
      code ?? champions[DEFAULT_CHAMPIONS[Math.min(this.players.length, 3)]],
      id,
      color ?? this.nextPlayerColor(),
      this
    );
    this.players.push(newPlayer);
    return newPlayer;
  }

  nextPlayerColor() {
    for (const color of PLAYER_COLORS) {
      if (!this.players.some((p) => p.color === color)) return color;
    }

    return 0xff0000;
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
      setColor: action.bound,
    });
  }

  compile(newCode: string) {
    this.code = newCode;
    this.compiledChampion = undefined;
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

  setColor(color: number) {
    this.color = color;
  }
}
