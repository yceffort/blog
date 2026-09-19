//! MDX 표현식 속성(`height={680}`) 의 리터럴 평가. JS 를 실행하지 않고
//! 숫자, 불리언, null, 문자열 리터럴만 받아들인다. 그 밖의 표현식은 거부한다.
//! 렌더 결과가 프로덕션에서만 문제를 일으키는 리터럴 태그도 여기서 막는다.

use crate::hast::{MdxAttribute, MdxAttributeValue, Node};
use serde_json::Value;

pub fn resolve(node: &mut Node) -> Result<(), String> {
    match node {
        Node::MdxJsxFlowElement(el) | Node::MdxJsxTextElement(el) => {
            // script 는 글 안의 스크립트가 그대로 실행되고, 원본 <img> 는 images.rs 가
            // hast 요소만 돌기 때문에 경로 재작성과 크기 부여를 건너뛴다.
            match el.name.as_deref() {
                Some("script") => {
                    return Err("<script> is not supported: use an iframe instead".to_string());
                }
                Some("img") => {
                    return Err(
                        "raw <img> is not supported: use the markdown image syntax".to_string()
                    );
                }
                _ => {}
            }
            for attribute in &mut el.attributes {
                match attribute {
                    MdxAttribute::Expression { value } => {
                        return Err(format!(
                            "MDX spread attribute is not supported: {{{value}}}"
                        ));
                    }
                    MdxAttribute::Attribute {
                        name,
                        value: Some(value),
                    } => {
                        // React 는 style 에 객체만 받는다. 문자열은 렌더 시점에 던진다.
                        if name == "style" {
                            if let MdxAttributeValue::Literal(literal) = value {
                                return Err(format!(
                                    "style must be an object, not a string: style=\"{literal}\""
                                ));
                            }
                        }
                        if let MdxAttributeValue::Expression(expression) = value {
                            let literal = expression.data.get("literal").ok_or_else(|| {
                                format!(
                                    "MDX attribute expression must be a literal: {name}={{{}}}",
                                    expression.value
                                )
                            })?;
                            *value = MdxAttributeValue::Resolved(literal.clone());
                        }
                    }
                    _ => {}
                }
            }
        }
        Node::MdxFlowExpression { value } | Node::MdxTextExpression { value } => {
            return Err(format!(
                "MDX expression is not supported: {{{}}}",
                value.chars().take(80).collect::<String>()
            ));
        }
        _ => {}
    }
    if let Some(children) = node.children_mut() {
        children.retain(|child| {
            !matches!(child,
                Node::MdxFlowExpression { value } | Node::MdxTextExpression { value }
                    if is_only_comments(value)
            )
        });
        for child in children {
            resolve(child)?;
        }
    }
    Ok(())
}

/// 값이 공백과 주석으로만 이루어졌는지 본다. 주석 뒤에 표현식이 붙어 있으면
/// 제거 대상이 아니라 거부 대상이다.
fn is_only_comments(value: &str) -> bool {
    let bytes = value.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i].is_ascii_whitespace() {
            i += 1;
        } else if bytes[i] == b'/' && bytes.get(i + 1) == Some(&b'*') {
            let Some(end) = value[i + 2..].find("*/") else {
                return false;
            };
            i += 2 + end + 2;
        } else if bytes[i] == b'/' && bytes.get(i + 1) == Some(&b'/') {
            i += value[i..].find('\n').map_or(bytes.len() - i, |n| n + 1);
        } else {
            return false;
        }
    }
    true
}

pub fn eval_literal(source: &str) -> Option<Value> {
    let s = source.trim();
    match s {
        "true" => return Some(Value::Bool(true)),
        "false" => return Some(Value::Bool(false)),
        "null" => return Some(Value::Null),
        _ => {}
    }
    if let Ok(n) = s.parse::<i64>() {
        return Some(Value::from(n));
    }
    if let Ok(n) = s.parse::<f64>() {
        if n.is_finite() {
            return Some(Value::from(n));
        }
    }
    let bytes = s.as_bytes();
    if bytes.len() >= 2 {
        let quote = bytes[0];
        if (quote == b'"' || quote == b'\'') && bytes[bytes.len() - 1] == quote {
            let inner = &s[1..s.len() - 1];
            if !inner.contains('\\') && !inner.contains(quote as char) {
                return Some(Value::String(inner.to_string()));
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_comments() {
        assert!(is_only_comments(""));
        assert!(is_only_comments("  \n "));
        assert!(is_only_comments("/* a */"));
        assert!(is_only_comments(" /* a */ /* b */ "));
        assert!(is_only_comments("// a\n"));
        // 주석 뒤에 표현식이 붙으면 제거 대상이 아니다.
        assert!(!is_only_comments("/* a */ b"));
        assert!(!is_only_comments("x /* a */"));
        // 닫히지 않은 블록 주석도 제거하지 않는다.
        assert!(!is_only_comments("/* a"));
    }

    #[test]
    fn rejects_tags_the_renderer_cannot_handle() {
        let script = crate::render("<script src=\"https://a.example/b.js\"></script>\n");
        assert!(script.unwrap_err().contains("<script> is not supported"));
        let img = crate::render("<img src=\"./a.png\" alt=\"a\" />\n");
        assert!(img.unwrap_err().contains("raw <img> is not supported"));
        let style = crate::render("<span style=\"color: red\">a</span>\n");
        assert!(style.unwrap_err().contains("style must be an object"));
        // 마크다운 이미지 문법과 다른 태그는 그대로 통과한다.
        assert!(crate::render("![a](./a.png)\n").is_ok());
        assert!(crate::render("<Demo height={2} />\n").is_ok());
    }

    #[test]
    fn literals() {
        assert_eq!(eval_literal("680"), Some(Value::from(680)));
        assert_eq!(eval_literal(" 1.5 "), Some(Value::from(1.5)));
        assert_eq!(eval_literal("true"), Some(Value::Bool(true)));
        assert_eq!(eval_literal("'a b'"), Some(Value::String("a b".into())));
        assert_eq!(eval_literal("props.x"), None);
    }
}
