#!/bin/zsh
set -u
cd /private/tmp/claude-501/-Users-yceffort-private-blog/4d9eeeca-58df-4cde-9601-78b2118af8da/scratchpad
SW=/Users/yceffort/private/blog/apps/blog/public/sw.js
trap 'git -C /Users/yceffort/private/blog checkout -- apps/blog/public/sw.js; echo restored' EXIT
rm -f runs-sw.jsonl runs-nosw.jsonl runs-sw-nopreload.jsonl
for i in {1..25}; do
  node measure.cjs sw 1 sw 2>&1 | tail -1
  node measure.cjs nosw 1 nosw 2>&1 | tail -1
done
echo "phase1 done"
sed -i '' 's|self.registration.navigationPreload?.enable(),|undefined, // preload off (lab)|' "$SW"
curl -s http://localhost:3100/sw.js | grep -c "preload off (lab)"
for i in {1..25}; do
  node measure.cjs sw 1 sw-nopreload 2>&1 | tail -1
done
echo "phase2 done"
