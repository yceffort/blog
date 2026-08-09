#!/usr/bin/env python3
# 5편: 스파이크 회차 분석기. 구간 분해 표와 p95 버킷을 출력한다.
# 사용: python3 analyze-spike.py <tag>
import re, sys, datetime, pathlib

tag = sys.argv[1]
R = pathlib.Path(__file__).parent.parent / "results"
load = (R / f"{tag}-load.txt").read_text().splitlines()
watch = (R / f"{tag}-watch.txt").read_text().splitlines()
timeline = (R / f"{tag}-timeline.txt").read_text()

T0 = next(int(l.split()[1]) for l in load if l.startswith("SPIKE"))
reqs = [l.split() for l in load if not l.startswith("SPIKE") and len(l.split()) == 5]

def iso2ms(s):
    return int(datetime.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp() * 1000)

# watch 파싱
W = []
for l in watch:
    m = re.match(r"(\d+) hpa=\[(\d*) ?(\d*)\] deploy=\[(\d*) ?(\d*)\]", l)
    if m:
        W.append((int(m.group(1)), *(int(g) if g else None for g in m.groups()[1:])))

def wfirst(pred, after=None):
    for w in W:
        if after and w[0] < after: continue
        try:
            if pred(w): return w[0]
        except TypeError: pass
    return None

t_util = wfirst(lambda w: w[2] is not None and w[2] > 70, after=T0 - 1000)
t_desired = wfirst(lambda w: w[1] is not None and w[1] > 3, after=T0 - 1000)

print(f"== {tag} ==")
print(f"T0(스파이크 시작): {T0}")
print(f"[감지] HPA 사용률>70% 첫 관찰: +{(t_util-T0)/1000:.1f}s" if t_util else "[감지] 사용률>70% 미관찰")
print(f"[판단] desired>3 첫 관찰: +{(t_desired-T0)/1000:.1f}s" if t_desired else "[판단] desired 변화 미관찰")

# ready 수 이정표
for n in (6, 9, 12):
    t = wfirst(lambda w, n=n: w[4] is not None and w[4] >= n, after=T0)
    if t: print(f"[기동] ready>={n}: +{(t-T0)/1000:.1f}s")

# 신규 파드: 생성/Ready/첫 트래픽
first_seen = {}
for r in reqs:
    pod = r[3]
    if pod != "-" and pod not in first_seen:
        first_seen[pod] = int(r[0])
print("[신규 파드] created → Ready → 첫 트래픽 (T0 기준 초)")
pod_lines = [l for l in timeline.splitlines() if l.startswith("autoscale-lab-")]
def parse_pod(l):
    name = l.split()[0]
    c = re.search(r"created=(\S+)", l)
    r = re.search(r"(?<![A-Za-z])Ready=(\S+)", l.replace("PodReadyToStartContainers=", "PRSC=").replace("ContainersReady=", "CR="))
    return name, c.group(1) if c else None, r.group(1) if r else None
for l in pod_lines:
    name, created, ready = parse_pod(l)
    if not created: continue
    cms = iso2ms(created)
    if cms < T0 - 2000: continue
    rms = iso2ms(ready) if ready else None
    fts = first_seen.get(name)
    row = f"  {name}: +{(cms-T0)/1000:.0f}s"
    row += f" → Ready +{(rms-T0)/1000:.0f}s" if rms else " → Ready ?"
    row += f" → 트래픽 +{(fts-T0)/1000:.1f}s" if fts else " → 트래픽 없음"
    print(row)

# p95 15초 버킷
ok = [(int(r[0]), int(r[4])) for r in reqs if r[1] == "OK"]
base = sorted(e for t, e in ok if t < T0)
bp95 = base[int(len(base) * 0.95)] if base else 0
print(f"[p95] 베이스라인: {bp95}ms")
buckets = {}
for t, e in ok:
    if t >= T0:
        buckets.setdefault((t - T0) // 15000, []).append(e)
rec = None
for b in sorted(buckets):
    xs = sorted(buckets[b])
    p = xs[int(len(xs) * 0.95)]
    flag = ""
    if rec is None and p <= max(bp95 * 1.5, bp95 + 20) and b > 0:
        rec = b; flag = "  <- 회복"
    print(f"  +{b*15}~{b*15+15}s: p95 {p}ms n={len(xs)}{flag}")
errs = [r for r in reqs if r[1] != "OK"]
print(f"[에러] {len(errs)}개 / 총 {len(reqs)}개")
if errs:
    from collections import Counter
    print("  유형:", dict(Counter(r[2] for r in errs)))
