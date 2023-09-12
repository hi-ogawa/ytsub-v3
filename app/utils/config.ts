import process from "process";
import { setPublicConfig } from "./config-public";
import {
  ServerConfig,
  Z_PUBLIC_CONFIG,
  Z_SERVER_CONFIG,
} from "./config-schema";

export let serverConfig: ServerConfig;

export function initializeConfigServer() {
  serverConfig = Z_SERVER_CONFIG.parse(process.env);
  setPublicConfig(Z_PUBLIC_CONFIG.parse(process.env));
}
