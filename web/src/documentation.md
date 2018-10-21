# Corewar

Corewar is a programming game involving between 2 and 4 players.  
Each player writes a **champion** (a program) that will fight to the death against the other players' champions inside a **virtual arena** (a virtual machine).  
The last champion alive in the arena wins the game for its player.

## The arena
The matches will be played by a **V**irtual **M**achine that has a circular memory buffer of **4096** bytes.  
Each player will be assigned a unique **identifier**. Their champions will be loaded in the memory at the start of the match. They will be placed at equally spaced offsets.  
Each champion is assigned a starting **process**. Processes are composed of:

 - A **p**rogram **c**ounter (`pc`) that will move around the arena and point to specific memory locations
 - 16 registers that can each hold a 32bit value, labelled from `r1` to `r16`
 - A **z**ero **f**lag (`zf`) whose state will depend on the result of some operations

The starting process of a champion will have its `pc` set to the first byte of the champion's bytecode, its `zf` set to `false`, and all of its registers zeroed except `r1` that will contain the champion's player identifier.

A unit of time inside the arena is called a **cycle**. Every cycle, the virtual machine will go through all of the processes sequentially in the reverse order that they were spawned (the last spawned process is processed first) and give them a fixed amount of CPU time. 

Processes can be in one of two states:
 - `Idle`: in which case they're waiting to decode an instruction. This is the default state of newly spawned processes.
 - `Executing` an instruction: in which case they're waiting for a sufficient amount of CPU time to execute said instruction

When an `Idle` process is given a cycle worth of CPU time, it will attempt to decode part of the instruction pointed by its `pc`. Each instruction has an **opcode** and can be executed in a certain amount of cycles `n`. If the opcode pointed by the process' `pc` is valid, said process will enter the `Executing` state. If the opcode is invalid however, the process' will stay `Idle` and its `pc` will be moved to the next byte in memory.  
When an `Executing` process is given its `n`th cycle of CPU time, it will attempt to decode the rest of the instruction located at its current `pc`. If the instruction is valid, it will be executed and the process' `pc` will be moved by an amount of bytes equal to the size of the instruction decoded. If the instruction is invalid however, the process will go back to an `Idle` state and its `pc` will be moved to the next byte in memory.

After a given number of cycles, the VM will perform a **live-check**. During this operation, every process that didn't report as being alive at least once between now and the last live-check will be **killed**.  
The number of cycles before a live-check is determined by a `check interval` value which is initialized to `1536`.  
During a live-check, if the total number of live reports among all the processes is at least `21`, then the `check interval` will be decreased by `50`, otherwise the live-check is said to have *passed* and the interval is untouched. However, if `10` consecutive live-checks *pass*, then the interval will be decreased by `50` too.

The match ends when a live-check kills the last process alive. The winner will be the last player who has been reported alive. 

⚠ Champions' processes can report any player to be alive, not exclusively their champion's player. See the `live` instruction for more information.

## Instructions
The VM supports 16 instructions.  
Instructions take between **1** and **3** parameters.  
Parameters can be one of three types:
 - `Register`: one of the 16 registers available
 - `Direct`: an immediate numeric value
 - `Indirect`: a pointer offset to a location in memory. the offset will be applied to the executing process' `pc` and the result will be used to address a 32bit value in memory.

⚠ For most instruction that perform addressing, the *reach* will be limited, in which case the `pc` offset will be wrapped within a `[-512, 512]` ring using a modulo operation. The only three instructions that have unlimited reach are referred to as **long** instructions.

Every instruction has an `opcode` and execute in a certain number of cycles.  
Some instructions can take different types of parameters and will therefore need an additional **o**ctal **c**ode **p**oint (`ocp`) when encoded (more details in the encoding section).  
Some instructions will have 16bit `Direct` values instead of 32bit.

The table below summarizes all those characterics for every instruction:

| mnemonic | opcode  | cycles | param 1 | param 2 | param 3 |  ocp  | Direct size |
| -------- | ------- | ------ | ------- | ------- | ------- | ----- | ----------- |
| live     | 1       | 10     | D       |         |         | ❌    | 32          |
| ld       | 2       | 5      | DI      | R       |         | ✔    | 32          |
| st       | 3       | 5      | R       | RI      |         | ✔    | 32          |
| add      | 4       | 10     | R       | R       | R       | ✔    | 32          |
| sub      | 5       | 10     | R       | R       | R       | ✔    | 32          |
| and      | 6       | 6      | RDI     | RDI     | R       | ✔    | 32          |
| or       | 7       | 6      | RDI     | RDI     | R       | ✔    | 32          |
| xor      | 8       | 6      | RDI     | RDI     | R       | ✔    | 32          |
| zjmp     | 9       | 20     | D       |         |         | ❌    | 16          |
| ldi      | 10      | 25     | RDI     | RD      | R       | ✔    | 16          |
| sti      | 11      | 25     | R       | RDI     | RD      | ✔    | 16          |
| fork     | 12      | 800    | D       |         |         | ❌    | 16          |
| lld      | 13      | 10     | DI      | R       |         | ✔    | 32          |
| lldi     | 14      | 50     | RDI     | RD      | R       | ✔    | 16          |
| lfork    | 15      | 1000   | D       |         |         | ❌    | 16          |
| aff      | 16      | 2      | R       |         |         | ✔    | 32          |

📝 **R** = `Register` **D** = `Direct` **I** = `Indirect`

Detailed behaviors for every instruction:

#### live
Reports this process as being alive **and** reports the player whose identifier is the first parameter of the instruction as being alive.

#### ld
*Load*s the value of the first parameter in the register specified by the second parameter. If the value loaded is 0, `zf` is set to `true`.

#### st
*Store*s the value of the register specified by the first parameter at the location specified by the second parameter (either a register or a memory location).

#### add
Adds the value of the registers specified by the first two parameters and stores the result in the register specified by the thrid parameter. If the computed value is 0, `zf` is set to `true`.

#### sub
Substracts the value of the register specified by the second parameter to the value of the register specified by the first parameter. Stores the result in the register specified by the thrid parameter. If the computed value is 0, `zf` is set to `true`.

#### and
Computes the binary *and* of the values specified by the first two parameters and stores the result in the register specified bu the third parameter. If the computed value is 0, `zf` is set to `true`.

#### or
Computes the binary *or* of the values specified by the first two parameters and stores the result in the register specified bu the third parameter. If the computed value is 0, `zf` is set to `true`.

#### xor
Computes the binary *xor* of the values specified by the first two parameters and stores the result in the register specified bu the third parameter. If the computed value is 0, `zf` is set to `true`.

#### zjmp
Moves the process' `pc` by an offset determined by the direct value of the first parameter **only** if the process' `zf` is `true`.

#### ldi
Adds the values specified by the first two parameters and use the result as an offset to address memory and load a 32bit value into the register specified by the third parameter.

#### sti
Adds the values specified by the 2nd and the 3rd parameters and use the result as an offset to address memory and store the value of the register specified by the first parameter at that memory location.

#### fork
*Fork*s this process. This effectively creates a new process that inherits the current process' registers and `zf`. The spawned process will have its `pc` set to his parent's `pc` offseted by the direct value specified by the first parameter. 

#### lld
The **long** version of **ld**.

#### lldi
The **long** version of **ldi**. Neither the parameter values or the computed address will have its reach limited. Contrary to **ldi**, this version will set `zf` to `true` if the value loaded from memory is 0

#### lfork
The **long** version of **fork**

#### aff (not yet implemented, subject to change)
Makes this process' champion talk by displaying a character whose value is determined by the register specified by the first parameter. This instruction is useful if you want to ridicule your opponents.


## The assembly language
TODO
