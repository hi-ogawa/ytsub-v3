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

export function cls(...args: unknown[]): string {
  return args.filter(Boolean).join(" ");
}

// TODO: to js-utils
export function newPromiseWithResolvers<T>() {
  let resolve!: (value: T) => void;
  let reject!: (value: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// TODO: to js-utils
export async function loadScript(src: string): Promise<void> {
  const { promise, resolve, reject } = newPromiseWithResolvers<void>();
  const el = document.createElement("script");
  el.src = src;
  el.async = true;
  el.addEventListener("load", () => resolve());
  el.addEventListener("error", reject);
  document.body.appendChild(el);
  await promise;
}
