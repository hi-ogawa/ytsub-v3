import { PublicConfig } from "./config-schema";

// both client and server code can use it.
// server will hand-off to client via global script.

const PUBLIC_CONFIG_VAR = "__publicConfig";

export let publicConfig: PublicConfig;

export function setPublicConfig(v: PublicConfig) {
  publicConfig = v;
}

export function initializePublicConfigClient() {
  publicConfig = (window as any)[PUBLIC_CONFIG_VAR];
}

export function generatePublicConfigScript() {
  return `\
window.${PUBLIC_CONFIG_VAR} = ${JSON.stringify(publicConfig)};
`;
}
