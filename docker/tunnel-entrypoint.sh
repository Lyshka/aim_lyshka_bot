#!/bin/sh
set -e

TARGET_URL="${TUNNEL_TARGET:-http://frontend:80}"
URL_FILE="${WEBAPP_URL_FILE:-/shared/webapp_url}"
mkdir -p "$(dirname "$URL_FILE")"
rm -f "$URL_FILE"

echo "Starting Cloudflare tunnel to $TARGET_URL"

cloudflared tunnel --no-autoupdate --url "$TARGET_URL" 2>&1 | while IFS= read -r line; do
  echo "$line"
  case "$line" in
    *trycloudflare.com*)
      url=$(printf '%s\n' "$line" | grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' | head -n1 || true)
      if [ -n "$url" ]; then
        current=""
        if [ -f "$URL_FILE" ]; then
          current=$(tr -d '[:space:]' < "$URL_FILE" || true)
        fi
        if [ "$url" != "$current" ]; then
          printf '%s' "$url" > "$URL_FILE"
          echo "Saved WEBAPP_URL=$url"
        fi
      fi
      ;;
  esac
done
