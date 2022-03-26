import { observable, action, makeObservable, computed } from "mobx";

import { VMBuilder } from "corewa-rs";
import { PlayerReady } from "./player";

export type MatchResult = VirtualMachine["players"];

const MAX_SPEED = 64;

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
  cycles = 0;
  coverages = this.engine.coverages();

  playing = false;
  speed = 1;

  playTimeout?: number;
  lastFrameTime = 0;

  matchResult?: MatchResult;
  players: PlayerReady[] = [];

  updateTimes: number[] = [];

  constructor(public wasmMemory: WebAssembly.Memory) {
    makeObservable(this, {
      engine: observable,
      cycles: observable,
      coverages: observable,
      playing: observable,
      speed: observable,
      matchResult: observable,
      players: observable,
      updateTimes: observable,

      tick: action,
      updateMatchResult: action,
      playLoop: action.bound,
      compile: action,
      togglePlay: action,
      play: action,
      pause: action,
      stop: action,
      step: action,
      nextSpeed: action,
      setCycle: action,

      setPlayers: action,

      ups: computed,
    });
  }

  get ups(): number | undefined {
    if (this.updateTimes.length === 0 || !this.playing) {
      return undefined;
    }

    const now = performance.now();
    const oneSecondAgo = now - 1_000;
    let ups = 0;

    for (let idx = this.updateTimes.length - 1; idx >= 0; --idx) {
      if (this.updateTimes[idx] < oneSecondAgo) {
        break;
      }

      if (idx === 0) {
        return Math.floor(
          (this.updateTimes.length / (now - this.updateTimes[idx])) * 1_000
        );
      }

      ++ups;
    }

    return ups;
  }

  tick(n: number) {
    const t0 = performance.now();

    for (let i = 0; i < n; ++i) {
      if (this.engine.tick()) {
        this.updateMatchResult();
        this.pause();
        break;
      }
    }

    this.cycles = this.engine.cycles();
    this.coverages = this.engine.coverages();

    const t1 = performance.now();
    this.updateTimes.push(t1);
    console.debug(`${n} tick: ${(t1 - t0).toFixed(2)} ms`);
  }

  updateMatchResult() {
    const info = this.players.map(
      (player) => <const>[player, this.engine.champion_info(player.id)]
    );

    const latestLive = Math.max(
      ...info.map(([_, championInfo]) => championInfo.last_live)
    );

    const playersWithLatestLives = info
      .filter(([_, championInfo]) => championInfo.last_live == latestLive)
      .map(([playerInfo, _]) => playerInfo);

    this.matchResult = playersWithLatestLives;
  }

  playLoop() {
    if (this.playing) {
      this.tick(this.speed);
      window.requestAnimationFrame(this.playLoop);
    }
  }

  compile() {
    this.pause();
    this.matchResult = undefined;
    this.engine = this.players
      .reduce(
        (builder, player) =>
          builder.with_player(player.id, player.champion.byteCode),
        new VMBuilder()
      )
      .finish();

    this.cycles = this.engine.cycles();
    this.coverages = this.engine.coverages();
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
    this.updateTimes = [];
    this.playLoop();
  }

  pause() {
    this.playing = false;
    clearTimeout(this.playTimeout);
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

  setPlayers(players: typeof this["players"]) {
    this.players = players;
    this.compile();
  }
}
