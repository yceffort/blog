//! rehype 단계 이식: rehype-slug, extractCodeFilename, rehype-autolink-headings.
//! parseCodeSnippet 은 prism 뒤에 와야 해서 JS 에 남겨 둔다.

use serde_json::json;

use crate::hast::{class_list, props, visit_elements_mut, Element, Node};
use crate::slugger::Slugger;

fn heading_rank(el: &Element) -> Option<u8> {
    let bytes = el.tag_name.as_bytes();
    if bytes.len() == 2 && bytes[0] == b'h' && (b'1'..=b'6').contains(&bytes[1]) {
        Some(bytes[1] - b'0')
    } else {
        None
    }
}

/// rehype-slug 6.0.0: id 가 없는 제목에 github-slugger 로 id 를 붙인다.
pub fn slug_headings(root: &mut Node) {
    let mut slugger = Slugger::new();
    visit_elements_mut(root, &mut |el| {
        if heading_rank(el).is_some() && !el.properties.contains_key("id") {
            let text = Node::Element(el.clone()).text_content();
            el.properties.insert("id".into(), json!(slugger.slug(&text)));
        }
    });
}

/// `language-{lang}:{filename}` 을 `language-{lang}` + `data-filename` 으로 나눈다.
pub fn extract_code_filename(root: &mut Node) {
    visit_elements_mut(root, &mut |el| {
        if el.tag_name != "pre" {
            return;
        }
        let Some(Node::Element(code)) = el
            .children
            .iter_mut()
            .find(|child| matches!(child, Node::Element(c) if c.tag_name == "code"))
        else {
            return;
        };
        let classes = code.class_names();
        let Some(lang_class) = classes.iter().find(|c| c.starts_with("language-")) else {
            return;
        };
        let rest = &lang_class["language-".len()..];
        // /^language-(\w+):(.+)$/
        let Some((lang, filename)) = rest.split_once(':') else {
            return;
        };
        if lang.is_empty()
            || filename.is_empty()
            || !lang.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        {
            return;
        }
        code.set_class_names(vec![format!("language-{lang}")]);
        code.properties
            .insert("data-filename".into(), json!(filename));
    });
}

/// rehype-autolink-headings 7.1.0 기본 동작(prepend): 제목 앞에 링크 아이콘을 넣는다.
pub fn autolink_headings(root: &mut Node) {
    visit_elements_mut(root, &mut |el| {
        if heading_rank(el).is_none() {
            return;
        }
        let Some(id) = el.properties.get("id").and_then(|v| v.as_str()).map(str::to_string) else {
            return;
        };
        let icon = Node::element(
            "span",
            props(vec![("className", class_list(&["icon", "icon-link"]))]),
            vec![],
        );
        let link = Node::element(
            "a",
            props(vec![
                ("ariaHidden", json!("true")),
                ("tabIndex", json!(-1)),
                ("href", json!(format!("#{id}"))),
            ]),
            vec![icon],
        );
        el.children.insert(0, link);
    });
}
