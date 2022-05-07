export type SIMPLIFY<T> = { [K in keyof T]: T[K] };

export type FilterKeys<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type Except<T, K extends keyof T> = Omit<T, K>;

export type Replace<T extends Record<keyof U, any>, U> = Except<T, keyof U> & U;
