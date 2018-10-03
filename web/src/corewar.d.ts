/* tslint:disable */
export function vm_from_code(arg0: string): VirtualMachine;

export function render_on_canvas(arg0: VirtualMachine, arg1: any): void;

export class VirtualMachine {
cycles: number
last_live_check: number
cycles_to_die: number
live_count_since_last_check: number
checks_without_cycle_decrement: number
free(): void;
 constructor();

 size(): number;

 memory(): number;

 process_count(): number;

 process_pc(arg0: number): number;

 cell_at(arg0: number): number;

 tick_n(arg0: number): void;

 tick(): void;

}
