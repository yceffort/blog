//! MDX 표현식 속성(`height={680}`) 의 리터럴 평가. JS 를 실행하지 않고
//! 숫자, 불리언, null, 문자열 리터럴만 받아들인다. 그 밖의 표현식은 거부한다.

use crate::hast::{MdxAttribute, MdxAttributeValue, Node};
use serde_json::Value;

pub fn resolve(node: &mut Node) -> Result<(), String> {
    match node {
        Node::MdxJsxFlowElement(el) | Node::MdxJsxTextElement(el) => {
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
                    if value.trim().is_empty() || value.trim().starts_with("/*")
            )
        });
        for child in children {
            resolve(child)?;
        }
    }
    Ok(())
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
    fn literals() {
        assert_eq!(eval_literal("680"), Some(Value::from(680)));
        assert_eq!(eval_literal(" 1.5 "), Some(Value::from(1.5)));
        assert_eq!(eval_literal("true"), Some(Value::Bool(true)));
        assert_eq!(eval_literal("'a b'"), Some(Value::String("a b".into())));
        assert_eq!(eval_literal("props.x"), None);
    }
}
