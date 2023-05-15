import { objectOmit, tinyassert, wrapPromise } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import {
  fetchCaptionEntries,
  fetchCaptionEntriesHalfManual,
  fetchVideoMetadata,
  ttmlToEntries,
  ttmlsToCaptionEntries,
} from "./youtube";

describe("fetchVideoMetadata", () => {
  it("basic", async () => {
    const res = await fetchVideoMetadata("EnPYXckiUVg");
    expect(res.videoDetails.title).toMatchInlineSnapshot(
      '"Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)"'
    );
    expect(res.playabilityStatus).toMatchInlineSnapshot(`
      {
        "playableInEmbed": true,
        "status": "OK",
      }
    `);
  });

  it("no-caption", async () => {
    // https://www.youtube.com/watch?v=s1FGPvIwrnY
    const res = await wrapPromise(fetchVideoMetadata("s1FGPvIwrnY"));
    tinyassert(res.ok);
    expect(res.value.captions).toMatchInlineSnapshot(`
      {
        "playerCaptionsTracklistRenderer": {
          "captionTracks": [],
        },
      }
    `);
    expect(res.value.playabilityStatus).toMatchInlineSnapshot(`
      {
        "playableInEmbed": true,
        "status": "OK",
      }
    `);
  });

  it("invalid-video-id", async () => {
    const res = await wrapPromise(fetchVideoMetadata("XXXXXXXXXXX"));
    expect(res).toMatchInlineSnapshot(`
      {
        "ok": false,
        "value": [ZodError: [
        {
          "code": "invalid_type",
          "expected": "object",
          "received": "undefined",
          "path": [
            "videoDetails"
          ],
          "message": "Required"
        },
        {
          "code": "invalid_type",
          "expected": "boolean",
          "received": "undefined",
          "path": [
            "playabilityStatus",
            "playableInEmbed"
          ],
          "message": "Required"
        }
      ]],
      }
    `);
  });

  it("iframe-embed-disabled", async () => {
    // https://www.youtube.com/watch?v=_TZN41ojF8A
    const res = await wrapPromise(fetchVideoMetadata("_TZN41ojF8A"));
    tinyassert(res.ok);
    expect(res.value.playabilityStatus).toMatchInlineSnapshot(`
      {
        "playableInEmbed": false,
        "status": "OK",
      }
    `);
  });

  it("captionTracks", async () => {
    const res = await fetchVideoMetadata("4gXmClk8rKI");
    const captionTracks =
      res.captions.playerCaptionsTracklistRenderer.captionTracks.map((c) =>
        objectOmit(c, ["baseUrl"])
      );
    expect(captionTracks).toMatchInlineSnapshot(`
      [
        {
          "languageCode": "zh",
          "vssId": ".zh",
        },
        {
          "languageCode": "en",
          "vssId": ".en",
        },
        {
          "languageCode": "id",
          "vssId": ".id",
        },
        {
          "languageCode": "ja",
          "vssId": ".ja",
        },
        {
          "languageCode": "ko",
          "vssId": ".ko",
        },
        {
          "kind": "asr",
          "languageCode": "ko",
          "vssId": "a.ko",
        },
        {
          "languageCode": "es",
          "vssId": ".es",
        },
        {
          "languageCode": "th",
          "vssId": ".th",
        },
      ]
    `);
  });
});

describe("fetchCaptionEntries", () => {
  it("basic", async () => {
    // https://www.youtube.com/watch?v=4gXmClk8rKI
    const entries = await fetchCaptionEntries({
      videoId: "4gXmClk8rKI",
      language1: { id: ".ko" },
      language2: { id: ".en" },
    });
    expect(entries.captionEntries.slice(0, 3)).toMatchInlineSnapshot(`
      [
        {
          "begin": 8.008,
          "end": 11.011,
          "index": 0,
          "text1": "Hey you 지금 뭐 해",
          "text2": "Hey you what you doin’",
        },
        {
          "begin": 11.545,
          "end": 13.51,
          "index": 1,
          "text1": "잠깐 밖으로 나올래",
          "text2": "Wanna come out for a sec",
        },
        {
          "begin": 13.646,
          "end": 15.549,
          "index": 2,
          "text1": "네가 보고 싶다고",
          "text2": "I wanna see you",
        },
      ]
    `);
  });

  it("translation", async () => {
    // https://www.youtube.com/watch?v=4gXmClk8rKI
    const entries = await fetchCaptionEntries({
      videoId: "4gXmClk8rKI",
      language1: { id: ".ko" },
      language2: { id: ".ko", translation: "en" },
    });
    expect(entries.captionEntries.slice(0, 3)).toMatchInlineSnapshot(`
      [
        {
          "begin": 8.008,
          "end": 11.011,
          "index": 0,
          "text1": "Hey you 지금 뭐 해",
          "text2": "Hey you, what are you doing right now? I want to",
        },
        {
          "begin": 11.545,
          "end": 13.51,
          "index": 1,
          "text1": "잠깐 밖으로 나올래",
          "text2": "go outside for a bit I miss you",
        },
        {
          "begin": 13.646,
          "end": 15.549,
          "index": 2,
          "text1": "네가 보고 싶다고",
          "text2": "",
        },
      ]
    `);
  });

  it("text1 can be empty", async () => {
    // https://www.youtube.com/watch?v=-UroBRG1rY8
    const entries = await fetchCaptionEntries({
      videoId: "-UroBRG1rY8",
      language1: { id: ".ko" },
      language2: { id: ".en" },
    });
    expect(entries.captionEntries.slice(0, 6)).toMatchInlineSnapshot(`
      [
        {
          "begin": 3.139,
          "end": 7.625,
          "index": 0,
          "text1": "",
          "text2": "Zombie biebiebie biebiebiebiebiebiebie",
        },
        {
          "begin": 7.626,
          "end": 9.441,
          "index": 1,
          "text1": "",
          "text2": "Zombie",
        },
        {
          "begin": 12.501,
          "end": 16.647,
          "index": 2,
          "text1": "달콤하고 잔인한 너의 그 맛 맛 맛 맛 맛",
          "text2": "Sweet and cruel, your taste taste taste taste taste",
        },
        {
          "begin": 16.648,
          "end": 18.781,
          "index": 3,
          "text1": "참을 수가 없어 널 보면",
          "text2": "I can't hold it when I see you",
        },
        {
          "begin": 18.782,
          "end": 20.849,
          "index": 4,
          "text1": "",
          "text2": "Cool down down down",
        },
        {
          "begin": 20.89,
          "end": 25.103,
          "index": 5,
          "text1": "너를 깜짝 놀라 켜 너 몰래 그림자놀이",
          "text2": "Surprising you, a shadow play in secret",
        },
      ]
    `);
    expect(entries.captionEntries.slice(38, 44)).toMatchInlineSnapshot(`
      [
        {
          "begin": 141.162,
          "end": 143.003,
          "index": 38,
          "text1": "여기 여기 붙어라",
          "text2": "Come gather around here",
        },
        {
          "begin": 143.102,
          "end": 145.36599999999999,
          "index": 39,
          "text1": "엄지를 붙여 모두 모여라",
          "text2": "Gather around with the thumbs together",
        },
        {
          "begin": 145.542,
          "end": 147.385,
          "index": 40,
          "text1": "꼭꼭 숨어라",
          "text2": "Hide well",
        },
        {
          "begin": 147.99,
          "end": 149.913,
          "index": 41,
          "text1": "",
          "text2": "PURPLE KISS Hide on Bloody top",
        },
        {
          "begin": 149.914,
          "end": 154.052,
          "index": 42,
          "text1": "-Zombie biebiebie biebiebiebiebiebiebie -여기 여기 붙어라 엄지를 붙여 모두 모여라",
          "text2": "-Zombie biebiebie biebiebiebiebiebiebie - Come gather around here, Gather around with the thumbs together",
        },
        {
          "begin": 154.183,
          "end": 161.138,
          "index": 43,
          "text1": "술래잡기를 시작해 이 밤",
          "text2": "Start the hide & seek on this night",
        },
      ]
    `);
  });
});

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
    const ttml1 = wrapTtml(`
      <p begin="00:01:36.600" end="00:01:41.930" style="s2">prendre un peu de temps pour soi<br />pour mieux analyser une situation.</p>
      <p begin="00:01:41.960" end="00:01:44.340" style="s2">Prendre du recul, ça permet en général de</p>
      <p begin="00:01:44.370" end="00:01:49.380" style="s2">relativiser une situation ou de se rendre<br />compte qu&#39;elle est moins grave que prévu.</p>
      <p begin="00:01:49.410" end="00:01:52.080" style="s2">Ou alors de pouvoir prendre une grande</p>
    `);
    const ttml2 = wrapTtml(`
      <p begin="00:01:36.710" end="00:01:41.930" style="s2">some time for yourself to<br />better analyze a situation.</p>
      <p begin="00:01:41.960" end="00:01:47.200" style="s2">Taking a step back usually allows you to<br />put a situation into perspective or to</p>
      <p begin="00:01:47.230" end="00:01:50.260" style="s2">realize that it is less<br />serious than expected.</p>
      <p begin="00:01:50.290" end="00:01:55.780" style="s2">Or to be able to make a big decision,<br />to change things in your life.</p>
    `);
    expect(ttmlsToCaptionEntries(ttml1, ttml2)).toMatchInlineSnapshot(`
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

  it("skip-empty", () => {
    const ttml1 = wrapTtml(`
      <p begin="1193:02:47.286" end="00:00:00.570" style="s2"></p>
      <p begin="00:00:00.000" end="00:00:00.570" style="s2">hello friends and welcome to a</p>
    `);
    const ttml2 = wrapTtml(`
      <p begin="1193:02:47.286" end="00:00:00.570" style="s2"></p>
      <p begin="00:00:00.000" end="00:00:00.570" style="s2">bonjour les amis et bienvenue dans un</p>
    `);
    expect(ttmlsToCaptionEntries(ttml1, ttml2)).toMatchInlineSnapshot(`
      [
        {
          "begin": 0,
          "end": 0.57,
          "index": 0,
          "text1": "hello friends and welcome to a",
          "text2": "bonjour les amis et bienvenue dans un",
        },
      ]
    `);
  });
});

describe(fetchCaptionEntriesHalfManual.name, () => {
  it("basic", async () => {
    // copied from https://lyricstranslate.com/en/twice-alcohol-free-lyrics.html
    const input = `\
너와 있을 땐 내게
신기한 변화가 있는데
자꾸 미소 짓게 돼
아무 일도 없는데

자꾸 마법에 걸려
밤을 새워도 안 졸려
다른 생각 지워져
심장 소리는 커져
사랑이 참 쉬워져
그래서 빠지고 빠져 점점 너에게
That's what you do to me

나는 Alcohol free 근데 취해
마신 게 하나도 없는데
너와 있을 때마다 이래
날 보는 네 눈빛 때문에

너는 눈으로 마시는 내 Champagne, 내 Wine
내 Tequila, margarita
Mojito with lime
Sweet mimosa, pina colada

I'm drunk in you
I'm drunk in you

너는 정말 특별해
전혀 독하지 않은데
낮에 별이 뜨게 해
한 모금 마셨는데

자꾸 마법에 걸려
밤을 새워도 안 졸려
다른 생각 지워져
심장 소리는 커져
사랑이 참 쉬워져
그래서 빠지고 빠져 점점 너에게
That's what you do to me

나는 Alcohol free 근데 취해
마신 게 하나도 없는데
너와 있을 때마다 이래
날 보는 네 눈빛 때문에

Alcohol 도수는 완전 0.0%
근데 마실 때마다 자꾸 길을 잃어
자고 일어나도 깨지가 않아
근데 이 기분 싫지가 않아

Easy to the mouth and tummy
Like a drink made of honey
이 술 이름은 도대체 뭐니
Makes the whole world bright and sunny

나는 Alcohol free 근데 취해
마신 게 하나도 없는데
너와 있을 때마다 이래
날 보는 네 눈빛 때문에

너는 눈으로 마시는 내 Champagne, 내 Wine
내 Tequila, margarita
Mojito with lime
Sweet mimosa, pina colada

I'm drunk in you
I'm drunk in you
`;
    const { captionEntries } = await fetchCaptionEntriesHalfManual({
      videoId: "XA2YEHn-A8Q",
      language1: { id: ".ko", input },
      language2: { id: ".en" },
    });
    expect(captionEntries.slice(0, 4)).toMatchInlineSnapshot(`
      [
        {
          "begin": 8.896,
          "end": 13.884,
          "index": 0,
          "text1": "너와 있을 땐 내게",
          "text2": "When I am with you",
        },
        {
          "begin": 13.884,
          "end": 18.836,
          "index": 1,
          "text1": "신기한 변화가 있는데",
          "text2": "Something magical happens",
        },
        {
          "begin": 18.836,
          "end": 23.801,
          "index": 2,
          "text1": "자꾸 미소 짓게 돼",
          "text2": "I keep smiling for no reason",
        },
        {
          "begin": 23.801,
          "end": 28.752,
          "index": 3,
          "text1": "아무 일도 없는데",
          "text2": "Though there is nothing going on",
        },
      ]
    `);
    expect(captionEntries.slice(-6)).toMatchInlineSnapshot(`
      [
        {
          "begin": 187.073,
          "end": 190.887,
          "index": 48,
          "text1": "너는 눈으로 마시는 내 Champagne, 내 Wine",
          "text2": "You are my champagne, my wine I drink with my eyes",
        },
        {
          "begin": 190.887,
          "end": 193.223,
          "index": 49,
          "text1": "내 Tequila, margarita",
          "text2": "My tequila, margarita",
        },
        {
          "begin": 193.223,
          "end": 195.678,
          "index": 50,
          "text1": "Mojito with lime",
          "text2": "Mojito with lime",
        },
        {
          "begin": 195.678,
          "end": 198.15800000000002,
          "index": 51,
          "text1": "Sweet mimosa, pina colada",
          "text2": "Sweet mimosa, pina colada",
        },
        {
          "begin": 198.15800000000002,
          "end": 203.039,
          "index": 52,
          "text1": "I'm drunk in you",
          "text2": "I'm drunk in you",
        },
        {
          "begin": 203.039,
          "end": 206.239,
          "index": 53,
          "text1": "I'm drunk in you",
          "text2": "I'm drunk in you",
        },
      ]
    `);
  });
});
