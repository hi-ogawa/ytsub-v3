import { tinyassert } from "@hiogawa/utils";
import { Window } from "happy-dom";

// not used yet
export async function scrapeColorCodedLyrics(url: string) {
  const res = await fetch(url);
  tinyassert(res.ok);
  const resText = await res.text();

  const window = new Window({
    settings: {
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
    },
  });
  Object.assign(window.document.defaultView, { console: createNoopProxy() }); // silence loading error log
  window.document.body.innerHTML = resText;

  function parseColumn(n: number) {
    const elements = window.document.querySelectorAll(
      `.wp-block-columns.are-vertically-aligned-top > .wp-block-column:nth-child(${n}) .wp-block-group p`
    );
    const lines = Array.from(elements).flatMap((p) =>
      Array.from(p.childNodes)
        .map((n) => n.textContent?.trim())
        .filter(Boolean)
    );
    return lines;
  }

  return [2, 3].map(parseColumn);
}

function createNoopProxy(): unknown {
  const proxy: any = new Proxy(() => {}, {
    get: () => proxy,
    set: () => false,
    apply: () => {},
  });
  return proxy;
}
