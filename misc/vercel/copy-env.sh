#!/bin/bash
set -eu -o pipefail

# usage:
#   bash scripts/dotenv.sh .env.staging bash misc/vercel/copy-env.sh preview APP_CAPTCHA_SITE_KEY APP_CAPTCHA_SECRET_KEY
#   bash scripts/dotenv.sh .env.production bash misc/vercel/copy-env.sh production APP_CAPTCHA_SITE_KEY APP_CAPTCHA_SECRET_KEY

target="$1"
shift

for key in "${@}"; do
  value="${!key:-}"
  if [ -z "${NO_CONFIRM:-}" ]; then
    echo "::"
    echo ":: configuring '$key' on '$target'"
    echo "::"
    echo ""
    echo "$key=$value"
    echo ""
    echo -n ":: do you proceed? (y/n) "
    read -n 1 -r
    echo
    case "$REPLY" in
      y) ;;
      *)
        echo "skipped ($key)"
        echo ""
        continue
      ;;
    esac
  fi
  echo 'y' | vercel env rm "$key" "$target" || true
  echo -n "$value" | vercel env add "$key" "$target"
  echo ""
done
