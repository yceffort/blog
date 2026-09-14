//! `mdast-util-to-hast` 13.2.1 이식 (remark-rehype 가 @mdx-js/mdx 안에서 쓰는 설정:
//! allowDangerousHtml, MDX 노드 passThrough). 각주 footer, GFM 표, remark-math 의
//! hName/hChildren 데이터까지 같은 트리를 만든다.

use std::collections::HashMap;

use markdown::mdast::{self, AlignKind, AttributeContent, AttributeValue, Node as M, ReferenceKind};
use serde_json::{json, Value};

use crate::hast::{
    class_list, props, Element, MdxAttribute, MdxAttributeValue, MdxAttributeValueExpression,
    MdxJsxElement, Node as H, Properties,
};
use crate::mdx::eval_literal;
use crate::uri::normalize_uri;

const CLOBBER_PREFIX: &str = "user-content-";

/// `@mdx-js/mdx` 의 `remark-mark-and-unravel`: JSX 요소와 표현식만 든 문단을 풀어서
/// flow 요소로 올린다 (`<LiveDemo />` 한 줄이 `<p>` 에 싸이지 않게).
pub fn unravel(node: &mut M) {
    let Some(children) = node.children_mut() else {
        return;
    };
    let mut index = 0;
    while index < children.len() {
        if let M::Paragraph(paragraph) = &children[index] {
            let mut one_or_more = false;
            let all = paragraph.children.iter().all(|child| match child {
                M::MdxJsxTextElement(_) | M::MdxTextExpression(_) => {
                    one_or_more = true;
                    true
                }
                M::Text(text) => text
                    .value
                    .chars()
                    .all(|c| matches!(c, '\t' | '\n' | '\x0C' | '\r' | ' ')),
                _ => false,
            });
            if all && one_or_more {
                let M::Paragraph(paragraph) = children.remove(index) else {
                    unreachable!()
                };
                let mut replacement = Vec::new();
                for child in paragraph.children {
                    match child {
                        M::MdxJsxTextElement(el) => {
                            replacement.push(M::MdxJsxFlowElement(mdast::MdxJsxFlowElement {
                                children: el.children,
                                position: el.position,
                                name: el.name,
                                attributes: el.attributes,
                            }));
                        }
                        M::MdxTextExpression(ex) => {
                            replacement.push(M::MdxFlowExpression(mdast::MdxFlowExpression {
                                value: ex.value,
                                position: ex.position,
                                stops: ex.stops,
                            }));
                        }
                        M::Text(text)
                            if !text.value.is_empty()
                                && text.value.chars().all(|c| matches!(c, '\t' | '\r' | '\n' | ' ')) => {}
                        other => replacement.push(other),
                    }
                }
                let count = replacement.len();
                children.splice(index..index, replacement);
                index += count;
                continue;
            }
        }
        unravel(&mut children[index]);
        index += 1;
    }
}

/// `mdast-util-gfm-autolink-literal` 은 link/linkReference 안에서는 autolink 를 만들지
/// 않는데 markdown-rs 는 토크나이저에서 만들어 버린다. 링크 안의 링크를 자식으로 푼다.
pub fn unwrap_nested_links(node: &mut M, inside_link: bool) {
    let is_link = matches!(node, M::Link(_) | M::LinkReference(_));
    let Some(children) = node.children_mut() else {
        return;
    };
    let mut index = 0;
    while index < children.len() {
        if inside_link || is_link {
            if let M::Link(_) = &children[index] {
                let M::Link(link) = children.remove(index) else {
                    unreachable!()
                };
                let count = link.children.len();
                children.splice(index..index, link.children);
                for child in &mut children[index..index + count] {
                    unwrap_nested_links(child, true);
                }
                index += count;
                continue;
            }
        }
        unwrap_nested_links(&mut children[index], inside_link || is_link);
        index += 1;
    }
}

struct State {
    definitions: HashMap<String, mdast::Definition>,
    footnotes: HashMap<String, mdast::FootnoteDefinition>,
    footnote_order: Vec<String>,
    footnote_counts: HashMap<String, usize>,
}

pub fn to_hast(root: &M) -> H {
    let mut state = State {
        definitions: HashMap::new(),
        footnotes: HashMap::new(),
        footnote_order: Vec::new(),
        footnote_counts: HashMap::new(),
    };
    collect_definitions(root, &mut state);
    let children = match root {
        M::Root(r) => state.all(&r.children),
        _ => state.one(root).0,
    };
    let mut children = wrap(children, false);
    if let Some(footer) = state.footer() {
        children.push(H::text("\n"));
        children.push(footer);
    }
    H::Root { children }
}

fn collect_definitions(node: &M, state: &mut State) {
    match node {
        M::Definition(def) => {
            state
                .definitions
                .entry(def.identifier.to_uppercase())
                .or_insert_with(|| def.clone());
        }
        M::FootnoteDefinition(def) => {
            state
                .footnotes
                .entry(def.identifier.to_uppercase())
                .or_insert_with(|| def.clone());
        }
        _ => {}
    }
    if let Some(children) = node.children() {
        for child in children {
            collect_definitions(child, state);
        }
    }
}

/// 노드 사이에 `\n` 텍스트를 끼운다. `loose` 면 앞뒤에도.
pub fn wrap(nodes: Vec<H>, loose: bool) -> Vec<H> {
    let mut result = Vec::with_capacity(nodes.len() * 2 + 2);
    if loose {
        result.push(H::text("\n"));
    }
    let count = nodes.len();
    for (index, node) in nodes.into_iter().enumerate() {
        if index > 0 {
            result.push(H::text("\n"));
        }
        result.push(node);
    }
    if loose && count > 0 {
        result.push(H::text("\n"));
    }
    result
}

/// `trim-lines`: 줄 경계의 탭/공백을 지운다 (첫 줄 앞, 마지막 줄 뒤는 제외).
pub fn trim_lines(value: &str) -> String {
    let mut lines: Vec<&str> = Vec::new();
    let mut seps: Vec<&str> = Vec::new();
    let mut last = 0;
    let bytes = value.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'\r' {
            let len = if i + 1 < bytes.len() && bytes[i + 1] == b'\n' { 2 } else { 1 };
            lines.push(&value[last..i]);
            seps.push(&value[i..i + len]);
            i += len;
            last = i;
        } else if bytes[i] == b'\n' {
            lines.push(&value[last..i]);
            seps.push(&value[i..i + 1]);
            i += 1;
            last = i;
        } else {
            i += 1;
        }
    }
    lines.push(&value[last..]);
    let count = lines.len();
    let mut out = String::with_capacity(value.len());
    for (index, line) in lines.iter().enumerate() {
        let mut segment = *line;
        if index > 0 {
            segment = segment.trim_start_matches([' ', '\t']);
        }
        if index + 1 < count {
            segment = segment.trim_end_matches([' ', '\t']);
        }
        out.push_str(segment);
        if index + 1 < count {
            out.push_str(seps[index]);
        }
    }
    out
}

fn trim_markdown_space_start(value: &mut String) {
    let trimmed = value.trim_start_matches([' ', '\t']).len();
    let remove = value.len() - trimmed;
    value.drain(..remove);
}

fn align_value(align: &AlignKind) -> Option<&'static str> {
    match align {
        AlignKind::Left => Some("left"),
        AlignKind::Right => Some("right"),
        AlignKind::Center => Some("center"),
        AlignKind::None => None,
    }
}

impl State {
    fn all(&mut self, nodes: &[M]) -> Vec<H> {
        let mut values = Vec::new();
        for (index, node) in nodes.iter().enumerate() {
            let (mut result, is_array) = self.one(node);
            if index > 0 && matches!(nodes[index - 1], M::Break(_)) && !is_array {
                match result.first_mut() {
                    Some(H::Text { value }) => trim_markdown_space_start(value),
                    Some(H::Element(el)) => {
                        if let Some(H::Text { value }) = el.children.first_mut() {
                            trim_markdown_space_start(value);
                        }
                    }
                    _ => {}
                }
            }
            values.extend(result);
        }
        values
    }

    fn element(&mut self, tag: &str, properties: Properties, children: &[M]) -> H {
        let children = self.all(children);
        H::element(tag, properties, children)
    }

    /// 한 노드를 변환한다. 두 번째 값은 JS 핸들러가 배열을 돌려주는 경우(true).
    fn one(&mut self, node: &M) -> (Vec<H>, bool) {
        let single = |h: H| (vec![h], false);
        match node {
            M::Root(r) => {
                let children = self.all(&r.children);
                single(H::Root {
                    children: wrap(children, false),
                })
            }
            M::Paragraph(n) => single(self.element("p", Properties::new(), &n.children)),
            M::Heading(n) => {
                let tag = format!("h{}", n.depth);
                single(self.element(&tag, Properties::new(), &n.children))
            }
            M::ThematicBreak(_) => single(H::element("hr", Properties::new(), vec![])),
            M::Blockquote(n) => {
                let children = self.all(&n.children);
                single(H::element("blockquote", Properties::new(), wrap(children, true)))
            }
            M::List(n) => single(self.list(n)),
            M::ListItem(n) => single(self.list_item(n, n.spread)),
            M::Code(n) => single(self.code(n)),
            M::Math(n) => {
                let code = H::element(
                    "code",
                    props(vec![("className", class_list(&["language-math", "math-display"]))]),
                    vec![H::text(n.value.clone())],
                );
                single(H::element("pre", Properties::new(), vec![code]))
            }
            M::InlineMath(n) => single(H::element(
                "code",
                props(vec![("className", class_list(&["language-math", "math-inline"]))]),
                vec![H::text(n.value.clone())],
            )),
            M::Text(n) => single(H::text(trim_lines(&n.value))),
            M::Emphasis(n) => single(self.element("em", Properties::new(), &n.children)),
            M::Strong(n) => single(self.element("strong", Properties::new(), &n.children)),
            M::Delete(n) => single(self.element("del", Properties::new(), &n.children)),
            M::InlineCode(n) => {
                let value = n.value.replace("\r\n", " ").replace(['\r', '\n'], " ");
                single(H::element("code", Properties::new(), vec![H::text(value)]))
            }
            M::Break(_) => (
                vec![H::element("br", Properties::new(), vec![]), H::text("\n")],
                true,
            ),
            M::Link(n) => {
                let mut properties = props(vec![("href", json!(normalize_uri(&n.url)))]);
                if let Some(title) = &n.title {
                    properties.insert("title".into(), json!(title));
                }
                single(self.element("a", properties, &n.children))
            }
            M::Image(n) => {
                let mut properties = props(vec![
                    ("src", json!(normalize_uri(&n.url))),
                    ("alt", json!(n.alt)),
                ]);
                if let Some(title) = &n.title {
                    properties.insert("title".into(), json!(title));
                }
                single(H::element("img", properties, vec![]))
            }
            M::LinkReference(n) => {
                let Some(def) = self.definitions.get(&n.identifier.to_uppercase()).cloned() else {
                    return (self.revert_link(n), true);
                };
                let mut properties = props(vec![("href", json!(normalize_uri(&def.url)))]);
                if let Some(title) = &def.title {
                    properties.insert("title".into(), json!(title));
                }
                single(self.element("a", properties, &n.children))
            }
            M::ImageReference(n) => {
                let Some(def) = self.definitions.get(&n.identifier.to_uppercase()).cloned() else {
                    let suffix = reference_suffix(&n.reference_kind, n.label.as_deref(), &n.identifier);
                    return (vec![H::text(format!("![{}{}", n.alt, suffix))], true);
                };
                let mut properties = props(vec![
                    ("src", json!(normalize_uri(&def.url))),
                    ("alt", json!(n.alt)),
                ]);
                if let Some(title) = &def.title {
                    properties.insert("title".into(), json!(title));
                }
                single(H::element("img", properties, vec![]))
            }
            M::FootnoteReference(n) => single(self.footnote_reference(n)),
            M::Table(n) => single(self.table(n)),
            M::TableRow(n) => single(self.table_row(n, 1, &[])),
            M::TableCell(n) => single(self.element("td", Properties::new(), &n.children)),
            M::MdxJsxFlowElement(n) => single(H::MdxJsxFlowElement(MdxJsxElement {
                name: n.name.clone(),
                attributes: convert_attributes(&n.attributes),
                children: self.all(&n.children),
            })),
            M::MdxJsxTextElement(n) => single(H::MdxJsxTextElement(MdxJsxElement {
                name: n.name.clone(),
                attributes: convert_attributes(&n.attributes),
                children: self.all(&n.children),
            })),
            M::MdxFlowExpression(n) => single(H::MdxFlowExpression {
                value: n.value.clone(),
            }),
            M::MdxTextExpression(n) => single(H::MdxTextExpression {
                value: n.value.clone(),
            }),
            M::MdxjsEsm(n) => single(H::MdxjsEsm {
                value: n.value.clone(),
            }),
            // MDX 모드에서는 html 구성요소가 꺼져 있어 나오지 않는다. 나와도 raw 로
            // 흘려보낼 수 없으니 버린다.
            M::Html(_) => (Vec::new(), false),
            M::Definition(_) | M::FootnoteDefinition(_) | M::Yaml(_) | M::Toml(_) => {
                (Vec::new(), false)
            }
        }
    }

    fn revert_link(&mut self, n: &mdast::LinkReference) -> Vec<H> {
        let suffix = reference_suffix(&n.reference_kind, n.label.as_deref(), &n.identifier);
        let mut contents = self.all(&n.children);
        match contents.first_mut() {
            Some(H::Text { value }) => value.insert(0, '['),
            _ => contents.insert(0, H::text("[")),
        }
        match contents.last_mut() {
            Some(H::Text { value }) => value.push_str(&suffix),
            _ => contents.push(H::text(suffix)),
        }
        contents
    }

    fn list(&mut self, n: &mdast::List) -> H {
        let loose = n.spread || n.children.iter().any(|item| match item {
            M::ListItem(item) => item.spread,
            _ => false,
        });
        let mut results = Vec::new();
        for item in &n.children {
            match item {
                M::ListItem(item) => results.push(self.list_item(item, loose)),
                other => results.extend(self.one(other).0),
            }
        }
        let mut properties = Properties::new();
        if n.ordered {
            if let Some(start) = n.start {
                if start != 1 {
                    properties.insert("start".into(), json!(start));
                }
            }
        }
        let has_task = results.iter().any(|child| match child {
            H::Element(el) => el.tag_name == "li" && el.class_names().iter().any(|c| c == "task-list-item"),
            _ => false,
        });
        if has_task {
            properties.insert("className".into(), class_list(&["contains-task-list"]));
        }
        H::element(
            if n.ordered { "ol" } else { "ul" },
            properties,
            wrap(results, true),
        )
    }

    fn list_item(&mut self, n: &mdast::ListItem, loose: bool) -> H {
        let mut results = self.all(&n.children);
        let mut properties = Properties::new();
        if let Some(checked) = n.checked {
            let is_paragraph = matches!(results.first(), Some(H::Element(el)) if el.tag_name == "p");
            if !is_paragraph {
                results.insert(0, H::element("p", Properties::new(), vec![]));
            }
            if let Some(H::Element(paragraph)) = results.first_mut() {
                if !paragraph.children.is_empty() {
                    paragraph.children.insert(0, H::text(" "));
                }
                paragraph.children.insert(
                    0,
                    H::element(
                        "input",
                        props(vec![
                            ("type", json!("checkbox")),
                            ("checked", json!(checked)),
                            ("disabled", json!(true)),
                        ]),
                        vec![],
                    ),
                );
            }
            properties.insert("className".into(), class_list(&["task-list-item"]));
        }
        let mut children = Vec::new();
        let count = results.len();
        let last_is_paragraph =
            matches!(results.last(), Some(H::Element(el)) if el.tag_name == "p");
        for (index, child) in results.into_iter().enumerate() {
            let is_paragraph = matches!(&child, H::Element(el) if el.tag_name == "p");
            if loose || index != 0 || !is_paragraph {
                children.push(H::text("\n"));
            }
            match child {
                H::Element(el) if el.tag_name == "p" && !loose => children.extend(el.children),
                other => children.push(other),
            }
        }
        if count > 0 && (loose || !last_is_paragraph) {
            children.push(H::text("\n"));
        }
        H::element("li", properties, children)
    }

    fn code(&mut self, n: &mdast::Code) -> H {
        let value = if n.value.is_empty() {
            String::new()
        } else {
            format!("{}\n", n.value)
        };
        let mut properties = Properties::new();
        if let Some(lang) = &n.lang {
            if let Some(first) = lang.split_whitespace().next() {
                properties.insert("className".into(), class_list(&[&format!("language-{first}")]));
            }
        }
        let mut code = Element {
            tag_name: "code".into(),
            properties,
            children: vec![H::text(value)],
            data: None,
        };
        if let Some(meta) = &n.meta {
            code.data = Some(json!({"meta": meta}));
        }
        H::element("pre", Properties::new(), vec![H::Element(code)])
    }

    fn footnote_reference(&mut self, n: &mdast::FootnoteReference) -> H {
        let id = n.identifier.to_uppercase();
        let safe_id = normalize_uri(&id.to_lowercase());
        let counter;
        let reuse = match self.footnote_counts.get(&id) {
            None => {
                self.footnote_order.push(id.clone());
                counter = self.footnote_order.len();
                1
            }
            Some(count) => {
                counter = self.footnote_order.iter().position(|x| x == &id).unwrap() + 1;
                count + 1
            }
        };
        self.footnote_counts.insert(id, reuse);
        let mut fnref = format!("{CLOBBER_PREFIX}fnref-{safe_id}");
        if reuse > 1 {
            fnref.push_str(&format!("-{reuse}"));
        }
        let link = H::element(
            "a",
            props(vec![
                ("href", json!(format!("#{CLOBBER_PREFIX}fn-{safe_id}"))),
                ("id", json!(fnref)),
                ("dataFootnoteRef", json!(true)),
                ("ariaDescribedBy", class_list(&["footnote-label"])),
            ]),
            vec![H::text(counter.to_string())],
        );
        H::element("sup", Properties::new(), vec![link])
    }

    fn table(&mut self, n: &mdast::Table) -> H {
        let mut rows = Vec::new();
        for (index, row) in n.children.iter().enumerate() {
            match row {
                M::TableRow(row) => rows.push(self.table_row(row, index, &n.align)),
                other => rows.extend(self.one(other).0),
            }
        }
        let mut content = Vec::new();
        if !rows.is_empty() {
            let first = rows.remove(0);
            content.push(H::element("thead", Properties::new(), wrap(vec![first], true)));
        }
        if !rows.is_empty() {
            content.push(H::element("tbody", Properties::new(), wrap(rows, true)));
        }
        H::element("table", Properties::new(), wrap(content, true))
    }

    fn table_row(&mut self, n: &mdast::TableRow, row_index: usize, align: &[AlignKind]) -> H {
        let tag = if row_index == 0 { "th" } else { "td" };
        let length = if align.is_empty() { n.children.len() } else { align.len() };
        let mut cells = Vec::new();
        for cell_index in 0..length {
            let mut properties = Properties::new();
            if let Some(value) = align.get(cell_index).and_then(align_value) {
                properties.insert("align".into(), json!(value));
            }
            let children = match n.children.get(cell_index) {
                Some(M::TableCell(cell)) => self.all(&cell.children),
                Some(other) => self.one(other).0,
                None => Vec::new(),
            };
            cells.push(H::element(tag, properties, children));
        }
        H::element("tr", Properties::new(), wrap(cells, true))
    }

    fn footer(&mut self) -> Option<H> {
        let mut items = Vec::new();
        let order = self.footnote_order.clone();
        for (reference_index, id) in order.iter().enumerate() {
            let Some(definition) = self.footnotes.get(id).cloned() else {
                continue;
            };
            let mut content = self.all(&definition.children);
            let safe_id = normalize_uri(&id.to_lowercase());
            let count = self.footnote_counts.get(id).copied().unwrap_or(0);
            let mut back_references = Vec::new();
            for rereference_index in 1..=count {
                if !back_references.is_empty() {
                    back_references.push(H::text(" "));
                }
                let mut children = vec![H::text("↩")];
                if rereference_index > 1 {
                    children.push(H::element(
                        "sup",
                        Properties::new(),
                        vec![H::text(rereference_index.to_string())],
                    ));
                }
                let suffix = if rereference_index > 1 {
                    format!("-{rereference_index}")
                } else {
                    String::new()
                };
                back_references.push(H::element(
                    "a",
                    props(vec![
                        ("href", json!(format!("#{CLOBBER_PREFIX}fnref-{safe_id}{suffix}"))),
                        ("dataFootnoteBackref", json!("")),
                        ("ariaLabel", json!(format!("Back to reference {}{}", reference_index + 1, suffix))),
                        ("className", class_list(&["data-footnote-backref"])),
                    ]),
                    children,
                ));
            }
            let tail_is_paragraph =
                matches!(content.last(), Some(H::Element(el)) if el.tag_name == "p");
            if tail_is_paragraph {
                if let Some(H::Element(tail)) = content.last_mut() {
                    match tail.children.last_mut() {
                        Some(H::Text { value }) => value.push(' '),
                        _ => tail.children.push(H::text(" ")),
                    }
                    tail.children.extend(back_references);
                }
            } else {
                content.extend(back_references);
            }
            items.push(H::element(
                "li",
                props(vec![("id", json!(format!("{CLOBBER_PREFIX}fn-{safe_id}")))]),
                wrap(content, true),
            ));
        }
        if items.is_empty() {
            return None;
        }
        Some(H::element(
            "section",
            props(vec![
                ("dataFootnotes", json!(true)),
                ("className", class_list(&["footnotes"])),
            ]),
            vec![
                H::element(
                    "h2",
                    props(vec![
                        ("className", class_list(&["sr-only"])),
                        ("id", json!("footnote-label")),
                    ]),
                    vec![H::text("Footnotes")],
                ),
                H::text("\n"),
                H::element("ol", Properties::new(), wrap(items, true)),
                H::text("\n"),
            ],
        ))
    }
}

fn reference_suffix(kind: &ReferenceKind, label: Option<&str>, identifier: &str) -> String {
    match kind {
        ReferenceKind::Shortcut => "]".to_string(),
        ReferenceKind::Collapsed => "][]".to_string(),
        ReferenceKind::Full => format!("][{}]", label.unwrap_or(identifier)),
    }
}

fn convert_attributes(attributes: &[AttributeContent]) -> Vec<MdxAttribute> {
    attributes
        .iter()
        .map(|attribute| match attribute {
            AttributeContent::Property(property) => MdxAttribute::Attribute {
                name: property.name.clone(),
                value: property.value.as_ref().map(|value| match value {
                    AttributeValue::Literal(s) => MdxAttributeValue::Literal(s.clone()),
                    AttributeValue::Expression(expression) => {
                        let literal = eval_literal(&expression.value);
                        MdxAttributeValue::Expression(MdxAttributeValueExpression {
                            kind: "mdxJsxAttributeValueExpression",
                            value: expression.value.clone(),
                            data: match literal {
                                Some(v) => json!({"literal": v}),
                                None => Value::Object(Default::default()),
                            },
                        })
                    }
                }),
            },
            AttributeContent::Expression(expression) => MdxAttribute::Expression {
                value: expression.value.clone(),
            },
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_lines() {
        assert_eq!(trim_lines("a  \n  b \n c"), "a\nb\nc");
        assert_eq!(trim_lines("  a"), "  a");
        assert_eq!(trim_lines("a  "), "a  ");
    }
}
