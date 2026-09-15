export const kakaoTheme = `
/* @theme kakao */
@import 'default';
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

/* 카카오 노랑과 먹색. 노랑은 여기 한 곳에서만 정의한다 */
section {
  --yellow: #fee500;
  --yellow-soft: #fff6bf;
  --ink: #191919;

  color-scheme: light;
  --bgColor-default: #fffdf7;
  --bgColor-muted: #fbf5dc;
  --bgColor-neutral-muted: #f3ecc9;
  --fgColor-default: var(--ink);
  --fgColor-muted: #6b6455;
  --fgColor-accent: #8a6d00;
  --borderColor-default: #e6dfc0;
  --borderColor-muted: #efe9d2;
  --h1-color: var(--ink);
  --heading-strong-color: var(--ink);
  --paginate-color: #a89f86;

  font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
  font-size: 28px;
  line-height: 1.55;
  letter-spacing: -0.01em;
  word-break: keep-all;
}

/* 모든 슬라이드 상단의 노랑 띠 */
section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 10px;
  background: var(--yellow);
}

section::after {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
}

section h1,
section h2,
section h3 {
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.25;
  border-bottom: none;
}
section h1 {
  font-size: 56px;
}
section h2 {
  font-size: 40px;
  padding: 0 0 0 20px;
  border-left: 10px solid var(--yellow);
  margin-bottom: 22px;
}
section h3 {
  font-size: 30px;
}

/* 형광펜 강조 */
section strong {
  color: var(--ink);
  font-weight: 800;
  background: linear-gradient(transparent 58%, var(--yellow) 58%);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  padding: 0 2px;
}

section a {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--yellow);
  text-decoration-thickness: 4px;
  text-underline-offset: 5px;
  text-decoration-skip-ink: none;
}

section li::marker {
  color: #b39a00;
}
section li {
  margin-bottom: 4px;
}

section code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.86em;
  background: var(--yellow-soft);
  color: var(--ink);
  padding: 2px 7px;
  border-radius: 6px;
}
section pre {
  --color-prettylights-syntax-comment: #9198a1;
  --color-prettylights-syntax-constant: #79c0ff;
  --color-prettylights-syntax-entity: #d2a8ff;
  --color-prettylights-syntax-entity-tag: #7ee787;
  --color-prettylights-syntax-keyword: #ff7b72;
  --color-prettylights-syntax-string: #a5d6ff;
  --color-prettylights-syntax-string-regexp: #7ee787;
  --color-prettylights-syntax-variable: #ffa657;
  --color-prettylights-syntax-markup-bold: #f0f6fc;
  --color-prettylights-syntax-storage-modifier-import: #f0f6fc;
  background: var(--ink);
  color: #f0f0f0;
  border-radius: 14px;
  padding: 16px 22px;
  font-size: 0.72em;
  line-height: 1.5;
  border-top: 6px solid var(--yellow);
}
section pre code {
  background: none;
  color: inherit;
  padding: 0;
  font-size: 1em;
}

section p > img:only-child {
  display: block;
  margin: 0 auto;
  border: 1px solid var(--borderColor-default);
  border-radius: 10px;
}

section blockquote {
  border-left: 8px solid var(--yellow);
  background: #fffbe8;
  color: #4a4538;
  padding: 14px 22px;
  border-radius: 0 12px 12px 0;
  font-size: 0.92em;
}

section table {
  font-size: 0.8em;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--borderColor-default);
}
section table th {
  background: var(--ink);
  color: #fff;
  font-weight: 700;
  border: none;
  padding: 10px 16px;
}
section table td {
  border: none;
  border-top: 1px solid var(--borderColor-muted);
  padding: 9px 16px;
}
section table tr:nth-child(2n) {
  background: #fdf9e9;
}

/* invert: 노랑 전면 */
section.invert {
  --bgColor-default: var(--yellow);
  --bgColor-muted: #f5dc00;
  --bgColor-neutral-muted: #e9d100;
  --fgColor-muted: #5c5200;
  --fgColor-accent: #3c1e1e;
  --borderColor-default: #d9c400;
  --borderColor-muted: #e6d000;
  --paginate-color: #6b6000;
}
section.invert::before {
  background: var(--ink);
}
section.invert strong {
  background: none;
}
section.invert h2 {
  border-left-color: var(--ink);
}

/* 덱에서 쓰는 레이아웃 클래스 */
section.lead {
  text-align: center;
  place-content: safe center center;
}
section.lead h1 {
  font-size: 60px;
  line-height: 1.25;
}
section.lead h2 {
  font-size: 32px;
  font-weight: 500;
  border: none;
  padding: 0;
  color: #3a3400;
}
section.lead p {
  font-family: inherit;
  font-size: 22px;
  color: #5c5200;
  letter-spacing: normal;
  text-transform: uppercase;
}

section.part {
  place-content: safe center start;
}
section.part h1 {
  font-size: 68px;
}
section.part h2 {
  font-size: 30px;
  font-weight: 500;
  border: none;
  padding: 0;
  color: #3a3400;
}

section.big h2 {
  font-size: 40px;
  line-height: 1.4;
}

section.punch {
  text-align: center;
  place-content: safe center center;
}
section.punch h1 {
  font-size: 64px;
}
section.punch h2 {
  border: none;
  padding: 0;
  font-size: 36px;
  font-weight: 600;
}

section.you {
  --bgColor-default: var(--yellow-soft);
}
section.you h2 {
  border-left-color: var(--ink);
}

section.map {
  --bgColor-default: #f7f3e4;
}
`
