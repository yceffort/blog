# markdown-rs 1.0.0 로컬 패치

원본: https://crates.io/crates/markdown/1.0.0 (MIT, Titus Wormer). `license` 파일 참고.

| 파일                           | 변경                                                                                                                                       | 이유                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cargo.toml`                   | `east-asian-width`, `unicode-properties`, `unicode-script` 의존성 추가                                                                     | 아래 CJK 분류에 필요                                                                                                                                             |
| `src/util/cjk.rs`              | 신규 파일. `micromark-extension-cjk-friendly` 2.0.1 의 문자 분류(`classifyCharacter`, `classifyPrecedingCharacter`)와 open/close 판정 이식 | 블로그가 `remark-cjk-friendly` 를 쓰므로 `**강조**는` 같은 한글 인접 강조가 같은 결과여야 한다                                                                   |
| `src/construct/attention.rs`   | `get_sequences()` 에서 `*`/`_` 시퀀스의 open/close 를 `cjk::flanking()` 으로 판정. `~`(취소선)는 원래 규칙 유지                            | 위와 동일. remark-cjk-friendly 도 취소선은 건드리지 않는다                                                                                                       |
| `src/construct/heading_atx.rs` | `resolve()` 가 여는 시퀀스(와 뒤 공백) 바로 다음부터 본문으로 잡는다                                                                       | `### #1. 제목` 에서 안쪽 `#` 시퀀스가 첫 Data 앞에 있어 본문에서 빠졌다 (micromark 는 `#1. 제목`). 본문(Data)이 전혀 없는 `# # #` 같은 경우는 그대로 빈 제목이다 |
