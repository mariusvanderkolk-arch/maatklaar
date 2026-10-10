#!/usr/bin/env bash
# Zet de huidige main-code op de testlink voor aannemers:
#   https://mariusvanderkolk-arch.github.io/maatklaar-test/
# De repo maatklaar-test bouwt met dezelfde workflow; door de reponaam
# (eindigt op -test) wordt automatisch VITE_TEST_MODE=true gezet.
#
# Gebruik:  npm run publiceer:test            (pusht origin/main)
#           npm run publiceer:test -- <ref>   (pusht een andere branch/commit)
set -euo pipefail
REF="${1:-origin/main}"
TEST_REPO="https://github.com/mariusvanderkolk-arch/maatklaar-test.git"
git fetch -q origin
SHA="$(git rev-parse "$REF")"
echo "Publiceer $REF ($(git log -1 --format='%h %s' "$SHA")) naar de testlink…"
git push -f "$TEST_REPO" "$SHA:refs/heads/main"
echo "Klaar. Over ±1 minuut live op https://mariusvanderkolk-arch.github.io/maatklaar-test/"
