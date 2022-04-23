export function mapOption<T, U>(
  x: T,
  f: (x: NonNullable<T>) => U
): U | undefined {
  if (x === null || typeof x === "undefined") {
    return undefined;
  }
  return f(x as NonNullable<T>);
}

// E.g.
//  fetch("...").then(getCall("json"))
//  fetch("...").then(getCall("text"))
export function getCall<M extends string>(m: M) {
  return function <F extends () => any, T extends Record<M, F>>(
    t: T
  ): ReturnType<F> {
    return t[m]();
  };
}

export function isNullable<T>(value: T): value is T & (null | undefined) {
  return value === null || typeof value === "undefined";
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return !isNullable(value);
}

export type Result<T, E> = ResultOk<T> | ResultErr<E>;

interface ResultOk<T> {
  ok: true;
  data: T;
}

interface ResultErr<E> {
  ok: false;
  data: E;
}
