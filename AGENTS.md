# yceffort blog monorepo

## 프로젝트 구조

- pnpm 모노레포 (Node 24, pnpm 10)
- `apps/blog` — Next.js 16 메인 블로그 (yceffort.kr)
- `apps/research` — Next.js 리서치 사이트 (research.yceffort.kr)
- `packages/shared` — 공유 패키지
- Tailwind CSS 4, React 19, TypeScript 5

## 포스트

- 경로: `apps/blog/posts/{year}/{month}/{slug}.md`
- 영문 번역: `{slug}.en.md`
- frontmatter 필수 필드: `title`, `tags`, `published`, `date`, `description`
- 커밋 컨벤션: `@naverpay/commit-helper` 사용 (lefthook pre-commit)

## 주요 스크립트

- `pnpm dev:blog` — 블로그 로컬 개발
- `pnpm dev:research` — 리서치 사이트 로컬 개발
- `pnpm build:blog` — 블로그 빌드
- `pnpm lint` — 전체 린트
- `pnpm prettier:fix` — 전체 포매팅

## GA4 Analytics

- `apps/blog/src/utils/analytics.ts`에 GA4 Data API 클라이언트 구현
- 환경 변수: `GA4_PROPERTY_ID`, `GOOGLE_APPLICATION_CREDENTIALS_JSON` (apps/blog/.env.local)
- 측정 ID: `G-ND58S24JBX`

## 블로그 포스트 전략 (GA4 데이터 기반 인사이트)

### 쓰지 말아야 할 글

- "X vs Y" 비교글, "N가지 방법" 나열형, "~란 무엇인가" 설명형
- AI가 즉답 가능한 주제는 트래픽이 급감하는 추세 (interface vs type: 역대 1위 → TOP 15 탈락)

### 써야 할 글

- **AI + 프론트엔드 실전**: coding agent 활용기, AI 기반 개발 워크플로우, LLM 기반 UI 패턴
- **"직접 해봤다" 류**: 성능 분석, 마이그레이션 후기, 장애 분석 (AI가 만들어낼 수 없는 경험 기반)
- **프레임워크 내부 딥다이브**: AST, React 컴파일러, 번들러 동작 원리 (ast-for-javascript가 2021년 글인데 2025년에도 1위)
- **실무 레퍼런스형**: 린트 규칙 설명, 보안 취약점 분석 등 GitHub PR에서 인용될 수 있는 근거 자료

### 핵심 원칙

> "ChatGPT에 물어보면 나오는 글"은 쓰지 말고, "ChatGPT가 이 글을 참고해야 답할 수 있는 글"을 쓸 것.
