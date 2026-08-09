#!/usr/bin/env bash
# 3편: 클러스터 DNS와 ndots. 같은 Service의 표기 4종이 만드는 DNS 쿼리 수 차이와
# 외부 도메인 조회의 search 순회 증폭을 CoreDNS 쿼리 로그로 계수한다.
# 주의: 측정은 glibc 파드(client, node:24-slim)의 dns.lookup으로 한다.
#       dig는 기본으로 search를 타지 않아(+search 필요) 증폭이 재현되지 않는다.
#       CoreDNS log 플러그인은 측정 후 반드시 제거한다(성능 경고).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results

echo "# measured at $(date '+%F %T')" | tee results/dns-notations.txt

echo "--- [0] client 파드의 /etc/resolv.conf" | tee -a results/dns-notations.txt
kubectl exec client -- cat /etc/resolv.conf | tee -a results/dns-notations.txt

# [1] CoreDNS log 플러그인 켜기 (원본 백업)
kubectl -n kube-system get cm coredns -o yaml > results/coredns-cm-original.yaml
kubectl -n kube-system get cm coredns -o jsonpath='{.data.Corefile}' > /tmp/Corefile.orig
python3 - <<'PYEOF'
src = open('/tmp/Corefile.orig').read()
if '\n    log\n' not in src:
    src = src.replace('    errors\n', '    errors\n    log\n', 1)
open('/tmp/Corefile.log', 'w').write(src)
PYEOF
kubectl -n kube-system create configmap coredns --from-file=Corefile=/tmp/Corefile.log --dry-run=client -o yaml | kubectl -n kube-system apply -f -
kubectl -n kube-system rollout restart deploy/coredns
kubectl -n kube-system rollout status deploy/coredns --timeout=60s
sleep 3

# [2] 표기 4종 + 외부 도메인을 순서대로 조회 (사이에 마커 시각 기록)
run_lookup() {
  local label="$1" name="$2"
  echo "MARK $(date '+%T.%3N' 2>/dev/null || perl -MTime::HiRes=time -e 'my @t=localtime; printf("%02d:%02d:%06.3f", $t[2],$t[1],time()%60)') $label" >> results/dns-notations.txt
  kubectl exec client -- node -e "
    const dns = require('node:dns')
    const s = process.hrtime.bigint()
    dns.lookup('$name', {all: false}, (err, addr) => {
      const ms = Number(process.hrtime.bigint() - s) / 1e6
      console.log(JSON.stringify({name: '$name', addr: addr || null, err: err?.code || null, ms: Math.round(ms * 100) / 100}))
    })" | tee -a results/dns-notations.txt
  sleep 2
}

echo "--- [2] 표기별 dns.lookup (glibc getaddrinfo 경유)" | tee -a results/dns-notations.txt
run_lookup shortname            "internal-api"
run_lookup ns-qualified         "internal-api.default"
run_lookup full-fqdn-no-dot     "internal-api.default.svc.cluster.local"
run_lookup full-fqdn-with-dot   "internal-api.default.svc.cluster.local."
run_lookup external-2dots       "www.example.com"
run_lookup external-with-dot    "www.example.com."

# [3] dig의 함정: 기본은 search를 안 탄다 (debug 파드)
{
  echo "--- [3] dig 기본 vs +search (debug 파드)"
  echo "\$ dig internal-api +short (기본: 절대 이름으로만 시도)"
  kubectl exec debug -- dig internal-api +short +time=2 +tries=1 || true
  kubectl exec debug -- sh -c 'dig internal-api +time=2 +tries=1 | grep -E "status|QUESTION" -A1 | head -4' || true
  echo "\$ dig +search internal-api +short (search 목록 사용)"
  kubectl exec debug -- dig +search internal-api +short || true
} | tee -a results/dns-notations.txt

# [4] ExternalName: 실체는 CNAME 한 줄
{
  echo "--- [4] ExternalName Service의 정체 (dig +search external-api)"
  kubectl exec debug -- sh -c 'dig +search external-api | grep -E "CNAME|IN A" | head -4' || true
  echo "--- [4b] https로 부르면 인증서 이름 불일치 (client 파드, node fetch)"
  kubectl exec client -- node -e "
    fetch('https://external-api.default.svc.cluster.local/')
      .then((r) => console.log('status', r.status))
      .catch((e) => console.log('FAIL', e.cause?.code || e.cause?.message || e.message))" || true
} | tee -a results/dns-notations.txt

sleep 2

# [5] CoreDNS 쿼리 로그 수집 (파드 2개 모두, 타임스탬프 포함)
kubectl -n kube-system logs -l k8s-app=kube-dns --prefix --timestamps --tail=2000 > results/dns-coredns-query-log.txt 2>/dev/null || true

# [6] log 플러그인 제거 (원상 복구)
kubectl -n kube-system create configmap coredns --from-file=Corefile=/tmp/Corefile.orig --dry-run=client -o yaml | kubectl -n kube-system apply -f -
kubectl -n kube-system rollout restart deploy/coredns
kubectl -n kube-system rollout status deploy/coredns --timeout=60s
echo "done. coredns log restored." | tee -a results/dns-notations.txt
