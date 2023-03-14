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

export function fromEntries<K extends string, V>(
  entries: [K, V][]
): Record<K, V> {
  return Object.fromEntries(entries) as any;
}

//
// Proxy to warn unexpected access
//

export const throwGetterProxy = new Proxy(
  {},
  {
    get: (_target, p) => {
      console.error("throwGetterProxy", p);
      throw new Error(`throwGetterProxy: ` + p.toString());
    },
  }
);
