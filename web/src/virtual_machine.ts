import { VirtualMachine as VMEngine, PlayerInfo, ChampionInfo } from './corewar'
import { observable, action } from 'mobx'

export type Player = {
  id: number
  color: number
  champion: CompiledChampion | null
}

export type MatchResult = PlayerInfo[]

const MAX_SPEED = 32
const TARGET_UPS = 60
const PLAYER_COLORS = [0x0fd5ff, 0xffa517, 0x7649cc, 0x14cc57]

// Webassembly memory can only grow (for now). Pages cannot be reclaimed which
// can lead to leaks overtime. The only way to effectively free the memory is
// to re-instantiate the webassembly module.
// Since the most reucrrent heaviest operation will be the creation of the
// wasm VirtualMachine, we can simply check for the current amount on mapped
// memory before creating a new one and set a threshold that will trigger the
// re-instantiation of the wasm module when exceeded.
// Allowing up to 250MB of Wasm memory usage before forcing a reload
const MAX_ACCEPTABLE_WASM_MEM_BUFFER_SIZE = 250000000 // In bytes

export class VirtualMachine {
  // VMEngine is opaque and cannot be made observable.
  // We know, however, that its state will change every tick.
  // We can therefore just add a simple observable value corresponding to
  // the vm's cycle count and use it as a notifier for components that want to
  // observe the vm.
  // INVARIANT TO MAINTAIN: cycles === engine.cycles
  engine: VMEngine = new wasm_bindgen.VMBuilder().finish()
  @observable
  cycles: number | null = null

  @observable
  playing: boolean = false
  @observable
  speed: number = 1

  timeoutId: number | null = null
  lastFrameTime = 0

  @observable
  playersById = new Map<number, Player>()

  @observable
  matchResult: MatchResult | null = null

  randomPlayerId() {
    let id = undefined

    do {
      const randomIds = new Int32Array(8)
      crypto.getRandomValues(randomIds)
      id = randomIds.find(n => n != 0 && !this.playersById.has(n))
    } while (id === undefined)

    return id
  }

  @action
  newPlayer() {
    const id = this.randomPlayerId()
    const color = PLAYER_COLORS[this.playersById.size]
    const player = { id, color, champion: null }
    this.playersById.set(id, player)
    // ⚠ cannot return player directly because of the observable map
    return this.playersById.get(id) as Player
  }

  @action
  changePlayerId(oldId: number, newId: number) {
    // Already taken
    if (this.playersById.has(newId)) return
    // Must not be NaN, must be non zero and must fit on a signed 32bit integer
    if (Number.isNaN(newId) || newId == 0 || newId < -(2 ** 31) || newId >= 2 ** 31)
      return

    let player = this.playersById.get(oldId)
    if (player === undefined) return

    player.id = newId
    const players = Array.from(this.playersById.values())

    this.playersById = new Map(players.map(p => [p.id, p] as [number, Player]))
    this.compile()
  }

  @action
  tick(n: number) {
    for (let i = 0; i < n; ++i) {
      if (this.engine.tick()) {
        this.updateMatchResult()
        this.pause()
        break
      }
    }

    this.cycles = this.engine.cycles()
  }

  @action
  updateMatchResult() {
    const info = Array.from(this.playersById.keys()).map(
      playerId =>
        [this.engine.player_info(playerId), this.engine.champion_info(playerId)] as [
          PlayerInfo,
          ChampionInfo
        ]
    )

    const latestLive = Math.max(
      ...info.map(([_, championInfo]) => championInfo.last_live)
    )

    const playersWithLatestLives = info
      .filter(([_, championInfo]) => championInfo.last_live == latestLive)
      .map(([playerInfo, _]) => playerInfo)

    this.matchResult = playersWithLatestLives
  }

  @action
  playLoop() {
    this.tick(this.speed)
    const now = performance.now()
    const dt = now - this.lastFrameTime
    this.lastFrameTime = now
    const delta = Math.max(0, 1000 / TARGET_UPS - dt)
    if (this.playing) {
      this.timeoutId = window.setTimeout(() => this.playLoop(), delta)
    }
  }

  @action
  compile() {
    this.pause()
    this.matchResult = null
    this.cycles = null // effectively resets the VM observers

    const currentBufferSize = wasm_bindgen.wasm.memory.buffer.byteLength
    if (currentBufferSize > MAX_ACCEPTABLE_WASM_MEM_BUFFER_SIZE) {
      return wasm_bindgen('./corewar_bg.wasm').then(() => this.compileImpl())
    } else {
      this.compileImpl()
      return Promise.resolve()
    }
  }

  @action
  compileImpl() {
    this.engine = Array.from(this.playersById.values())
      .reduce(
        (builder, player) =>
          player.champion ? builder.with_player(player.id, player.champion) : builder,
        new wasm_bindgen.VMBuilder()
      )
      .finish()

    this.cycles = this.engine.cycles()
  }

  @action
  removePlayer(playerId: number) {
    this.playersById.delete(playerId)
    Array.from(this.playersById.values()).forEach((player, idx) => {
      player.color = PLAYER_COLORS[idx]
    })
    this.compile()
  }

  @action
  togglePlay() {
    if (this.playing) {
      this.pause()
    } else {
      this.play()
    }
  }

  @action
  play() {
    this.playing = true
    this.lastFrameTime = performance.now()
    this.playLoop()
  }

  @action
  pause() {
    this.playing = false
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
  }

  @action
  stop() {
    this.pause()
    this.compile()
  }

  @action
  step() {
    this.pause()
    this.tick(1)
  }

  @action
  nextSpeed() {
    this.speed *= 2

    if (this.speed > MAX_SPEED) this.speed = 1
  }

  @action
  setCycle(cycle: number) {
    this.pause()
    const cycles = this.engine.cycles()
    if (cycles <= cycle) {
      this.tick(cycle - cycles)
    } else {
      this.compile().then(() => this.tick(cycle))
    }
  }
}
