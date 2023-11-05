interface TinyStoreApi<T, RO extends boolean = false> {
    get: () => T;
    set: RO extends true ? null : (newValue: SetAction<T>) => void;
    subscribe: (onStoreChange: () => void) => () => void;
}
declare function tinyStoreTransform<T1, T2>(store: TinyStoreApi<T1>, decode: (v1: T1) => T2, encode: (v2: T2) => T1): TinyStoreApi<T2>;
declare function tinyStoreSelect<T1, T2>(store: Omit<TinyStoreApi<T1>, "set">, decode: (v: T1) => T2): TinyStoreApi<T2, true>;
declare function createTinyStore<T>(defaultValue: T): TinyStoreApi<T>;
declare class TinyStore<T> implements TinyStoreApi<T> {
    private adapter;
    private listeners;
    constructor(adapter: TinyStoreAdapter<T>);
    get: () => T;
    set: (action: SetAction<T>) => void;
    subscribe: (listener: () => void) => () => void;
    protected notify: () => void;
}
type SetAction<T> = T | ((prev: T) => T);
interface TinyStoreAdapter<T> {
    get: () => T;
    set: (value: T) => void;
    subscribe?: (onStoreChange: () => void) => () => void;
}

export { TinyStoreApi as T, tinyStoreSelect as a, TinyStore as b, createTinyStore as c, TinyStoreAdapter as d, tinyStoreTransform as t };
