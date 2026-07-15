#!/bin/sh
set -e

URL_FILE="${WEBAPP_URL_FILE:-/shared/webapp_url}"

echo "Waiting for database..."
i=0
until npx prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 40 ]; then
    echo "Database is not ready"
    exit 1
  fi
  echo "Retry migrate deploy ($i)..."
  sleep 3
done

echo "Waiting for tunnel URL at $URL_FILE ..."
while [ ! -s "$URL_FILE" ]; do
  sleep 2
done

export WEBAPP_URL="$(tr -d '[:space:]' < "$URL_FILE")"
echo "Using WEBAPP_URL=$WEBAPP_URL"

exec node dist/main.js
