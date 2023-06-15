import { wrapError } from "@hiogawa/utils";
import { z } from "zod";

export const Z_CAPTION_EDITOR_ENTRY = z.object({
  begin: z.number(),
  end: z.number(),
  endLocked: z.boolean(),
  text1: z.string(),
  text2: z.string(),
});

export type CaptionEditorEntry = z.infer<typeof Z_CAPTION_EDITOR_ENTRY>;

export function createDraftUtils(key: string) {
  const draftKey = `ytsub:useDraft:${key}`;

  function get(): CaptionEditorEntry[] | undefined {
    const item = window.localStorage.getItem(draftKey);
    if (item) {
      const parsed = wrapError(() =>
        Z_CAPTION_EDITOR_ENTRY.array().parse(JSON.parse(item))
      );
      if (parsed.ok) {
        return parsed.value;
      }
      console.error("createDraftUtils", parsed.value);
    }
    return;
  }

  function set(data: CaptionEditorEntry[]) {
    const item = JSON.stringify(data);
    window.localStorage.setItem(draftKey, item);
  }

  return { get, set };
}
