import { routerFactory } from "./factory";
import { trpcRoutesDecks } from "./routes/decks";
import { trpcRoutesVideos } from "./routes/videos";

// intricate nested router is not necessary by manually "namespace"-ing procedure name
export const trpcApp = routerFactory({
  ...trpcRoutesDecks,
  ...trpcRoutesVideos,
});
