//! Import adapters deliberately keep missing capture-time evidence missing.
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result, bail, ensure};
use serde::{Deserialize, Serialize};

use crate::coverage::{self, CoverageFile, FunctionCoverage, Interval};
use crate::text::TextIndex;

#[derive(Debug, Default)]
pub struct InputOptions {
    pub url_prefixes: Vec<String>,
    pub script_paths: BTreeMap<String, String>,
    pub allow_unverified: bool,
}

#[derive(Debug)]
pub enum Ranges {
    V8(Vec<FunctionCoverage>),
    Used(Vec<Interval>),
}

#[derive(Debug)]
pub struct Observation {
    pub scenario: String,
    pub format: &'static str,
    pub hash: Option<String>,
    pub source: Option<String>,
    // Some(None) means the capture explicitly had no map; None means unknown.
    pub map_hash: Option<Option<String>>,
    pub ranges: Ranges,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Verification {
    pub scenario: String,
    pub format: String,
    pub source: &'static str,
    pub source_map: &'static str,
}

impl Observation {
    pub fn verify(
        &self,
        path: &str,
        content: &str,
        hash: &str,
        map_hash: &Option<String>,
        allow_unverified: bool,
    ) -> Result<Verification> {
        let source = if let Some(expected) = &self.hash {
            ensure!(
                expected == hash,
                "{path}: coverage SHA-256 mismatch; collect against this exact build"
            );
            "sha256"
        } else if let Some(expected) = &self.source {
            ensure!(
                expected == content,
                "{path}: coverage source text mismatch; collect against this exact build"
            );
            "source-text"
        } else {
            ensure!(
                allow_unverified,
                "{path}: coverage contains no source text or capture hash; provide a hash-bound envelope, or explicitly use --allow-unverified for this exact build"
            );
            "unverified"
        };
        let source_map = if let Some(expected) = &self.map_hash {
            ensure!(
                expected == map_hash,
                "{path}: source-map SHA-256 mismatch (or missing binding); collect against this exact map"
            );
            "capture-bound"
        } else {
            "unverified"
        };
        Ok(Verification {
            scenario: self.scenario.clone(),
            format: self.format.into(),
            source,
            source_map,
        })
    }

    pub fn used(&self, text: &TextIndex) -> Result<Vec<Interval>> {
        match &self.ranges {
            Ranges::V8(functions) => coverage::used_ranges(functions, text),
            Ranges::Used(ranges) => {
                for range in ranges {
                    ensure!(range.start <= range.end, "reversed coverage range");
                    text.byte(range.start)?;
                    text.byte(range.end)?;
                }
                Ok(coverage::union(
                    ranges.iter().copied().filter(|r| r.start < r.end).collect(),
                ))
            }
        }
    }
}

pub type Index = BTreeMap<String, Vec<Observation>>;

#[derive(Deserialize)]
struct StandardEntry {
    url: String,
    source: Option<String>,
    text: Option<String>,
    functions: Option<Vec<FunctionCoverage>>,
    ranges: Option<Vec<UsedRange>>,
}

#[derive(Deserialize)]
struct UsedRange {
    start: usize,
    end: usize,
}

fn local_path(url: &str, root: &Path, options: &InputOptions) -> Result<Option<String>> {
    if let Some(path) = options.script_paths.get(url) {
        coverage::validate_path(path)?;
        return Ok(Some(path.clone()));
    }
    let clean = url.split(['?', '#']).next().unwrap_or(url);
    // Longest prefix wins; a trailing slash prevents matching an adjacent path.
    if let Some(prefix) = options
        .url_prefixes
        .iter()
        .filter(|p| clean.starts_with(p.as_str()))
        .max_by_key(|p| p.len())
    {
        ensure!(
            prefix.ends_with('/'),
            "--url-prefix must end with /: {prefix}"
        );
        let path = percent_encoding::percent_decode_str(&clean[prefix.len()..])
            .decode_utf8()?
            .into_owned();
        coverage::validate_path(&path)?;
        return Ok(Some(path));
    }
    if let Some(path) = clean.strip_prefix("file://") {
        // Only local absolute file URLs. No hostnames or network reads.
        if !path.starts_with('/') {
            return Ok(None);
        }
        let path = PathBuf::from(
            percent_encoding::percent_decode_str(path)
                .decode_utf8()?
                .as_ref(),
        );
        let root = fs::canonicalize(root)?;
        if let Ok(relative) = path.strip_prefix(root) {
            let relative = relative.to_string_lossy().replace('\\', "/");
            coverage::validate_path(&relative)?;
            return Ok(Some(relative));
        }
        return Ok(None);
    }
    if !clean.is_empty() && !clean.contains(':') && !clean.starts_with('/') {
        coverage::validate_path(clean)?;
        return Ok(Some(clean.into()));
    }
    Ok(None)
}

pub fn load(
    paths: &[PathBuf],
    root: &Path,
    options: &InputOptions,
) -> Result<(Index, Vec<String>, Vec<String>)> {
    for prefix in &options.url_prefixes {
        ensure!(
            prefix.ends_with('/'),
            "--url-prefix must end with /: {prefix}"
        );
    }
    let mut index: Index = BTreeMap::new();
    let mut scenarios = Vec::new();
    let mut warnings = Vec::new();
    for path in paths {
        let value: serde_json::Value = serde_json::from_slice(&fs::read(path)?)
            .with_context(|| format!("read coverage {}", path.display()))?;
        if value.get("schemaVersion").is_some() {
            let file: CoverageFile =
                serde_json::from_value(value).context("invalid bundle-trace coverage envelope")?;
            ensure!(
                file.schema_version == 1,
                "unsupported coverage schema version"
            );
            ensure!(
                !file.scenario.trim().is_empty(),
                "coverage scenario cannot be empty"
            );
            scenarios.push(file.scenario.clone());
            for script in file.scripts {
                coverage::validate_path(&script.path)?;
                index.entry(script.path).or_default().push(Observation {
                    scenario: file.scenario.clone(),
                    format: "bundle-trace",
                    hash: Some(script.sha256),
                    source: None,
                    map_hash: Some(script.source_map_sha256),
                    ranges: Ranges::V8(script.functions),
                });
            }
            continue;
        }
        let entries = if let Some(entries) = value.as_array() {
            entries
        } else if let Some(entries) = value.get("result").and_then(|v| v.as_array()) {
            entries
        } else {
            bail!(
                "{}: unsupported coverage format; expected a bundle-trace envelope, V8 {{result:[...]}}, or a DevTools/Playwright array",
                path.display()
            );
        };
        let scenario = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();
        scenarios.push(scenario.clone());
        let mut matched = 0;
        for value in entries {
            let url = value
                .get("url")
                .and_then(|v| v.as_str())
                .context("coverage entry has no string url")?;
            let Some(local) = local_path(url, root, options)? else {
                warnings.push(format!(
                    "{}: skipped coverage URL {url:?}; use --url-prefix or --script-map to bind it",
                    path.display()
                ));
                continue;
            };
            if !matches!(
                Path::new(&local).extension().and_then(|x| x.to_str()),
                Some("js" | "mjs" | "cjs")
            ) {
                warnings.push(format!("skipped non-JavaScript coverage URL {url:?}"));
                continue;
            }
            let entry: StandardEntry = serde_json::from_value(value.clone())
                .with_context(|| format!("invalid coverage entry {url}"))?;
            let (ranges, format) = if let Some(functions) = entry.functions {
                (
                    Ranges::V8(functions),
                    if entry.source.is_some() {
                        "playwright-v8"
                    } else {
                        "v8"
                    },
                )
            } else if let Some(ranges) = entry.ranges {
                ensure!(
                    entry.text.is_some() || entry.source.is_some(),
                    "{}: DevTools ranges require source text",
                    entry.url
                );
                (
                    Ranges::Used(
                        ranges
                            .into_iter()
                            .map(|r| Interval {
                                start: r.start,
                                end: r.end,
                            })
                            .collect(),
                    ),
                    "devtools",
                )
            } else {
                bail!("{}: coverage entry needs functions or ranges", entry.url);
            };
            matched += 1;
            index.entry(local).or_default().push(Observation {
                scenario: scenario.clone(),
                format,
                hash: None,
                source: entry.source.or(entry.text),
                map_hash: None,
                ranges,
            });
        }
        ensure!(
            matched > 0 || entries.is_empty(),
            "{}: no JavaScript coverage entries matched --dir; configure --url-prefix or --script-map",
            path.display()
        );
    }
    Ok((index, scenarios, warnings))
}
