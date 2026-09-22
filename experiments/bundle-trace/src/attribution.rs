use anyhow::{Result, bail, ensure};
use serde::Serialize;
use sourcemap::DecodedMap;
use std::collections::BTreeMap;

use crate::text::TextIndex;

pub const UNMAPPED: &str = "[unmapped]";

#[derive(Debug)]
pub struct Segment {
    pub start: usize,
    pub end: usize,
    pub source: String,
    pub original: Option<OriginalPosition>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OriginalPosition {
    pub line: u32,
    pub column: u32,
}

pub struct Attribution {
    pub segments: Vec<Segment>,
    pub invalid_points: usize,
    pub contents: BTreeMap<String, String>,
}

/// Attribute each mapping to the next mapping on the SAME line or line end.
/// Prefixes, newlines, mapping gaps and bundler wrappers remain explicitly unmapped.
pub fn segments(data: &[u8], text: &TextIndex, byte_len: usize) -> Result<Vec<Segment>> {
    Ok(segments_with_diagnostics(data, text, byte_len)?.0)
}

pub fn segments_with_diagnostics(
    data: &[u8],
    text: &TextIndex,
    byte_len: usize,
) -> Result<(Vec<Segment>, usize)> {
    let result = decode(data, text, byte_len)?;
    Ok((result.segments, result.invalid_points))
}

pub fn decode(data: &[u8], text: &TextIndex, byte_len: usize) -> Result<Attribution> {
    decode_with_contents(data, text, byte_len, true)
}

pub fn decode_with_contents(
    data: &[u8],
    text: &TextIndex,
    byte_len: usize,
    retain_contents: bool,
) -> Result<Attribution> {
    validate_map(&serde_json::from_slice(data)?)?;
    let map = sourcemap::decode_slice(data)?;
    let mut decoder = Decoder {
        text,
        retain_contents,
        points: BTreeMap::new(),
        contents: BTreeMap::new(),
        invalid_points: 0,
    };
    decoder.collect(&map, (0, 0), None)?;
    let mut points = Vec::new();
    for ((line, column), (source, original)) in decoder.points {
        points.push((text.position(line, column)?, line, source, original));
    }
    let mut result = Vec::new();
    let mut cursor = 0;
    for (index, (start, line, source, original)) in points.iter().enumerate() {
        ensure!(*start >= cursor, "overlapping source-map segments");
        if *start > cursor {
            result.push(Segment {
                start: cursor,
                end: *start,
                source: UNMAPPED.into(),
                original: None,
            });
        }
        let end = points
            .get(index + 1)
            .filter(|(_, next_line, _, _)| next_line == line)
            .map(|(position, _, _, _)| *position)
            .unwrap_or(text.line_end(*line)?);
        if end > *start {
            result.push(Segment {
                start: *start,
                end,
                source: source.clone(),
                original: original.clone(),
            });
        }
        cursor = end;
    }
    if cursor < byte_len {
        result.push(Segment {
            start: cursor,
            end: byte_len,
            source: UNMAPPED.into(),
            original: None,
        });
    }
    Ok(Attribution {
        segments: result,
        invalid_points: decoder.invalid_points,
        contents: decoder.contents,
    })
}

type Position = (u32, u32);

fn offset_position(base: Position, local: Position) -> Result<Position> {
    Ok((
        base.0
            .checked_add(local.0)
            .ok_or_else(|| anyhow::anyhow!("source-map line overflow"))?,
        if local.0 == 0 {
            base.1
                .checked_add(local.1)
                .ok_or_else(|| anyhow::anyhow!("source-map column overflow"))?
        } else {
            local.1
        },
    ))
}

struct Decoder<'a> {
    text: &'a TextIndex,
    retain_contents: bool,
    points: BTreeMap<Position, (String, Option<OriginalPosition>)>,
    contents: BTreeMap<String, String>,
    invalid_points: usize,
}

impl Decoder<'_> {
    fn collect(&mut self, map: &DecodedMap, offset: Position, end: Option<Position>) -> Result<()> {
        match map {
            DecodedMap::Hermes(_) => bail!("Hermes source maps are unsupported"),
            DecodedMap::Index(index) => {
                let sections = index.sections().collect::<Vec<_>>();
                let starts = sections
                    .iter()
                    .map(|s| offset_position(offset, s.get_offset()))
                    .collect::<Result<Vec<_>>>()?;
                ensure!(
                    starts.windows(2).all(|pair| pair[0] < pair[1]),
                    "index-map sections must be strictly ordered"
                );
                for (i, section) in sections.iter().enumerate() {
                    let start = starts[i];
                    ensure!(
                        end.is_none_or(|end| start < end),
                        "index-map section starts outside its parent section"
                    );
                    self.text.position(start.0, start.1)?;
                    // A section boundary exists even if its map is empty or its
                    // first mapping starts later. Flattening loses this boundary.
                    self.points.insert(start, (UNMAPPED.into(), None));
                    self.collect(
                        section.get_sourcemap().ok_or_else(|| {
                            anyhow::anyhow!("index-map section has no embedded map")
                        })?,
                        start,
                        starts.get(i + 1).copied().or(end),
                    )?;
                }
            }
            DecodedMap::Regular(map) => {
                if self.retain_contents {
                    for i in 0..map.get_source_count() {
                        if let (Some(source), Some(content)) =
                            (map.get_source(i), map.get_source_contents(i))
                        {
                            if let Some(previous) = self.contents.get(source) {
                                ensure!(
                                    previous == content,
                                    "conflicting sourcesContent for {source}"
                                );
                            }
                            self.contents.insert(source.to_owned(), content.to_owned());
                        }
                    }
                }
                for token in map.tokens() {
                    let position =
                        offset_position(offset, (token.get_dst_line(), token.get_dst_col()))?;
                    ensure!(
                        end.is_none_or(|end| position <= end),
                        "source-map mapping overlaps the next section"
                    );
                    // A terminal mapping owns no bytes across a section boundary.
                    if end == Some(position) {
                        continue;
                    }
                    self.text.line_end(position.0)?;
                    if self.text.position(position.0, position.1).is_err() {
                        self.invalid_points += 1;
                        continue;
                    }
                    // At duplicate generated positions, the last mapping wins.
                    self.points.insert(
                        position,
                        (
                            token.get_source().unwrap_or(UNMAPPED).to_owned(),
                            token.get_source().map(|_| OriginalPosition {
                                line: token.get_src_line(),
                                column: token.get_src_col(),
                            }),
                        ),
                    );
                }
            }
        }
        Ok(())
    }
}

fn validate_map(map: &serde_json::Value) -> Result<()> {
    ensure!(
        map.get("version").and_then(|value| value.as_u64()) == Some(3),
        "source map must declare version 3"
    );
    if let Some(sections) = map.get("sections") {
        let sections = sections
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("sections must be an array"))?;
        let mut previous = None;
        for section in sections {
            let offset = section
                .get("offset")
                .ok_or_else(|| anyhow::anyhow!("index-map section has no offset"))?;
            let coordinate = |key: &str| -> Result<u32> {
                offset
                    .get(key)
                    .and_then(|v| v.as_u64())
                    .and_then(|v| u32::try_from(v).ok())
                    .ok_or_else(|| {
                        anyhow::anyhow!("index-map offset {key} must be a nonnegative u32")
                    })
            };
            let position = (coordinate("line")?, coordinate("column")?);
            ensure!(
                previous.is_none_or(|previous| previous < position),
                "index-map sections must be strictly ordered"
            );
            previous = Some(position);
            ensure!(
                section.get("url").is_none(),
                "external index-map sections are unsupported; supply embedded maps"
            );
            validate_map(
                section
                    .get("map")
                    .ok_or_else(|| anyhow::anyhow!("index-map section has no map"))?,
            )?;
        }
    } else {
        ensure!(
            map.get("sources").is_some_and(|value| value.is_array()),
            "source map has no sources array"
        );
        ensure!(
            map.get("mappings").is_some_and(|value| value.is_string()),
            "source map has no mappings string"
        );
    }
    Ok(())
}

pub fn package(source: &str) -> String {
    if source == UNMAPPED {
        return UNMAPPED.into();
    }
    let normalized = source.replace('\\', "/");
    if let Some((_, rest)) = normalized.rsplit_once("node_modules/") {
        let mut parts = rest.split('/');
        let first = parts.next().unwrap_or_default();
        if first.starts_with('@') {
            return format!("{first}/{}", parts.next().unwrap_or_default());
        }
        return first.to_owned();
    }
    "[application]".into()
}
