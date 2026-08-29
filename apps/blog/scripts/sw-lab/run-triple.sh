#!/bin/zsh
cd /private/tmp/claude-501/-Users-yceffort-private-blog/4d9eeeca-58df-4cde-9601-78b2118af8da/scratchpad
SW=/Users/yceffort/private/blog/apps/blog/public/sw.js
trap 'git -C /Users/yceffort/private/blog checkout -- apps/blog/public/sw.js; echo restored' EXIT
node measure-bw.cjs nosw 10 nosw
node measure-bw.cjs sw 10 sw
sed -i '' 's|    event.waitUntil(savePageHTML(request, event.clientId))|    void 0 // savePageHTML off (lab)|' "$SW"
curl -s http://localhost:3100/sw.js | grep -c "savePageHTML off (lab)"
node measure-bw.cjs sw 10 sw-nosave
echo "TRIPLE DONE"
