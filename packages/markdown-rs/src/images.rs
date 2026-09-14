use crate::hast::{visit_elements_mut, Node};
use serde_json::json;
use std::path::Path;

pub fn apply(tree: &mut Node, post_path: &str, public_dir: &Path) {
    let Some(relative) = post_path.split_once("/posts/").map(|(_, path)| path)
        .or_else(|| post_path.strip_prefix("posts/")) else { return; };
    let Some((directory, _)) = relative.rsplit_once('/') else { return; };
    let directory = directory.split('/').take(2).collect::<Vec<_>>().join("/");
    visit_elements_mut(tree, &mut |element| {
        if element.tag_name != "img" {
            return;
        }
        let Some(src) = element.properties.get("src").and_then(|v| v.as_str()).map(str::to_owned) else { return; };
        if src.is_empty() || src.starts_with("http") {
            return;
        }
        let file = src.split_once('/').map_or(src.as_str(), |(_, rest)| rest);
        let url = format!("/{directory}/{file}");
        if let Some((width, height)) = dimensions(&public_dir.join(url.trim_start_matches('/'))) {
            element.properties.insert("width".into(), json!(width));
            element.properties.insert("height".into(), json!(height));
        }
        if element
            .properties
            .get("alt")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .is_empty()
        {
            element.properties.insert("alt".into(), json!(src));
        }
        element.properties.insert("src".into(), json!(url));
    });
}

fn dimensions(path: &Path) -> Option<(usize, usize)> {
    if let Ok(size) = imagesize::size(path) {
        return Some((size.width, size.height));
    }
    if path.extension()?.to_str()? != "svg" {
        return None;
    }
    let source = std::fs::read_to_string(path).ok()?;
    svg_dimensions(&source)
}

fn svg_dimensions(source: &str) -> Option<(usize, usize)> {
    let document = roxmltree::Document::parse(source).ok()?;
    let svg = document.root_element();
    let length = |value: &str| {
        value
            .trim_end_matches("px")
            .parse::<f64>()
            .ok()
            .filter(|n| *n > 0.0)
            .map(|n| n.round() as usize)
    };
    if let (Some(width), Some(height)) = (
        svg.attribute("width").and_then(length),
        svg.attribute("height").and_then(length),
    ) {
        return Some((width, height));
    }
    let view_box = svg
        .attribute("viewBox")?
        .split(|c: char| c.is_whitespace() || c == ',')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>();
    Some((length(view_box.get(2)?)?, length(view_box.get(3)?)?))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_alt_and_rebases_only_local_images() {
        let mut tree =
            crate::render("![설명](./missing.png)\n\n![remote](https://example.com/a.png)")
                .unwrap();
        apply(
            &mut tree,
            "/repo/apps/blog/posts/2026/09/post.md",
            Path::new("/missing-public"),
        );
        let json = serde_json::to_string(&tree).unwrap();
        assert!(json.contains("/2026/09/missing.png"));
        assert!(json.contains("설명"));
        assert!(json.contains("https://example.com/a.png"));
    }

    #[test]
    fn reads_svg_dimensions() {
        assert_eq!(
            svg_dimensions(r#"<svg width="734px" height="240"/>"#),
            Some((734, 240))
        );
        assert_eq!(
            svg_dimensions(r#"<svg viewBox="0 0 734 344"/>"#),
            Some((734, 344))
        );
    }
}
