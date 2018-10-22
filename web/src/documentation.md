# Corewar

Corewar is a programming game involving between 2 and 4 players.  
Each player writes a **champion** (a program) that will fight to the death against the other players' champions inside a **virtual arena** (a virtual machine).  
The last champion alive in the arena wins the game for its player.

## The arena
The matches are played by a **V**irtual **M**achine with a circular memory buffer of **4096** bytes.  
Each player is assigned a unique **identifier**. Their champions are loaded in the memory at the start of the match. They are placed at equally spaced offsets.  
Each champion is assigned a starting **process**. Processes are composed of:

 - A **p**rogram **c**ounter (`pc`) that moves around the arena and point to specific memory locations
 - 16 registers that can each hold a 32bit value, labelled from `r1` to `r16`
 - A **z**ero **f**lag (`zf`) whose state depends on the result of some operations

The starting process of a champion has its `pc` set to the first byte of the champion's bytecode, its `zf` set to `0`, and all of its registers zeroed except `r1` that will contain the champion's player identifier.

A unit of time inside the arena is called a **cycle**. Every cycle, the virtual machine goes through all of the processes sequentially in the reverse order that they were spawned (the last spawned process is processed first) and gives them a fixed amount of CPU time. 

Processes can be in either one of two states:
 - `Idle`: in which case they're waiting to decode an instruction. This is the default state of newly spawned processes.
 - `Executing` an instruction: in which case they're waiting for a sufficient amount of CPU time to execute said instruction

When an `Idle` process is given a cycle worth of CPU time, it will attempt to decode part of the instruction pointed by its `pc`. Each instruction has an **opcode** and can be executed in a certain amount of cycles `n`. If the opcode pointed by the process' `pc` is valid, said process will enter the `Executing` state. If the opcode is invalid however, the process' will stay `Idle` and its `pc` will be moved to the next byte in memory.  
When an `Executing` process is given its `n`th cycle of CPU time, it will attempt to decode the rest of the instruction located at its current `pc`. If the instruction is valid, it will be executed and the process' `pc` will be moved by an amount of bytes equal to the size of the instruction decoded. If the instruction is invalid however, the process will go back to an `Idle` state and its `pc` will be moved to the next byte in memory.

After a given number of cycles, the VM performs a **live-check**. During this operation, every process that didn't report as being alive at least once between now and the last live-check is **killed**.  
The number of cycles before a live-check is determined by a `check interval` value which is initialized to `1536`.  
During a live-check, if the total number of live reports among all the processes is at least `21`, then the `check interval` will be decreased by `50`, otherwise the live-check is said to have *passed* and the interval is untouched. However, if `10` consecutive live-checks *pass*, then the interval will be decreased by `50` again.

The match ends when a live-check kills the last process alive. The winner is the last player who has been reported alive. 

⚠ Champions' processes can report any player to be alive, not exclusively their champion's player. See the `live` instruction for more information.

## The instructions
The VM supports 16 instructions.  
Instructions take between **1** and **3** parameters.  
Parameters can be one of three types:
 - `Register`: one of the 16 registers available
 - `Direct`: an immediate numeric value
 - `Indirect`: a pointer offset to a location in memory. the offset will be applied to the executing process' `pc` and the result will be used to address a 32bit value in memory.

⚠ For most instructions that perform addressing, the *reach* will be limited, in which case the `pc` offset will be wrapped within a `[-512, 512]` ring using a modulo operation. The only three instructions that have unlimited reach are referred to as **long** instructions.

Every instruction has an `opcode` and executes in a certain number of cycles.  
Some instructions can take different types of parameters and therefore need an additional **o**ctal **c**ode **p**oint (`ocp`) when encoded (more details in the encoding section).  
Some instructions have 16bit `Direct` values instead of 32bit.

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

Some instructions can affect the zero flag `zf` by either reading or computing a value. If the value is zero, `zf` is set to `1`, otherwise it is set to `0`.

Detailed behaviors for every instruction:

#### live
Reports this process as being alive **and** reports the player whose identifier is the first parameter of the instruction as being alive.

#### ld
*Load*s the value of the first parameter in the register specified by the second parameter. The value loaded affects `zf`.

#### st
*Store*s the value of the register specified by the first parameter at the location specified by the second parameter (either a register or a memory location).

#### add
Adds the value of the registers specified by the first two parameters and stores the result in the register specified by the thrid parameter. The computed value affects `zf`.

#### sub
Substracts the value of the register specified by the second parameter to the value of the register specified by the first parameter. Stores the result in the register specified by the thrid parameter. The computed value affects `zf`.

#### and
Computes the binary *and* of the values specified by the first two parameters and stores the result in the register specified bu the third parameter. The computed value affects `zf`.

#### or
Computes the binary *or* of the values specified by the first two parameters and stores the result in the register specified bu the third parameter. The computed value affects `zf`.

#### xor
Computes the binary *xor* of the values specified by the first two parameters and stores the result in the register specified bu the third parameter. The computed value affects `zf`.

#### zjmp
Moves the process' `pc` by an offset determined by the direct value of the first parameter **only** if the process' `zf` is `1`.

#### ldi
Adds the values specified by the first two parameters and use the result as an offset to address memory and load a 32bit value into the register specified by the third parameter.

#### sti
Adds the values specified by the 2nd and the 3rd parameters and use the result as an offset to address memory and store the value of the register specified by the first parameter at that memory location.

#### fork
*Fork*s this process. This effectively creates a new process that inherits the current process' registers and `zf`. The spawned process will have its `pc` set to his parent's `pc` offseted by the direct value specified by the first parameter. 

#### lld
The **long** version of **ld**.

#### lldi
The **long** version of **ldi**. Neither the parameter values or the computed address will have its reach limited. Contrary to **ldi**, the value loaded from memory will affect `zf`.

#### lfork
The **long** version of **fork**

#### aff (not yet implemented, subject to change)
Makes this process' champion talk by displaying a character whose value is determined by the register specified by the first parameter. This instruction is useful if you want to ridicule your opponents.


## Writing champions
Champions consist of bytecode generated from compiling programs written in the VM's assembly language.

### The assembly language
A champion's program consist of:
 - A name
 - A description
 - A sequence of instructions

The champion's name and description are set using the `.name` and `.comment` directives respectively.  
Instructions and directives are each placed on a single line, empty lines are allowed, token spacing works with any number of whitespace and you can start line comments by using the `#` character  
To create a champion called "John Cena", you could for instance start your program by writing:
```
.name    "John Cena"          # Champion's name
.comment "And his name is..." # Champion's description
```

Instructions are composed of a **mnemonic** followed by comma (`,`) separated parameters
 - `Register` parameters are valid register numbers prefixed by a `r` character. (e.g: `r12`)
 - `Direct` parameters are numbers (or labels, see below) prefixed by a `%` character. (e.g. `%1337`)
 - `Indirect` parameters are standalone numbers (or labels, see below). (e.g. `42`)

An instruction that *xor*s the memory value at offset 42 with the number 1337 and stored it in the 12th register could be written:
```
xor  42, %1337, r12    # r12 = mem[pc+42] ^ 1337
```

Instructions can be optionally preceded by **labels**.  
Labels are references to locations in your code. They can be used in parameters to help with offset computing and code readability.  
A label is declared as a colon (`:`) **suffixed** alphanumeric identifier, and referenced with its identifier **prefixed** by a colon.  
An infinite live loop could look like:
```
loop: live %1         # Stay alive
      and  r1, %0, r1 # Set zf = 1 to make sure the next zjmp takes effect
      zjmp %:loop     # Jump back to the start of the loop
```
When compiling this program, `%:loop` will be treated as `%-13` (the `live` and the `and` instructions are respectively 5 and 8 bytes long when encoded here)

### Bytecode generation
Compiling a program to bytecode is pretty straightforward.  
Compiled champions are made of two parts:
 - a `Header` containing the champion's name and description.
 - a `code section` containing each encoded instruction, in sequence.

Only the `code section` will be loaded into the arena as the `Header` is just there
to validate champions and provide metadata.

#### Header content
Headers contain 4 fields:
 - a 32bit magic number with the value `0x00EA_83F3`
 - an array of 128 + 1 bytes containing the 0-right-padded champion's name
 - a 32bit number with the size of the `code section` as its value
 - an array of 2048 + 1 btes containing the 0-right-padded champion's description

The header is *packed* and its total size will always be `2186` bytes

#### Code section
The code section is a *packed* array of bytes containing the bytes for every instruction.  
Instructions are encoded as a *packed* sequence of the following elements:
 - `opcode` on **1** byte
 - `ocp` on **1** byte (only if the instruction requires an octal code point)
 - parameters on a number of bytes depending on their types:
   - `Register`s on **1** byte, the value being the register number
   - `Direct` values on either **2** or **4** bytes depending on the instruction (see the instruction table in the earlier chapters)
   - `Indirect` values on **2** bytes

the `ocp` of an instruction is computed as the 0-right-padded bit concatenation of each parameter type's code point value:
 - **1** for `Register`s 
 - **2** for `Direct`s
 - **3** for `Indirect`s

For example:
```
xor     42,    %1337,    r12
#    indirect  direct  register
#       3        2        1
#      0b11     0b10     0b01
#      ocp = 0b11100100
#         == 0xE4 == 0d228

st      r1,      -5
#    register  indirect
#       1         3
#      0b01      0b11
#      ocp = 0b01110000
#         == 0x70 == 0d112
```

More examples of full instruction encoding:
```
xor  42, %1337, r12
# opcode = 0x08 (see table)
# ocp = 0xE4 (see above)
# param1 = 0x00 0x2A (indirect 42 on 2 bytes)
# param2 = 0x00 0x00 0x05 0x39 (direct 1337 on 4 bytes)
# param3 = 0x0C (register 12 on 1 byte)
# Full instruction = 0x08 0xE4 0x00 0x2A 0x00 0x00 0x05 0x39 0x0C (9 bytes)

live  %8
# opcode = 0x01 (see table)
# ocp = ø (see table)
# param1 = 0x00 0x00 0x00 0x08 (direct 8 on 4 bytes)
# Full instruction = 0x01 0x00 0x00 0x00 0x08 (5 bytes)

sti  r6, 22, %70
# opcode = 0x0B
# ocp = 0x78 (try to compute it yourself 🙂)
# param1 = 0x06
# param2 = 0x00 0x16
# param3 = 0x00 0x46 (sti has 16bit directs)
# Full instruction = 0x0B 0x78 0x06 0x00 0x16 0x00 0x46 (7 bytes)

# Full program = 0x08 0xE4 0x00 0x2A 0x00 0x00 0x05 0x39 0x0C 0x01 0x00 0x00 0x00 0x08 0x0B 0x78 0x06 0x00 0x16 0x00 0x46 (21 bytes)
```

Try to load the champion called `zork` and see if you understand its bytecode 🙂
