---
name: publish-post
description: 블로그 초안을 발행할 준비를 한다. 영문 번역, 태그, unDraw 썸네일을 만들고 결과를 사용자에게 확인받은 뒤 `published: true`로 바꿔 커밋한다. 사용자가 "배포 준비", "발행 준비", "/publish-post"로 요청할 때 사용.
argument-hint: <apps/blog/posts/YYYY/MM/slug.md>
---

# 블로그 글 발행 준비

대상: `$ARGUMENTS`. 비어 있으면 `published: false`인 글 중 가장 최근 수정된 것을 후보로 제시하고 사용자에게 확인받는다.

순서가 중요하다. 영문본을 먼저 만들어야 태그와 썸네일 스크립트가 영문본에도 같은 값을 쓴다.

## 1. 사전 점검

- frontmatter 필수 필드(`title`, `tags`, `published`, `date`, `description`)를 확인한다.
- `node ~/.claude/skills/my-writing/scan.mjs <파일>`에서 1(즉시 수정)과 2(축자 번역)가 0건인지 확인한다. 0건이 아니면 발행 준비를 멈추고 사용자에게 알린다.
- em dash(—), en dash(–), 가운뎃점(·)이 본문에 없는지 `grep`으로 확인한다.
- 본문의 코드 링크가 커밋 해시에 고정돼 있으면, 그 커밋이 `origin/main`에 있는지 `git merge-base --is-ancestor`로 확인한다.

## 2. 영문 번역 (`{slug}.en.md`)

이미 있으면 한국어본과 달라진 부분만 반영한다. 새로 만들 때 규칙:

- frontmatter는 `title`, `description`만 번역하고 `tags`, `date`, `published`, `series`, `seriesOrder`, `art`는 한국어본과 같게 둔다.
- 내부 링크 경로(`/2026/...`), 이미지 경로, 각주 번호와 링크는 그대로 둔다. 코드 블록은 번역하지 않는다.
- 이미지 alt, 표, mermaid 라벨, 각주 설명은 번역한다.
- 영문본에도 em dash, en dash(범위는 `122-128ms`처럼 하이픈), 가운뎃점을 쓰지 않는다.
- 각주 수가 한국어본과 같은지 확인한다.

기존 영문본(`apps/blog/posts/2026/09/*.en.md`)의 문체를 참고한다. 직역보다 자연스러운 영어를 우선하되 주장과 수치는 바꾸지 않는다.

## 3. 태그

```bash
node apps/blog/scripts/retag-posts.mjs <파일> --apply
```

`tag-vocabulary.json` 어휘 안에서 Jev가 고르고 영문본에도 같은 태그를 쓴다. 먼저 `--apply` 없이 미리보기를 보여 줘도 된다. 어휘에 맞는 태그가 없다고 나오면 `propose-tags.mjs`로 제안받아 사용자와 정한다.

## 4. 썸네일 (unDraw)

```bash
node apps/blog/scripts/generate-undraw-thumbnail.mjs <파일>
```

frontmatter `art.undraw`를 고르고 `apps/blog/public/thumbnails/{slug}.webp`를 만든다. `generate-thumbnail.mjs`(Gemini)와 `generate-art-spec.mjs`는 쓰지 않는다.

- 만든 webp를 png로 바꿔 직접 열어 보고 확인한다(`sharp(webp).png().toFile(...)`).
- **사람이 들어간 그림은 쓰지 않는다.** 카탈로그 필터(피부색 fill)를 통과한 이름이라도 사람 실루엣이 새어 나올 수 있다.
- Anthropic API 오류(키 무효 등)로 고르지 못하면, 사람 없는 카탈로그에서 직접 고른다. 한국어본과 영문본 frontmatter에 `art:\n  undraw: <이름>`을 넣고 같은 명령을 다시 실행하면 API 없이 렌더링한다. 사람 없는 이름 목록은 스크립트의 `PEOPLE_NAME`, `SKIN` 필터를 `node_modules/undraw-svg/svgs`에 적용해 뽑는다.
- 최근 글들과 같은 이름이 겹치지 않게 한다(`grep -rh "undraw:" apps/blog/posts/<최근 월>`).

## 5. 검증

- 커밋 훅과 같은 검사를 돌린다: `npx lefthook run pre-commit --file <한국어본> --file <영문본>`.
- dev 서버가 떠 있으면 `http://localhost:3000/<경로>`와 `/en/<경로>`가 200인지 확인한다.

## 6. 사용자 확인 (필수)

아래를 한 번에 보여 주고 AskUserQuestion으로 발행 여부를 묻는다. 확인 없이 `published: true`로 바꾸지 않는다.

- 태그(기존 → 새), 썸네일 이름과 이미지(Read로 보여 줌)
- 영문 title, description
- `date`를 발행 시각으로 바꿀지(기본은 그대로 둔다)
- 점검 결과(스캔, 린트)와 확인하지 못한 것

## 7. 발행

승인받으면 한국어본과 영문본 모두 `published: true`로 바꾸고, 글, 영문본, 썸네일을 한 커밋으로 묶는다(메시지 예: `📝 Publish <slug>`). **푸시는 사용자가 따로 요청할 때만 한다.**

푸시하면 `.github/workflows/notify-push.yaml`이 `published: false → true` 전환을 감지해 구독자에게 웹 푸시를 보낸다. 한 번 나가면 되돌릴 수 없으니 푸시 전에 이 점을 사용자에게 알린다. 발송이 실패하면 `gh workflow run notify-push.yaml -f files=<경로>`로 수동 발송한다.
