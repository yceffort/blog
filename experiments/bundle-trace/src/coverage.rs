use std::path::{Component, Path};

use anyhow::{Result, ensure};
use serde::Deserialize;

use crate::text::TextIndex;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Interval {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageFile {
    pub schema_version: u32,
    pub scenario: String,
    pub scripts: Vec<ScriptCoverage>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptCoverage {
    pub path: String,
    pub sha256: String,
    pub source_map_sha256: Option<String>,
    pub functions: Vec<FunctionCoverage>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FunctionCoverage {
    pub is_block_coverage: bool,
    pub ranges: Vec<CoverageRange>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageRange {
    pub start_offset: usize,
    pub end_offset: usize,
    pub count: u64,
}

pub fn validate_path(path: &str) -> Result<()> {
    ensure!(
        !path.is_empty() && !path.contains('\\'),
        "coverage path must be a relative slash-separated path"
    );
    ensure!(
        Path::new(path)
            .components()
            .all(|part| matches!(part, Component::Normal(_))),
        "coverage path must not contain absolute paths, . or ..: {path}"
    );
    Ok(())
}

/// A child range overrides its parent. Unioning all zero-count ranges is wrong:
/// an unexecuted outer function can contain a hoisted function called elsewhere.
pub fn used_ranges(functions: &[FunctionCoverage], text: &TextIndex) -> Result<Vec<Interval>> {
    let mut ranges = Vec::new();
    for function in functions {
        ensure!(
            !function.ranges.is_empty(),
            "function has no coverage ranges"
        );
        let root = function.ranges[0];
        for range in &function.ranges {
            ensure!(
                range.start_offset <= range.end_offset,
                "reversed coverage range"
            );
            ensure!(
                range.start_offset >= root.start_offset && range.end_offset <= root.end_offset,
                "block range falls outside its function"
            );
            text.byte(range.start_offset)?;
            text.byte(range.end_offset)?;
            if range.start_offset != range.end_offset {
                ranges.push(*range);
            }
        }
    }
    ranges.sort_by_key(|range| (range.start_offset, std::cmp::Reverse(range.end_offset)));
    let mut stack: Vec<CoverageRange> = Vec::new();
    let mut used = Vec::new();
    let mut cursor = 0;
    let append = |end: usize, count: u64, cursor: &mut usize, used: &mut Vec<Interval>| {
        if count > 0 && end > *cursor {
            used.push(Interval {
                start: *cursor,
                end,
            });
        }
        *cursor = end;
    };
    for range in ranges {
        while stack
            .last()
            .is_some_and(|top| top.end_offset <= range.start_offset)
        {
            let top = stack.pop().unwrap();
            append(top.end_offset, top.count, &mut cursor, &mut used);
        }
        if let Some(parent) = stack.last() {
            ensure!(
                range.end_offset <= parent.end_offset,
                "crossing coverage ranges are unsupported"
            );
        }
        append(
            range.start_offset,
            stack.last().map_or(0, |top| top.count),
            &mut cursor,
            &mut used,
        );
        stack.push(range);
    }
    while let Some(top) = stack.pop() {
        append(top.end_offset, top.count, &mut cursor, &mut used);
    }
    Ok(union(used))
}

pub fn union(mut ranges: Vec<Interval>) -> Vec<Interval> {
    ranges.sort_by_key(|range| (range.start, range.end));
    let mut merged: Vec<Interval> = Vec::new();
    for range in ranges {
        if let Some(last) = merged.last_mut().filter(|last| range.start <= last.end) {
            last.end = last.end.max(range.end);
        } else {
            merged.push(range);
        }
    }
    merged
}
