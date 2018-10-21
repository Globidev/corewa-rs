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

When an `Idle` process is given a cycle worth of CPU time, it will attempt to decode part of the instruction pointed by its `pc`. Each instruction has an `opcode` and can be executed in a certain amount of cycles `n`. If the `opcode` pointed by the process' `pc` is valid, said process will enter the `Executing` state. If the `opcode` is invalid however, the process' will stay `Idle` and its `pc` will be moved to the next byte in memory.  
When an `Executing` process is given its `n`th cycle of CPU time, it will attempt to decode the rest of the instruction located at its current `pc`. If the instruction is valid, it will be executed and the process' `pc` will be moved by an amount of bytes equal to the size of the instruction decoded. If the instruction is invalid however, the process' will go back to an `Idle` state and its `pc` will be moved to the next byte in memory.



## Language Spec
detail the language, the encoding system
