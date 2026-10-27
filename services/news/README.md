# 뉴스레터 봇

매일 09시(KST) 기술 글을 모아 고른 5~8편을 `clippings/`에 캡처하고 그 읽기 목록을 `digest/`에 쓴다. 월요일 09시 30분에는 지난 7일 clippings(사람의 캡처 포함)를 종합해 `digest/weekly/`에 쓰고, 핵심 한두 편을 루트 MOC에 잇는다. 발송은 없다.

## 구조

두 단계로 나뉜다.

1. **수집기** (`src/collect.ts`). RSS 59개와 API 2종(Hacker News, GitHub Trending)에서 긁고, URL을 정규화하고, 이미 내보낸 것을 걸러내고, 본문을 추출해 `out/candidates.json`을 만든다. LLM을 쓰지 않아 비용이 0이고 결과가 재현 가능하다.
2. **큐레이터** (`anthropics/claude-code-action`). 그 JSON의 `content`를 읽고 판단해 노트를 쓴다. 지시서는 `prompts/daily.md`와 `prompts/weekly.md`다.

판단이 필요 없는 일을 에이전트에게 맡기지 않는 것이 이 구조의 요점이다.

## 로컬 실행

```bash
pnpm install
pnpm collect --dry-run    # state/seen-urls.json을 건드리지 않는다
pnpm test
pnpm typecheck
```

dry-run 결과 확인.

```bash
node -e "const d=require('./out/candidates.json'); console.log(d.candidates.length); console.table(d.reports.filter(r=>!r.ok))"
```

pnpm이 없으면 `corepack enable pnpm`으로 켠다.

## secrets

- `CLAUDE_CODE_OAUTH_TOKEN` (필수). `claude setup-token`으로 발급해 `gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo yceffort/brain`으로 등록한다. 만료되면 워크플로가 인증 오류로 실패하니 같은 절차로 재발급한다.
- `FIRECRAWL_API_KEY` (선택). 없으면 본문 추출 폴백을 건너뛴다. 없어도 파이프라인 전체가 동작한다.

Anthropic API 키는 쓰지 않는다. 구독으로 커버된다.

## 알려진 제약

**GitHub Trending은 공식 API가 없어 HTML을 읽는다.** 구조가 바뀌면 0건이 되는데, 그때는 다이제스트의 "수집 상태" 절에 "HTML 구조 변경 의심"으로 뜬다.

## 소스를 고치고 싶을 때

`src/config/sources.ts`를 고친다. 추가하거나 빼면 `test/sources.test.ts`의 개수도 함께 고친다.

피드는 예고 없이 죽는다. 실제로 기존 Worker의 Chrome Developers 피드는 404인 채로 방치돼 있었다. 다이제스트의 "수집 상태" 절에 실패한 소스 이름이 남으니 주기적으로 본다.

새 피드를 넣기 전에 살아있는지 먼저 확인한다.

```bash
curl -sL -A 'brain-newsletter-bot/1.0' <피드 URL> | head -c 300
```

## 튜닝 지점

`src/config/sources.ts`의 상수들이다.

- `RECENT_WINDOW_HOURS` (168). 좁히면 개인 블로그와 프레임워크 블로그가 배제된다. 36시간에서 실측했을 때 개인 2건 프레임워크 0건이었다.
- `SHORTLIST_SIZE` (30). 본문을 실제로 읽는 개수다. 늘리면 수집 시간과 구독 사용량이 함께 는다.
- `HN_MIN_SCORE` (50), `HN_TOP_COUNT` (30).
- `CONTENT_MAX_CHARS` (12000). 큐레이터에 넘기는 본문 상한.

`src/shortlist.ts`의 `LANES`가 소스 종류별 몫을 정한다. 몫을 없애면 발행량 많은 쪽이 전부 가져간다.

## 되돌리기

워크플로가 만든 커밋은 `digest:` 또는 `weekly:` 접두사를 쓴다. 잘못된 결과는 `git revert`로 지운다.
