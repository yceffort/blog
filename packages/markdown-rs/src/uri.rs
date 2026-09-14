//! `micromark-util-sanitize-uri` 의 `normalizeUri` 이식. href/src 에 쓰인다.

const KEEP: &[u8] = b"!#$&'()*+,-./0123456789:;=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~";

pub fn normalize_uri(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut out = String::with_capacity(value.len());
    let mut i = 0;
    while i < bytes.len() {
        let b = bytes[i];
        if b == b'%'
            && i + 2 < bytes.len()
            && bytes[i + 1].is_ascii_alphanumeric()
            && bytes[i + 2].is_ascii_alphanumeric()
        {
            out.push_str(&value[i..i + 3]);
            i += 3;
            continue;
        }
        if b.is_ascii() {
            if KEEP.contains(&b) {
                out.push(b as char);
            } else {
                out.push_str(&format!("%{b:02X}"));
            }
            i += 1;
            continue;
        }
        let c = value[i..].chars().next().unwrap();
        let mut buf = [0u8; 4];
        for byte in c.encode_utf8(&mut buf).as_bytes() {
            out.push_str(&format!("%{byte:02X}"));
        }
        i += c.len_utf8();
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes() {
        assert_eq!(normalize_uri("https://a.b/c?d=1&e=2#f"), "https://a.b/c?d=1&e=2#f");
        assert_eq!(normalize_uri("a b"), "a%20b");
        assert_eq!(normalize_uri("/2024/01/한글"), "/2024/01/%ED%95%9C%EA%B8%80");
        assert_eq!(normalize_uri("%ED%95%9C"), "%ED%95%9C");
        assert_eq!(normalize_uri("100%"), "100%25");
        assert_eq!(normalize_uri("<a>"), "%3Ca%3E");
    }
}
