use crate::{Report, Span, Status};
use anyhow::Result;
use base64::Engine;
use serde::{Serialize, ser::SerializeSeq};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HtmlReport<'a> {
    schema_version: u32,
    totals: &'a crate::Counts,
    scenarios: &'a [String],
    warnings: &'a [String],
    excluded_bundles: &'a [String],
    budget_failures: &'a [String],
    compression: &'a Option<crate::ci::CompressedSizes>,
    bundles: Vec<HtmlBundle<'a>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HtmlBundle<'a> {
    path: &'a str,
    #[serde(flatten)]
    counts: &'a crate::Counts,
    sources: Vec<HtmlSource<'a>>,
    verification: &'a [crate::input::Verification],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HtmlSource<'a> {
    source: &'a str,
    package: &'a str,
    has_content: bool,
    #[serde(flatten)]
    counts: &'a crate::Counts,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ChunkDetails<'a> {
    generated_source: &'a str,
    contents: Vec<&'a Option<String>>,
    spans: CompactSpans<'a>,
}

/// The HTML wire format uses tuples; the public JSON keeps named fields.
struct CompactSpans<'a>(&'a [Span]);
impl Serialize for CompactSpans<'_> {
    fn serialize<S: serde::Serializer>(
        &self,
        serializer: S,
    ) -> std::result::Result<S::Ok, S::Error> {
        let mut seq = serializer.serialize_seq(Some(self.0.len()))?;
        for span in self.0 {
            seq.serialize_element(&(
                span.start,
                span.end,
                span.start_utf16,
                span.end_utf16,
                span.source,
                match span.status {
                    Status::Observed => 0u8,
                    Status::Unobserved => 1u8,
                    Status::Unmeasured => 2u8,
                },
                span.original.as_ref().map(|p| p.line),
                span.original.as_ref().map(|p| p.column),
            ))?;
        }
        seq.end()
    }
}

/// Escape the HTML raw-text boundary as well as legacy script parsing hazards.
pub fn html(report: &Report) -> Result<String> {
    anyhow::ensure!(report.details, "HTML requires detailed analysis");
    let json = serde_json::to_string(&HtmlReport {
        schema_version: report.schema_version,
        totals: &report.totals,
        scenarios: &report.scenarios,
        warnings: &report.warnings,
        excluded_bundles: &report.excluded_bundles,
        budget_failures: &report.budget_failures,
        compression: &report.compression,
        bundles: report
            .bundles
            .iter()
            .map(|b| HtmlBundle {
                path: &b.path,
                counts: &b.counts,
                sources: b
                    .sources
                    .iter()
                    .map(|s| HtmlSource {
                        source: &s.source,
                        package: &s.package,
                        has_content: s.content.is_some(),
                        counts: &s.counts,
                    })
                    .collect(),
                verification: &b.verification,
            })
            .collect(),
    })?;
    let mut payloads = embedded_data("report-data", json)?;
    for (index, bundle) in report.bundles.iter().enumerate() {
        payloads.push_str(&embedded_data(
            &format!("chunk-data-{index}"),
            serde_json::to_string(&ChunkDetails {
                generated_source: &bundle.generated_source,
                contents: bundle.sources.iter().map(|s| &s.content).collect(),
                spans: CompactSpans(&bundle.spans),
            })?,
        )?);
    }
    Ok(include_str!("report.html").replacen("__BUNDLE_TRACE_PAYLOADS__", &payloads, 1))
}

fn embedded_data(id: &str, json: String) -> Result<String> {
    let (encoding, payload) = if json.len() > 16_384 {
        (
            "gzip-base64",
            base64::engine::general_purpose::STANDARD.encode(crate::ci::gzip(json.as_bytes())?),
        )
    } else {
        (
            "json",
            json.replace('&', "\\u0026")
                .replace('<', "\\u003c")
                .replace('>', "\\u003e")
                .replace('\u{2028}', "\\u2028")
                .replace('\u{2029}', "\\u2029"),
        )
    };
    Ok(format!(
        "<script type=\"application/json\" data-encoding=\"{encoding}\" id=\"{id}\">{payload}</script>\n"
    ))
}
