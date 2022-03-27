import { describe, expect, it } from "@jest/globals";
import { ttmlToEntries } from "../youtube";

describe("ttmlToEntries", () => {
  it("basic", async () => {
    const ttml = `
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
          <p begin="00:00:05.280" end="00:00:07.650" style="s2">Bienvenue dans ce format de vidéo où nous</p>
          <p begin="00:00:07.680" end="00:00:11.780" style="s2">voyons en quelques minutes<br />une expression française.</p>
        </div>
      </body>
    </tt>
    `;
    const result = ttmlToEntries(ttml);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "begin": 5.28,
          "end": 7.65,
          "text": "Bienvenue dans ce format de vidéo où nous",
        },
        Object {
          "begin": 7.68,
          "end": 11.78,
          "text": "voyons en quelques minutes une expression française.",
        },
      ]
    `);
  });
});
