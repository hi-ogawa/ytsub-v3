// TODO: use utils

// Cf.
// https://github.com/nodejs/node/blob/a0461255c05c79cf6c78b967cf8f11167a5d06b4/lib/internal/assert/assertion_error.js#L328
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/dac9b82160ab002f77a400383d2663c264041080/types/node/assert.d.ts#L12
// https://github.com/chaijs/assertion-error/blob/08a1f16ece0c5d4b916c9ce1479a776df0e203e0/mod.ts#L10

export class AssertionError extends Error {
  constructor(message?: string, stackStartFunction?: Function) {
    super(message);
    if ("captureStackTrace" in Error) {
      Error.captureStackTrace(this, stackStartFunction ?? AssertionError);
    }
  }
}

// TODO: rename to tinyassert to avoid conflict when auto-completion
export function assert(value: any, message?: string): asserts value {
  if (value) return;
  throw new AssertionError(message, assert);
}
