//! github-slugger 2.0.0 이식. rehype-slug 와 mdast-util-toc 가 같은 규칙으로 앵커 id 를 만든다.

use std::collections::HashMap;

use crate::slug_table::REMOVED;

fn is_removed(c: char) -> bool {
    let cp = c as u32;
    REMOVED
        .binary_search_by(|(start, end)| {
            if cp < *start {
                std::cmp::Ordering::Greater
            } else if cp > *end {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Equal
            }
        })
        .is_ok()
}

/// 중복을 추적하지 않는 슬러그.
pub fn slug(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .filter(|c| !is_removed(*c))
        .map(|c| if c == ' ' { '-' } else { c })
        .collect()
}

/// 같은 값이 반복되면 `-1`, `-2` 를 붙이는 슬러거.
#[derive(Default)]
pub struct Slugger {
    occurrences: HashMap<String, u32>,
}

impl Slugger {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn slug(&mut self, value: &str) -> String {
        let original = slug(value);
        let mut result = original.clone();
        while self.occurrences.contains_key(&result) {
            let count = self.occurrences.entry(original.clone()).or_insert(0);
            *count += 1;
            result = format!("{original}-{count}");
        }
        self.occurrences.insert(result.clone(), 0);
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_github_slugger() {
        assert_eq!(slug("Hello World!"), "hello-world");
        assert_eq!(slug("한글 제목 (괄호)"), "한글-제목-괄호");
        assert_eq!(slug("foo_bar-baz"), "foo_bar-baz");
        assert_eq!(slug("`code` and $math$"), "code-and-math");
        let mut slugger = Slugger::new();
        assert_eq!(slugger.slug("a"), "a");
        assert_eq!(slugger.slug("a"), "a-1");
        assert_eq!(slugger.slug("a"), "a-2");
        assert_eq!(slugger.slug("a-1"), "a-1-1");
    }
}
