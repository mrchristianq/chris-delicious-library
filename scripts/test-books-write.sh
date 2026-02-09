#!/usr/bin/env bash
set -euo pipefail

# Quick verification for Books write endpoint.
# Usage:
#   scripts/test-books-write.sh "<google_books_volume_id>"
#
# Optional:
#   BOOKS_WRITE_URL="https://script.google.com/macros/s/.../exec" scripts/test-books-write.sh "<id>"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BOOKS_WRITE_URL="${BOOKS_WRITE_URL:-}"
if [[ -z "${BOOKS_WRITE_URL}" && -f "${ROOT_DIR}/.env.local" ]]; then
  BOOKS_WRITE_URL="$(grep -E '^NEXT_PUBLIC_BOOKS_WRITE_URL=' "${ROOT_DIR}/.env.local" | head -n 1 | cut -d '=' -f2- | sed 's/^"//;s/"$//')"
fi

if [[ -z "${BOOKS_WRITE_URL}" ]]; then
  echo "Error: BOOKS_WRITE_URL is not set and NEXT_PUBLIC_BOOKS_WRITE_URL was not found in .env.local"
  exit 1
fi

GOOGLE_BOOKS_VOLUME_ID="${1:-}"
if [[ -z "${GOOGLE_BOOKS_VOLUME_ID}" ]]; then
  echo "Usage: scripts/test-books-write.sh \"<google_books_volume_id>\""
  exit 1
fi

MARKER="test-from-curl-$(date +%s)"
echo "Posting test update to: ${BOOKS_WRITE_URL}"
echo "GoogleBooksVolumeId: ${GOOGLE_BOOKS_VOLUME_ID}"
echo "tags marker: ${MARKER}"

curl -sS -X POST "${BOOKS_WRITE_URL}" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"updateBook\",
    \"match\": {\"googleBooksVolumeId\": \"${GOOGLE_BOOKS_VOLUME_ID}\"},
    \"updates\": {\"tags\": \"${MARKER}\"}
  }"

echo
echo "Done. Check the Books sheet row for updated tags."
