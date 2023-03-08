import { PrismaClient } from "@prisma/client";
import KNEX_CONFIG from "./knexfile";

// reuse db client on dev reload

export let prismaClient: PrismaClient;

declare let globalThis: {
  __prismaClient: any;
};

if (!globalThis.__prismaClient) {
  globalThis.__prismaClient = createPrismaClient();
}
prismaClient = globalThis.__prismaClient;

function createPrismaClient() {
  // https://www.prisma.io/docs/concepts/database-connectors/mysql
  const { user, password, host, port, database, ssl } =
    KNEX_CONFIG.connection as any;
  const params = ssl ? "?sslaccept=strict" : "";
  const url = `mysql://${user}:${password}@${host}:${port}/${database}${params}`;
  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
}
