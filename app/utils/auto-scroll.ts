import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { toToggleArrayState } from "./misc";

const storageAtom = atomWithStorage(
  "video-subtitle-auto-scroll",
  Array<number>()
);

export function useAutoScrollState() {
  const [state, setState] = useAtom(storageAtom);
  return [state, toToggleArrayState(setState)] as const;
}
