/* tslint:disable */
export function compile_champion(arg0: string): Uint8Array

export class ChampionInfo {
  free(): void
  process_count: number
  last_live: number
}
export class Region {
  free(): void
  from_row: number
  from_col: number
  to_row: number
  to_col: number
}
export class VirtualMachine {
  free(): void

  cycles(): number

  last_live_check(): number

  check_interval(): number

  live_count_since_last_check(): number

  checks_without_cycle_decrement(): number

  tick(): boolean

  process_count(): number

  player_count(): number

  player_info(arg0: number): any

  champion_info(arg0: number): ChampionInfo

  processes_at(arg0: number): ProcessCollection

  decode(arg0: number): DecodeResult

  memory(): Memory
}
export class Memory {
  free(): void
  values_ptr: number
  ages_ptr: number
  owners_ptr: number
  pc_count_ptr: number
}
export class PlayerInfo {
  free(): void
  id: number
  champion_size: number

  champion_name(): string

  champion_comment(): string
}
export class ProcessCollection {
  free(): void

  len(): number

  at(arg0: number): ProcessInfo
}
export class VMBuilder {
  free(): void

  constructor()

  with_player(arg0: number, arg1: Uint8Array): VMBuilder

  finish(): VirtualMachine
}
export class ProcessInfo {
  free(): void
  pid: number
  player_id: number
  pc: number
  zf: boolean
  last_live_cycle: number

  executing(): any

  registers(): Int32Array
}
export class ExecutingState {
  free(): void
  exec_at: number

  op(): string
}
export class DecodeResult {
  free(): void

  byte_size(): number

  to_string(): string
}
export class CompileError {
  free(): void

  reason(): string

  region(): any
}
