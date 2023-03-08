import { videos } from "@prisma/client";
import { VideoTable } from "./models";

export function compatVideoTable(data: videos): VideoTable {
  const { id, userId, language1_translation, language2_translation, ...rest } =
    data;
  return {
    id: Number(id),
    userId: userId ? Number(userId) : undefined,
    language1_translation: language1_translation ?? undefined,
    language2_translation: language1_translation ?? undefined,
    ...rest,
  };
}
