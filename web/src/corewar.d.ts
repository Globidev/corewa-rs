/* tslint:disable */
export function compile_champion(arg0: string): Uint8Array

export class JsCompileError {
  from_row: number
  from_col: number
  to_row: number
  to_col: number
  free(): void
  reason(): string
}
export class VirtualMachine {
  cycles: number
  last_live_check: number
  cycles_to_die: number
  live_count_since_last_check: number
  checks_without_cycle_decrement: number
  free(): void
  constructor()

  size(): number

  process_count(): number

  process_pc(arg0: number): number

  cell_at(arg0: number): Cell

  winner(): string

  player_count(): number

  player_id(arg0: number): number

  tick(): boolean
}
export class Cell {
  value: number
  owner: number
  free(): void
}
export class VMBuilder {
  free(): void
  constructor()

  with_player(arg0: number, arg1: Uint8Array): VMBuilder

  finish(): VirtualMachine
}
