import { generateThemeScript } from "@hiogawa/theme-script";
import { injectPublicConfigScript, publicConfig } from "#utils/config-public";

// since we don't currently use remix's <Meta /> or <Links /> convention,
// we can render static document html only on server, which is probably common ssr practice.

export async function renderToDocument(ssrHtml: string, style: string) {
  // syntax highlight by https://github.com/mjbvz/vscode-comment-tagged-templates/
  return /* html */ `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${
      publicConfig.VERCEL_ENV === "preview" ? "[PREVIEW] Ytsub" : "Ytsub"
    }</title>
    <meta
      name="viewport"
      content="width=device-width, height=device-height, initial-scale=1.0"
    />
    <link rel="manifest" href="/manifest.json" />
    <link
        rel="icon"
        type="image/svg+xml"
        href="https://iconify-dark-hiro18181.vercel.app/icon/ri/translate-2"
    />
    <style>
      html,
      body,
      #root {
        height: 100%;
      }
    </style>
    ${style}
    ${generateThemeScript({ storageKey: "ytsub:theme" })}
    ${injectPublicConfigScript()}
  </head>
  <body>
    <div id="root">${ssrHtml}</div>
  </body>
</html>
`;
}
