/* tslint:disable */
import * as wasm from './corewar_bg';

const TextEncoder = typeof self === 'object' && self.TextEncoder
    ? self.TextEncoder
    : require('util').TextEncoder;

let cachedEncoder = new TextEncoder('utf-8');

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

function passStringToWasm(arg) {

    const buf = cachedEncoder.encode(arg);
    const ptr = wasm.__wbindgen_malloc(buf.length);
    getUint8Memory().set(buf, ptr);
    return [ptr, buf.length];
}
/**
* @param {string} arg0
* @returns {VirtualMachine}
*/
export function vm_from_code(arg0) {
    const [ptr0, len0] = passStringToWasm(arg0);
    try {
        return VirtualMachine.__wrap(wasm.vm_from_code(ptr0, len0));

    } finally {
        wasm.__wbindgen_free(ptr0, len0 * 1);

    }

}

const stack = [];

function addBorrowedObject(obj) {
    stack.push(obj);
    return ((stack.length - 1) << 1) | 1;
}
/**
* @param {VirtualMachine} arg0
* @param {any} arg1
* @returns {void}
*/
export function render_on_canvas(arg0, arg1) {
    try {
        return wasm.render_on_canvas(arg0.ptr, addBorrowedObject(arg1));

    } finally {
        stack.pop();

    }

}

const __wbg_error_cc95a3d302735ca3_target = console.error;

const TextDecoder = typeof self === 'object' && self.TextDecoder
    ? self.TextDecoder
    : require('util').TextDecoder;

let cachedDecoder = new TextDecoder('utf-8');

function getStringFromWasm(ptr, len) {
    return cachedDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

export function __wbg_error_cc95a3d302735ca3(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);

    varg0 = varg0.slice();
    wasm.__wbindgen_free(arg0, arg1 * 1);

    __wbg_error_cc95a3d302735ca3_target(varg0);
}

const slab = [{ obj: undefined }, { obj: null }, { obj: true }, { obj: false }];

function getObject(idx) {
    if ((idx & 1) === 1) {
        return stack[idx >> 1];
    } else {
        const val = slab[idx >> 1];

        return val.obj;

    }
}

export function __widl_instanceof_CanvasRenderingContext2D(idx) {
    return getObject(idx) instanceof CanvasRenderingContext2D ? 1 : 0;
}

function GetOwnOrInheritedPropertyDescriptor(obj, id) {
    while (obj) {
        let desc = Object.getOwnPropertyDescriptor(obj, id);
        if (desc) return desc;
        obj = Object.getPrototypeOf(obj);
    }
    throw new Error(`descriptor for id='${id}' not found`);
}

const __widl_f_set_fill_style_CanvasRenderingContext2D_target = GetOwnOrInheritedPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle').set || function() {
    throw new Error(`wasm-bindgen: GetOwnOrInheritedPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle').set does not exist`);
};

export function __widl_f_set_fill_style_CanvasRenderingContext2D(arg0, arg1) {
    __widl_f_set_fill_style_CanvasRenderingContext2D_target.call(getObject(arg0), getObject(arg1));
}

const __widl_f_clear_rect_CanvasRenderingContext2D_target = CanvasRenderingContext2D.prototype.clearRect || function() {
    throw new Error(`wasm-bindgen: CanvasRenderingContext2D.prototype.clearRect does not exist`);
};

export function __widl_f_clear_rect_CanvasRenderingContext2D(arg0, arg1, arg2, arg3, arg4) {
    __widl_f_clear_rect_CanvasRenderingContext2D_target.call(getObject(arg0), arg1, arg2, arg3, arg4);
}

const __widl_f_fill_rect_CanvasRenderingContext2D_target = CanvasRenderingContext2D.prototype.fillRect || function() {
    throw new Error(`wasm-bindgen: CanvasRenderingContext2D.prototype.fillRect does not exist`);
};

export function __widl_f_fill_rect_CanvasRenderingContext2D(arg0, arg1, arg2, arg3, arg4) {
    __widl_f_fill_rect_CanvasRenderingContext2D_target.call(getObject(arg0), arg1, arg2, arg3, arg4);
}

const __widl_f_fill_text_with_max_width_CanvasRenderingContext2D_target = CanvasRenderingContext2D.prototype.fillText || function() {
    throw new Error(`wasm-bindgen: CanvasRenderingContext2D.prototype.fillText does not exist`);
};

let cachegetUint32Memory = null;
function getUint32Memory() {
    if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory;
}

let slab_next = slab.length;

function addHeapObject(obj) {
    if (slab_next === slab.length) slab.push(slab.length + 1);
    const idx = slab_next;
    const next = slab[idx];

    slab_next = next;

    slab[idx] = { obj, cnt: 1 };
    return idx << 1;
}

export function __widl_f_fill_text_with_max_width_CanvasRenderingContext2D(arg0, arg1, arg2, arg3, arg4, arg5, exnptr) {
    let varg1 = getStringFromWasm(arg1, arg2);
    try {
        __widl_f_fill_text_with_max_width_CanvasRenderingContext2D_target.call(getObject(arg0), varg1, arg3, arg4, arg5);
    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

const __widl_f_set_font_CanvasRenderingContext2D_target = GetOwnOrInheritedPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font').set || function() {
    throw new Error(`wasm-bindgen: GetOwnOrInheritedPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font').set does not exist`);
};

export function __widl_f_set_font_CanvasRenderingContext2D(arg0, arg1, arg2) {
    let varg1 = getStringFromWasm(arg1, arg2);
    __widl_f_set_font_CanvasRenderingContext2D_target.call(getObject(arg0), varg1);
}

const __widl_f_get_context_HTMLCanvasElement_target = HTMLCanvasElement.prototype.getContext || function() {
    throw new Error(`wasm-bindgen: HTMLCanvasElement.prototype.getContext does not exist`);
};

function isLikeNone(x) {
    return x === undefined || x === null;
}

export function __widl_f_get_context_HTMLCanvasElement(arg0, arg1, arg2, exnptr) {
    let varg1 = getStringFromWasm(arg1, arg2);
    try {

        const val = __widl_f_get_context_HTMLCanvasElement_target.call(getObject(arg0), varg1);
        return isLikeNone(val) ? 0 : addHeapObject(val);

    } catch (e) {
        const view = getUint32Memory();
        view[exnptr / 4] = 1;
        view[exnptr / 4 + 1] = addHeapObject(e);

    }
}

const __widl_f_width_HTMLCanvasElement_target = GetOwnOrInheritedPropertyDescriptor(HTMLCanvasElement.prototype, 'width').get || function() {
    throw new Error(`wasm-bindgen: GetOwnOrInheritedPropertyDescriptor(HTMLCanvasElement.prototype, 'width').get does not exist`);
};

export function __widl_f_width_HTMLCanvasElement(arg0) {
    return __widl_f_width_HTMLCanvasElement_target.call(getObject(arg0));
}

const __widl_f_height_HTMLCanvasElement_target = GetOwnOrInheritedPropertyDescriptor(HTMLCanvasElement.prototype, 'height').get || function() {
    throw new Error(`wasm-bindgen: GetOwnOrInheritedPropertyDescriptor(HTMLCanvasElement.prototype, 'height').get does not exist`);
};

export function __widl_f_height_HTMLCanvasElement(arg0) {
    return __widl_f_height_HTMLCanvasElement_target.call(getObject(arg0));
}

function freeVirtualMachine(ptr) {

    wasm.__wbg_virtualmachine_free(ptr);
}
/**
*/
export class VirtualMachine {

    static __wrap(ptr) {
        const obj = Object.create(VirtualMachine.prototype);
        obj.ptr = ptr;

        return obj;
    }

    /**
    * @returns {number}
    */
    get cycles() {
        return wasm.__wbg_get_virtualmachine_cycles(this.ptr);
    }
    set cycles(arg0) {
        return wasm.__wbg_set_virtualmachine_cycles(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get last_live_check() {
        return wasm.__wbg_get_virtualmachine_last_live_check(this.ptr);
    }
    set last_live_check(arg0) {
        return wasm.__wbg_set_virtualmachine_last_live_check(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get cycles_to_die() {
        return wasm.__wbg_get_virtualmachine_cycles_to_die(this.ptr);
    }
    set cycles_to_die(arg0) {
        return wasm.__wbg_set_virtualmachine_cycles_to_die(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get live_count_since_last_check() {
        return wasm.__wbg_get_virtualmachine_live_count_since_last_check(this.ptr);
    }
    set live_count_since_last_check(arg0) {
        return wasm.__wbg_set_virtualmachine_live_count_since_last_check(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get checks_without_cycle_decrement() {
        return wasm.__wbg_get_virtualmachine_checks_without_cycle_decrement(this.ptr);
    }
    set checks_without_cycle_decrement(arg0) {
        return wasm.__wbg_set_virtualmachine_checks_without_cycle_decrement(this.ptr, arg0);
    }
    free() {
        const ptr = this.ptr;
        this.ptr = 0;
        freeVirtualMachine(ptr);
    }
    /**
    * @returns {}
    */
    constructor() {
        this.ptr = wasm.virtualmachine_new();
    }
    /**
    * @returns {number}
    */
    size() {
        return wasm.virtualmachine_size(this.ptr);
    }
    /**
    * @returns {number}
    */
    memory() {
        return wasm.virtualmachine_memory(this.ptr);
    }
    /**
    * @returns {number}
    */
    process_count() {
        return wasm.virtualmachine_process_count(this.ptr);
    }
    /**
    * @param {number} arg0
    * @returns {number}
    */
    process_pc(arg0) {
        return wasm.virtualmachine_process_pc(this.ptr, arg0);
    }
    /**
    * @param {number} arg0
    * @returns {number}
    */
    cell_at(arg0) {
        return wasm.virtualmachine_cell_at(this.ptr, arg0);
    }
    /**
    * @param {number} arg0
    * @returns {void}
    */
    tick_n(arg0) {
        return wasm.virtualmachine_tick_n(this.ptr, arg0);
    }
    /**
    * @returns {void}
    */
    tick() {
        return wasm.virtualmachine_tick(this.ptr);
    }
}

function dropRef(idx) {

    idx = idx >> 1;
    if (idx < 4) return;
    let obj = slab[idx];

    obj.cnt -= 1;
    if (obj.cnt > 0) return;

    // If we hit 0 then free up our space in the slab
    slab[idx] = slab_next;
    slab_next = idx;
}

export function __wbindgen_object_drop_ref(i) {
    dropRef(i);
}

export function __wbindgen_string_new(p, l) {
    return addHeapObject(getStringFromWasm(p, l));
}

export function __wbindgen_number_get(n, invalid) {
    let obj = getObject(n);
    if (typeof(obj) === 'number') return obj;
    getUint8Memory()[invalid] = 1;
    return 0;
}

export function __wbindgen_is_null(idx) {
    return getObject(idx) === null ? 1 : 0;
}

export function __wbindgen_is_undefined(idx) {
    return getObject(idx) === undefined ? 1 : 0;
}

export function __wbindgen_boolean_get(i) {
    let v = getObject(i);
    if (typeof(v) === 'boolean') {
        return v ? 1 : 0;
    } else {
        return 2;
    }
}

export function __wbindgen_is_symbol(i) {
    return typeof(getObject(i)) === 'symbol' ? 1 : 0;
}

export function __wbindgen_string_get(i, len_ptr) {
    let obj = getObject(i);
    if (typeof(obj) !== 'string') return 0;
    const [ptr, len] = passStringToWasm(obj);
    getUint32Memory()[len_ptr / 4] = len;
    return ptr;
}

export function __wbindgen_throw(ptr, len) {
    throw new Error(getStringFromWasm(ptr, len));
}

