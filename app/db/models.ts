import { client } from "./client.server";

export interface UserTable {
  id: number;
  username: string;
  passwordHash: string; // TODO: hide this field from the client
  createdAt: Date;
  updatedAt: Date;
  language1?: string; // TODO: database returns `null`
  language2?: string;
}

// TODO:
// - view count
export interface VideoTable {
  id: number;
  videoId: string; // video's id on youtube
  language1_id: string;
  language1_translation?: string;
  language2_id: string;
  language2_translation?: string;
  title: string;
  author: string;
  channelId: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: number; // associated to anonymous users when `null`
}

export interface CaptionEntryTable {
  id: number;
  begin: number;
  end: number;
  text1: string;
  text2: string;
  createdAt: Date;
  updatedAt: Date;
  videoId: number; // not `VideoTable.videoId` but `VideoTable.id`
}

export const tables = {
  users: () => client<UserTable>("users"),
  videos: () => client<VideoTable>("videos"),
  captionEntries: () => client<CaptionEntryTable>("captionEntries"),
};
