import { type ConnectionOptions } from "mysql2";
import { serverConfig } from "#utils/config";

export function dbConfig() {
  return {
    host: serverConfig.APP_MYSQL_HOST,
    port: serverConfig.APP_MYSQL_PORT,
    user: serverConfig.APP_MYSQL_USER,
    password: serverConfig.APP_MYSQL_PASSWORD,
    database: serverConfig.APP_MYSQL_DATABASE,
    ssl: serverConfig.APP_MYSQL_SSL ? {} : undefined,
    multipleStatements: true,
    timezone: "+00:00", // planetscale and development mysql image have UTC localtime
  } satisfies ConnectionOptions;
}
