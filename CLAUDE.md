# yceffort blog monorepo

## 구성

- pnpm 12.1 모노레포, Node 24.20 (`.nvmrc`)
- `apps/blog`: 메인 블로그 (yceffort.kr)
- `apps/research`: marp 슬라이드 사이트 (research.yceffort.kr), 덱은 `apps/research/research/*.md`
- `apps/news`: 기술 뉴스 일간/주간 호 (news.yceffort.kr), 호는 `services/news` 봇이 `apps/news/content/{daily,weekly}`에 쓴다
- `packages/shared`: 세 앱이 같이 쓰는 컴포넌트와 유틸리티
- `packages/markdown-rs`: 블로그 마크다운을 HAST로 바꾸는 Rust/WASM 렌더러
- `infra/otel`: Core Web Vitals 수집용 OTel Collector, Tempo, Mimir, Grafana 구성
- Next.js 16, React 19, TypeScript 7, 스타일은 세 앱 모두 StyleX

## 포스트

- 경로: `apps/blog/posts/{year}/{month}/{slug}.md`, 영문 번역은 같은 폴더의 `{slug}.en.md`
- frontmatter 필수 필드: `title`, `tags`, `published`, `date`, `description`. `published`는 따옴표 없이 `true` 또는 `false`
- 한국어 글을 고치면 `.en.md`가 있는 경우 같은 커밋에 함께 반영할 것 (pre-commit `translation-sync`가 막는다)
- `updated`는 pre-commit 훅이 찍으므로 손으로 고치지 않는다

## 시리즈

- 리드미: `apps/blog/series/{slug}.md`, 영문은 `{slug}.en.md`. frontmatter 필수 필드는 `name`, `description`
- `name`이 포스트의 `series` 값과 정확히 일치해야 함
- `title`은 표시용이며 핵심어를 `<em>`으로 감쌀 것 (예: `'<em>서비스 워커</em> 캐싱 딥다이브'`)

## 명령

- `pnpm dev:blog` (3000), `pnpm dev:research` (3001), `pnpm dev:news` (3003)
- `pnpm build:blog`, `pnpm build:research`, `pnpm build:news`: 타입 검사는 `next build`가 한다
- `pnpm lint`: oxlint(type-aware), rust-markdownlint, `apps/blog/scripts/check-markdown.mjs`
- `pnpm prettier`: oxfmt 검사만. `pnpm prettier:fix`는 저장소 전체를 다시 쓰므로 커밋 전에 돌리지 말 것 (lefthook이 staged 파일만 포맷한다)
- `pnpm --filter blog lint:style`: stylelint
- 테스트: `pnpm --filter blog test:offline`, `pnpm --filter blog test:telemetry` (vitest), `pnpm --filter research test:offline` (playwright)

## 커밋

- 제목은 gitmoji + 영어 명령형 (예: `🐛 Show the blog alert switch immediately on tap`)
- lefthook pre-commit이 oxlint, oxfmt, stylelint, markdownlint 수정, `updated` 스탬프, 관련 글 JSON 재생성을 처리한다

## markdown-rs

- 배포는 커밋된 `packages/markdown-rs/pkg/markdown_rs.wasm`을 그대로 싣는다. 이 바이너리는 Linux CI 산출물이다
- 로컬 `build`는 `MARKDOWN_RS_WRITE_PKG=1` 없이는 `pkg/`를 건드리지 않는다. CI가 소스 빌드 결과와 커밋된 바이너리를 대조하고, 다르면 `ci-markdown-wasm` artifact를 남긴다

## GA4

- 측정 ID: `apps/blog/src/config.ts`의 `googleAnalyticsId`
- 인기 글 조회: `apps/blog/src/utils/analytics.ts` (GA4 Data API). 환경 변수 `GA4_PROPERTY_ID`, `GOOGLE_APPLICATION_CREDENTIALS_JSON` (`apps/blog/.env.local`)
