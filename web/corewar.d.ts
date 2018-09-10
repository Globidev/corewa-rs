/* tslint:disable */
export function vm_from_code(arg0: string): VirtualMachine;

export class VirtualMachine {
constructor(...args: any[]);
cycles: number
last_live_check: number
cycles_to_die: number
live_count_since_last_check: number
checks_without_cycle_decrement: number
free(): void;
static  new(): VirtualMachine;

 size(): number;

 memory(): number;

 process_count(): number;

 process_pc(arg0: number): number;

 tick(): void;

}
