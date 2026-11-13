# news 봇

매일 09시(KST) 기술 글을 모아 고른 5~8편을 요약한 일간 호를 `apps/news/content/daily/`에 쓴다. 월요일 09시 30분에는 지난 7일의 일간 호를 종합해 `apps/news/content/weekly/`에 쓴다. 결과는 news.yceffort.kr에 공개된다. 발송은 없다.

## 구조

두 단계로 나뉜다.

1. **수집기** (`src/collect.ts`). RSS 67개와 API 2종(Hacker News, GitHub Trending)에서 긁고, URL을 정규화하고, 이미 내보낸 것을 걸러내고, 남은 글 전부의 본문을 추출한다. 목록은 `out/index.json`, 본문은 `out/articles/<id>.txt`다. LLM을 쓰지 않아 비용이 0이고 결과가 재현 가능하다.
2. **큐레이터** (`anthropics/claude-code-action`). 목록 전체를 훑어 읽을 글을 고르고, 그 본문을 읽고 판단해 호를 쓴다. 출처별 몫이나 상한은 없다. 지시서는 `prompts/daily.md`와 `prompts/weekly.md`다.

판단이 필요 없는 일을 에이전트에게 맡기지 않는 것이 이 구조의 요점이다.

워크플로는 `.github/workflows/news-daily.yml`과 `news-weekly.yml`이다. 큐레이터는 신뢰할 수 없는 외부 본문을 읽으므로 읽기 권한만 가진 `curate` job에서 돌고, 결과물을 artifact로 넘긴다. 포맷과 린트, 커밋과 푸시는 `publish` job이 `NEWS_BOT_TOKEN`으로 한다.

## 로컬 실행

```bash
pnpm install
pnpm collect --dry-run    # state/seen-urls.json을 건드리지 않는다
pnpm collect --dry-run --as-of 2026-10-21    # 그날 09시(KST)에 돌았던 것처럼 수집한다
pnpm test
pnpm typecheck
```

dry-run 결과 확인.

```bash
node -e "const d=require('./out/index.json'); console.log(d.candidates.length); console.table(d.reports.filter(r=>!r.ok))"
```

## secrets

- `CLAUDE_CODE_OAUTH_TOKEN` (필수). `claude setup-token`으로 발급해 `gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo yceffort/blog`로 등록한다. 만료되면 워크플로가 인증 오류로 실패하니 같은 절차로 재발급한다.
- `NEWS_BOT_TOKEN` (필수). 이 저장소 하나에 Contents 읽기/쓰기 권한을 준 fine-grained PAT다. main의 보호 규칙을 우회해 푸시하는 데 쓴다.
- `FIRECRAWL_API_KEY` (선택). 없으면 본문 추출 폴백을 건너뛴다. 없어도 파이프라인 전체가 동작한다.

Anthropic API 키는 쓰지 않는다. 구독으로 커버된다.

## 알려진 제약

**GitHub Trending은 공식 API가 없어 HTML을 읽는다.** 구조가 바뀌면 0건이 되는데, 그때는 호의 "수집 상태" 절에 "HTML 구조 변경 의심"으로 뜬다.

## 소스를 고치고 싶을 때

`src/config/sources.ts`를 고친다. 추가하거나 빼면 `test/sources.test.ts`의 개수도 함께 고친다.

피드는 예고 없이 죽는다. 호의 "수집 상태" 절에 실패한 소스 이름이 남으니 주기적으로 본다.

새 피드를 넣기 전에 살아있는지 먼저 확인한다.

```bash
curl -sL -A 'news-bot/1.0' <피드 URL> | head -c 300
```

## 튜닝 지점

`src/config/sources.ts`의 상수들이다.

- `RECENT_WINDOW_HOURS` (168). 좁히면 개인 블로그와 프레임워크 블로그가 배제된다. 36시간에서 실측했을 때 개인 2건 프레임워크 0건이었다.
- `HN_MIN_SCORE` (50), `HN_TOP_COUNT` (30).
- `CONTENT_MAX_CHARS` (12000). 큐레이터에 넘기는 본문 상한.

큐레이터가 본문을 읽는 개수(25건 안팎)는 `prompts/daily.md`의 "훑기" 단계가 정한다. 늘리면 구독 사용량이 는다.

## 되돌리기

워크플로가 만든 커밋은 `news:` 또는 `news weekly:` 접두사를 쓴다. 잘못된 호는 `git revert`로 지운다.
