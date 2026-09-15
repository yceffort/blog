use crate::hast::{class_list, props, Element, Node};
use serde_json::json;
use std::sync::OnceLock;
use syntect::{
    easy::ScopeRegionIterator,
    parsing::{ParseState, Scope, ScopeStack, SyntaxSet},
};

/// syntect 는 한 줄 안의 개별 토큰 길이에 대해 2차식으로 느려진다. 저장소의 실제
/// 코드블록 최장 줄은 601자이므로 이 상한은 기존 글을 그대로 토큰화하면서
/// base64 한 줄 같은 장문에서 빌드가 멈춘 듯 보이는 것만 막는다.
///
/// 상한을 넘은 줄만 건너뛰면 `ParseState` 가 그 줄에서 열린 주석이나 문자열을 못 봐서
/// 뒤따르는 줄의 토큰이 어긋난다. 그래서 그런 줄이 하나라도 있으면 블록 전체를
/// 토큰화하지 않는다.
const MAX_TOKENIZED_LINE: usize = 2048;

static SYNTAXES: OnceLock<SyntaxSet> = OnceLock::new();
static TOKENS: OnceLock<Vec<(Scope, &'static str)>> = OnceLock::new();

fn token_type(stack: &ScopeStack) -> Option<&'static str> {
    let tokens = TOKENS.get_or_init(|| {
        [
            ("comment", "comment"),
            ("string", "string"),
            ("constant.numeric", "number"),
            ("constant.language", "boolean"),
            ("keyword", "keyword"),
            ("storage", "keyword"),
            ("entity.name.function", "function"),
            ("support.function", "function"),
            ("entity.name.tag", "tag"),
            ("entity.other.attribute-name", "attr-name"),
            ("entity.name.type", "class-name"),
            ("entity.name.class", "class-name"),
            ("punctuation", "punctuation"),
        ]
        .into_iter()
        .map(|(scope, name)| (Scope::new(scope).unwrap(), name))
        .collect()
    });
    for scope in stack.as_slice().iter().rev() {
        for (prefix, name) in tokens {
            if prefix.is_prefix_of(*scope) {
                return Some(name);
            }
        }
    }
    None
}

pub fn apply(node: &mut Node) -> Result<(), String> {
    if let Node::Element(pre) = node {
        if pre.tag_name == "pre" {
            highlight(pre)?;
            return Ok(());
        }
    }
    if let Some(children) = node.children_mut() {
        for child in children {
            apply(child)?;
        }
    }
    Ok(())
}

fn highlight(pre: &mut Element) -> Result<(), String> {
    let Some(Node::Element(code)) = pre.children.iter_mut().find(|node| {
        matches!(node, Node::Element(el) if el.tag_name == "code")
    }) else {
        return Ok(());
    };
    let language = code
        .class_names()
        .iter()
        .find_map(|s| s.strip_prefix("language-").map(str::to_ascii_lowercase))
        .unwrap_or_default();
    if language == "math" {
        return Ok(());
    }
    let grammar = language.strip_prefix("diff-").unwrap_or(&language);
    let token = match grammar {
        "javascript" => "js",
        "typescript" => "ts",
        "shell" | "shellscript" => "sh",
        "python" => "py",
        "ruby" => "rb",
        "rust" => "rs",
        "csharp" => "cs",
        "markup" => "html",
        "pascal" => "pas",
        "ocaml" => "ml",
        other => other,
    };
    let ss = SYNTAXES.get_or_init(two_face::syntax::extra_newlines);
    let syntax = ss
        .find_syntax_by_token(token)
        .unwrap_or_else(|| ss.find_syntax_plain_text());
    let mut parser = ParseState::new(syntax);
    let mut scopes = ScopeStack::new();
    let meta = code
        .data
        .as_ref()
        .and_then(|d| d.get("meta"))
        .and_then(|v| v.as_str())
        .or_else(|| code.properties.get("metastring").and_then(|v| v.as_str()))
        .unwrap_or_default()
        .to_ascii_lowercase();
    let numbered = ![
        "showlinenumbers=false",
        "showlinenumbers=\"false\"",
        "showlinenumbers={false}",
    ]
    .iter()
    .any(|value| meta.contains(value));
    let start = meta
        .split_once("showlinenumbers=")
        .and_then(|(_, value)| value.split(|c: char| !c.is_ascii_digit()).next())
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(1);
    let source = code
        .children
        .iter()
        .map(Node::text_content)
        .collect::<String>();
    let tokenize = source
        .split_inclusive('\n')
        .all(|line| line.len() <= MAX_TOKENIZED_LINE);
    let mut lines = Vec::new();
    for (index, line) in source.split_inclusive('\n').enumerate() {
        let mut children = Vec::new();
        if !tokenize {
            children.push(Node::text(line));
        } else {
            let ops = parser
                .parse_line(line, ss)
                .map_err(|e| format!("{language} highlighting: {e}"))?;
            for (text, op) in ScopeRegionIterator::new(&ops, line) {
                scopes.apply(op).map_err(|e| e.to_string())?;
                if text.is_empty() {
                    continue;
                }
                children.push(match token_type(&scopes) {
                    Some(kind) => Node::element(
                        "span",
                        props(vec![("className", class_list(&["token", kind]))]),
                        vec![Node::text(text)],
                    ),
                    None => Node::text(text),
                });
            }
        }
        let mut classes = vec!["code-line"];
        if numbered {
            classes.push("line-number");
        }
        if highlighted(&meta, index + 1) {
            classes.push("highlight-line");
        }
        if language == "diff" || language.starts_with("diff-") {
            if line.starts_with('-') {
                classes.push("deleted");
            }
            if line.starts_with('+') {
                classes.push("inserted");
            }
        }
        let mut properties = props(vec![("className", class_list(&classes))]);
        if numbered {
            properties.insert("line".into(), json!([(start + index).to_string()]));
        }
        lines.push(Node::element("span", properties, children));
    }
    code.push_class("code-highlight");
    code.children = lines;
    if !language.is_empty() {
        pre.push_class(&format!("language-{grammar}"));
    }
    Ok(())
}

fn highlighted(meta: &str, line: usize) -> bool {
    meta.split('{').skip(1).filter_map(|s| s.split_once('}').map(|(s, _)| s))
        .any(|list| list.split(',').any(|range| {
            let range = range.trim();
            if let Some((start, end)) = range.split_once('-') {
                matches!((start.trim().parse::<usize>(), end.trim().parse::<usize>()), (Ok(start), Ok(end)) if start <= line && line <= end)
            } else { range.parse::<usize>() == Ok(line) }
        }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leaves_a_block_with_a_very_long_line_untokenized() {
        let long = "x".repeat(MAX_TOKENIZED_LINE + 1);
        let node = crate::render(&format!("```js\nconst a = 1\nconst b = '{long}'\n```\n")).unwrap();
        // 원문은 그대로 남는다.
        assert_eq!(
            node.text_content(),
            format!("const a = 1\nconst b = '{long}'\n")
        );
        let value = serde_json::to_value(node).unwrap();
        let lines = value["children"][0]["children"][0]["children"]
            .as_array()
            .unwrap()
            .clone();
        // 파서 상태가 어긋나지 않도록 블록의 모든 줄이 텍스트 하나로 남는다.
        for line in &lines {
            let children = line["children"].as_array().unwrap();
            assert_eq!(children.len(), 1);
            assert_eq!(children[0]["type"], "text");
        }
    }

    #[test]
    fn a_long_line_does_not_shift_the_tokens_after_it() {
        let long = "x".repeat(MAX_TOKENIZED_LINE + 1);
        // 긴 줄이 여러 줄 주석을 열어 둔다. 그 줄만 건너뛰면 뒤의 줄이 주석 밖으로 읽힌다.
        let source = format!("```js\n/* {long}\nconst a = 1 */\nconst b = 2\n```\n");
        let value = serde_json::to_value(crate::render(&source).unwrap()).unwrap();
        let lines = value["children"][0]["children"][0]["children"]
            .as_array()
            .unwrap()
            .clone();
        assert_eq!(lines.len(), 3);
        for line in &lines {
            let children = line["children"].as_array().unwrap();
            assert_eq!(children.len(), 1);
            assert_eq!(children[0]["type"], "text");
        }
    }

    #[test]
    fn preserves_line_controls_and_filename() {
        let node = crate::render("```typescript:example.ts {2-3} showLineNumbers=5\nconst a = 1\nconst b = 2\nconst c = 3\n```\n").unwrap();
        let value = serde_json::to_value(node).unwrap();
        let code = &value["children"][0]["children"][0];
        assert_eq!(code["properties"]["data-filename"], "example.ts");
        let lines = code["children"].as_array().unwrap();
        assert_eq!(lines.len(), 3);
        assert_eq!(lines[0]["properties"]["line"], json!(["5"]));
        assert_eq!(lines[1]["properties"]["line"], json!(["6"]));
        assert!(lines[1]["properties"]["className"]
            .as_array()
            .unwrap()
            .contains(&json!("highlight-line")));
    }

    #[test]
    fn supports_tsx_and_disables_line_numbers() {
        let ss = SYNTAXES.get_or_init(two_face::syntax::extra_newlines);
        for token in ["ts", "tsx", "jsx", "dockerfile", "toml"] {
            assert!(ss.find_syntax_by_token(token).is_some(), "{token}");
        }
        let node =
            crate::render("```tsx showLineNumbers=false\nconst el = <Button value={1} />\n```\n")
                .unwrap();
        assert_eq!(node.text_content(), "const el = <Button value={1} />\n");
        let value = serde_json::to_string(&node).unwrap();
        assert!(value.contains("token"));
        assert!(!value.contains("line-number"));
    }

    #[test]
    fn preserves_diff_and_multiline_comment_text() {
        let node = crate::render("```diff-javascript\n-old\n+new\n```\n").unwrap();
        let value = serde_json::to_string(&node).unwrap();
        assert!(value.contains("deleted"));
        assert!(value.contains("inserted"));
        let node = crate::render("```js\n/* first\nsecond */\nconst x = 1\n```\n").unwrap();
        assert_eq!(node.text_content(), "/* first\nsecond */\nconst x = 1\n");
    }

    #[test]
    fn preserves_a_real_trailing_blank_line() {
        let node = crate::render("```text\none\n\n```\n").unwrap();
        assert_eq!(node.text_content(), "one\n\n");
        let value = serde_json::to_value(node).unwrap();
        assert_eq!(
            value["children"][0]["children"][0]["children"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
    }
}
