#!/bin/bash
# Contact sheet across film frames.
# Usage: tools/qa-sheet.sh <name> <cols> <mode> <frame> [frame...]
#   mode: film (scrubbed frames) or boot (autoplay intro frames)
# Env: QA_W, QA_H viewport size (default 1440x900), QA_URL, QA_SHOT_W thumbnail width.
set -u
name=$1; cols=$2; mode=$3; shift 3
W=${QA_W:-1440}; H=${QA_H:-900}; URL=${QA_URL:-http://localhost:5173/?noboot&hud}
SHOT_W=${QA_SHOT_W:-640}
OUT=/private/tmp/portfolio-qa/$name
rm -rf "$OUT"; mkdir -p "$OUT"
ab() { agent-browser --session pf "$@"; }

ab set viewport "$W" "$H" >/dev/null 2>&1
ab open "$URL" >/dev/null 2>&1
ab wait 900 >/dev/null 2>&1

i=0
for f in "$@"; do
  if [ "$mode" = "boot" ]; then
    ab eval "window.__qa.bootAt($f); 1" >/dev/null 2>&1
  else
    ab eval "window.__qa.seek($f); 1" >/dev/null 2>&1
  fi
  ab wait 160 >/dev/null 2>&1
  ab screenshot "$OUT/$(printf %03d $i).png" >/dev/null 2>&1
  i=$((i + 1))
done

rows=$(( (i + cols - 1) / cols ))
ffmpeg -v error -y -pattern_type glob -i "$OUT/*.png" \
  -vf "scale=${SHOT_W}:-2,tile=${cols}x${rows}:padding=6:color=0x444444" -frames:v 1 -q:v 3 "$OUT/sheet.jpg"
echo "$OUT/sheet.jpg"
