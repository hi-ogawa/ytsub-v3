export function createGetProxy(
  propHandler: (prop: string | symbol) => unknown
): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop, _receiver) {
        return propHandler(prop);
      },
    }
  );
}
