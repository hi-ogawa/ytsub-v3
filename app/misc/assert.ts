export class AssertError extends Error {}

// cf. https://github.com/DefinitelyTyped/DefinitelyTyped/blob/dac9b82160ab002f77a400383d2663c264041080/types/node/assert.d.ts#L12
export function assert(value: any, message?: string): asserts value {
  if (value) return;
  throw new AssertError(message);
}
