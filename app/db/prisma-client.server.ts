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
  // TODO: ssl? https://www.prisma.io/docs/concepts/database-connectors/mysql#configuring-an-ssl-connection
  const { user, password, host, port, database } =
    KNEX_CONFIG.connection as any;
  const url = `mysql://${user}:${password}@${host}:${port}/${database}`;
  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
}
