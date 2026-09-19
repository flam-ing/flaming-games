#!/bin/sh
# usage: sh scripts/smoke.sh [id ...] [-p port]  — headless Chrome: console errors + title screenshot into scripts/out/
cd "$(dirname "$0")/.." || exit 1
PORT=8799; IDS=""
while [ $# -gt 0 ]; do case "$1" in -p) PORT=$2; shift 2;; *) IDS="$IDS $1"; shift;; esac; done
mkdir -p scripts/out
python3 -m http.server $PORT >/dev/null 2>&1 & PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT HUP INT TERM
sleep 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
fail=0
if [ -z "$IDS" ]; then FILES="index.html $(ls games/*.html | grep -v _template)"; else FILES=""; for i in $IDS; do FILES="$FILES games/$i.html"; done; fi
for f in $FILES; do
  n=$(basename "$f" .html)
  log=$("$CHROME" --headless=new --disable-gpu --window-size=1000,620 --virtual-time-budget=3000 --enable-logging=stderr --v=0 --screenshot="scripts/out/$n.png" "http://localhost:$PORT/$f" 2>&1 | grep -E 'CONSOLE|Uncaught|ReferenceError|TypeError|SyntaxError' | grep -v 'CVDisplayLink' | grep -v 'favicon')
  if [ -n "$log" ]; then echo "FAIL $f"; echo "$log"; fail=1; else echo "ok   $f"; fi
done
exit $fail
