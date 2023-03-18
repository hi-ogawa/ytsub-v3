import { atom, useAtom } from "jotai";

// TODO: persist to localstorage
const autoScrollStateAtom = atom(new Map<number, boolean>());

export function useAutoScrollState() {
  const [state, setState] = useAtom(autoScrollStateAtom);

  function enabled(id: number) {
    return Boolean(state.get(id));
  }

  function toggle(id: number) {
    setState((prev) => new Map([...prev, [id, !state.get(id)]]));
  }

  return { enabled, toggle };
}
