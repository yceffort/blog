#!/bin/zsh
cd /private/tmp/claude-501/-Users-yceffort-private-blog/4d9eeeca-58df-4cde-9601-78b2118af8da/scratchpad
while pgrep -f runall.sh > /dev/null; do sleep 10; done
git -C /Users/yceffort/private/blog status --short apps/blog/public/sw.js
rm -f runs-sw-cpu6.jsonl runs-nosw-cpu6.jsonl
for i in {1..10}; do
  CPU=6 node measure-cpu.cjs sw 1 sw-cpu6 2>&1 | tail -1
  CPU=6 node measure-cpu.cjs nosw 1 nosw-cpu6 2>&1 | tail -1
done
echo "phase3 done"
