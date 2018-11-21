;(function() {
  var wasm
  const __exports = {}

  let cachedTextDecoder = new TextDecoder('utf-8')

  let cachegetUint8Memory = null
  function getUint8Memory() {
    if (
      cachegetUint8Memory === null ||
      cachegetUint8Memory.buffer !== wasm.memory.buffer
    ) {
      cachegetUint8Memory = new Uint8Array(wasm.memory.buffer)
    }
    return cachegetUint8Memory
  }

  function getStringFromWasm(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len))
  }

  let cachedGlobalArgumentPtr = null
  function globalArgumentPtr() {
    if (cachedGlobalArgumentPtr === null) {
      cachedGlobalArgumentPtr = wasm.__wbindgen_global_argument_ptr()
    }
    return cachedGlobalArgumentPtr
  }

  let cachegetUint32Memory = null
  function getUint32Memory() {
    if (
      cachegetUint32Memory === null ||
      cachegetUint32Memory.buffer !== wasm.memory.buffer
    ) {
      cachegetUint32Memory = new Uint32Array(wasm.memory.buffer)
    }
    return cachegetUint32Memory
  }

  const stack = []

  const slab = [{ obj: undefined }, { obj: null }, { obj: true }, { obj: false }]

  function getObject(idx) {
    if ((idx & 1) === 1) {
      return stack[idx >> 1]
    } else {
      const val = slab[idx >> 1]

      return val.obj
    }
  }

  let slab_next = slab.length

  function dropRef(idx) {
    idx = idx >> 1
    if (idx < 4) return
    let obj = slab[idx]

    obj.cnt -= 1
    if (obj.cnt > 0) return

    // If we hit 0 then free up our space in the slab
    slab[idx] = slab_next
    slab_next = idx
  }

  function takeObject(idx) {
    const ret = getObject(idx)
    dropRef(idx)
    return ret
  }

  function passArray8ToWasm(arg) {
    const ptr = wasm.__wbindgen_malloc(arg.length * 1)
    getUint8Memory().set(arg, ptr / 1)
    return [ptr, arg.length]
  }

  let cachedTextEncoder = new TextEncoder('utf-8')

  function passStringToWasm(arg) {
    const buf = cachedTextEncoder.encode(arg)
    const ptr = wasm.__wbindgen_malloc(buf.length)
    getUint8Memory().set(buf, ptr)
    return [ptr, buf.length]
  }

  function getArrayU8FromWasm(ptr, len) {
    return getUint8Memory().subarray(ptr / 1, ptr / 1 + len)
  }
  /**
   * @param {string} arg0
   * @returns {Uint8Array}
   */
  __exports.compile_champion = function(arg0) {
    const [ptr0, len0] = passStringToWasm(arg0)
    const retptr = globalArgumentPtr()
    try {
      wasm.compile_champion(retptr, ptr0, len0)
      const mem = getUint32Memory()
      const rustptr = mem[retptr / 4]
      const rustlen = mem[retptr / 4 + 1]

      const realRet = getArrayU8FromWasm(rustptr, rustlen).slice()
      wasm.__wbindgen_free(rustptr, rustlen * 1)
      return realRet
    } finally {
      wasm.__wbindgen_free(ptr0, len0 * 1)
    }
  }

  let cachegetInt32Memory = null
  function getInt32Memory() {
    if (
      cachegetInt32Memory === null ||
      cachegetInt32Memory.buffer !== wasm.memory.buffer
    ) {
      cachegetInt32Memory = new Int32Array(wasm.memory.buffer)
    }
    return cachegetInt32Memory
  }

  function getArrayI32FromWasm(ptr, len) {
    return getInt32Memory().subarray(ptr / 4, ptr / 4 + len)
  }

  const __wbg_error_cc95a3d302735ca3_target = console.error

  __exports.__wbg_error_cc95a3d302735ca3 = function(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)

    varg0 = varg0.slice()
    wasm.__wbindgen_free(arg0, arg1 * 1)

    __wbg_error_cc95a3d302735ca3_target(varg0)
  }

  function freeChampionInfo(ptr) {
    wasm.__wbg_championinfo_free(ptr)
  }
  /**
   */
  class ChampionInfo {
    static __wrap(ptr) {
      const obj = Object.create(ChampionInfo.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeChampionInfo(ptr)
    }

    /**
     * @returns {number}
     */
    get process_count() {
      return wasm.__wbg_get_championinfo_process_count(this.ptr)
    }
    set process_count(arg0) {
      return wasm.__wbg_set_championinfo_process_count(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get last_live() {
      return wasm.__wbg_get_championinfo_last_live(this.ptr)
    }
    set last_live(arg0) {
      return wasm.__wbg_set_championinfo_last_live(this.ptr, arg0)
    }
  }
  __exports.ChampionInfo = ChampionInfo

  function addHeapObject(obj) {
    if (slab_next === slab.length) slab.push(slab.length + 1)
    const idx = slab_next
    const next = slab[idx]

    slab_next = next

    slab[idx] = { obj, cnt: 1 }
    return idx << 1
  }

  __exports.__wbg_region_new = function(ptr) {
    return addHeapObject(Region.__wrap(ptr))
  }

  function freeRegion(ptr) {
    wasm.__wbg_region_free(ptr)
  }
  /**
   */
  class Region {
    static __wrap(ptr) {
      const obj = Object.create(Region.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeRegion(ptr)
    }

    /**
     * @returns {number}
     */
    get from_row() {
      return wasm.__wbg_get_region_from_row(this.ptr)
    }
    set from_row(arg0) {
      return wasm.__wbg_set_region_from_row(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get from_col() {
      return wasm.__wbg_get_region_from_col(this.ptr)
    }
    set from_col(arg0) {
      return wasm.__wbg_set_region_from_col(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get to_row() {
      return wasm.__wbg_get_region_to_row(this.ptr)
    }
    set to_row(arg0) {
      return wasm.__wbg_set_region_to_row(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get to_col() {
      return wasm.__wbg_get_region_to_col(this.ptr)
    }
    set to_col(arg0) {
      return wasm.__wbg_set_region_to_col(this.ptr, arg0)
    }
  }
  __exports.Region = Region

  function freeVirtualMachine(ptr) {
    wasm.__wbg_virtualmachine_free(ptr)
  }
  /**
   */
  class VirtualMachine {
    static __wrap(ptr) {
      const obj = Object.create(VirtualMachine.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeVirtualMachine(ptr)
    }

    /**
     * @returns {number}
     */
    cycles() {
      return wasm.virtualmachine_cycles(this.ptr)
    }
    /**
     * @returns {number}
     */
    last_live_check() {
      return wasm.virtualmachine_last_live_check(this.ptr)
    }
    /**
     * @returns {number}
     */
    check_interval() {
      return wasm.virtualmachine_check_interval(this.ptr)
    }
    /**
     * @returns {number}
     */
    live_count_since_last_check() {
      return wasm.virtualmachine_live_count_since_last_check(this.ptr)
    }
    /**
     * @returns {number}
     */
    checks_without_cycle_decrement() {
      return wasm.virtualmachine_checks_without_cycle_decrement(this.ptr)
    }
    /**
     * @returns {boolean}
     */
    tick() {
      return wasm.virtualmachine_tick(this.ptr) !== 0
    }
    /**
     * @returns {number}
     */
    process_count() {
      return wasm.virtualmachine_process_count(this.ptr)
    }
    /**
     * @returns {number}
     */
    player_count() {
      return wasm.virtualmachine_player_count(this.ptr)
    }
    /**
     * @param {number} arg0
     * @returns {any}
     */
    player_info(arg0) {
      return takeObject(wasm.virtualmachine_player_info(this.ptr, arg0))
    }
    /**
     * @param {number} arg0
     * @returns {ChampionInfo}
     */
    champion_info(arg0) {
      return ChampionInfo.__wrap(wasm.virtualmachine_champion_info(this.ptr, arg0))
    }
    /**
     * @param {number} arg0
     * @returns {ProcessCollection}
     */
    processes_at(arg0) {
      return ProcessCollection.__wrap(wasm.virtualmachine_processes_at(this.ptr, arg0))
    }
    /**
     * @param {number} arg0
     * @returns {DecodeResult}
     */
    decode(arg0) {
      return DecodeResult.__wrap(wasm.virtualmachine_decode(this.ptr, arg0))
    }
    /**
     * @returns {Memory}
     */
    memory() {
      return Memory.__wrap(wasm.virtualmachine_memory(this.ptr))
    }
  }
  __exports.VirtualMachine = VirtualMachine

  function freeMemory(ptr) {
    wasm.__wbg_memory_free(ptr)
  }
  /**
   */
  class Memory {
    static __wrap(ptr) {
      const obj = Object.create(Memory.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeMemory(ptr)
    }

    /**
     * @returns {number}
     */
    get values_ptr() {
      return wasm.__wbg_get_memory_values_ptr(this.ptr)
    }
    set values_ptr(arg0) {
      return wasm.__wbg_set_memory_values_ptr(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get ages_ptr() {
      return wasm.__wbg_get_memory_ages_ptr(this.ptr)
    }
    set ages_ptr(arg0) {
      return wasm.__wbg_set_memory_ages_ptr(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get owners_ptr() {
      return wasm.__wbg_get_memory_owners_ptr(this.ptr)
    }
    set owners_ptr(arg0) {
      return wasm.__wbg_set_memory_owners_ptr(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get pc_count_ptr() {
      return wasm.__wbg_get_memory_pc_count_ptr(this.ptr)
    }
    set pc_count_ptr(arg0) {
      return wasm.__wbg_set_memory_pc_count_ptr(this.ptr, arg0)
    }
  }
  __exports.Memory = Memory

  __exports.__wbg_playerinfo_new = function(ptr) {
    return addHeapObject(PlayerInfo.__wrap(ptr))
  }

  function freePlayerInfo(ptr) {
    wasm.__wbg_playerinfo_free(ptr)
  }
  /**
   */
  class PlayerInfo {
    static __wrap(ptr) {
      const obj = Object.create(PlayerInfo.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freePlayerInfo(ptr)
    }

    /**
     * @returns {number}
     */
    get id() {
      return wasm.__wbg_get_playerinfo_id(this.ptr)
    }
    set id(arg0) {
      return wasm.__wbg_set_playerinfo_id(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get champion_size() {
      return wasm.__wbg_get_playerinfo_champion_size(this.ptr)
    }
    set champion_size(arg0) {
      return wasm.__wbg_set_playerinfo_champion_size(this.ptr, arg0)
    }
    /**
     * @returns {string}
     */
    champion_name() {
      const retptr = globalArgumentPtr()
      wasm.playerinfo_champion_name(retptr, this.ptr)
      const mem = getUint32Memory()
      const rustptr = mem[retptr / 4]
      const rustlen = mem[retptr / 4 + 1]

      const realRet = getStringFromWasm(rustptr, rustlen).slice()
      wasm.__wbindgen_free(rustptr, rustlen * 1)
      return realRet
    }
    /**
     * @returns {string}
     */
    champion_comment() {
      const retptr = globalArgumentPtr()
      wasm.playerinfo_champion_comment(retptr, this.ptr)
      const mem = getUint32Memory()
      const rustptr = mem[retptr / 4]
      const rustlen = mem[retptr / 4 + 1]

      const realRet = getStringFromWasm(rustptr, rustlen).slice()
      wasm.__wbindgen_free(rustptr, rustlen * 1)
      return realRet
    }
  }
  __exports.PlayerInfo = PlayerInfo

  function freeProcessCollection(ptr) {
    wasm.__wbg_processcollection_free(ptr)
  }
  /**
   */
  class ProcessCollection {
    static __wrap(ptr) {
      const obj = Object.create(ProcessCollection.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeProcessCollection(ptr)
    }

    /**
     * @returns {number}
     */
    len() {
      return wasm.processcollection_len(this.ptr)
    }
    /**
     * @param {number} arg0
     * @returns {ProcessInfo}
     */
    at(arg0) {
      return ProcessInfo.__wrap(wasm.processcollection_at(this.ptr, arg0))
    }
  }
  __exports.ProcessCollection = ProcessCollection

  function freeVMBuilder(ptr) {
    wasm.__wbg_vmbuilder_free(ptr)
  }
  /**
   */
  class VMBuilder {
    static __wrap(ptr) {
      const obj = Object.create(VMBuilder.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeVMBuilder(ptr)
    }

    /**
     * @returns {}
     */
    constructor() {
      this.ptr = wasm.vmbuilder_new()
    }
    /**
     * @param {number} arg0
     * @param {Uint8Array} arg1
     * @returns {VMBuilder}
     */
    with_player(arg0, arg1) {
      const ptr = this.ptr
      this.ptr = 0
      const [ptr1, len1] = passArray8ToWasm(arg1)
      return VMBuilder.__wrap(wasm.vmbuilder_with_player(ptr, arg0, ptr1, len1))
    }
    /**
     * @returns {VirtualMachine}
     */
    finish() {
      const ptr = this.ptr
      this.ptr = 0
      return VirtualMachine.__wrap(wasm.vmbuilder_finish(ptr))
    }
  }
  __exports.VMBuilder = VMBuilder

  function freeProcessInfo(ptr) {
    wasm.__wbg_processinfo_free(ptr)
  }
  /**
   */
  class ProcessInfo {
    static __wrap(ptr) {
      const obj = Object.create(ProcessInfo.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeProcessInfo(ptr)
    }

    /**
     * @returns {number}
     */
    get pid() {
      return wasm.__wbg_get_processinfo_pid(this.ptr)
    }
    set pid(arg0) {
      return wasm.__wbg_set_processinfo_pid(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get player_id() {
      return wasm.__wbg_get_processinfo_player_id(this.ptr)
    }
    set player_id(arg0) {
      return wasm.__wbg_set_processinfo_player_id(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get pc() {
      return wasm.__wbg_get_processinfo_pc(this.ptr)
    }
    set pc(arg0) {
      return wasm.__wbg_set_processinfo_pc(this.ptr, arg0)
    }
    /**
     * @returns {boolean}
     */
    get zf() {
      return wasm.__wbg_get_processinfo_zf(this.ptr) !== 0
    }
    set zf(arg0) {
      return wasm.__wbg_set_processinfo_zf(this.ptr, arg0 ? 1 : 0)
    }
    /**
     * @returns {number}
     */
    get last_live_cycle() {
      return wasm.__wbg_get_processinfo_last_live_cycle(this.ptr)
    }
    set last_live_cycle(arg0) {
      return wasm.__wbg_set_processinfo_last_live_cycle(this.ptr, arg0)
    }
    /**
     * @returns {any}
     */
    executing() {
      return takeObject(wasm.processinfo_executing(this.ptr))
    }
    /**
     * @returns {Int32Array}
     */
    registers() {
      const retptr = globalArgumentPtr()
      wasm.processinfo_registers(retptr, this.ptr)
      const mem = getUint32Memory()
      const rustptr = mem[retptr / 4]
      const rustlen = mem[retptr / 4 + 1]

      const realRet = getArrayI32FromWasm(rustptr, rustlen).slice()
      wasm.__wbindgen_free(rustptr, rustlen * 4)
      return realRet
    }
  }
  __exports.ProcessInfo = ProcessInfo

  __exports.__wbg_executingstate_new = function(ptr) {
    return addHeapObject(ExecutingState.__wrap(ptr))
  }

  function freeExecutingState(ptr) {
    wasm.__wbg_executingstate_free(ptr)
  }
  /**
   */
  class ExecutingState {
    static __wrap(ptr) {
      const obj = Object.create(ExecutingState.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeExecutingState(ptr)
    }

    /**
     * @returns {number}
     */
    get exec_at() {
      return wasm.__wbg_get_executingstate_exec_at(this.ptr)
    }
    set exec_at(arg0) {
      return wasm.__wbg_set_executingstate_exec_at(this.ptr, arg0)
    }
    /**
     * @returns {string}
     */
    op() {
      const retptr = globalArgumentPtr()
      wasm.executingstate_op(retptr, this.ptr)
      const mem = getUint32Memory()
      const rustptr = mem[retptr / 4]
      const rustlen = mem[retptr / 4 + 1]

      const realRet = getStringFromWasm(rustptr, rustlen).slice()
      wasm.__wbindgen_free(rustptr, rustlen * 1)
      return realRet
    }
  }
  __exports.ExecutingState = ExecutingState

  function freeDecodeResult(ptr) {
    wasm.__wbg_decoderesult_free(ptr)
  }
  /**
   */
  class DecodeResult {
    static __wrap(ptr) {
      const obj = Object.create(DecodeResult.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeDecodeResult(ptr)
    }

    /**
     * @returns {number}
     */
    byte_size() {
      return wasm.decoderesult_byte_size(this.ptr)
    }
    /**
     * @returns {string}
     */
    to_string() {
      const retptr = globalArgumentPtr()
      wasm.decoderesult_to_string(retptr, this.ptr)
      const mem = getUint32Memory()
      const rustptr = mem[retptr / 4]
      const rustlen = mem[retptr / 4 + 1]

      const realRet = getStringFromWasm(rustptr, rustlen).slice()
      wasm.__wbindgen_free(rustptr, rustlen * 1)
      return realRet
    }
  }
  __exports.DecodeResult = DecodeResult

  __exports.__wbg_compileerror_new = function(ptr) {
    return addHeapObject(CompileError.__wrap(ptr))
  }

  function freeCompileError(ptr) {
    wasm.__wbg_compileerror_free(ptr)
  }
  /**
   */
  class CompileError {
    static __wrap(ptr) {
      const obj = Object.create(CompileError.prototype)
      obj.ptr = ptr

      return obj
    }

    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeCompileError(ptr)
    }

    /**
     * @returns {string}
     */
    reason() {
      const retptr = globalArgumentPtr()
      wasm.compileerror_reason(retptr, this.ptr)
      const mem = getUint32Memory()
      const rustptr = mem[retptr / 4]
      const rustlen = mem[retptr / 4 + 1]

      const realRet = getStringFromWasm(rustptr, rustlen).slice()
      wasm.__wbindgen_free(rustptr, rustlen * 1)
      return realRet
    }
    /**
     * @returns {any}
     */
    region() {
      return takeObject(wasm.compileerror_region(this.ptr))
    }
  }
  __exports.CompileError = CompileError

  __exports.__wbindgen_rethrow = function(idx) {
    throw takeObject(idx)
  }

  __exports.__wbindgen_throw = function(ptr, len) {
    throw new Error(getStringFromWasm(ptr, len))
  }

  function init(path_or_module) {
    let instantiation
    const imports = { './corewar': __exports }
    if (path_or_module instanceof WebAssembly.Module) {
      instantiation = WebAssembly.instantiate(path_or_module, imports)
    } else {
      const data = fetch(path_or_module)
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        instantiation = WebAssembly.instantiateStreaming(data, imports)
      } else {
        instantiation = data
          .then(response => response.arrayBuffer())
          .then(buffer => WebAssembly.instantiate(buffer, imports))
      }
    }
    return instantiation.then(({ instance }) => {
      wasm = init.wasm = instance.exports
      return
    })
  }
  self.wasm_bindgen = Object.assign(init, __exports)
})()
