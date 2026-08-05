---
title: '내 Next.js 앱은 어떻게 파드가 되는가: 컨테이너와 파드를 직접 열어본 기록'
tags:
  - kubernetes
  - docker
  - nextjs
  - nodejs
  - frontend
published: true
date: 2026-08-05 21:00:00
description: '같은 Next.js 앱인데 이미지 하나는 1.72GB, 하나는 208MB였다. 사라진 1.5GB를 레이어에서 역추적하고, 컨테이너가 격리된 프로세스라는 것을 PID와 cgroup 파일로 직접 확인한다. 프론트엔드 개발자를 위한 쿠버네티스 시리즈의 두 번째 편이다.'
thumbnail: /thumbnails/2026/08/k8s-for-frontend-2.png
series: '프론트엔드 개발자가 알아야 할 쿠버네티스'
seriesOrder: 2
---

## Table of Contents

## 다섯 줄짜리 Dockerfile이 만든 1.72GB

처음 SSR 서비스를 컨테이너에 담던 때를 떠올려 보면, Dockerfile은 어딘가에서 복사해 온 것이었다. `FROM node`, `COPY . .`, `RUN npm ci`, `RUN npm run build`, `CMD npm start`. 다섯 줄이면 빌드가 됐고, 파이프라인에 태우니 배포도 됐고, 이미지가 얼마나 큰지는 들여다볼 이유가 없었다. 그 시절의 Dockerfile을 이 글의 예제 앱으로 그대로 재현해 빌드하면 1.72GB가 나온다. 예제 앱의 코드와 빌드 산출물은 다 합쳐도 42.5MB인데, 그 40배가 넘는 무언가가 함께 실려 있는 것이다.

같은 앱을 담는 방법을 바꾸면 이 숫자는 208MB까지 내려간다. 기능은 하나도 다르지 않다. 이 글은 그 사이에 있는 약 1.5GB의 정체를 `docker history`로 한 층씩 열어보는 데서 시작해서, 컨테이너가 실제로 무엇인지(작은 VM이 아니다), 그 컨테이너 안에서 Node.js가 무엇을 보는지, 그리고 쿠버네티스가 그 컨테이너를 파드로 감싸 노드에 올리기까지 무슨 일이 일어나는지를 직접 측정한 값으로 따라간다.

이 글은 "프론트엔드 개발자가 알아야 할 쿠버네티스" 시리즈의 두 번째 편이다. [1편](/2026/08/k8s-for-frontend-1)에서 용어와 개념을 정리했다면, 이번 편부터는 그것들을 직접 실행하고 측정한다. 첫 대상이 컨테이너와 파드다. 이후 트래픽 경로, 파드의 삶과 죽음, 오토스케일링으로 이어지고, 마지막은 이미 공개한 [Node.js 파드 사이징 글](/2026/08/nodejs-k8s-pod-sizing)이 심화편으로 닿는 종착점이다.

> 측정 환경: Apple M5(10코어, 24GB RAM) macOS 위에 colima VM(4 CPU/8GB, Docker 29.5.2)을 두고 측정했다. 쿠버네티스는 kind v0.32.0(kindest/node v1.36.1, Kubernetes v1.36.1), 예제 앱은 **Next.js 16.2.12**를 standalone으로 빌드했고, 컨테이너의 Node는 node:24 이미지 기준 **v24.19.0**이다. 이미지 크기는 arm64 아키텍처, 압축을 푼(디스크에 놓인) 크기 기준이다. 절대치는 환경마다 다르지만, 이 글이 보려는 것은 절대치가 아니라 구조다.

## 이 글의 순서

우리가 작성한 코드는 이미지, 컨테이너, 파드, 배포라는 네 단계를 거쳐 서비스되는 프로세스가 된다. 글도 이 순서를 따른다. 각 단계에서 확인하게 될 것을 한 줄씩만 미리 적어 두면 이렇다.

코드는 먼저 **이미지**가 된다. 여기서 확인할 것은 이미지의 대부분이 우리 앱이 아니라는 사실이다(실측에서 앱은 2.5%였다). 이미지는 실행되어 **컨테이너**가 되는데, 이 컨테이너의 실체는 작은 VM이 아니라 격리 장치를 두른 프로세스 하나다. 같은 프로세스가 안에서는 PID 1, 밖에서는 PID 7656으로 보이는 것을 직접 확인한다. 그 컨테이너를 쿠버네티스가 **파드**로 감싸면서 IP와 자원 계약이 붙는데, 파드 안의 컨테이너들이 정말로 네트워크를 공유하는지도 여기서 직접 확인한다. 마지막으로 `kubectl apply` 한 번이 이 모든 단계를 거쳐 **배포**가 되는 과정을 이벤트 로그로 초 단위까지 따라가고, 그 끝에서 Next.js standalone과 쿠버네티스의 궁합 문제(HOSTNAME 함정) 하나를 만난다.

파드, kubelet, readiness 같은 용어가 아직 낯설다면 [1편의 용어·개념 정리](/2026/08/k8s-for-frontend-1)를 먼저 읽는 것을 권한다. 다만 처음 나오는 개념은 이 글 안에서도 그 자리에서 짧게 풀었으니, 바로 읽어 나가도 지장은 없다.

## 이미지: 앱을 통째로 찍은 스냅샷

이미지(image)는 앱과 그 실행에 필요한 파일시스템 전체를 찍어둔 스냅샷이다. 실행 파일이 아니라 파일 뭉치라는 점이 중요하다. 서두의 다섯 줄짜리 Dockerfile을 실제로 빌드해서 이 뭉치를 열어보는 데서 시작한다. 예제 앱은 Next.js 16의 기본 구성에 SSR 페이지와 API 라우트 두 개를 얹은 최소 구성이다.

```dockerfile
FROM node:24
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

이렇게 빌드한 이미지가 1,715MB다. 이미지는 레이어(layer, Dockerfile의 명령 하나가 대체로 만드는 층)를 겹쳐 쌓은 것이라, `docker history`로 층별 명세를 볼 수 있다. 어디서 온 것인지 알기 쉽게 묶으면 이렇게 나뉜다.

| 레이어                                      |   크기 | 누가 넣었나      |
| ------------------------------------------- | -----: | ---------------- |
| Debian(bookworm) 베이스                     |  155MB | `node:24` 베이스 |
| ca-certificates, curl 등 기본 유틸          |   52MB | `node:24` 베이스 |
| git, mercurial, openssh 등 버전 관리 도구   |  200MB | `node:24` 베이스 |
| gcc, g++, imagemagick, 각종 -dev 라이브러리 |  592MB | `node:24` 베이스 |
| Node.js 24.19 본체 + yarn                   |  215MB | `node:24` 베이스 |
| `npm ci` (node_modules)                     |  458MB | 우리 Dockerfile  |
| `npm run build` (.next)                     | 42.5MB | 우리 Dockerfile  |

이 표에서 두 가지가 보인다. 첫째, 우리가 만든 것은 맨 아래 두 줄, 그중에서도 앱 산출물이라 부를 만한 것은 42.5MB뿐이다. 둘째, `node:24` 베이스 이미지 혼자 1.2GB를 차지하는데, 그 절반이 gcc와 g++, imagemagick, 수십 개의 `-dev` 헤더 패키지 같은 **빌드 도구**다. `node:24`가 게을러서가 아니다. 네이티브 애드온(C++로 작성되어 설치 시 컴파일이 필요한 npm 패키지)을 어떤 환경에서도 빌드할 수 있도록 준비물을 다 갖춘, 일부러 완전한 이미지다. 문제는 그 준비물이 빌드가 끝난 뒤의 **실행 시점**에는 필요 없다는 것이다. 컴파일러를 서비스와 함께 배포하고 있었던 셈이다.

그래서 감량은 두 방향에서 이뤄진다. 베이스 이미지를 바꾸는 것과, 담는 파일을 줄이는 것이다. 단계별로 재보면 이렇게 내려간다.

| 단계                                        | 디스크 크기 | 전송(압축) 크기 |
| ------------------------------------------- | ----------: | --------------: |
| `node:24` + 전체 node_modules + `npm start` |     1,715MB |           590MB |
| `node:24-slim`으로 베이스만 교체            |       767MB |           270MB |
| 멀티스테이지 + standalone 출력              |       304MB |            91MB |
| 러너만 `node:24-alpine`으로                 |       208MB |            69MB |

첫 감량은 베이스 교체다. `node:24-slim`은 같은 Debian에서 빌드 도구와 VCS를 뺀 이미지로, 그것만으로 948MB가 사라진다. 두 번째 감량이 이 절의 본론인 standalone이다.

### standalone: 458MB의 node_modules가 37MB가 되는 이유

`next.config.mjs`에 한 줄을 추가하면 빌드 출력이 달라진다.

```js
const nextConfig = {
  output: 'standalone',
}
```

이렇게 하면 `next build`가 `.next/standalone` 디렉토리에 **자립형 서버 사본**을 만든다. 핵심은 Next.js가 빌드 과정에서 실제 실행 경로가 참조하는 파일을 추적해서, `node_modules`에서 그 파일들만 골라 담는다는 것이다. 개발 의존성, 빌드에만 쓰인 패키지, 참조되지 않는 코드가 전부 빠진다. 이 예제에서 그 결과가 458MB 대 37.3MB다. 12분의 1이 된 셈인데, 앱이 커져도 이 비율의 방향은 유지된다. 실행에 필요한 것은 전체 의존성 트리의 일부이기 때문이다.

남은 것은 이 사본만 최종 이미지에 담는 것이다. 빌드는 도구가 다 있는 단계에서 하고, 결과물만 가벼운 단계로 옮기는 멀티스테이지 빌드다.

```dockerfile
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

마지막 `runner` 스테이지에는 `npm ci`도 `COPY . .`도 없다. standalone 사본과 정적 파일만 얹는다. 그 결과가 304MB이고, 러너 베이스를 alpine으로 바꾸면 208MB다. 서두의 1,715MB와 비교하면 8분의 1이다.

> 재보다가 알게 된 표기 문제 하나. 최근 도커(containerd 이미지 스토어)의 `docker image ls`는 압축본과 압축 해제본을 **합친** 디스크 사용량을 보여준다. 그래서 위의 1,715MB짜리 이미지가 목록에는 2.31GB로 찍힌다. 이 글의 숫자는 `docker history` 합산, 즉 압축을 푼 파일시스템 기준으로 통일했다.

크기가 왜 중요한지는 정직하게 말할 필요가 있다. 노드에 이미지가 이미 캐시되어 있다면 큰 이미지도 실행 속도에는 영향이 없다. 값을 치르는 순간은 **이미지가 없는 노드에 파드가 처음 뜰 때**다. 새 노드가 추가됐을 때, 스케일 아웃으로 낯선 노드에 배치됐을 때, 배포 직후 전체 노드가 새 이미지를 받을 때. 전송 크기 590MB와 69MB의 차이는 그 순간마다 레지스트리에서 내려받는 시간과 대역폭의 차이가 된다. 트래픽 스파이크에 몇 초 안에 새 파드가 떠야 하는 상황(오토스케일링 편의 주제다)에서 이 차이는 그대로 응답 지연이 된다. 이미지 감량은 최적화 테크닉이라기보다, 실행에 필요 없는 파일을 이미지에서 빼는 일에 가깝다.

## 컨테이너: 격리 장치를 두른 프로세스

이미지를 실행하면 컨테이너가 된다. 그런데 이 "실행된 것"의 정체를 작은 가상 머신으로 상상하면, 이후의 모든 직관이 조금씩 어긋난다. 컨테이너에는 부팅할 OS도, 별도의 커널도 없다. 실체는 **호스트 커널 위에서 격리 장치를 두르고 도는 평범한 프로세스**다. 이건 비유가 아니라 관찰 가능한 사실이라, 직접 확인해 보는 것이 가장 빠르다.

standalone 이미지를 CPU 1개, 메모리 256MB 제한으로 띄우고, 안과 밖에서 같은 프로세스를 찾아본다.

```bash
$ docker run -d --rm --name pid-demo --cpus=1 --memory=256m k8s-fe-lab:standalone

# 컨테이너 안에서 본 세계 (이름이 잘린 이유는 아래에서)
$ docker exec pid-demo cat /proc/1/comm
next-server (v

# 호스트(리눅스 VM)에서 본 같은 프로세스
$ docker inspect -f '{{.State.Pid}}' pid-demo
7656
$ ps -o pid,ppid,comm -p 7656
    PID    PPID COMMAND
   7656    7632 next-server (v
$ ps -o pid,comm -p 7632
    PID COMMAND
   7632 containerd-shim
```

같은 `next-server` 프로세스가 안에서는 PID 1이고, 밖에서는 PID 7656이다. 이름이 잘린 것도 짚고 가면, Next.js는 `start-server.js`에서 `process.title = 'next-server (v16.2.12)'`로 이름을 지정하는데, 리눅스에서 프로세스 타이틀은 원래 명령줄이 차지하던 argv 메모리 위에 덮어쓰는 방식이라 `node server.js`라는 원래 명령의 길이(14자)만큼만 담긴다. comm에는 15자라는 커널 제한도 따로 있지만, 여기서 잘린 원인은 그쪽이 아니라 argv 공간이다(긴 명령줄로 실행해 보면 타이틀은 온전하고 comm만 정확히 15자에서 잘리는 것으로 구분된다). 부모는 containerd-shim이라는 컨테이너 런타임의 관리 프로세스다. 다시 말해 호스트 입장에서 컨테이너란 프로세스 트리의 한 가지일 뿐이고, `ps`로 보이는 이웃 프로세스와 다를 게 없다. 다른 것은 커널이 이 프로세스에게 씌워둔 두 겹의 장치다.

첫 번째 겹이 **namespace**다. 프로세스에게 보여주는 세계를 분리한다. PID namespace 덕에 컨테이너 안에서는 자기가 PID 1이고 다른 프로세스가 보이지 않으며, 네트워크 namespace 덕에 자기만의 네트워크 인터페이스를 가지고, 마운트 namespace 덕에 이미지의 파일시스템이 루트(`/`)로 보인다. 격리의 "보이는 것" 담당이다.

두 번째 겹이 **cgroup**이다. 보이는 것이 아니라 쓰는 양을 제한한다. 호스트에서 이 프로세스의 cgroup을 따라가 보면, 아까 `docker run`에 준 제한이 파일로 그대로 적혀 있다.

```bash
$ cat /proc/7656/cgroup
0::/docker/f00ea3e52f44...

$ cat /sys/fs/cgroup/docker/f00ea3e52f44.../memory.max
268435456        # 256MB
$ cat /sys/fs/cgroup/docker/f00ea3e52f44.../cpu.max
100000 100000    # 100ms마다 100ms어치 = 1코어
```

`--memory=256m`이라는 도커 옵션의 실체는 이 `memory.max` 파일에 적힌 숫자 하나다. 쿠버네티스의 메모리 limit도, 뒤에서 볼 파드의 자원 계약도, 끝까지 따라가면 전부 이 파일에 도착한다. [파드 사이징 글](/2026/08/nodejs-k8s-pod-sizing)에서 OOMKill과 CFS 스로틀을 다뤘는데, 그 강제가 일어나는 곳이 바로 여기다.

호스트를 건물 하나로 비유하면 이 구조가 한 장에 들어온다. 호스트 커널은 건물의 골조와 설비이고 모든 호실이 공유한다. 컨테이너는 호실 하나다. namespace는 호실의 벽이라 옆집이 보이지 않게 하고, cgroup은 임대 계약서라 전기와 수도를 얼마나 쓸 수 있는지 적혀 있다. VM은 설비(커널)까지 따로 짓는 단독주택이다. 튼튼하지만 무겁고, 그래서 컨테이너에는 VM에 있는 "부팅"이 없다. 시작이 프로세스 실행만큼 빠른 이유, 커널 수준의 격리는 VM보다 약한 이유, 그리고 PID 1인 프로세스가 죽으면 컨테이너가 통째로 죽는 이유(파드의 삶과 죽음 편에서 종료 신호 이야기로 다시 만난다)가 전부 이 구조에서 따라 나온다.

### 컨테이너 안의 Node가 보는 세계는 절반이 거짓말이다

프로세스에게 세계를 속이는 데는 부작용이 있다. 안에서 도는 Node.js가 시스템 정보를 물었을 때, 커널이 돌려주는 답이 **어떤 것은 호스트 기준이고 어떤 것은 cgroup 기준**이라는 점이다. 같은 이미지를 제한 조건만 바꿔 띄우고, 안에서 Node가 보는 값을 정리하면 이렇게 나온다.

| 값                                       | 호스트(macOS) | 컨테이너(제한 없음) | `--cpus=1 --memory=512m` |
| ---------------------------------------- | ------------: | ------------------: | -----------------------: |
| `os.cpus().length`                       |            10 |                   4 |                    **4** |
| `os.availableParallelism()`              |            10 |                   4 |                    **1** |
| `os.totalmem()`                          |          24GB |               7.9GB |                **7.9GB** |
| `v8.getHeapStatistics().heap_size_limit` |      4,288MiB |            2,240MiB |               **259MiB** |
| cgroup `memory.max`                      |             - |                 max |              536,870,912 |

읽는 축은 마지막 열이다. CPU 1개, 메모리 512MB로 제한한 컨테이너인데, `os.cpus()`는 여전히 4개(colima VM의 코어 수)를 돌려주고 `os.totalmem()`도 VM 전체 메모리인 7.9GB를 돌려준다. 이 둘은 커널의 전역 정보를 읽기 때문에 cgroup을 모른다. 건물 비유로는 창밖 풍경(건물 전체)을 보여주는 셈이다. 반면 `availableParallelism()`은 1을 돌려준다. libuv가 cgroup의 CPU 쿼터를 반영해 주기 때문이다. V8도 힙 상한을 4,288MiB에서 259MiB로 스스로 줄였다. cgroup의 `memory.max`를 읽고 그에 맞춰 기본값을 잡는, [사이징 글](/2026/08/nodejs-k8s-pod-sizing)에서 다룬 Node 24의 컨테이너 인식이 여기서 동작한 것이다. 이쪽은 계약서를 읽어주는 API다.

이 표의 절반이 거짓말이라는 사실은 실무에서 두 종류의 사고로 나타난다. 하나는 `os.cpus().length`로 워커 수를 정하는 코드다. 64코어 노드 위의 1코어 파드에서 이 값은 64를 돌려주고, 워커 64개가 1코어 쿼터를 나눠 먹으며 스로틀 지옥이 열린다(pm2의 `-i max`가 정확히 이 함정이고, 사이징 글에서 자세히 다뤘다). 다른 하나는 `totalmem()` 기반의 캐시 크기 계산 같은 코드인데, 컨테이너 limit의 몇 배를 "가용 메모리"로 믿게 된다. 컨테이너 안에서 병렬성이 필요하면 `availableParallelism()`을, 메모리 판단이 필요하면 cgroup 값을 읽는 것이 안전하다.

힙 상한이 cgroup에 맞춰 움직이는 것을 조건별로 다시 보면, 512MB 제한에서 259MiB, 2GB 제한에서 1,120MiB로, 제한이 있을 때는 limit의 절반 안팎을 따라왔다. 제한이 없을 때는 기준 자체가 달라져서 VM 전체 메모리 7.9GB의 약 28%인 2,240MiB로 잡혔다. 정확한 산식은 버전을 탈 수 있으니, 여기서는 "제한을 주면 V8이 그에 비례해 힙을 줄인다"는 방향만 가져가면 된다. 이 자동 조정이 얼마나 고마운 것인지, 그리고 힙 플래그를 명시하는 순간 어떻게 꺼지는지는 사이징 글의 주제다.

## 파드: 컨테이너에 IP와 자원 계약을 붙인 것

여기까지는 도커만으로도 가능한 이야기였다. 여기서 쿠버네티스가 등장한다. 쿠버네티스는 컨테이너를 직접 다루지 않고 **파드(Pod)**라는 포장 단위로 다루는데, 컨테이너가 이미 실행 단위인데 왜 한 겹을 더 씌우는지가 첫 질문이 된다.

파드는 컨테이너 한 개 이상을 묶어서, 그 묶음에 세 가지를 붙인 것이다. 첫째, **IP 주소 하나**. 파드 안의 컨테이너들은 네트워크 namespace를 공유해서, 서로를 localhost로 부르고 바깥에는 하나의 IP로 보인다. 로그 수집기나 프록시 같은 보조 컨테이너(사이드카)를 앱 옆에 붙이는 패턴이 이 공유 덕에 성립한다. 둘째, **자원 계약**. 파드 명세의 `requests`/`limits`가 앞 절에서 본 cgroup 파일로 강제된다. 셋째, **생명주기 하나**. 쿠버네티스는 파드 단위로 만들고, 옮기고, 죽인다. 스케줄링도 재시작도 파드가 최소 단위다.

이 네트워크 공유가 사실인지도 직접 확인했다. 같은 standalone 이미지로 앱 컨테이너와, 아무 일도 하지 않고 잠만 자는 사이드카 컨테이너를 한 파드에 넣고, 각자에게 자기 네트워크 인터페이스를 물어봤다.

```bash
# 명령과 출력은 IPv4 주소만 남도록 추린 것이다
$ kubectl exec sidecar-demo -c app -- node -e "console.log(os.networkInterfaces().eth0...)"
10.244.1.5
$ kubectl exec sidecar-demo -c sidecar -- node -e "console.log(os.networkInterfaces().eth0...)"
10.244.1.5
```

두 컨테이너가 같은 eth0, 같은 IP를 본다. 각자 인터페이스를 하나씩 받은 것이 아니라 **하나의 네트워크 namespace를 함께 쓰고 있다**는 물증이다. 컨테이너 절에서 namespace가 컨테이너마다 보이는 세계를 분리한다고 했는데, 파드는 그 경계 중 네트워크 하나를 컨테이너들 사이에서 일부러 허문 묶음인 셈이다. 사이드카에서 앱을 localhost로 불러보는 실험은 잠시 뒤 HOSTNAME 함정에서 이어진다.

파드가 계약의 단위라면, 그 계약을 집행하는 조직이 클러스터다. 조직도는 [1편](/2026/08/k8s-for-frontend-1)에서 그렸으니 여기서는 이 글에 필요한 만큼만 요약한다. 컨트롤 플레인의 스케줄러가 파드를 어느 노드에 둘지 정하고, 각 노드의 kubelet이 그 결정을 containerd에 전달해 앞 절에서 본 격리 장치를 두른 프로세스로 만든다. 그리고 우리가 매니페스트로 작성하는 것은 파드가 아니라 Deployment("이 앱을 N개 유지하라"는 선언)이고, Deployment가 ReplicaSet을, ReplicaSet이 파드를 만든다. 파드는 소모품이고, 우리가 관리하는 것은 선언뿐이라는 것이 쿠버네티스의 기본 자세다.

### 노드조차 컨테이너일 수 있다: kind

이 시리즈의 실험 환경인 kind는 위 구조를 재귀적으로 보여주는 재미가 있다. kind(Kubernetes in Docker)는 "노드"를 도커 컨테이너로 흉내 내 로컬에 클러스터를 만드는 도구인데, 클러스터를 만들고 나서 `docker ps`를 치면 이렇게 나온다.

```bash
$ docker ps --format 'table {{.Names}}\t{{.Image}}'
NAMES                      IMAGE
k8s-fe-lab-control-plane   kindest/node:v1.36.1
k8s-fe-lab-worker          kindest/node:v1.36.1
k8s-fe-lab-worker2         kindest/node:v1.36.1
```

노드 세 개가 그냥 컨테이너 세 개다. 그 컨테이너 안에서 kubelet과 containerd가 돌고, 우리 파드는 그 안에 다시 프로세스로 뜬다. 컨테이너가 격리 장치를 두른 프로세스라는 컨테이너 절의 결론을 받아들이면, 노드조차 컨테이너로 흉내 낼 수 있다는 것이 자연스러워진다. 격리는 층층이 겹칠 수 있는 장치이기 때문이다.

파드당 컨테이너를 몇 개 두는지, 자원 계약을 얼마로 쓰는지 같은 운영 결정은 이 시리즈의 종착점인 [사이징 글](/2026/08/nodejs-k8s-pod-sizing)이 다룬다. 이 절에서 필요한 것은 구조 하나다. **파드 = 컨테이너 묶음 + IP + cgroup 계약**, 그 계약을 컨트롤 플레인이 결정하고 kubelet이 집행한다는 것.

## 배포: 선언이 프로세스가 되기까지

이제 이 파드를 실제로 띄워 본다. 배포 명세는 요약하면 이렇다. standalone 이미지를 파드 2개(replicas)로 띄우고, CPU 1개와 메모리 512Mi를 limit으로 걸고, `/api/health`를 readiness probe(트래픽을 받아도 되는지 kubelet이 주기적으로 확인하는 검사)로 지정했다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-fe-lab
spec:
  replicas: 2
  selector:
    matchLabels:
      app: k8s-fe-lab
  template:
    metadata:
      labels:
        app: k8s-fe-lab
    spec:
      containers:
        - name: app
          image: k8s-fe-lab:standalone
          resources:
            requests: {cpu: '500m', memory: '256Mi'}
            limits: {cpu: '1', memory: '512Mi'}
          readinessProbe:
            httpGet: {path: /api/health, port: 3000}
```

`kubectl apply -f app.yaml`은 명령이 아니라 선언이라는 점이 쿠버네티스의 중심 아이디어다. "파드를 띄워라"가 아니라 "이 앱의 원하는 상태는 레플리카 2개다"라는 문서를 API 서버에 제출하는 것이고, 그 문서를 읽은 컨트롤러들이 연쇄적으로 움직인다. 앞 절에서 요약한 역할 분담이 여기서 실제로 돌아간다. Deployment 컨트롤러가 ReplicaSet을 만들고, ReplicaSet이 파드 2개를 만들고, 스케줄러가 노드를 고르고, 해당 노드의 kubelet이 컨테이너를 띄운다. 이 연쇄가 전부 이벤트로 기록되기 때문에, apply 직후의 이벤트 로그를 시간순으로 읽으면 배포 한 사이클이 그대로 보인다. 실측한 로그를 발췌하면 이렇다.

```text
02:09:48  Normal   ScalingReplicaSet  k8s-fe-lab         Scaled up replica set k8s-fe-lab-6c8fb44888 from 0 to 2
02:09:48  Normal   SuccessfulCreate   k8s-fe-lab-6c8...  Created pod: k8s-fe-lab-6c8fb44888-wvx2x
02:09:48  Normal   Scheduled          ...-wvx2x          Successfully assigned default/...-wvx2x to k8s-fe-lab-worker
02:09:48  Normal   Pulled             ...-wvx2x          Container image "k8s-fe-lab:standalone" already present on machine
02:09:48  Normal   Created            ...-wvx2x          Container created
02:09:48  Normal   Started            ...-wvx2x          Container started
02:09:48  Warning  Unhealthy          ...-wvx2x          Readiness probe failed: ... connect: connection refused
```

apply부터 두 파드가 모두 Ready가 되기까지 0.97초가 걸렸다. Ready로 바뀐 시각은 이벤트가 아니라 파드의 conditions 필드에 남는데, 두 파드 모두 Started 다음 초인 02:09:49였다. 몇 가지를 짚어 둘 만하다.

먼저 `Pulled` 줄의 "already present on machine". 이번 측정은 이미지를 미리 노드에 넣어둔 상태라 풀(pull, 레지스트리에서 이미지를 내려받는 것)이 생략됐고, 그래서 1초가 나왔다. 실전의 첫 배포나 새 노드에서는 이 줄이 수십 초짜리 다운로드가 되고, 그 시간은 이미지 절에서 잰 전송 크기(590MB냐 69MB냐)에 비례한다. 배포 타임라인에서 가장 큰 변수가 이미지 크기라는 것이 여기서 연결된다.

다음으로 마지막의 `Unhealthy` 경고. 실패처럼 보이지만 정상 동작이다. 컨테이너가 Started 된 시점에 Node 프로세스는 아직 리슨을 시작하기 전이고, 그 짧은 틈에 첫 readiness probe가 먼저 도착해 connection refused를 받은 것이다. 중요한 것은 이 실패 동안 파드가 **트래픽을 받지 않는다**는 점이다. readiness가 성공하기 전까지 파드는 서비스의 대상 목록에 오르지 않는다. "떠 있다"와 "받을 준비가 됐다"를 구분하는 이 장치가 배포 중 무중단을 만드는 핵심 부품인데, 그 이야기는 트래픽 편과 파드의 삶과 죽음 편에서 제대로 다룬다.

### 파드 안에서 다시 만난 cgroup

파드가 떴으니, 컨테이너 절에서 도커로 했던 관찰을 쿠버네티스 안에서 한 번 더 확인해 둔다. 파드에 열어둔 `/api/info` 엔드포인트는 Node가 보는 세계를 그대로 돌려준다.

```json
{
  "pod": "k8s-fe-lab-6c8fb44888-nm5h4",
  "node": "v24.19.0",
  "availableParallelism": 1,
  "cpus": 4,
  "totalmemMiB": 7922,
  "heapSizeLimitMiB": 259,
  "rssMiB": 83,
  "cgroup": {"memoryMax": "536870912", "cpuMax": "100000 100000"}
}
```

limit으로 건 CPU 1개와 메모리 512Mi가 cgroup 파일(`100000 100000`, `536870912`)로 내려왔고, Node는 그걸 읽어 병렬성 1과 힙 상한 259MiB로 스스로를 맞췄다. 도커에서 본 것과 같은 값이다. 매니페스트의 YAML 한 줄이 cgroup 파일을 거쳐 V8 힙 상한까지 내려오는 경로가 이것으로 끝까지 이어졌다.

### HOSTNAME: 파드에서만 localhost가 거부된 이유

그런데 이 값을 받아오는 과정에서 예상 밖의 함정을 하나 밟았다. 파드 안에서 `kubectl exec`로 서버를 호출하는데, localhost가 거부된 것이다.

```bash
$ kubectl exec deploy/k8s-fe-lab -- node -e "fetch('http://localhost:3000/api/info')..."
Error: connect ECONNREFUSED 127.0.0.1:3000
```

readiness probe는 통과하고 서비스도 정상인데 localhost만 안 된다. 원인은 Next.js standalone이 생성하는 `server.js`에 있다. 바인드 주소를 정하는 줄이 이렇게 생겼다(Next.js 16.2.12 기준).

```js
const hostname = process.env.HOSTNAME || '0.0.0.0'
```

`HOSTNAME`이 있으면 그 주소에 바인드한다는 뜻인데, 하필 쿠버네티스에서는 이미지가 `HOSTNAME`을 따로 정의하지 않는 한 파드의 `HOSTNAME` 환경변수가 **파드 이름**으로 채워진다. 파드 이름은 파드 안 `/etc/hosts`에서 파드 IP로 풀리므로, 서버는 `0.0.0.0`(모든 인터페이스)이 아니라 **파드 IP에만** 바인드된다. 파드 IP로 들어오는 readiness probe와 서비스 트래픽은 멀쩡하고, 127.0.0.1로 들어가려는 것들만 거부된다. `kubectl exec`로 하는 로컬 디버깅, localhost를 호출하는 사이드카, `exec` 기반 헬스체크 스크립트가 여기에 걸린다.

사이드카가 실제로 걸리는지는, 파드 절에서 네트워크 공유를 확인했던 그 파드로 이어서 실험했다. 사이드카 컨테이너에서 앱을 localhost로 부르면 그대로 거부된다.

```bash
$ kubectl exec sidecar-demo -c sidecar -- node -e "fetch('http://localhost:3000/api/health')..."
FAIL ECONNREFUSED
```

같은 네트워크 namespace를 쓰는 두 컨테이너 사이에서조차 localhost가 안 통하는, 파드의 전제(localhost로 서로 부른다)가 깨진 상태다.

해법은 바인드 주소를 명시하는 것이다. Dockerfile의 러너 스테이지에 한 줄이면 된다.

```dockerfile
ENV HOSTNAME=0.0.0.0
```

이 한 줄이 실제로 듣는지도 확인했다. 이 ENV를 붙인 이미지로 같은 사이드카 실험을 반복하면 localhost 호출이 복구된다. 적어도 이 실험의 containerd 환경에서는, 이미지에 정의된 `HOSTNAME`이 파드 이름보다 우선했다. 다만 부작용이 하나 따라온다. 이제 앱이 읽는 `process.env.HOSTNAME`은 파드 이름이 아니라 `0.0.0.0`이라서, 이 값을 로그의 파드 식별자로 쓰던 코드가 함께 무너진다. 신원이 필요하면 환경변수 대신 `os.hostname()`을 읽으면 된다. UTS hostname은 여전히 파드 이름이라, 같은 파드에서 `process.env.HOSTNAME`은 `0.0.0.0`이고 `os.hostname()`은 파드 이름이 나오는 것까지 확인했다.

이 함정이 흥미로운 건, 도커 단독 환경에서는 잘 드러나지 않는다는 점이다. 도커의 `HOSTNAME`은 컨테이너 ID라서 같은 방식으로 컨테이너 IP에 바인드되지만, 도커에서는 localhost로 컨테이너에 들어갈 일 자체가 드물다(포트 매핑은 컨테이너 IP로 간다). 쿠버네티스로 넘어와 `kubectl exec` 디버깅을 하는 순간에야 수면 위로 올라온다. 로컬과 도커에서 멀쩡하던 것이 파드에서만 이상하게 굴 때, 환경변수가 실행 환경마다 다르게 주입된다는 사실은 꽤 자주 범인이 된다.

## 우리 서비스에 대볼 다섯 가지 질문

이 글에서 확인한 것들을 우리 서비스에 물어볼 수 있는 형태로 추려 둔다. `deploy/my-app`은 각자 서비스 이름으로 바꿔 읽으면 된다.

**1. 이미지에서 우리 앱은 몇 %인가?**

```bash
docker history <우리-이미지> --format 'table {{.Size}}\t{{.CreatedBy}}' | head -20
```

앱 산출물보다 베이스와 node_modules가 압도적으로 크다면(이 글의 예제는 앱이 2.5%였다), 감량의 여지가 그만큼 있다는 뜻이다.

**2. standalone을 쓰고 있는가?**

```bash
grep -r "output.*standalone" next.config.*
```

Next.js인데 이 설정이 없고 최종 이미지에 `node_modules` 전체가 실려 있다면, 458MB → 37MB 급의 감량이 설정 한 줄과 멀티스테이지 Dockerfile로 가능하다.

**3. 파드 안의 Node는 limit을 인식하고 있는가?**

```bash
kubectl exec deploy/my-app -- node -e "const os=require('node:os'),v8=require('node:v8'); console.log({parallelism: os.availableParallelism(), cpus: os.cpus().length, heapMiB: Math.round(v8.getHeapStatistics().heap_size_limit/1048576)})"
```

`cpus`는 노드 코어 수, `parallelism`은 파드 limit이 나오는 것이 정상이다. 코드 어딘가에서 `os.cpus().length`로 워커 수나 동시성을 정하고 있다면 그 값이 파드가 아니라 노드 크기라는 점을 의심해 볼 만하다.

**4. 배포마다 이미지를 새로 받고 있는가?**

```bash
kubectl get events --sort-by=.metadata.creationTimestamp | grep my-app
```

`Pulled`에 "already present"가 아니라 실제 다운로드가 매번 찍히고 그 간격이 길다면, 이미지 크기가 배포와 스케일 아웃 속도를 잡아먹고 있는 상태다.

**5. 서버는 어느 주소에 바인드되어 있는가?**

```bash
kubectl exec deploy/my-app -- node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/').then(r=>console.log(r.status)).catch(e=>console.log(e.cause?.code))"
```

`ECONNREFUSED`가 나오면 서버가 파드 IP에만 바인드된 상태다. localhost 기반 사이드카나 exec 헬스체크가 있다면 `ENV HOSTNAME=0.0.0.0`을 검토한다.

## 정리

이 글에서 측정으로 확인한 것을 요약한다.

- **이미지는 파일시스템 스냅샷이고, 그 대부분은 우리 앱이 아니다.** naive한 이미지에서 앱은 2.5%였다. 베이스 교체와 standalone으로 1,715MB가 208MB까지 내려갔고, 그 차이는 새 노드에 파드가 뜰 때마다 시간으로 돌아온다.
- **컨테이너는 격리 장치를 두른 프로세스다.** 같은 프로세스가 안에서는 PID 1, 밖에서는 PID 7656이었다. namespace가 보이는 것을, cgroup이 쓰는 양을 정하고, 도커 옵션과 쿠버네티스 limit은 결국 cgroup 파일의 숫자로 내려간다. 그리고 그 안의 Node는 절반만 진실을 본다. `os.cpus()`와 `totalmem()`은 호스트 값을, `availableParallelism()`과 V8 힙 상한은 cgroup 값을 돌려준다.
- **파드는 컨테이너 묶음에 IP와 자원 계약을 붙인 단위**이고, 그 계약을 컨트롤 플레인이 결정하고 kubelet이 집행한다. 우리가 관리하는 것은 파드가 아니라 "원하는 상태"를 적은 Deployment다.
- **apply는 명령이 아니라 선언이다.** 컨트롤러들의 연쇄가 그 선언을 프로세스로 만들고, 과정 전체가 이벤트로 남아 초 단위로 읽힌다. 그 타임라인에서 가장 큰 변수는 이미지 풀, 즉 이미지 절에서 잰 전송 크기였다.
- **환경변수는 실행 환경마다 다르게 주입된다.** 쿠버네티스가 넣어주는 `HOSTNAME`(파드 이름)이 Next.js standalone의 바인드 주소가 되면서, 사이드카의 localhost 호출까지 깨지는 것을 확인했다. 해법은 `ENV HOSTNAME=0.0.0.0`이고, 그 대신 파드 신원은 환경변수가 아니라 `os.hostname()`으로 읽는다. 로컬과 도커에서 멀쩡하던 것이 파드에서만 이상할 때 먼저 의심해 볼 지점이다.

컨테이너와 파드가 실제로 무엇인지는 여기까지의 측정으로 확인했다. 다음 편은 바깥에서 들어온 요청이 이 파드에 도착하기까지의 경로다. `kubectl get svc`가 보여주는 ClusterIP라는 주소는 ping도 받지 않는 이상한 IP인데, 어떻게 트래픽이 그리로 흘러 들어가는지를 이번처럼 직접 열어서 확인한다.
