import { trpcRoutes } from "./routes.server";
import { t } from "./t.server";

// cf. https://trpc.io/docs/server/routers

export const trpcAppRouter = t.router(trpcRoutes);
