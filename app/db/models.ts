import type { TT } from "./drizzle-client.server";

// TODO: organize code

export type UserTable = TT["users"];
export type VideoTable = TT["videos"];
export type CaptionEntryTable = TT["captionEntries"];
export type BookmarkEntryTable = TT["bookmarkEntries"];
export type DeckTable = TT["decks"];
export type PracticeEntryTable = TT["practiceEntries"];

export interface PaginationMetadata {
  total: number;
  totalPage: number;
  page: number;
  perPage: number;
}
