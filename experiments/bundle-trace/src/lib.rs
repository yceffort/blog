pub mod attribution;
pub mod ci;
pub mod coverage;
pub mod input;
pub mod maps;
pub mod metadata;
pub mod report;
pub mod text;

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, ensure};
use serde::Serialize;
use sha2::{Digest, Sha256};

use attribution::{Segment, UNMAPPED};
use coverage::Interval;
use text::TextIndex;

#[derive(Debug, Default, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Counts {
    pub bytes: usize,
    pub observed_bytes: usize,
    pub unobserved_bytes: usize,
    pub unmeasured_bytes: usize,
}

impl Counts {
    fn add(&mut self, other: &Self) {
        self.bytes += other.bytes;
        self.observed_bytes += other.observed_bytes;
        self.unobserved_bytes += other.unobserved_bytes;
        self.unmeasured_bytes += other.unmeasured_bytes;
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRow {
    pub source: String,
    pub package: String,
    #[serde(flatten)]
    pub counts: Counts,
}

#[derive(Debug, Serialize)]
pub struct PackageRow {
    pub package: String,
    #[serde(flatten)]
    pub counts: Counts,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleRow {
    pub path: String,
    pub sha256: String,
    pub source_map_sha256: Option<String>,
    pub utf16_units: usize,
    pub observed_utf16_units: Option<usize>,
    pub mapped_bytes: usize,
    pub verification: Vec<input::Verification>,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub generated_source: String,
    pub sources: Vec<BundleSource>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub spans: Vec<Span>,
    pub compression: Option<ci::CompressedSizes>,
    #[serde(flatten)]
    pub counts: Counts,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleSource {
    pub source: String,
    pub package: String,
    pub content: Option<String>,
    #[serde(flatten)]
    pub counts: Counts,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Observed,
    Unobserved,
    Unmeasured,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Span {
    /// Half-open generated UTF-8 byte offsets.
    pub start: usize,
    pub end: usize,
    /// Half-open generated UTF-16 offsets for JavaScript string slicing.
    pub start_utf16: usize,
    pub end_utf16: usize,
    /// Index into the parent bundle's sources array.
    pub source: usize,
    pub status: Status,
    /// Zero-based source-map anchor, not a recovered original coverage range.
    pub original: Option<attribution::OriginalPosition>,
}

#[derive(Debug)]
pub struct AnalyzeOptions {
    pub input: input::InputOptions,
    pub maps: BTreeMap<String, PathBuf>,
    pub include: Vec<String>,
    pub exclude: Vec<String>,
    pub compression: bool,
    pub details: bool,
}

impl Default for AnalyzeOptions {
    fn default() -> Self {
        Self {
            input: Default::default(),
            maps: Default::default(),
            include: Vec::new(),
            exclude: Vec::new(),
            compression: false,
            details: true,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub schema_version: u32,
    pub details: bool,
    pub metric: &'static str,
    pub attribution: &'static str,
    pub scenarios: Vec<String>,
    pub totals: Counts,
    pub bundles: Vec<BundleRow>,
    pub sources: Vec<SourceRow>,
    pub packages: Vec<PackageRow>,
    pub warnings: Vec<String>,
    pub excluded_bundles: Vec<String>,
    pub include: Vec<String>,
    pub exclude: Vec<String>,
    pub compression: Option<ci::CompressedSizes>,
    pub budget_failures: Vec<String>,
    pub compression_settings: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub import_paths: Option<Vec<metadata::ImportPath>>,
}

impl Report {
    pub fn strip_details(&mut self) {
        self.details = false;
        for bundle in &mut self.bundles {
            bundle.generated_source.clear();
            bundle.spans.clear();
            for source in &mut bundle.sources {
                source.content = None;
            }
        }
    }
}

pub fn sha256(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn javascript_files(dir: &Path, paths: &mut Vec<PathBuf>) -> Result<()> {
    for entry in fs::read_dir(dir).with_context(|| format!("read {}", dir.display()))? {
        let entry = entry?;
        let kind = entry.file_type()?;
        if kind.is_dir() {
            javascript_files(&entry.path(), paths)?;
        } else if kind.is_file()
            && matches!(
                entry.path().extension().and_then(|ext| ext.to_str()),
                Some("js" | "mjs" | "cjs")
            )
        {
            paths.push(entry.path());
        }
    }
    Ok(())
}

pub fn analyze(dir: &Path, coverage_files: &[PathBuf]) -> Result<Report> {
    analyze_with_options(dir, coverage_files, &AnalyzeOptions::default())
}

pub fn analyze_with_options(
    dir: &Path,
    coverage_files: &[PathBuf],
    options: &AnalyzeOptions,
) -> Result<Report> {
    let (mut coverage, scenarios, warnings) = input::load(coverage_files, dir, &options.input)?;
    let mut files = Vec::new();
    javascript_files(dir, &mut files)?;
    files.sort();
    ensure!(
        !files.is_empty(),
        "no JavaScript files in {}",
        dir.display()
    );
    let mut report = Report {
        schema_version: 2,
        details: options.details,
        metric: "utf8-generated-source-bytes",
        attribution: "mapping-to-next-mapping-on-same-line; remaining bytes unmapped",
        scenarios,
        totals: Counts::default(),
        bundles: Vec::new(),
        sources: Vec::new(),
        packages: Vec::new(),
        warnings,
        excluded_bundles: Vec::new(),
        include: options.include.clone(),
        exclude: options.exclude.clone(),
        compression: options.compression.then(ci::CompressedSizes::default),
        budget_failures: Vec::new(),
        compression_settings: options.compression.then_some("gzip level=6 (flate2 default Rust backend); Brotli quality=5 lgwin=22; independent whole files"),
        import_paths: None,
    };
    for path in options.maps.keys() {
        coverage::validate_path(path)?;
        ensure!(
            files.iter().any(|file| file
                .strip_prefix(dir)
                .is_ok_and(|p| p.to_string_lossy().replace('\\', "/") == *path)),
            "explicit map references file missing from --dir: {path}"
        );
    }
    let mut source_counts: BTreeMap<String, Counts> = BTreeMap::new();
    let include = ci::globs(&options.include)?;
    let exclude = ci::globs(&options.exclude)?;
    for file in files {
        let path = file.strip_prefix(dir)?.to_string_lossy().replace('\\', "/");
        if (!options.include.is_empty() && !include.is_match(&path)) || exclude.is_match(&path) {
            coverage.remove(&path);
            report.excluded_bundles.push(path);
            continue;
        }
        let content =
            fs::read_to_string(&file).with_context(|| format!("read UTF-8 source {path}"))?;
        let text = TextIndex::new(&content);
        let hash = sha256(content.as_bytes());
        let map_data = maps::load(&file, &content, dir, options.maps.get(&path))
            .with_context(|| format!("locate source map for {path}"))?;
        let (segments, map_hash, mut contents) = if let Some(data) = map_data {
            let attribution::Attribution {
                segments,
                invalid_points,
                contents,
            } = attribution::decode_with_contents(&data, &text, content.len(), options.details)
                .with_context(|| format!("decode source map for {path}"))?;
            if invalid_points > 0 {
                report.warnings.push(format!("{path}: ignored {invalid_points} mapping points outside their line or inside a surrogate pair; attribution is approximate"));
            }
            (segments, Some(sha256(&data)), contents)
        } else {
            report
                .warnings
                .push(format!("{path}: no source map; entire source is unmapped"));
            (
                vec![Segment {
                    start: 0,
                    end: content.len(),
                    source: UNMAPPED.into(),
                    original: None,
                }],
                None,
                BTreeMap::new(),
            )
        };
        let observations = coverage.remove(&path);
        let mut used = Vec::new();
        let mut verification = Vec::new();
        if let Some(observations) = &observations {
            for observation in observations {
                let binding = observation.verify(
                    &path,
                    &content,
                    &hash,
                    &map_hash,
                    options.input.allow_unverified,
                )?;
                if binding.source == "unverified" || binding.source_map == "unverified" {
                    report.warnings.push(format!("{path}: {} verification: source={}, source-map={}; current file hashes do not prove capture-time identity", observation.scenario, binding.source, binding.source_map));
                }
                verification.push(binding);
                if let input::Ranges::V8(functions) = &observation.ranges {
                    if functions.iter().any(|function| {
                        !function.is_block_coverage
                            && function.ranges.iter().any(|range| range.count > 0)
                    }) {
                        report.warnings.push(format!("{path}: executed function has function-only coverage; block detail unavailable"));
                    }
                }
                used.extend(
                    observation
                        .used(&text)
                        .with_context(|| format!("normalize coverage for {path}"))?,
                );
            }
        }
        let used = coverage::union(used);
        let used_utf16 = used.iter().map(|range| range.end - range.start).sum();
        let used: Vec<Interval> = used
            .into_iter()
            .map(|range| {
                Ok(Interval {
                    start: text.byte(range.start)?,
                    end: text.byte(range.end)?,
                })
            })
            .collect::<Result<_>>()?;
        let mut counts = Counts::default();
        let mut mapped_bytes = 0;
        let mut used_index = 0;
        let mut bundle_sources: Vec<BundleSource> = Vec::new();
        let mut source_indices = BTreeMap::new();
        let mut spans = Vec::new();
        for segment in segments {
            let source_index = *source_indices
                .entry(segment.source.clone())
                .or_insert_with(|| {
                    let index = bundle_sources.len();
                    bundle_sources.push(BundleSource {
                        source: segment.source.clone(),
                        package: attribution::package(&segment.source),
                        content: contents.remove(&segment.source),
                        counts: Counts::default(),
                    });
                    index
                });
            let bytes = segment.end - segment.start;
            while used_index < used.len() && used[used_index].end <= segment.start {
                used_index += 1;
            }
            let observed_bytes = used[used_index..]
                .iter()
                .take_while(|range| range.start < segment.end)
                .map(|range| {
                    range
                        .end
                        .min(segment.end)
                        .saturating_sub(range.start.max(segment.start))
                })
                .sum();
            let row = Counts {
                bytes,
                observed_bytes,
                unobserved_bytes: if observations.is_some() {
                    bytes - observed_bytes
                } else {
                    0
                },
                unmeasured_bytes: if observations.is_none() { bytes } else { 0 },
            };
            if segment.source != UNMAPPED {
                mapped_bytes += bytes;
            }
            source_counts
                .entry(segment.source.clone())
                .or_default()
                .add(&row);
            bundle_sources[source_index].counts.add(&row);
            counts.add(&row);
            if options.details {
                let mut cursor = segment.start;
                let mut append = |start: usize, end: usize, status: Status| -> Result<()> {
                    if start < end {
                        spans.push(Span {
                            start,
                            end,
                            start_utf16: text.utf16(start)?,
                            end_utf16: text.utf16(end)?,
                            source: source_index,
                            status,
                            original: segment.original.clone(),
                        });
                    }
                    Ok(())
                };
                if observations.is_none() {
                    append(cursor, segment.end, Status::Unmeasured)?;
                } else {
                    for range in used[used_index..]
                        .iter()
                        .take_while(|r| r.start < segment.end)
                    {
                        let start = range.start.max(segment.start);
                        let end = range.end.min(segment.end);
                        append(cursor, start, Status::Unobserved)?;
                        append(start, end, Status::Observed)?;
                        cursor = end;
                    }
                    append(cursor, segment.end, Status::Unobserved)?;
                }
            }
        }
        ensure!(
            counts.bytes == content.len(),
            "{path}: source attribution lost bytes"
        );
        report.totals.add(&counts);
        let compression = if options.compression {
            Some(ci::compress(content.as_bytes())?)
        } else {
            None
        };
        if let (Some(total), Some(bundle)) = (&mut report.compression, &compression) {
            total.gzip_bytes += bundle.gzip_bytes;
            total.brotli_bytes += bundle.brotli_bytes;
        }
        report.bundles.push(BundleRow {
            path,
            sha256: hash,
            source_map_sha256: map_hash,
            utf16_units: text.utf16_len(),
            observed_utf16_units: observations.as_ref().map(|_| used_utf16),
            mapped_bytes,
            verification,
            generated_source: if options.details {
                content
            } else {
                String::new()
            },
            sources: bundle_sources,
            spans,
            compression,
            counts,
        });
    }
    ensure!(
        !report.bundles.is_empty(),
        "no JavaScript files selected by --include/--exclude"
    );
    ensure!(
        coverage.is_empty(),
        "coverage references files missing from --dir: {:?}",
        coverage.keys().collect::<Vec<_>>()
    );
    let mut packages: BTreeMap<String, Counts> = BTreeMap::new();
    for (source, counts) in source_counts {
        let package = attribution::package(&source);
        packages.entry(package.clone()).or_default().add(&counts);
        report.sources.push(SourceRow {
            source,
            package,
            counts,
        });
    }
    report.sources.sort_by(|a, b| {
        b.counts
            .bytes
            .cmp(&a.counts.bytes)
            .then(a.source.cmp(&b.source))
    });
    report.packages = packages
        .into_iter()
        .map(|(package, counts)| PackageRow { package, counts })
        .collect();
    report.packages.sort_by(|a, b| {
        b.counts
            .bytes
            .cmp(&a.counts.bytes)
            .then(a.package.cmp(&b.package))
    });
    report.warnings.sort();
    report.warnings.dedup();
    Ok(report)
}
