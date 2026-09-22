use std::collections::{BTreeMap, BTreeSet, VecDeque};

use anyhow::{Result, ensure};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct Metafile {
    inputs: BTreeMap<String, Input>,
    outputs: BTreeMap<String, Output>,
}

#[derive(Deserialize)]
struct Input {
    #[serde(default)]
    imports: Vec<Import>,
}

#[derive(Deserialize)]
struct Import {
    path: String,
    #[serde(default)]
    external: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Output {
    entry_point: Option<String>,
    #[serde(default)]
    inputs: BTreeMap<String, Contribution>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Contribution {
    bytes_in_output: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPath {
    pub source: String,
    pub bytes_in_output: usize,
    /// One shortest path in the esbuild input graph; not a runtime call graph.
    pub path: Option<Vec<String>>,
}

pub fn import_paths(data: &[u8]) -> Result<Vec<ImportPath>> {
    let meta: Metafile = serde_json::from_slice(data)?;
    ensure!(!meta.inputs.is_empty(), "esbuild metafile has no inputs");
    let mut sizes: BTreeMap<String, usize> = BTreeMap::new();
    let mut queue = VecDeque::new();
    let mut visited = BTreeSet::new();
    for (output_path, output) in &meta.outputs {
        if !(output_path.ends_with(".js")
            || output_path.ends_with(".mjs")
            || output_path.ends_with(".cjs"))
        {
            continue;
        }
        for (input, contribution) in &output.inputs {
            *sizes.entry(input.clone()).or_default() += contribution.bytes_in_output;
        }
        if let Some(entry) = &output.entry_point {
            if visited.insert(entry.clone()) {
                queue.push_back(vec![entry.clone()]);
            }
        }
    }
    let mut paths = BTreeMap::new();
    while let Some(path) = queue.pop_front() {
        let current = path.last().unwrap();
        if let Some(input) = meta.inputs.get(current) {
            for import in &input.imports {
                if !import.external && visited.insert(import.path.clone()) {
                    let mut next = path.clone();
                    next.push(import.path.clone());
                    queue.push_back(next);
                }
            }
        }
        paths.insert(current.clone(), path);
    }
    let mut result = sizes
        .into_iter()
        .filter(|(_, bytes)| *bytes > 0)
        .map(|(source, bytes_in_output)| ImportPath {
            path: paths.remove(&source),
            source,
            bytes_in_output,
        })
        .collect::<Vec<_>>();
    result.sort_by(|a, b| {
        b.bytes_in_output
            .cmp(&a.bytes_in_output)
            .then(a.source.cmp(&b.source))
    });
    Ok(result)
}
