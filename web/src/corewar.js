;(function() {
  var wasm
  const __exports = {}

  let cachedEncoder = new TextEncoder('utf-8')

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

  function passStringToWasm(arg) {
    const buf = cachedEncoder.encode(arg)
    const ptr = wasm.__wbindgen_malloc(buf.length)
    getUint8Memory().set(buf, ptr)
    return [ptr, buf.length]
  }
  /**
   * @param {string} arg0
   * @returns {VirtualMachine}
   */
  __exports.vm_from_code = function(arg0) {
    const [ptr0, len0] = passStringToWasm(arg0)
    try {
      return VirtualMachine.__wrap(wasm.vm_from_code(ptr0, len0))
    } finally {
      wasm.__wbindgen_free(ptr0, len0 * 1)
    }
  }

  let cachedDecoder = new TextDecoder('utf-8')

  function getStringFromWasm(ptr, len) {
    return cachedDecoder.decode(getUint8Memory().subarray(ptr, ptr + len))
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

  const __wbg_error_cc95a3d302735ca3_target = console.error

  __exports.__wbg_error_cc95a3d302735ca3 = function(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)

    varg0 = varg0.slice()
    wasm.__wbindgen_free(arg0, arg1 * 1)

    __wbg_error_cc95a3d302735ca3_target(varg0)
  }

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

    /**
     * @returns {number}
     */
    get cycles() {
      return wasm.__wbg_get_virtualmachine_cycles(this.ptr)
    }
    set cycles(arg0) {
      return wasm.__wbg_set_virtualmachine_cycles(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get last_live_check() {
      return wasm.__wbg_get_virtualmachine_last_live_check(this.ptr)
    }
    set last_live_check(arg0) {
      return wasm.__wbg_set_virtualmachine_last_live_check(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get cycles_to_die() {
      return wasm.__wbg_get_virtualmachine_cycles_to_die(this.ptr)
    }
    set cycles_to_die(arg0) {
      return wasm.__wbg_set_virtualmachine_cycles_to_die(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get live_count_since_last_check() {
      return wasm.__wbg_get_virtualmachine_live_count_since_last_check(this.ptr)
    }
    set live_count_since_last_check(arg0) {
      return wasm.__wbg_set_virtualmachine_live_count_since_last_check(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get checks_without_cycle_decrement() {
      return wasm.__wbg_get_virtualmachine_checks_without_cycle_decrement(this.ptr)
    }
    set checks_without_cycle_decrement(arg0) {
      return wasm.__wbg_set_virtualmachine_checks_without_cycle_decrement(this.ptr, arg0)
    }
    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeVirtualMachine(ptr)
    }
    /**
     * @returns {}
     */
    constructor() {
      this.ptr = wasm.virtualmachine_new()
    }
    /**
     * @returns {number}
     */
    size() {
      return wasm.virtualmachine_size(this.ptr)
    }
    /**
     * @returns {number}
     */
    process_count() {
      return wasm.virtualmachine_process_count(this.ptr)
    }
    /**
     * @param {number} arg0
     * @returns {number}
     */
    process_pc(arg0) {
      return wasm.virtualmachine_process_pc(this.ptr, arg0)
    }
    /**
     * @param {number} arg0
     * @returns {Cell}
     */
    cell_at(arg0) {
      return Cell.__wrap(wasm.virtualmachine_cell_at(this.ptr, arg0))
    }
    /**
     * @returns {string}
     */
    winner() {
      const retptr = globalArgumentPtr()
      wasm.virtualmachine_winner(retptr, this.ptr)
      const mem = getUint32Memory()
      const rustptr = mem[retptr / 4]
      const rustlen = mem[retptr / 4 + 1]
      if (rustptr === 0) return
      const realRet = getStringFromWasm(rustptr, rustlen).slice()
      wasm.__wbindgen_free(rustptr, rustlen * 1)
      return realRet
    }
    /**
     * @returns {boolean}
     */
    tick() {
      return wasm.virtualmachine_tick(this.ptr) !== 0
    }
  }
  __exports.VirtualMachine = VirtualMachine

  function isLikeNone(x) {
    return x === undefined || x === null
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

  function freeCell(ptr) {
    wasm.__wbg_cell_free(ptr)
  }
  /**
   */
  class Cell {
    static __wrap(ptr) {
      const obj = Object.create(Cell.prototype)
      obj.ptr = ptr

      return obj
    }

    /**
     * @returns {number}
     */
    get value() {
      return wasm.__wbg_get_cell_value(this.ptr)
    }
    set value(arg0) {
      return wasm.__wbg_set_cell_value(this.ptr, arg0)
    }
    /**
     * @returns {number}
     */
    get owner() {
      const retptr = globalArgumentPtr()

      wasm.__wbg_get_cell_owner(retptr, this.ptr)
      const present = getUint32Memory()[retptr / 4]
      const value = getInt32Memory()[retptr / 4 + 1]
      return present === 0 ? undefined : value
    }
    set owner(arg0) {
      return wasm.__wbg_set_cell_owner(
        this.ptr,
        !isLikeNone(arg0),
        isLikeNone(arg0) ? 0 : arg0
      )
    }
    free() {
      const ptr = this.ptr
      this.ptr = 0
      freeCell(ptr)
    }
  }
  __exports.Cell = Cell

  __exports.__wbindgen_throw = function(ptr, len) {
    throw new Error(getStringFromWasm(ptr, len))
  }

  function init(wasm_path) {
    const fetchPromise = fetch(wasm_path)
    let resultPromise
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      resultPromise = WebAssembly.instantiateStreaming(fetchPromise, {
        './corewar': __exports
      })
    } else {
      resultPromise = fetchPromise
        .then(response => response.arrayBuffer())
        .then(buffer => WebAssembly.instantiate(buffer, { './corewar': __exports }))
    }
    return resultPromise.then(({ instance }) => {
      wasm = init.wasm = instance.exports
      return
    })
  }
  self.wasm_bindgen = Object.assign(init, __exports)
})()
