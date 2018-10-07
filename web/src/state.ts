import { VirtualMachine } from './corewar.d'
import { observable, action } from 'mobx'

class State {
  @observable
  playing: boolean = false
  @observable
  speed: number = 1

  // VirtualMachine is opaque and cannot be made observable.
  // We know, however, that its state will change every tick.
  // We can therefore just add a simple observable value corresponding to
  // the vm's cycle count and use it as a notifier for components that want to
  // observe the vm.
  // INVARIANTS TO MAINTAIN:
  //   - vmCycles === null if vm === null
  //   - vmCycles === vm.cycles otherwise
  vm: VirtualMachine | null = null
  @observable
  vmCycles: number | null = null

  debounceId: number | undefined = undefined
  animationId: number | undefined = undefined

  currentCode: string | undefined = undefined // TODO: remove when reset implemented on vm

  @action
  tick(vm: VirtualMachine, n: number) {
    // console.log("tick")
    for (let i = 0; i < n; ++i)
      if (vm.tick()) {
        this.pause()
        let winner = vm.winner()
        alert(`${winner !== undefined ? winner : 'nobody'} Wins!`)
        break
      }

    this.vmCycles = vm.cycles
  }

  @action
  renderLoop(vm: VirtualMachine) {
    // console.log("renderLoop")
    this.tick(vm, this.speed)
    if (this.playing) this.animationId = requestAnimationFrame(() => this.renderLoop(vm))
  }

  @action
  compile(code: string) {
    // console.log("compile")
    this.vmCycles = null // effectively resets the VM observers
    this.currentCode = code

    try {
      this.vm = wasm_bindgen.vm_from_code(code)
      if (this.vm) this.vmCycles = this.vm.cycles
    } catch (err) {
      console.error(err)
      this.vm = null
      this.vmCycles = null
    }
  }

  @action
  togglePlay() {
    // console.log("togglePlay")
    if (this.playing) this.pause()
    else this.play()
  }

  @action
  play() {
    // console.log("play")
    if (this.vm) {
      this.playing = true
      this.renderLoop(this.vm)
    }
  }

  @action
  pause() {
    // console.log("pause")
    if (this.animationId) cancelAnimationFrame(this.animationId)
    this.playing = false
  }

  @action
  stop() {
    // console.log("stop")
    this.pause()

    if (this.currentCode) this.compile(this.currentCode)
  }

  @action
  step() {
    // console.log("step")
    if (this.playing) this.pause()
    if (this.vm) this.tick(this.vm, 1)
  }

  @action
  nextSpeed() {
    // console.log("nextSpeed")
    this.speed *= 2

    if (this.speed > 16) this.speed = 1
  }

  @action
  setCycle(cycle: number) {
    // console.log("setCycle")
    this.stop()

    if (this.vm) this.tick(this.vm, cycle)
  }
}

class UIState {
  @observable
  fullscreen: boolean = false

  @action
  toggleFullscreen() {
    this.fullscreen = !this.fullscreen
  }
}

export const state = new State()
export const uiState = new UIState()
