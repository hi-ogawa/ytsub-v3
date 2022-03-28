const NODE_ENV = process.env.NODE_ENV ?? "development";

module.exports = {
  NODE_ENV,
  APP_MYSQL_HOST: process.env.APP_MYSQL_HOST ?? "localhost",
  APP_MYSQL_PORT: process.env.APP_MYSQL_PORT ?? "3306",
  APP_MYSQL_USER: process.env.APP_MYSQL_USER ?? "root",
  APP_MYSQL_PASSWORD: process.env.APP_MYSQL_PASSWORD ?? "password",
  APP_MYSQL_DATABASE: process.env.APP_MYSQL_DATABASE ?? `ytsub_${NODE_ENV}`,
  APP_MYSQL_SSL: process.env.APP_MYSQL_SSL ?? "",
  APP_SESSION_SECRET: process.env.APP_SESSION_SECRET ?? "__secret__",
};
