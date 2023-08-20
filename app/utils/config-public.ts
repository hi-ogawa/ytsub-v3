import type { PublicConfig } from "./config";
import { uninitialized } from "./misc";

// both client and server code can use it.
// server will hand-off to client via global script.

const PUBLIC_CONFIG_VAR = "__publicConfig";

export let publicConfig = uninitialized as PublicConfig;

export function initializePublicConfigServer(v: PublicConfig) {
  publicConfig = v;
}

export function initializePublicConfigClient() {
  publicConfig = (window as any)[PUBLIC_CONFIG_VAR];
}

export function injectPublicConfigScript() {
  return `\
<script>
  window.${PUBLIC_CONFIG_VAR} = ${JSON.stringify(publicConfig)};
</script>
`;
}
