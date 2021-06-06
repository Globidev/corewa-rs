import { observable, action, makeObservable } from "mobx";

import type { PlayerInfo } from "corewa-rs";
import { VMBuilder } from "corewa-rs";

export type Player = {
  id: number;
  color: number;
  champion: Uint8Array | null;
};

export type MatchResult = PlayerInfo[];

const MAX_SPEED = 32;
const TARGET_UPS = 60;
const PLAYER_COLORS = [0x0fd5ff, 0xffa517, 0x7649cc, 0x14cc57];

// Webassembly memory can only grow (for now). Pages cannot be reclaimed which
// can lead to leaks overtime. The only way to effectively free the memory is
// to re-instantiate the webassembly module.
// Since the most reucrrent heaviest operation will be the creation of the
// wasm VirtualMachine, we can simply check for the current amount on mapped
// memory before creating a new one and set a threshold that will trigger the
// re-instantiation of the wasm module when exceeded.
// Allowing up to 500MB of Wasm memory usage before forcing a reload
// const MAX_ACCEPTABLE_WASM_MEM_BUFFER_SIZE = 500000000 // In bytes

export class VirtualMachine {
  // VMEngine is opaque and cannot be made observable.
  // We know, however, that its state will change every tick.
  // We can therefore just add a simple observable value corresponding to
  // the vm's cycle count and use it as a notifier for components that want to
  // observe the vm.
  // INVARIANT TO MAINTAIN: cycles === engine.cycles
  engine = new VMBuilder().finish();
  cycles: number | null = null;

  playing: boolean = false;
  speed: number = 1;

  timeoutId: number | null = null;
  lastFrameTime = 0;

  playersById = new Map<number, Player>();
  matchResult: MatchResult | null = null;

  constructor() {
    makeObservable(this, {
      cycles: observable,
      playing: observable,
      speed: observable,
      playersById: observable,
      matchResult: observable,

      newPlayer: action,
      changePlayerId: action,
      tick: action,
      updateMatchResult: action,
      playLoop: action,
      compile: action,
      compileImpl: action,
      removePlayer: action,
      togglePlay: action,
      play: action,
      pause: action,
      stop: action,
      step: action,
      nextSpeed: action,
      setCycle: action,
    });
  }

  randomPlayerId() {
    let id = undefined;

    do {
      const randomIds = new Int32Array(8);
      crypto.getRandomValues(randomIds);
      id = randomIds.find((n) => n != 0 && !this.playersById.has(n));
    } while (id === undefined);

    return id;
  }

  newPlayer() {
    const id = this.randomPlayerId();
    const color = PLAYER_COLORS[this.playersById.size];
    const player = { id, color, champion: null };
    this.playersById.set(id, player);
    // ⚠ cannot return player directly because of the observable map
    return this.playersById.get(id) as Player;
  }

  changePlayerId(oldId: number, newId: number) {
    // Already taken
    if (this.playersById.has(newId)) return;
    // Must not be NaN, must be non zero and must fit on a signed 32bit integer
    if (
      Number.isNaN(newId) ||
      newId == 0 ||
      newId < -(2 ** 31) ||
      newId >= 2 ** 31
    )
      return;

    let player = this.playersById.get(oldId);
    if (player === undefined) return;

    player.id = newId;
    const players = Array.from(this.playersById.values());

    this.playersById = new Map(
      players.map((p) => [p.id, p] as [number, Player])
    );
    this.compile();
  }

  tick(n: number) {
    let before = performance.now();
    let processes = 0;
    for (let i = 0; i < n; ++i) {
      if (this.engine.tick()) {
        this.updateMatchResult();
        this.pause();
        break;
      }
      processes += this.engine.process_count();
    }

    this.cycles = this.engine.cycles();

    let duration = performance.now() - before;
    if (duration > 16)
      console.warn(
        `${n} cycles took too long to compute:\n${duration} ms | ${processes} procs`
      );
  }

  updateMatchResult() {
    const info = Array.from(this.playersById.keys()).map((playerId) => [
      this.engine.player_info(playerId),
      this.engine.champion_info(playerId),
    ]);

    const latestLive = Math.max(
      ...info.map(([_, championInfo]) => championInfo.last_live)
    );

    const playersWithLatestLives = info
      .filter(([_, championInfo]) => championInfo.last_live == latestLive)
      .map(([playerInfo, _]) => playerInfo);

    this.matchResult = playersWithLatestLives;
  }

  playLoop() {
    this.tick(this.speed);
    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const delta = Math.max(0, 1000 / TARGET_UPS - dt);
    if (this.playing) {
      this.timeoutId = window.setTimeout(() => this.playLoop(), delta);
    }
  }

  compile() {
    this.pause();
    this.matchResult = null;
    this.cycles = null; // effectively resets the VM observe
    this.compileImpl();
  }

  compileImpl() {
    this.engine = Array.from(this.playersById.values())
      .reduce(
        (builder, player) =>
          player.champion
            ? builder.with_player(player.id, player.champion)
            : builder,
        new VMBuilder()
      )
      .finish();

    this.cycles = this.engine.cycles();
  }

  removePlayer(playerId: number) {
    this.playersById.delete(playerId);
    Array.from(this.playersById.values()).forEach((player, idx) => {
      player.color = PLAYER_COLORS[idx];
    });
    this.compile();
  }

  togglePlay() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.playing = true;
    this.lastFrameTime = performance.now();
    this.playLoop();
  }

  pause() {
    this.playing = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  stop() {
    this.pause();
    this.compile();
  }

  step() {
    this.pause();
    this.tick(1);
  }

  nextSpeed() {
    this.speed *= 2;

    if (this.speed > MAX_SPEED) this.speed = 1;
  }

  setCycle(cycle: number) {
    this.pause();
    const cycles = this.engine.cycles();
    if (cycles <= cycle) {
      this.tick(cycle - cycles);
    } else {
      this.compile();
      this.tick(cycle);
    }
  }
}
