import { T as TinyStoreApi } from './core-4aef5a83.js';

declare function useTinyStore<T, RO extends boolean>(store: TinyStoreApi<T, RO>): [T, TinyStoreApi<T, RO>["set"]];
declare function useTinyStoreStorage<T>(key: string, defaultValue: T): [T, (newValue: T | ((prev: T) => T)) => void];

export { useTinyStore, useTinyStoreStorage };
