#!/usr/bin/env bash
# Bouwt de overzetpagina en zet hem op https://mariusvanderkolk-arch.github.io/maatklaar-overzetten/
# (zelfde origin als de oude app, zodat de oude lokale gegevens leesbaar zijn). Zie src/lib/verhuizing.ts.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=mariusvanderkolk-arch/maatklaar-overzetten
VITE_OVERZETTEN=true VITE_BASE=/maatklaar-overzetten/ npx vite build >/dev/null
mv dist-overzetten/overzetten.html dist-overzetten/index.html
rm -f dist-overzetten/sw.js dist-overzetten/manifest.webmanifest
touch dist-overzetten/.nojekyll
TMP=$(mktemp -d)
cp -r dist-overzetten/. "$TMP"
cd "$TMP"
git init -q -b main
git add -A
git -c user.name="Marius van der Kolk" -c user.email="mariusvanderkolk-arch@users.noreply.github.com" commit -qm "Overzetpagina $(date +%F)"
git push -qf "https://github.com/$REPO.git" main
echo "Klaar: https://mariusvanderkolk-arch.github.io/maatklaar-overzetten/"
