import type { TT } from "./drizzle-client.server";

// TODO
// for legacy reason, types are still re-exported in models.ts.
// maybe there is a better way to organize code.

export type UserTable = TT["users"];
export type VideoTable = TT["videos"];
export type CaptionEntryTable = TT["captionEntries"];
export type BookmarkEntryTable = TT["bookmarkEntries"];
export type DeckTable = TT["decks"];
export type PracticeEntryTable = TT["practiceEntries"];
