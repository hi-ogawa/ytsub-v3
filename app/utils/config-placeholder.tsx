import { CONFIG_SCRIPT_ID, CONFIG_SCRIPT_PLACEHOLDER } from "./config";

// split from config.ts to workaround playwright transpilation

// modified by server (injectConfigScript)
// read by client (initializeConfigClient)
export function ConfigScriptPlaceholder() {
  return (
    <script
      id={CONFIG_SCRIPT_ID}
      type="application/json"
      dangerouslySetInnerHTML={{ __html: CONFIG_SCRIPT_PLACEHOLDER }}
      suppressHydrationWarning
    />
  );
}
