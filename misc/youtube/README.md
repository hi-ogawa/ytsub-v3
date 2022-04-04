# youtube

```sh
# Example https://www.youtube.com/watch?v=_2FF6O6Z8Hc
video_id="MoH8Fk2K9bc"

# Download "watch" page
curl -H 'accept-language: en' "https://www.youtube.com/watch?v=$video_id" > "misc/youtube/data/$video_id.html"

# Parse "player response" metadata
python -c 'import re, sys; print(re.search("var ytInitialPlayerResponse = ({.+?});", sys.stdin.read()).group(1))' < "misc/youtube/data/$video_id.html" | jq > "misc/youtube/data/$video_id.json"

# Extract "language code" mapping
jq '.captions.playerCaptionsTracklistRenderer.translationLanguages | map({"\(.languageCode)": .languageName.simpleText}) | add' "misc/youtube/data/$video_id.json"

# List available captions
jq -r '.captions.playerCaptionsTracklistRenderer.captionTracks' "misc/youtube/data/$video_id.json"

# Download ttml files
curl "$(jq -r '.captions.playerCaptionsTracklistRenderer.captionTracks | .[1].baseUrl' "misc/youtube/data/$video_id.json")&fmt=ttml" > "misc/youtube/data/$video_id-fr-FR.ttml"
curl "$(jq -r '.captions.playerCaptionsTracklistRenderer.captionTracks | .[1].baseUrl' "misc/youtube/data/$video_id.json")&fmt=ttml&tlang=ru" > "misc/youtube/data/$video_id-fr-FR--ru.ttml"
```
