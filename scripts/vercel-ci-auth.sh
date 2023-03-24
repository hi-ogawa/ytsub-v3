#!/bin/bash
set -eu -o pipefail

# based on https://github.com/hi-ogawa/unocss-preset-antd/blob/1e096a1e2b8bbf6193bb6f0fb33e225ca355fb6e/packages/app/misc/vercel/ci-setup.sh#L6-L15

config_dir="$HOME/.local/share/com.vercel.cli"
mkdir -p "$config_dir"
cat > "$config_dir/auth.json" <<EOF
{
  "token": "$VERCEL_TOKEN"
}
EOF
