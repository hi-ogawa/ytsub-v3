type Key =
  | "NODE_ENV"
  | "APP_MYSQL_HOST"
  | "APP_MYSQL_PORT"
  | "APP_MYSQL_USER"
  | "APP_MYSQL_PASSWORD"
  | "APP_MYSQL_DATABASE"
  | "APP_MYSQL_SSL"
  | "APP_SESSION_SECRET";

declare const env: Record<Key, string>;

export default env;
