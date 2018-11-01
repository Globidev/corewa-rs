import { VirtualMachine as VMEngine, PlayerInfo, ChampionInfo } from './corewar'
import { observable, action } from 'mobx'

const PLAYER_COLORS = [0x0fd5ff, 0xffa517, 0x7649cc, 0x14cc57]

export class VirtualMachine {
  // VMEngine is opaque and cannot be made observable.
  // We know, however, that its state will change every tick.
  // We can therefore just add a simple observable value corresponding to
  // the vm's cycle count and use it as a notifier for components that want to
  // observe the vm.
  // INVARIANTS TO MAINTAIN:
  //   - cycles === null if engine === null
  //   - cycles === engine.cycles otherwise
  engine: VMEngine | null = null
  @observable
  cycles: number | null = null

  @observable
  playing: boolean = false
  @observable
  speed: number = 1

  animationId: number | null = null
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

  newPlayer() {
    const id = this.randomPlayerId()
    const color = PLAYER_COLORS[this.playersById.size]
    const player = { id, color, champion: null }
    this.playersById.set(id, player)
    // ⚠ cannot return player directly because of the observable map
    return this.playersById.get(id) as Player
  }

  @action
  tick(vm: VMEngine, n: number) {
    for (let i = 0; i < n; ++i) {
      if (vm.tick()) {
        this.updateMatchResult(vm)
        break
      }
    }

    this.cycles = vm.cycles()
  }

  updateMatchResult(vm: VMEngine) {
    const info = Array.from(this.playersById.keys()).map(
      playerId =>
        [vm.player_info(playerId), vm.champion_info(playerId)] as [
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
  renderLoop(vm: VMEngine) {
    this.tick(vm, this.speed)
    const now = performance.now()
    const dt = now - this.lastFrameTime
    this.lastFrameTime = now
    const delta = Math.max(0, 1000 / 60 - dt)
    if (this.playing) {
      this.animationId = window.setTimeout(() => this.renderLoop(vm), delta)
    }
  }

  @action
  compile() {
    this.pause()
    this.matchResult = null
    this.cycles = null // effectively resets the VM observers
    this.engine = Array.from(this.playersById.values())
      .reduce((builder, player) => {
        if (player.champion) return builder.with_player(player.id, player.champion)
        else return builder
      }, new wasm_bindgen.VMBuilder())
      .finish()

    this.cycles = 0
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
    if (this.playing) this.pause()
    else this.play()
  }

  @action
  play() {
    if (this.engine) {
      this.playing = true
      this.lastFrameTime = performance.now()
      this.renderLoop(this.engine)
    }
  }

  @action
  pause() {
    this.playing = false
    if (this.animationId) clearTimeout(this.animationId)
  }

  // @action
  stop() {
    this.pause()
    this.engine = null
    this.cycles = null

    wasm_bindgen('./corewar_bg.wasm').then(() => this.compile())
  }

  @action
  step() {
    if (this.playing) this.pause()
    if (this.engine) this.tick(this.engine, 1)
  }

  @action
  nextSpeed() {
    this.speed *= 2

    if (this.speed > MAX_SPEED) this.speed = 1
  }

  @action
  setCycle(cycle: number) {
    this.pause()
    if (this.engine) {
      const cycles = this.engine.cycles()
      if (cycles <= cycle) {
        this.tick(this.engine, cycle - cycles)
      } else {
        this.engine = null
        this.cycles = null
        this.compile()
        if (this.engine) this.tick(this.engine, cycle)
      }
    }
  }
}

export type Player = {
  id: number
  color: number
  champion: CompiledChampion | null
}

export type MatchResult = PlayerInfo[]

const MAX_SPEED = 32
