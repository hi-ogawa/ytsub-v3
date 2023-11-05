import { T as TinyStoreApi } from './core-4aef5a83.js';
export { b as TinyStore, d as TinyStoreAdapter, c as createTinyStore, a as tinyStoreSelect, t as tinyStoreTransform } from './core-4aef5a83.js';

declare function createTinyStoreWithStorage<T>(key: string, defaultValue: T, parse?: (text: string, reviver?: ((this: any, key: string, value: any) => any) | undefined) => any, stringify?: {
    (value: any, replacer?: ((this: any, key: string, value: any) => any) | undefined, space?: string | number | undefined): string;
    (value: any, replacer?: (string | number)[] | null | undefined, space?: string | number | undefined): string;
}): TinyStoreApi<T>;

export { TinyStoreApi, createTinyStoreWithStorage };
