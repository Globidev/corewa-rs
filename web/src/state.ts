import { VirtualMachine } from './corewar.d'
import { observable, action } from 'mobx'

export class ObservableVM {
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
  cycles: number | null = null

  animationId: number | undefined = undefined

  champions: Map<number, string> = new Map()

  @action
  tick(vm: VirtualMachine, n: number) {
    for (let i = 0; i < n; ++i)
      if (vm.tick()) {
        this.cycles = vm.cycles
        this.pause()
        let winner = vm.winner()
        alert(`${winner !== undefined ? winner : 'nobody'} Wins!`)
        break
      }

    this.cycles = vm.cycles
  }

  @action
  renderLoop(vm: VirtualMachine) {
    // console.log("renderLoop")
    this.tick(vm, this.speed)
    if (this.playing) this.animationId = requestAnimationFrame(() => this.renderLoop(vm))
  }

  @action
  compile() {
    this.pause()
    // console.log('compile')
    this.cycles = null // effectively resets the VM observers
    // this.currentCodes = codes
    const codes = Array.from(this.champions.values())

    try {
      this.vm = wasm_bindgen.vm_from_code(codes)
      this.cycles = 0
      // this.vm = observable(new ObservableVM(wasm_bindgen.vm_from_code(codes)))
    } catch (err) {
      console.error(err)
      // this.vm = null
    }
  }

  @action
  setChampionCode(championId: number, code: string) {
    this.champions.set(championId, code)
    this.compile()
  }

  @action
  togglePlay() {
    // console.log("togglePlay")
    if (this.playing) this.pause()
    else this.play()
  }

  @action
  play() {
    // console.log('play')
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
    this.compile()
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

class State {
  @observable
  vms: Map<number, ObservableVM> = new Map()
  vmIdPool: number = 0

  @action
  newVm() {
    let vmId = this.nextVmId()
    let vm = new ObservableVM()
    this.vms.set(vmId, vm)
    return [vmId, vm]
  }

  nextVmId() {
    let id = this.vmIdPool
    ++this.vmIdPool
    return id
  }

  getVm(id: number) {
    return this.vms.get(id)
  }
}

class UIState {}

export const state = new State()
export const uiState = new UIState()