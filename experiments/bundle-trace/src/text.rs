use anyhow::{Result, anyhow, ensure};

/// CDP offsets and JS source-map columns count UTF-16 code units, not UTF-8 bytes.
pub struct TextIndex {
    boundaries: Vec<Option<usize>>,
    byte_boundaries: Vec<(usize, usize)>,
    lines: Vec<(usize, usize)>,
}

impl TextIndex {
    pub fn new(text: &str) -> Self {
        let mut boundaries = vec![Some(0)];
        let mut lines = Vec::new();
        let mut line_start = 0;
        let mut chars = text.char_indices().peekable();
        while let Some((byte, ch)) = chars.next() {
            let position = boundaries.len() - 1;
            if ch.len_utf16() == 2 {
                boundaries.push(None);
            }
            boundaries.push(Some(byte + ch.len_utf8()));
            if ch == '\r' {
                lines.push((line_start, position));
                if chars.peek().is_some_and(|(_, next)| *next == '\n') {
                    let (byte, _) = chars.next().unwrap();
                    boundaries.push(Some(byte + 1));
                }
                line_start = boundaries.len() - 1;
            } else if matches!(ch, '\n' | '\u{2028}' | '\u{2029}') {
                lines.push((line_start, position));
                line_start = boundaries.len() - 1;
            }
        }
        lines.push((line_start, boundaries.len() - 1));
        let byte_boundaries = boundaries
            .iter()
            .enumerate()
            .filter_map(|(unit, byte)| byte.map(|byte| (byte, unit)))
            .collect();
        Self {
            boundaries,
            byte_boundaries,
            lines,
        }
    }

    pub fn utf16(&self, byte: usize) -> Result<usize> {
        self.byte_boundaries
            .binary_search_by_key(&byte, |&(byte, _)| byte)
            .map(|index| self.byte_boundaries[index].1)
            .map_err(|_| anyhow!("invalid UTF-8 boundary {byte}"))
    }

    pub fn utf16_len(&self) -> usize {
        self.boundaries.len() - 1
    }

    pub fn byte(&self, offset: usize) -> Result<usize> {
        self.boundaries
            .get(offset)
            .copied()
            .flatten()
            .ok_or_else(|| {
                anyhow!("invalid UTF-16 offset {offset}: outside source or inside a surrogate pair")
            })
    }

    pub fn position(&self, line: u32, column: u32) -> Result<usize> {
        let &(start, end) = self
            .lines
            .get(line as usize)
            .ok_or_else(|| anyhow!("source-map line {line} is outside generated source"))?;
        let offset = start + column as usize;
        ensure!(
            offset <= end,
            "source-map column {column} exceeds line {line}"
        );
        self.byte(offset)
    }

    pub fn line_end(&self, line: u32) -> Result<usize> {
        let &(_, end) = self
            .lines
            .get(line as usize)
            .ok_or_else(|| anyhow!("source-map line {line} is outside generated source"))?;
        self.byte(end)
    }
}
