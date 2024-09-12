#!/bin/bash

# based on https://stackoverflow.com/questions/19331497/set-environment-variables-from-file-of-key-value-pairs

# usage:
#   bash scripts/dotenv.sh [dotenv-file] [command...]

# shellcheck disable=SC2046
env $(grep -v '^#' "$1") "${@:2}"
