#!/bin/bash
# Compares the frames either side of every cut. Identical frames mean no visible pop.
# Usage: tools/qa-seams.sh [width] [height] [gap in frames]
ab() { agent-browser --session seams "$@"; }
W=${1:-1440}; H=${2:-900}; GAP=${3:-0.08}
OUT=/private/tmp/portfolio-qa/seams-$W; rm -rf "$OUT"; mkdir -p "$OUT"
ab set viewport "$W" "$H" >/dev/null 2>&1
ab open "http://localhost:5173/?noboot" >/dev/null 2>&1
ab wait 1000 >/dev/null 2>&1
CUTS=$(ab eval "JSON.stringify([...new Set([...Object.values(window.__qa.cuts), ...window.__qa.eventCuts])].sort((a,b)=>a-b))" 2>&1 | tail -1 | tr -d '"[]\\' | tr ',' ' ')
for c in $CUTS; do
  for side in a b; do
    if [ $side = a ]; then f=$(echo "$c - $GAP" | bc -l); else f=$(echo "$c + $GAP" | bc -l); fi
    ab eval "window.__qa.seek($f); 1" >/dev/null 2>&1
    ab wait 180 >/dev/null 2>&1
    ab screenshot "$OUT/${c}_$side.png" >/dev/null 2>&1
  done
  s=$(ffmpeg -hide_banner -i "$OUT/${c}_a.png" -i "$OUT/${c}_b.png" -lavfi ssim -f null - 2>&1 | grep -oE 'All:[0-9.]+' | head -1)
  echo "f$c $s"
done
ab close >/dev/null 2>&1
