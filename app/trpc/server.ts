import { routerFactory } from "./factory";
import { trpcRoutesBookmarks } from "./routes/bookmarks";
import { trpcRoutesDecks } from "./routes/decks";
import { trpcRoutesUsers } from "./routes/users";
import { trpcRoutesVideos } from "./routes/videos";

// intricate nested router is not necessary by manually "namespace"-ing procedure name
export const trpcApp = routerFactory({
  ...trpcRoutesBookmarks,
  ...trpcRoutesUsers,
  ...trpcRoutesDecks,
  ...trpcRoutesVideos,
});
