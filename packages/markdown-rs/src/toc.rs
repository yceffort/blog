//! remark-toc 9.0.0 (mdast-util-toc 7.1.0) 이식. 기본 옵션(heading 정규식
//! `(table[ -]of[ -])?contents?|toc`, tight, maxDepth 6) 만 지원한다.

use markdown::mdast::{self, Node};

use crate::slugger::Slugger;

struct Entry {
    depth: u8,
    children: Vec<Node>,
    id: String,
}

struct Search {
    slugger: Slugger,
    index: Option<usize>,
    end_index: Option<usize>,
    opening_depth: Option<u8>,
    map: Vec<Entry>,
}

/// `mdast-util-to-string` (includeImageAlt: false).
pub fn to_string(node: &Node) -> String {
    let mut out = String::new();
    collect(node, &mut out);
    out
}

fn collect(node: &Node, out: &mut String) {
    match node {
        Node::Text(n) => out.push_str(&n.value),
        Node::InlineCode(n) => out.push_str(&n.value),
        Node::InlineMath(n) => out.push_str(&n.value),
        Node::Html(n) => out.push_str(&n.value),
        Node::Code(n) => out.push_str(&n.value),
        Node::Math(n) => out.push_str(&n.value),
        Node::MdxFlowExpression(n) => out.push_str(&n.value),
        Node::MdxTextExpression(n) => out.push_str(&n.value),
        Node::MdxjsEsm(n) => out.push_str(&n.value),
        Node::Yaml(n) => out.push_str(&n.value),
        Node::Toml(n) => out.push_str(&n.value),
        Node::Image(_) | Node::ImageReference(_) => {}
        _ => {
            if let Some(children) = node.children() {
                for child in children {
                    collect(child, out);
                }
            }
        }
    }
}

/// `^((table[ -]of[ -])?contents?|toc)$` (대소문자 무시).
fn is_toc_heading(value: &str) -> bool {
    let lower = value.to_lowercase();
    if lower == "toc" {
        return true;
    }
    let rest = strip_table_of(&lower).unwrap_or(lower.as_str());
    rest == "content" || rest == "contents"
}

fn strip_table_of(value: &str) -> Option<&str> {
    let rest = value.strip_prefix("table")?;
    let rest = rest.strip_prefix([' ', '-'])?;
    let rest = rest.strip_prefix("of")?;
    rest.strip_prefix([' ', '-'])
}

fn visit(node: &Node, is_root_child: bool, position: usize, search: &mut Search) {
    if let Node::Heading(heading) = node {
        let value = to_string(node);
        let slug = search.slugger.slug(&value);
        if is_root_child {
            if search.index.is_none() && is_toc_heading(&value) {
                search.index = Some(position + 1);
                search.opening_depth = Some(heading.depth);
                return;
            }
            if let Some(opening) = search.opening_depth {
                if search.end_index.is_none() && heading.depth <= opening {
                    search.end_index = Some(position);
                }
            }
            if search.end_index.is_some() {
                search.map.push(Entry {
                    depth: heading.depth,
                    children: heading.children.clone(),
                    id: slug,
                });
            }
        }
    }
    if let Some(children) = node.children() {
        for (i, child) in children.iter().enumerate() {
            visit(child, false, i, search);
        }
    }
}

pub fn apply(root: &mut Node) {
    let Node::Root(root_node) = root else {
        return;
    };
    let mut search = Search {
        slugger: Slugger::new(),
        index: None,
        end_index: None,
        opening_depth: None,
        map: Vec::new(),
    };
    for (i, child) in root_node.children.iter().enumerate() {
        visit(child, true, i, &mut search);
    }
    let Some(index) = search.index else {
        return;
    };
    let end_index = search.end_index.unwrap_or(root_node.children.len());
    if search.map.is_empty() {
        return;
    }
    let table = contents(search.map);
    let tail = root_node.children.split_off(end_index);
    root_node.children.truncate(index);
    root_node.children.push(table);
    root_node.children.extend(tail);
}

fn list() -> Node {
    Node::List(mdast::List {
        children: Vec::new(),
        position: None,
        ordered: false,
        start: None,
        spread: false,
    })
}

fn list_item(children: Vec<Node>) -> Node {
    Node::ListItem(mdast::ListItem {
        children,
        position: None,
        spread: false,
        checked: None,
    })
}

fn contents(mut map: Vec<Entry>) -> Node {
    let min_depth = map.iter().map(|e| e.depth).min().unwrap_or(1);
    for entry in &mut map {
        entry.depth -= min_depth - 1;
    }
    let mut table = list();
    for mut entry in map {
        insert(&mut entry, &mut table);
    }
    table
}

fn insert(entry: &mut Entry, parent: &mut Node) {
    match parent {
        Node::List(list_node) => {
            if entry.depth == 1 {
                let link = Node::Link(mdast::Link {
                    children: all(&entry.children),
                    position: None,
                    url: format!("#{}", entry.id),
                    title: None,
                });
                let paragraph = Node::Paragraph(mdast::Paragraph {
                    children: vec![link],
                    position: None,
                });
                list_node.children.push(list_item(vec![paragraph]));
            } else if let Some(tail) = list_node.children.last_mut() {
                insert(entry, tail);
            } else {
                list_node.children.push(list_item(Vec::new()));
                insert(entry, list_node.children.last_mut().unwrap());
            }
            // tight: true
            list_node.spread = false;
        }
        Node::ListItem(item) => {
            if !matches!(item.children.last(), Some(Node::List(_))) {
                item.children.push(list());
            }
            entry.depth -= 1;
            insert(entry, item.children.last_mut().unwrap());
            item.spread = false;
        }
        _ => {}
    }
}

fn all(nodes: &[Node]) -> Vec<Node> {
    let mut out = Vec::new();
    for node in nodes {
        match node {
            Node::FootnoteReference(_) => {}
            Node::Link(link) => out.extend(all(&link.children)),
            Node::LinkReference(link) => out.extend(all(&link.children)),
            _ => {
                let mut copy = node.clone();
                if let Some(children) = copy.children_mut() {
                    *children = all(children);
                }
                out.push(copy);
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heading_expression() {
        assert!(is_toc_heading("Table of Contents"));
        assert!(is_toc_heading("table-of-contents"));
        assert!(is_toc_heading("Contents"));
        assert!(is_toc_heading("TOC"));
        assert!(!is_toc_heading("Table of Contents (Subject to Change)"));
        assert!(!is_toc_heading("목차"));
    }
}
