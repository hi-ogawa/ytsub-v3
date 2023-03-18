import { toSetSetState } from "@hiogawa/utils-react";
import { SetStateAction, atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

const storageAtom = atomWithStorage(
  "video-subtitle-auto-scroll",
  Array<number>()
);

// sounds overkill but why not...
const storageSetAtom = atom(
  (get) => new Set(get(storageAtom)),
  (get, set, value: SetStateAction<Set<number>>) =>
    typeof value === "function"
      ? set(storageAtom, [...value(new Set(get(storageAtom)))])
      : set(storageAtom, [...value])
);

export function useAutoScrollState() {
  const [state, setState] = useAtom(storageSetAtom);
  return [state, toSetSetState(setState)] as const;
}
