export function mapOption<T, U>(
  x: T,
  f: (x: NonNullable<T>) => U
): U | undefined {
  if (x === null || typeof x === "undefined") {
    return undefined;
  }
  return f(x as NonNullable<T>);
}
