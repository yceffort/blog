//! remark-cjk-friendly 2.3.1 (micromark-extension-cjk-friendly 2.0.1,
//! micromark-extension-cjk-friendly-util 3.0.1) 의 문자 분류 이식.
//!
//! 강조(`*`, `_`) 시퀀스가 열리고 닫힐 수 있는지 판정할 때 CJK 문자와
//! CJK 문장 부호를 CommonMark 와 다르게 취급한다.
//! <https://github.com/tats-u/markdown-cjk-friendly/blob/main/specification.md>

use crate::util::unicode::PUNCTUATION;
use east_asian_width::east_asian_width_type;
use unicode_properties::{EmojiStatus, UnicodeEmoji};
use unicode_script::{Script, UnicodeScript};

pub const WHITESPACE: u32 = 1;
pub const PUNCTUATION_BIT: u32 = 2;
pub const SPACE_OR_PUNCTUATION: u32 = 3;
pub const CJK: u32 = 4096;
pub const CJK_PUNCTUATION: u32 = 4098;
pub const IVS: u32 = 8192;
pub const CJK_OR_IVS: u32 = 12288;
pub const NON_EMOJI_GENERAL_USE_VS: u32 = 16384;

fn is_emoji_presentation(c: char) -> bool {
    matches!(
        c.emoji_status(),
        EmojiStatus::EmojiPresentation
            | EmojiStatus::EmojiPresentationAndModifierBase
            | EmojiStatus::EmojiPresentationAndEmojiComponent
            | EmojiStatus::EmojiPresentationAndModifierAndEmojiComponent
    )
}

/// `Some(true)` 면 CJK, `None` 이면 IVS(Ideographic Variation Selector), `Some(false)` 면 둘 다 아님.
fn cjk_or_ivs(c: char) -> Option<bool> {
    let uc = c as u32;
    if uc < 4352 {
        return Some(false);
    }
    match east_asian_width_type(uc) {
        "fullwidth" | "halfwidth" => Some(true),
        "wide" => Some(!is_emoji_presentation(c)),
        "narrow" => Some(false),
        "ambiguous" => {
            if (917_760..=917_999).contains(&uc) {
                None
            } else {
                Some(false)
            }
        }
        _ => Some(c.script() == Script::Hangul),
    }
}

/// `\p{P}|\p{S}` (CommonMark 0.31 의 Unicode punctuation).
fn is_unicode_punctuation(c: char) -> bool {
    c.is_ascii_punctuation() || PUNCTUATION.binary_search(&c).is_ok()
}

/// JS 의 `/\s/` 와 같게: Rust `is_whitespace` 에 U+FEFF 를 더한다.
fn is_unicode_whitespace(c: char) -> bool {
    c.is_whitespace() || c == '\u{feff}'
}

/// `classifyCharacter`: 공백(1), 문장 부호(2), CJK(4096), IVS(8192),
/// 이모지가 아닌 범용 variation selector(16384) 의 비트 조합. eof 는 공백.
pub fn classify(c: Option<char>) -> u32 {
    let Some(c) = c else {
        return WHITESPACE;
    };
    if is_unicode_whitespace(c) {
        return WHITESPACE;
    }
    let mut value = 0;
    let uc = c as u32;
    if uc >= 4352 {
        if (0xFE00..=0xFE0E).contains(&uc) {
            return NON_EMOJI_GENERAL_USE_VS;
        }
        match cjk_or_ivs(c) {
            None => return IVS,
            Some(true) => value |= CJK,
            Some(false) => {}
        }
    }
    if is_unicode_punctuation(c) {
        value |= PUNCTUATION_BIT;
    }
    value
}

/// `classifyPrecedingCharacter`: 앞 글자가 범용 variation selector 이면
/// 그 앞 글자(본체)의 분류를 대신 쓴다.
pub fn classify_preceding(before: u32, two_previous: Option<char>, previous: Option<char>) -> u32 {
    if before != NON_EMOJI_GENERAL_USE_VS {
        return before;
    }
    let Some(main) = two_previous else {
        return before;
    };
    let two_before = classify(Some(main));
    if two_before & WHITESPACE != 0 {
        return before;
    }
    if previous == Some('\u{fe01}')
        && matches!(main, '\u{2018}' | '\u{2019}' | '\u{201c}' | '\u{201d}')
    {
        return CJK_PUNCTUATION;
    }
    two_before & !IVS
}

/// 시퀀스 양옆 글자로 `(open, close)` 를 판정한다 (`tokenizeAttention` 의 `inside`).
///
/// `marker` 는 `*` 또는 `_`. `before_is_marker`/`after_is_marker` 는 micromark 의
/// `attentionMarkers.includes(...)` 에 해당한다.
pub fn flanking(
    marker: u8,
    before_char: Option<char>,
    two_before_char: Option<char>,
    after_char: Option<char>,
    before_is_marker: bool,
    after_is_marker: bool,
) -> (bool, bool) {
    let before = classify(before_char);
    let before_primary = classify_preceding(before, two_before_char, before_char);
    let after = classify(after_char);

    let before_non_cjk_punctuation = (before_primary & CJK_PUNCTUATION) == PUNCTUATION_BIT;
    let before_space_or_non_cjk_punctuation =
        before_non_cjk_punctuation || before_primary & WHITESPACE != 0;
    let after_non_cjk_punctuation = (after & CJK_PUNCTUATION) == PUNCTUATION_BIT;
    let after_space_or_non_cjk_punctuation =
        after_non_cjk_punctuation || after & WHITESPACE != 0;
    let before_cjk_or_ivs = before_primary & CJK_OR_IVS != 0;

    let open = !after_space_or_non_cjk_punctuation
        || (after_non_cjk_punctuation
            && (before_space_or_non_cjk_punctuation || before_cjk_or_ivs))
        || after_is_marker;
    let close = !before_space_or_non_cjk_punctuation
        || (before_non_cjk_punctuation
            && (after_space_or_non_cjk_punctuation || after & CJK != 0))
        || before_is_marker;

    if marker == b'*' {
        (open, close)
    } else {
        (
            open && (before_primary & SPACE_OR_PUNCTUATION != 0 || !close),
            close && (after & SPACE_OR_PUNCTUATION != 0 || !open),
        )
    }
}
