import { action, makeObservable, observable, reaction } from "mobx";

import { VirtualMachine } from "./vm";

import { champions } from "../assets/champions";
import { Options } from "./options";
import { CorewarPlayer, PlayerReady } from "./player";

const PLAYER_COLORS = [0x81a1c1, 0xb48ead, 0xa3be8c, 0xbf616a];
const DEFAULT_CHAMPIONS = <const>[
  "sweepmaster",
  "kappa",
  "helltrain",
  "justin_bee",
];

export class Game {
  players = observable<CorewarPlayer>([]);

  options = new Options();

  constructor(public vm: VirtualMachine) {
    makeObservable(this, {
      options: observable,

      getPlayer: action.bound,
      removePlayer: action.bound,
    });

    reaction(
      () => this.players.filter((p): p is PlayerReady => p.isReady()),
      (players) => this.vm.setPlayers(players),
      { name: "Update VM players" }
    );
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
