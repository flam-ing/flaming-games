#!/bin/sh
# usage: sh scripts/play.sh [id ...] [--port N] [--humans N]  (wraps play.mjs with local Chrome + playwright-core)
cd "$(dirname "$0")/.." || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}" \
PW_MODULE="${PW_MODULE:-playwright-core}" \
node scripts/play.mjs "$@"
