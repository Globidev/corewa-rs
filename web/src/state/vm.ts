import { observable, action, makeObservable } from "mobx";

import { VMBuilder } from "corewa-rs";
import { PlayerReady } from "./player";

export type MatchResult = VirtualMachine["players"];

const MAX_SPEED = 64;
const TARGET_UPS = 60;

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

  playing = false;
  speed = 1;

  playTimeout?: number;
  lastFrameTime = 0;

  matchResult?: MatchResult;
  players: PlayerReady[] = [];

  constructor(public wasmMemory: WebAssembly.Memory) {
    makeObservable(this, {
      engine: observable,
      cycles: observable,
      playing: observable,
      speed: observable,
      matchResult: observable,
      players: observable,

      tick: action,
      updateMatchResult: action,
      playLoop: action,
      compile: action,
      togglePlay: action,
      play: action,
      pause: action,
      stop: action,
      step: action,
      nextSpeed: action,
      setCycle: action,

      setPlayers: action,
    });
  }

  tick(n: number) {
    const before = performance.now();
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

    const duration = performance.now() - before;
    if (duration > 16)
      console.warn(
        `${n} cycles took too long to compute:\n${duration} ms | ${processes} procs`
      );
    console.debug(duration);
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
    this.tick(this.speed);
    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const delta = Math.max(0, 1000 / TARGET_UPS - dt);
    if (this.playing) {
      this.playTimeout = window.setTimeout(() => this.playLoop(), delta);
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
