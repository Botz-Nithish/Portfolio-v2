#!/bin/bash
# Renders the PNG favicons from public/favicon.svg in a real browser.
# Usage: tools/favicon-png.sh, with the dev server running.
ab() { agent-browser --session favicon "$@"; }
public="$(cd "$(dirname "$0")/../public" && pwd)"
page=/tmp/favicon-page.html
for spec in "32 favicon-32.png" "180 apple-touch-icon.png"; do
  set -- $spec
  # Square and full bleed: browsers and iOS round the corners themselves.
  sed 's/rx="14"//' "$public/favicon.svg" > /tmp/favicon-square.svg
  echo "<!doctype html><style>html,body{margin:0;background:#0B0B0C}img{display:block;width:$1px;height:$1px}</style><img src='data:image/svg+xml;base64,$(base64 < /tmp/favicon-square.svg | tr -d '\n')'>" > "$page"
  ab set viewport "$1" "$1" >/dev/null 2>&1
  ab open "file://$page" >/dev/null 2>&1
  ab wait 200 >/dev/null 2>&1
  ab screenshot "$public/$2" >/dev/null 2>&1
done
ab close >/dev/null 2>&1
