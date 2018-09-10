/* tslint:disable */
import * as wasm from './corewar_bg';
import { error_at } from './index';

const TextDecoder = typeof self === 'object' && self.TextDecoder
    ? self.TextDecoder
    : require('util').TextDecoder;

let cachedDecoder = new TextDecoder('utf-8');

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

function getStringFromWasm(ptr, len) {
    return cachedDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

export function __wbg_errorat_2a316cd95cc6ee03(arg0, arg1, arg2, arg3, arg4) {
    let varg0 = getStringFromWasm(arg0, arg1);
    error_at(varg0, arg2, arg3, arg4);
}

const TextEncoder = typeof self === 'object' && self.TextEncoder
    ? self.TextEncoder
    : require('util').TextEncoder;

let cachedEncoder = new TextEncoder('utf-8');

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
        return VirtualMachine.__construct(wasm.vm_from_code(ptr0, len0));
        
    } finally {
        wasm.__wbindgen_free(ptr0, len0 * 1);
        
    }
    
}

const __wbg_error_2c2dd5f14f439749_target = console.error;

export function __wbg_error_2c2dd5f14f439749(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);
    
    varg0 = varg0.slice();
    wasm.__wbindgen_free(arg0, arg1 * 1);
    
    __wbg_error_2c2dd5f14f439749_target(varg0);
}

class ConstructorToken {
    constructor(ptr) {
        this.ptr = ptr;
    }
}

function freeVirtualMachine(ptr) {
    
    wasm.__wbg_virtualmachine_free(ptr);
}
/**
*/
export class VirtualMachine {
    
    static __construct(ptr) {
        return new VirtualMachine(new ConstructorToken(ptr));
    }
    
    constructor(...args) {
        if (args.length === 1 && args[0] instanceof ConstructorToken) {
            this.ptr = args[0].ptr;
            return;
        }
        
        // This invocation of new will call this constructor with a ConstructorToken
        let instance = VirtualMachine.new(...args);
        this.ptr = instance.ptr;
        
    }
    /**
    * @returns {number}
    */
    get cycles() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_get_virtualmachine_cycles(this.ptr);
    }
    set cycles(arg0) {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_set_virtualmachine_cycles(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get last_live_check() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_get_virtualmachine_last_live_check(this.ptr);
    }
    set last_live_check(arg0) {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_set_virtualmachine_last_live_check(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get cycles_to_die() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_get_virtualmachine_cycles_to_die(this.ptr);
    }
    set cycles_to_die(arg0) {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_set_virtualmachine_cycles_to_die(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get live_count_since_last_check() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_get_virtualmachine_live_count_since_last_check(this.ptr);
    }
    set live_count_since_last_check(arg0) {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_set_virtualmachine_live_count_since_last_check(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get checks_without_cycle_decrement() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_get_virtualmachine_checks_without_cycle_decrement(this.ptr);
    }
    set checks_without_cycle_decrement(arg0) {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.__wbg_set_virtualmachine_checks_without_cycle_decrement(this.ptr, arg0);
    }
    free() {
        const ptr = this.ptr;
        this.ptr = 0;
        freeVirtualMachine(ptr);
    }
    /**
    * @returns {VirtualMachine}
    */
    static new() {
        return VirtualMachine.__construct(wasm.virtualmachine_new());
    }
    /**
    * @returns {number}
    */
    size() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.virtualmachine_size(this.ptr);
    }
    /**
    * @returns {number}
    */
    memory() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.virtualmachine_memory(this.ptr);
    }
    /**
    * @returns {number}
    */
    process_count() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.virtualmachine_process_count(this.ptr);
    }
    /**
    * @param {number} arg0
    * @returns {number}
    */
    process_pc(arg0) {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.virtualmachine_process_pc(this.ptr, arg0);
    }
    /**
    * @returns {void}
    */
    tick() {
        if (this.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        return wasm.virtualmachine_tick(this.ptr);
    }
}

export function __wbindgen_throw(ptr, len) {
    throw new Error(getStringFromWasm(ptr, len));
}

