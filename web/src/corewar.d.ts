/* tslint:disable */
export function vm_from_code(arg0: string): VirtualMachine

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

  tick(): boolean
}
export class Cell {
  value: number
  owner: number
  free(): void
}
