import { VirtualMachine, vm_from_code } from './corewar';
import { observable, action, decorate, computed, extendObservable } from "mobx";

class State {
  @observable playing: boolean = false;
  @observable speed: number = 1;

  // VirtualMachine is opaque and cannot be made observable.
  // We know, however, that its state will change every tick.
  // We can therefore just add a simple observable value corresponding to
  // the vm's cycle count and use it as a notifier for components that want to
  // observe the vm.
  // INVARIANTS TO MAINTAIN:
  //   - vmCycles === null if vm === null
  //   - vmCycles === vm.cycles otherwise
  vm: VirtualMachine | null = null;
  @observable vmCycles: number | null = null;

  debounceId: number | undefined = undefined;
  animationId: number | undefined = undefined;

  currentCode: string | undefined = undefined; // TODO: remove when reset implemented on vm

  @action
  tick(vm: VirtualMachine, n: number) {
    for (let i = 0; i < n; ++i)
      vm.tick()
    this.vmCycles = vm.cycles;
  }

  @action
  renderLoop(vm: VirtualMachine) {
    this.tick(vm, this.speed)
    this.animationId = requestAnimationFrame(() => this.renderLoop(vm));
  }

  @action
  compile(code: string) {
    this.currentCode = code;

    try {
      this.vm = vm_from_code(code);
      this.vmCycles = this.vm.cycles;
    } catch (err) {
      console.error(err)
      this.vm = null;
      this.vmCycles = null;
    }
  }

  @action
  togglePlay() {
    if (this.playing) this.pause()
    else              this.play()
  }

  @action
  play() {
    if (this.vm) {
      this.playing = true;
      this.renderLoop(this.vm)
    }
  }

  @action
  pause() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.playing = false;
  }

  @action
  stop() {
    this.pause();

    if (this.currentCode)
      this.compile(this.currentCode)
  }

  @action
  step() {
    if (this.playing) this.pause();
    if (this.vm)      this.tick(this.vm, 1);
  }

  @action
  nextSpeed() {
    this.speed *= 2;

    if (this.speed > 16)
      this.speed = 1;
  }

  @action
  setCycle(cycle: number) {
    this.stop();

    if (this.vm)
      this.tick(this.vm, cycle)
  }
}

class UIState {
  @observable fullscreen: boolean = false;

  @action
  toggleFullscreen() {
    this.fullscreen = !this.fullscreen
  }
}

export const state = new State;
export const uiState = new UIState;
