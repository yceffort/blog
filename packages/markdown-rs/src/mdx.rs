//! MDX 표현식 속성(`height={680}`) 의 리터럴 평가. JS 를 실행하지 않고
//! 숫자, 불리언, null, 문자열 리터럴만 받아들인다. 그 밖의 표현식은 그대로 넘긴다.

use serde_json::Value;

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
