#!/bin/bash
set -eu -o pipefail

# input
video_id="$1"
shift

# setup directly
out_dir="misc/youtube/data/$video_id"
mkdir -p "$out_dir"

# download "watch" page
echo "::"
echo ":: download watch page"
echo "::"
curl -H 'accept-language: en' "https://www.youtube.com/watch?v=$video_id" > "$out_dir/watch.html"

# parse "player response" metadata
python -c 'import re, sys; print(re.search("var ytInitialPlayerResponse = ({.+?});", sys.stdin.read()).group(1))' < "$out_dir/watch.html" \
  | jq > "$out_dir/player-response.json"

# list captions
echo "::"
echo ":: caption list"
echo "::"
jq -r '.captions.playerCaptionsTracklistRenderer.captionTracks' "$out_dir/player-response.json"

# download ttml
while [ $# -gt 0 ]; do
  arg="$1";
  shift
  # shellcheck disable=SC2206
  arg_split=(${arg//--/ })
  language_code="${arg_split[0]}"
  translation="${arg_split[1]:-}"
  url=$(jq -r ".captions.playerCaptionsTracklistRenderer.captionTracks | map(select(.languageCode == \"$language_code\"))[0].baseUrl" "$out_dir/player-response.json")
  url="$url&fmt=ttml"
  if [ -n "$translation" ]; then
    url="$url&tlang=$translation"
  fi
  echo "::"
  echo ":: downloading (language_code = '$language_code', translation = '$translation') ..."
  echo "::"
  curl "$url" > "$out_dir/catpion-$arg.ttml"
done
