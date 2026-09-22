use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicUsize, Ordering},
};

use bundle_trace::{
    analyze, attribution,
    coverage::{self, CoverageRange, FunctionCoverage, Interval},
    metadata, sha256,
    text::TextIndex,
};
use serde_json::json;

static NEXT_DIR: AtomicUsize = AtomicUsize::new(0);
struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let dir = std::env::temp_dir().join(format!(
            "bundle-trace-test-{}-{}",
            std::process::id(),
            NEXT_DIR.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&dir).unwrap();
        Self(dir)
    }
    fn write(&self, path: &str, content: &str) -> PathBuf {
        let path = self.0.join(path);
        fs::write(&path, content).unwrap();
        path
    }
    fn coverage(&self, name: &str, source: &str, ranges: serde_json::Value) -> PathBuf {
        let map = fs::read(self.0.join("app.js.map")).ok();
        self.write(
            name,
            &json!({"schemaVersion":1,"scenario":name,"scripts":[{
                "path":"app.js", "sha256":sha256(source.as_bytes()),
                "sourceMapSha256":map.map(|data| sha256(&data)),
                "functions":[{"isBlockCoverage":true,"ranges":ranges}]
            }]})
            .to_string(),
        )
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn function(ranges: &[(usize, usize, u64)]) -> FunctionCoverage {
    FunctionCoverage {
        is_block_coverage: true,
        ranges: ranges
            .iter()
            .map(|&(start_offset, end_offset, count)| CoverageRange {
                start_offset,
                end_offset,
                count,
            })
            .collect(),
    }
}

#[test]
fn nested_zero_range_does_not_erase_executed_child() {
    let text = TextIndex::new(&"x".repeat(100));
    let ranges = coverage::used_ranges(
        &[
            function(&[(0, 100, 1), (10, 90, 0)]),
            function(&[(20, 40, 1), (25, 30, 0)]),
        ],
        &text,
    )
    .unwrap();
    assert_eq!(
        ranges,
        vec![
            Interval { start: 0, end: 10 },
            Interval { start: 20, end: 25 },
            Interval { start: 30, end: 40 },
            Interval {
                start: 90,
                end: 100
            }
        ]
    );
}

#[test]
fn adjacent_and_equal_start_ranges() {
    let text = TextIndex::new("0123456789");
    let ranges =
        coverage::used_ranges(&[function(&[(0, 10, 1), (0, 3, 0), (3, 6, 0)])], &text).unwrap();
    assert_eq!(ranges, vec![Interval { start: 6, end: 10 }]);
}

#[test]
fn crossing_ranges_fail_instead_of_silently_miscounting() {
    let text = TextIndex::new(&"x".repeat(20));
    assert!(
        coverage::used_ranges(&[function(&[(0, 10, 1)]), function(&[(5, 15, 0)])], &text).is_err()
    );
}

#[test]
fn rejects_invalid_offsets_and_blocks() {
    let text = TextIndex::new("한🔥x");
    for ranges in [
        &[(0, 9, 1)][..],
        &[(0, 4, 1), (1, 2, 0)][..],
        &[(1, 3, 1), (0, 1, 0)][..],
        &[(3, 1, 1)][..],
    ] {
        assert!(coverage::used_ranges(&[function(ranges)], &text).is_err());
    }
}

#[test]
fn utf16_and_all_javascript_line_endings() {
    let text = TextIndex::new("한🔥\r\nx\ry\u{2028}z\u{2029}");
    assert_eq!(text.byte(1).unwrap(), 3);
    assert!(text.byte(2).is_err());
    assert_eq!(text.byte(3).unwrap(), 7);
    assert_eq!(text.position(1, 0).unwrap(), 9);
    assert_eq!(text.position(2, 0).unwrap(), 11);
    assert_eq!(text.position(3, 0).unwrap(), 15);
    assert_eq!(text.position(4, 0).unwrap(), 19);
    assert!(text.position(0, 4).is_err());
}

#[test]
fn utf8_bytes_and_utf16_units_are_separate() {
    let fixture = Fixture::new();
    let source = "한🔥x";
    fixture.write("app.js", source);
    fixture.write(
        "app.js.map",
        r#"{"version":3,"sources":["src/a.js"],"names":[],"mappings":"AAAA"}"#,
    );
    let coverage = fixture.coverage(
        "run.json",
        source,
        json!([
            {"startOffset":0,"endOffset":4,"count":1},
            {"startOffset":1,"endOffset":3,"count":0}
        ]),
    );
    let report = analyze(&fixture.0, &[coverage]).unwrap();
    assert_eq!(report.totals.bytes, 8);
    assert_eq!(report.totals.observed_bytes, 4);
    assert_eq!(report.totals.unobserved_bytes, 4);
    assert_eq!(report.bundles[0].observed_utf16_units, Some(2));
}

#[test]
fn static_mode_and_missing_script_are_unmeasured() {
    let fixture = Fixture::new();
    fixture.write("app.js", "abcd");
    fixture.write("lazy.js", "later");
    let report = analyze(&fixture.0, &[]).unwrap();
    assert_eq!(report.totals.unmeasured_bytes, 9);
    assert_eq!(report.totals.unobserved_bytes, 0);
    let coverage = fixture.coverage(
        "run.json",
        "abcd",
        json!([{"startOffset":0,"endOffset":4,"count":0}]),
    );
    let report = analyze(&fixture.0, &[coverage]).unwrap();
    assert_eq!(report.totals.unobserved_bytes, 4);
    assert_eq!(report.totals.unmeasured_bytes, 5);
}

#[test]
fn stale_bundle_and_stale_map_are_rejected() {
    let fixture = Fixture::new();
    fixture.write("app.js", "abcd");
    let coverage = fixture.coverage(
        "run.json",
        "abcd",
        json!([{"startOffset":0,"endOffset":4,"count":1}]),
    );
    fixture.write("app.js", "abce");
    assert!(
        analyze(&fixture.0, std::slice::from_ref(&coverage))
            .unwrap_err()
            .to_string()
            .contains("SHA-256 mismatch")
    );
    fixture.write("app.js", "abcd");
    fixture.write(
        "app.js.map",
        r#"{"version":3,"sources":[],"names":[],"mappings":""}"#,
    );
    assert!(
        analyze(&fixture.0, &[coverage])
            .unwrap_err()
            .to_string()
            .contains("source-map SHA-256 mismatch")
    );
}

#[test]
fn multiple_scenarios_union_without_double_counting() {
    let fixture = Fixture::new();
    fixture.write("app.js", "0123456789");
    let first = fixture.coverage(
        "one.json",
        "0123456789",
        json!([
            {"startOffset":0,"endOffset":10,"count":0}, {"startOffset":0,"endOffset":5,"count":1}
        ]),
    );
    let second = fixture.coverage(
        "two.json",
        "0123456789",
        json!([
            {"startOffset":0,"endOffset":10,"count":0}, {"startOffset":3,"endOffset":8,"count":1}
        ]),
    );
    let report = analyze(&fixture.0, &[first.clone(), second, first]).unwrap();
    assert_eq!(report.totals.observed_bytes, 8);
    assert_eq!(report.totals.unobserved_bytes, 2);
}

#[test]
fn mapping_does_not_claim_unmapped_lines_or_prefixes() {
    let source = "xxabcd\nwrapper\nz";
    let map = br#"{"version":3,"sources":["src/a.js"],"names":[],"mappings":"EAAA,E;"}"#;
    let segments = attribution::segments(map, &TextIndex::new(source), source.len()).unwrap();
    assert_eq!(
        segments
            .iter()
            .filter(|s| s.source == "src/a.js")
            .map(|s| s.end - s.start)
            .sum::<usize>(),
        2
    );
    assert_eq!(
        segments.iter().map(|s| s.end - s.start).sum::<usize>(),
        source.len()
    );
}

#[test]
fn indexed_source_maps_and_missing_sources_content_work() {
    let map = br#"{"version":3,"sections":[{"offset":{"line":0,"column":0},"map":{"version":3,"sources":["a.js"],"names":[],"mappings":"AAAA"}},{"offset":{"line":1,"column":1},"map":{"version":3,"sources":["b.js"],"names":[],"mappings":"AAAA"}}]}"#;
    let source = "abc\n xyz";
    let segments = attribution::segments(map, &TextIndex::new(source), source.len()).unwrap();
    assert_eq!(
        segments
            .iter()
            .filter(|s| s.source == "a.js")
            .map(|s| s.end - s.start)
            .sum::<usize>(),
        3
    );
    assert_eq!(
        segments
            .iter()
            .filter(|s| s.source == "b.js")
            .map(|s| s.end - s.start)
            .sum::<usize>(),
        3
    );
}

#[test]
fn indexed_sections_preserve_empty_and_unmapped_prefixes() {
    let source = "abcdefghij";
    for (mappings, expected) in [
        (
            "EAAA",
            vec![(0, 5, "a.ts"), (5, 7, "[unmapped]"), (7, 10, "b.ts")],
        ),
        ("", vec![(0, 5, "a.ts"), (5, 10, "[unmapped]")]),
        ("AAAA", vec![(0, 5, "a.ts"), (5, 10, "b.ts")]),
    ] {
        let map = json!({"version":3,"sections":[
            {"offset":{"line":0,"column":0},"map":{"version":3,"sources":["a.ts"],"names":[],"mappings":"AAAA"}},
            {"offset":{"line":0,"column":5},"map":{"version":3,"sources":["b.ts"],"names":[],"mappings":mappings}}
        ]});
        let decoded = attribution::decode(
            map.to_string().as_bytes(),
            &TextIndex::new(source),
            source.len(),
        )
        .unwrap();
        assert_eq!(decoded.invalid_points, 0);
        assert_eq!(
            decoded
                .segments
                .iter()
                .map(|s| (s.start, s.end, s.source.as_str()))
                .collect::<Vec<_>>(),
            expected
        );
        assert!(
            decoded
                .segments
                .iter()
                .filter(|s| s.source == "[unmapped]")
                .all(|s| s.original.is_none())
        );
    }
}

#[test]
fn nested_index_offsets_reset_columns_on_later_lines() {
    let source = "abcdefghij\nklmnop";
    let map = json!({"version":3,"sections":[
        {"offset":{"line":0,"column":2},"map":{"version":3,"sections":[
            {"offset":{"line":0,"column":1},"map":{"version":3,"sources":["a.ts"],"names":[],"mappings":"EAAA"}},
            {"offset":{"line":1,"column":2},"map":{"version":3,"sources":["b.ts"],"names":[],"mappings":"AAAA"}}
        ]}}
    ]});
    let decoded = attribution::decode(
        map.to_string().as_bytes(),
        &TextIndex::new(source),
        source.len(),
    )
    .unwrap();
    assert_eq!(
        decoded
            .segments
            .iter()
            .filter(|s| s.source != "[unmapped]")
            .map(|s| (s.start, s.end, s.source.as_str()))
            .collect::<Vec<_>>(),
        vec![(5, 10, "a.ts"), (13, 17, "b.ts")]
    );
    assert_eq!(
        decoded
            .segments
            .iter()
            .map(|s| s.end - s.start)
            .sum::<usize>(),
        source.len()
    );
}

#[test]
fn unordered_and_overlapping_index_sections_are_rejected() {
    for (offsets, mappings) in [([5, 0], "AAAA"), ([0, 0], "AAAA"), ([0, 5], "MAAA")] {
        let map = json!({"version":3,"sections":[
            {"offset":{"line":0,"column":offsets[0]},"map":{"version":3,"sources":["a.ts"],"names":[],"mappings":mappings}},
            {"offset":{"line":0,"column":offsets[1]},"map":{"version":3,"sources":[],"names":[],"mappings":""}}
        ]});
        assert!(
            attribution::decode(
                map.to_string().as_bytes(),
                &TextIndex::new("abcdefghij"),
                10
            )
            .is_err()
        );
    }
}

#[test]
fn pnpm_scoped_packages_and_application_sources() {
    assert_eq!(
        attribution::package(
            "[project]/node_modules/.pnpm/@scope+pkg@1/node_modules/@scope/pkg/a.js"
        ),
        "@scope/pkg"
    );
    assert_eq!(
        attribution::package("../../node_modules/minisearch/dist/index.js"),
        "minisearch"
    );
    assert_eq!(
        attribution::package("webpack:///src/app.js"),
        "[application]"
    );
}

#[test]
fn malformed_map_fails_with_bundle_context() {
    let fixture = Fixture::new();
    fixture.write("app.js", "a");
    fixture.write("app.js.map", "{}");
    assert!(
        analyze(&fixture.0, &[])
            .unwrap_err()
            .to_string()
            .contains("app.js")
    );
}

#[test]
fn metadata_paths_handle_cycles_and_external_imports() {
    let data = json!({"inputs":{
        "entry.js":{"imports":[{"path":"shared.js"},{"path":"external","external":true}]},
        "shared.js":{"imports":[{"path":"entry.js"},{"path":"node_modules/pkg/index.js"}]},
        "node_modules/pkg/index.js":{"imports":[]}
    },"outputs":{"app.js":{"entryPoint":"entry.js","inputs":{
        "entry.js":{"bytesInOutput":5},"node_modules/pkg/index.js":{"bytesInOutput":100}
    }}}});
    let rows = metadata::import_paths(&serde_json::to_vec(&data).unwrap()).unwrap();
    assert_eq!(
        rows[0].path.as_ref().unwrap(),
        &vec!["entry.js", "shared.js", "node_modules/pkg/index.js"]
    );
}

#[test]
fn coverage_missing_file_and_unsafe_path_fail() {
    assert!(coverage::validate_path("../app.js").is_err());
    assert!(coverage::validate_path("/app.js").is_err());
    let fixture = Fixture::new();
    fixture.write("other.js", "abcd");
    let coverage = fixture.coverage(
        "run.json",
        "abcd",
        json!([{"startOffset":0,"endOffset":4,"count":1}]),
    );
    assert!(
        analyze(&fixture.0, &[coverage])
            .unwrap_err()
            .to_string()
            .contains("missing from --dir")
    );
}

#[test]
fn turbopack_separate_map_name_is_followed() {
    let fixture = Fixture::new();
    fixture.write(
        "app.js",
        "abc\n//# sourceMappingURL=different%20hash.js.map",
    );
    fixture.write(
        "different hash.js.map",
        r#"{"version":3,"sources":["src/a.js"],"names":[],"mappings":"AAAA"}"#,
    );
    let report = analyze(&fixture.0, &[]).unwrap();
    assert_eq!(report.bundles[0].mapped_bytes, 3);
    assert!(report.warnings.is_empty());
}

#[test]
fn declared_missing_and_remote_maps_are_errors() {
    let fixture = Fixture::new();
    for reference in [
        "missing.js.map",
        "https://example.com/app.js.map",
        "data:application/json;base64,e30=",
    ] {
        fixture.write("app.js", &format!("abc\n//# sourceMappingURL={reference}"));
        assert!(analyze(&fixture.0, &[]).is_err());
    }
}

#[test]
fn out_of_line_mapping_never_spills_into_next_line() {
    let source = "abc\nxyz";
    let map = br#"{"version":3,"sources":["a.js"],"names":[],"mappings":"AAAA,KAAA;AAAA"}"#;
    let (segments, ignored) =
        attribution::segments_with_diagnostics(map, &TextIndex::new(source), source.len()).unwrap();
    assert_eq!(ignored, 1);
    assert_eq!(
        segments
            .iter()
            .filter(|s| s.source == "a.js")
            .map(|s| s.end - s.start)
            .sum::<usize>(),
        6
    );
    assert_eq!(
        segments.iter().map(|s| s.end - s.start).sum::<usize>(),
        source.len()
    );
}

#[test]
fn standard_formats_agree_and_preserve_capture_evidence() {
    let fixture = Fixture::new();
    let source = "한🔥x";
    fixture.write("app.js", source);
    fixture.write("app.js.map", r#"{"version":3,"sources":["a.ts"],"sourcesContent":["original"],"names":[],"mappings":"AAAA"}"#);
    let functions = json!([{"functionName":"f","isBlockCoverage":true,"ranges":[
        {"startOffset":0,"endOffset":4,"count":1},
        {"startOffset":1,"endOffset":3,"count":0}
    ]}]);
    let url = "https://cdn.test/assets/app.js?v=1";
    let mut options = bundle_trace::AnalyzeOptions::default();
    options
        .input
        .url_prefixes
        .push("https://cdn.test/assets/".into());
    for (name, value, verification) in [
        (
            "chrome.json",
            json!([{"url":url,"text":source,"ranges":[{"start":3,"end":4},{"start":0,"end":1}]}]),
            "source-text",
        ),
        (
            "playwright.json",
            json!([{"url":url,"source":source,"functions":functions}]),
            "source-text",
        ),
        (
            "v8.json",
            json!({"result":[{"url":url,"scriptId":"1","functions":functions}]}),
            "unverified",
        ),
    ] {
        let path = fixture.write(name, &value.to_string());
        if name == "v8.json" {
            assert!(
                bundle_trace::analyze_with_options(
                    &fixture.0,
                    std::slice::from_ref(&path),
                    &options
                )
                .unwrap_err()
                .to_string()
                .contains("--allow-unverified")
            );
            options.input.allow_unverified = true;
        }
        let report = bundle_trace::analyze_with_options(&fixture.0, &[path], &options).unwrap();
        assert_eq!(report.totals.observed_bytes, 4);
        assert_eq!(report.totals.unobserved_bytes, 4);
        let bundle = &report.bundles[0];
        assert_eq!(bundle.verification[0].source, verification);
        assert_eq!(bundle.verification[0].source_map, "unverified");
        assert_eq!(
            bundle
                .spans
                .iter()
                .map(|s| (s.start, s.end, s.start_utf16, s.end_utf16))
                .collect::<Vec<_>>(),
            vec![(0, 3, 0, 1), (3, 7, 1, 3), (7, 8, 3, 4)]
        );
        assert_eq!(bundle.sources[0].content.as_deref(), Some("original"));
        assert_eq!(bundle.spans[1].original.as_ref().unwrap().line, 0);
        assert_eq!(bundle.spans[1].status, bundle_trace::Status::Unobserved);
    }
}

#[test]
fn standard_source_mismatch_and_invalid_ranges_are_rejected() {
    let fixture = Fixture::new();
    fixture.write("app.js", "한🔥x");
    for (source, ranges) in [
        ("한🔥y", json!([])),
        ("한🔥x", json!([{"start":1,"end":2}])),
        ("한🔥x", json!([{"start":3,"end":1}])),
        ("한🔥x", json!([{"start":0,"end":100}])),
    ] {
        let path = fixture.write(
            "input.json",
            &json!([{"url":"app.js","text":source,"ranges":ranges}]).to_string(),
        );
        assert!(analyze(&fixture.0, &[path]).is_err());
    }
}

#[test]
fn inline_maps_and_explicit_external_maps() {
    use base64::Engine;
    let fixture = Fixture::new();
    let external = Fixture::new();
    let map = r#"{"version":3,"sources":["a.ts"],"names":[],"mappings":"AAAA"}"#;
    let encoded = base64::engine::general_purpose::STANDARD.encode(map);
    let percent =
        percent_encoding::utf8_percent_encode(map, percent_encoding::NON_ALPHANUMERIC).to_string();
    for reference in [
        format!("//# sourceMappingURL=data:application/json;charset=utf-8;base64,{encoded}"),
        format!("/*# sourceMappingURL=data:application/json,{percent} */"),
    ] {
        fixture.write("app.js", &format!("abc\n{reference}"));
        let report = analyze(&fixture.0, &[]).unwrap();
        assert_eq!(report.bundles[0].mapped_bytes, 3);
        assert_eq!(
            report.bundles[0].source_map_sha256.as_deref(),
            Some(sha256(map.as_bytes()).as_str())
        );
    }
    fixture.write(
        "app.js",
        "abc\n//# sourceMappingURL=https://private.test/map",
    );
    let mut options = bundle_trace::AnalyzeOptions::default();
    options
        .maps
        .insert("app.js".into(), external.write("external.map", map));
    let report = bundle_trace::analyze_with_options(&fixture.0, &[], &options).unwrap();
    assert_eq!(report.bundles[0].mapped_bytes, 3);
    options
        .maps
        .insert("missing.js".into(), external.0.join("external.map"));
    assert!(bundle_trace::analyze_with_options(&fixture.0, &[], &options).is_err());
}

#[test]
fn url_mapping_is_explicit_and_rejects_traversal() {
    let fixture = Fixture::new();
    fixture.write("app.js", "abcd");
    let path = fixture.write(
        "input.json",
        &json!([{"url":"https://cdn.test/app.js","text":"abcd","ranges":[]}]).to_string(),
    );
    assert!(analyze(&fixture.0, std::slice::from_ref(&path)).is_err());
    let mut options = bundle_trace::AnalyzeOptions::default();
    options
        .input
        .script_paths
        .insert("https://cdn.test/app.js".into(), "app.js".into());
    assert_eq!(
        bundle_trace::analyze_with_options(&fixture.0, &[path], &options)
            .unwrap()
            .totals
            .unobserved_bytes,
        4
    );
    options.input.url_prefixes.push("https://cdn.test/".into());
    for url in [
        "https://cdn.test/%2e%2e/app.js",
        "https://cdn.test/%2Fapp.js",
        "https://cdn.test/a%5Cb.js",
    ] {
        let path = fixture.write(
            "input.json",
            &json!([{"url":url,"text":"abcd","ranges":[]}]).to_string(),
        );
        assert!(bundle_trace::analyze_with_options(&fixture.0, &[path], &options).is_err());
    }
}

#[test]
fn file_urls_and_unrelated_entries() {
    let fixture = Fixture::new();
    fixture.write("app.js", "abcd");
    let url = format!(
        "file://{}/app.js",
        fs::canonicalize(&fixture.0).unwrap().display()
    );
    let path = fixture.write(
        "node.json",
        &json!({"result":[
            {"url":"node:internal/bootstrap","functions":[]},
            {"url":url,"source":"abcd","functions":[]}
        ]})
        .to_string(),
    );
    let report = analyze(&fixture.0, &[path]).unwrap();
    assert_eq!(report.totals.unobserved_bytes, 4);
    assert!(report.warnings.iter().any(|w| w.contains("node:internal")));
}

#[test]
fn detail_spans_partition_every_bundle_and_source() {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("examples/recorded");
    let report = analyze(
        &dir,
        &[
            dir.join("initial.coverage.json"),
            dir.join("interaction.coverage.json"),
        ],
    )
    .unwrap();
    assert_eq!(report.totals.bytes, 293);
    assert_eq!(report.totals.observed_bytes, 208);
    for bundle in report.bundles {
        let mut cursor = 0;
        for span in &bundle.spans {
            assert_eq!(span.start, cursor);
            assert!(span.end > span.start);
            assert!(bundle.generated_source.get(span.start..span.end).is_some());
            cursor = span.end;
        }
        assert_eq!(cursor, bundle.counts.bytes);
        for (index, source) in bundle.sources.iter().enumerate() {
            let spans = bundle
                .spans
                .iter()
                .filter(|s| s.source == index)
                .collect::<Vec<_>>();
            assert_eq!(
                spans.iter().map(|s| s.end - s.start).sum::<usize>(),
                source.counts.bytes
            );
            assert_eq!(
                spans
                    .iter()
                    .filter(|s| s.status == bundle_trace::Status::Observed)
                    .map(|s| s.end - s.start)
                    .sum::<usize>(),
                source.counts.observed_bytes
            );
        }
        assert!(
            bundle
                .verification
                .iter()
                .all(|v| v.source == "sha256" && v.source_map == "capture-bound")
        );
    }
}

#[test]
fn html_does_not_turn_source_into_markup() {
    let fixture = Fixture::new();
    let payload = "</script><script>globalThis.injected=true</script>🔥";
    fixture.write("app.js", payload);
    let report = analyze(&fixture.0, &[]).unwrap();
    let html = bundle_trace::report::html(&report).unwrap();
    assert!(!html.contains(payload));
    let data = html
        .split("id=\"report-data\">")
        .nth(1)
        .unwrap()
        .split("</script>")
        .next()
        .unwrap();
    let value: serde_json::Value = serde_json::from_str(data).unwrap();
    assert!(value["bundles"][0].get("generatedSource").is_none());
    assert!(value["bundles"][0].get("spans").is_none());
    let chunk = html
        .split("id=\"chunk-data-0\">")
        .nth(1)
        .unwrap()
        .split("</script>")
        .next()
        .unwrap();
    let details: serde_json::Value = serde_json::from_str(chunk).unwrap();
    assert_eq!(details["generatedSource"], payload);
}

#[test]
fn filters_change_denominator_and_do_not_hide_missing_files() {
    let fixture = Fixture::new();
    fs::create_dir(fixture.0.join("chunks")).unwrap();
    fixture.write("app.js", "abcd");
    fixture.write("chunks/lazy.js", "later");
    let coverage = fixture.coverage(
        "run.json",
        "abcd",
        json!([{"startOffset":0,"endOffset":4,"count":1}]),
    );
    let mut options = bundle_trace::AnalyzeOptions::default();
    options.include.push("**/*.js".into());
    options.exclude.push("app.js".into());
    let report =
        bundle_trace::analyze_with_options(&fixture.0, std::slice::from_ref(&coverage), &options)
            .unwrap();
    assert_eq!(report.totals.bytes, 5);
    assert_eq!(report.totals.unmeasured_bytes, 5);
    assert_eq!(report.excluded_bundles, vec!["app.js"]);
    assert_eq!(
        report.bundles[0].spans[0].status,
        bundle_trace::Status::Unmeasured
    );
    fs::remove_file(fixture.0.join("app.js")).unwrap();
    assert!(
        bundle_trace::analyze_with_options(&fixture.0, &[coverage], &options)
            .unwrap_err()
            .to_string()
            .contains("missing from --dir")
    );
    options.exclude.push("**/*.js".into());
    assert!(bundle_trace::analyze_with_options(&fixture.0, &[], &options).is_err());
    options.include = vec!["[".into()];
    assert!(bundle_trace::analyze_with_options(&fixture.0, &[], &options).is_err());
}

#[test]
fn ci_reports_are_written_even_when_budget_fails() {
    use std::process::Command;
    let fixture = Fixture::new();
    fixture.write("app.js", "abcd");
    let config = fixture.write("config.json", r#"{"include":["**/*.js"],"compression":true,"budgets":{"maxBytes":3,"maxUnmeasuredBytes":0}}"#);
    let output = Command::new(env!("CARGO_BIN_EXE_bundle-trace"))
        .args([
            "--dir",
            fixture.0.to_str().unwrap(),
            "--config",
            config.to_str().unwrap(),
            "--json",
            fixture.0.join("report.json").to_str().unwrap(),
            "--html",
            fixture.0.join("report.html").to_str().unwrap(),
            "--markdown",
            fixture.0.join("report.md").to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(2));
    let report: serde_json::Value =
        serde_json::from_slice(&fs::read(fixture.0.join("report.json")).unwrap()).unwrap();
    assert_eq!(report["budgetFailures"].as_array().unwrap().len(), 2);
    assert!(report["compression"]["gzipBytes"].as_u64().unwrap() > 0);
    assert!(
        fs::read_to_string(fixture.0.join("report.md"))
            .unwrap()
            .contains("Budget failed")
    );
    assert!(fixture.0.join("report.html").exists());
    let output = Command::new(env!("CARGO_BIN_EXE_bundle-trace"))
        .args([
            "--dir",
            fixture.0.to_str().unwrap(),
            "--config",
            config.to_str().unwrap(),
            "--max-bytes",
            "4",
            "--max-unmeasured-bytes",
            "4",
        ])
        .output()
        .unwrap();
    assert!(output.status.success());
}

#[test]
fn budget_does_not_confuse_unmeasured_with_unobserved() {
    let fixture = Fixture::new();
    fixture.write("app.js", "abcd");
    let report = analyze(&fixture.0, &[]).unwrap();
    let config: bundle_trace::ci::Config =
        serde_json::from_str(r#"{"budgets":{"maxUnobservedBytes":0,"maxUnmeasuredBytes":0}}"#)
            .unwrap();
    let failures = config.budgets.check(&report);
    assert_eq!(failures.len(), 1);
    assert!(failures[0].contains("unmeasured"));
    assert!(
        serde_json::from_str::<bundle_trace::ci::Config>(r#"{"budgets":{"maxByte":4}}"#).is_err()
    );
}

#[test]
fn summary_json_and_detailed_json_have_identical_counts() {
    use std::process::Command;
    let fixture = Fixture::new();
    fixture.write("app.js", "한🔥x");
    let mut totals = Vec::new();
    for details in [false, true] {
        let output = fixture.0.join("report.json");
        let mut command = Command::new(env!("CARGO_BIN_EXE_bundle-trace"));
        command.args([
            "--dir",
            fixture.0.to_str().unwrap(),
            "--json",
            output.to_str().unwrap(),
        ]);
        if details {
            command.arg("--details");
        }
        assert!(command.output().unwrap().status.success());
        let report: serde_json::Value = serde_json::from_slice(&fs::read(output).unwrap()).unwrap();
        assert_eq!(report["details"], details);
        assert_eq!(report["bundles"][0].get("spans").is_some(), details);
        assert_eq!(
            report["bundles"][0].get("generatedSource").is_some(),
            details
        );
        totals.push(report["totals"].clone());
    }
    assert_eq!(totals[0], totals[1]);
}
