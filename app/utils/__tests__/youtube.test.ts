import { describe, expect, it } from "vitest";
import { ttmlToEntries, ttmlsToCaptionEntries } from "../youtube";

function wrapTtml(content: string): string {
  return `
    <?xml version="1.0" encoding="utf-8" ?>
    <tt xml:lang="fr-FR" xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ttp:profile="http://www.w3.org/TR/profile/sdp-us" >
      <head>
        <styling>
          <style xml:id="s1" tts:textAlign="center" tts:extent="90% 90%" tts:origin="5% 5%" tts:displayAlign="after"/>
          <style xml:id="s2" tts:fontSize=".72c" tts:backgroundColor="black" tts:color="white"/>
        </styling>
        <layout>
          <region xml:id="r1" style="s1"/>
        </layout>
      </head>
      <body region="r1">
        <div>
          ${content}
        </div>
      </body>
    </tt>
  `;
}

describe("ttmlToEntries", () => {
  it("basic", async () => {
    const ttml = wrapTtml(`
      <p begin="00:00:05.280" end="00:00:07.650" style="s2">Bienvenue dans ce format de vidéo où nous</p>
      <p begin="00:00:07.680" end="00:00:11.780" style="s2">voyons en quelques minutes<br />une expression française.</p>
      <p begin="00:00:11.810" end="00:00:16.980" style="s2">Alors aujourd&#39;hui, on va voir<br />l&#39;expression noyer le poisson.</p>
      <p begin="00:00:17.010" end="00:00:19.320" style="s2">Cette expression est un peu étrange parce</p>
      <p begin="00:00:19.350" end="00:00:22.660" style="s2">que noyer un poisson,<br />en fait, c&#39;est impossible.</p>
    `);
    const result = ttmlToEntries(ttml);
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "begin": 5.28,
          "end": 7.65,
          "text": "Bienvenue dans ce format de vidéo où nous",
        },
        {
          "begin": 7.68,
          "end": 11.78,
          "text": "voyons en quelques minutes une expression française.",
        },
        {
          "begin": 11.81,
          "end": 16.98,
          "text": "Alors aujourd'hui, on va voir l'expression noyer le poisson.",
        },
        {
          "begin": 17.01,
          "end": 19.32,
          "text": "Cette expression est un peu étrange parce",
        },
        {
          "begin": 19.35,
          "end": 22.66,
          "text": "que noyer un poisson, en fait, c'est impossible.",
        },
      ]
    `);
  });
});

describe("ttmlsToCaptionEntries", () => {
  it("overlap-intervals-heuristics", () => {
    const fr = wrapTtml(`
      <p begin="00:01:36.600" end="00:01:41.930" style="s2">prendre un peu de temps pour soi<br />pour mieux analyser une situation.</p>
      <p begin="00:01:41.960" end="00:01:44.340" style="s2">Prendre du recul, ça permet en général de</p>
      <p begin="00:01:44.370" end="00:01:49.380" style="s2">relativiser une situation ou de se rendre<br />compte qu&#39;elle est moins grave que prévu.</p>
      <p begin="00:01:49.410" end="00:01:52.080" style="s2">Ou alors de pouvoir prendre une grande</p>
    `);
    const en = wrapTtml(`
      <p begin="00:01:36.710" end="00:01:41.930" style="s2">some time for yourself to<br />better analyze a situation.</p>
      <p begin="00:01:41.960" end="00:01:47.200" style="s2">Taking a step back usually allows you to<br />put a situation into perspective or to</p>
      <p begin="00:01:47.230" end="00:01:50.260" style="s2">realize that it is less<br />serious than expected.</p>
      <p begin="00:01:50.290" end="00:01:55.780" style="s2">Or to be able to make a big decision,<br />to change things in your life.</p>
    `);
    expect(ttmlsToCaptionEntries(fr, en)).toMatchInlineSnapshot(`
      [
        {
          "begin": 96.6,
          "end": 101.93,
          "index": 0,
          "text1": "prendre un peu de temps pour soi pour mieux analyser une situation.",
          "text2": "some time for yourself to better analyze a situation.",
        },
        {
          "begin": 101.96000000000001,
          "end": 104.34,
          "index": 1,
          "text1": "Prendre du recul, ça permet en général de",
          "text2": "Taking a step back usually allows you to put a situation into perspective or to",
        },
        {
          "begin": 104.37,
          "end": 109.38,
          "index": 2,
          "text1": "relativiser une situation ou de se rendre compte qu'elle est moins grave que prévu.",
          "text2": "Taking a step back usually allows you to put a situation into perspective or torealize that it is less serious than expected.",
        },
        {
          "begin": 109.41,
          "end": 112.08,
          "index": 3,
          "text1": "Ou alors de pouvoir prendre une grande",
          "text2": "Or to be able to make a big decision, to change things in your life.",
        },
      ]
    `);
  });
});
