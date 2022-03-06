export async function fetchPlayerResponse(videoId: string): Promise<any> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url, { headers: { "accept-language": "en" } });
  if (res.ok) {
    return parsePlayerResponse(await res.text());
  }
  throw new Error("fetch failed");
}

export function parsePlayerResponse(html: string): any {
  // cf. https://github.com/ytdl-org/youtube-dl/blob/a7f61feab2dbfc50a7ebe8b0ea390bd0e5edf77a/youtube_dl/extractor/youtube.py#L283
  const match = html.match(/var ytInitialPlayerResponse = ({.+?});/);
  if (match && match[1]) {
    return JSON.parse(match[1]);
  }
  throw new Error("player response not found");
}
