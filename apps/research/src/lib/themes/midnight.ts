export const midnightTheme = `
/* @theme midnight */
@import 'default';

/* 다크 퍼스트: 일반 슬라이드가 다크, invert가 라이트 변형 */
section {
  color-scheme: dark;
  --bgColor-default: light-dark(#faf9fc, #171123);
  --bgColor-muted: light-dark(#f0edf6, #211936);
  --bgColor-neutral-muted: light-dark(#e6e1f0, #2b2244);
  --fgColor-default: light-dark(#2b2440, #ece7f8);
  --fgColor-muted: light-dark(#6f6590, #a89cc8);
  --fgColor-accent: light-dark(#7c3aed, #a78bfa);
  --borderColor-default: light-dark(#d8d0e8, #3d3160);
  --borderColor-muted: light-dark(#e4def0, #2e2549);
  --h1-color: light-dark(#6d28d9, #c4b5fd);
  --heading-strong-color: light-dark(#6d28d9, #c4b5fd);
}

section.invert {
  color-scheme: light;
}
`
