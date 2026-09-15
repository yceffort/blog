//! yceffort.kr 포스트용 마크다운 파이프라인. 마크다운(MDX 문법 포함)을 받아
//! React에 전달할 hast 트리를 만든다. 코드 색상은 syntect, 수식은 MathML을 쓴다.
//!
//! 순서: 파싱(GFM, math, MDX, CJK 강조) -> unravel -> toc -> to_hast -> slug ->
//! code filename -> 제목 자동 링크 -> 수식 -> 하이라이트 -> MDX 리터럴 검증.
//! render_json에 포스트 경로를 전달하면 WASI의 /public에서 이미지 크기도 읽는다.

mod hast;
mod highlight;
mod images;
mod math;
mod mdx;
mod slug_table;
mod slugger;
mod to_hast;
mod toc;
mod transforms;
mod uri;

use markdown::{Constructs, ParseOptions};
use serde::Deserialize;

pub use hast::Node;

fn parse_options() -> ParseOptions {
    // remark-parse + remark-mdx + remark-gfm + remark-math 와 같은 구성.
    // remark-mdx 는 autolink, 들여쓰기 코드, HTML 을 끈다.
    let mut constructs = Constructs::gfm();
    constructs.autolink = false;
    constructs.code_indented = false;
    constructs.html_flow = false;
    constructs.html_text = false;
    constructs.math_flow = true;
    constructs.math_text = true;
    // import/export 는 JS 를 실행해야 의미가 있어 지원하지 않는다. 이 값을 켜도
    // mdx_esm_parse 가 없으면 구성요소가 꺼지므로, 꺼져 있다고 적어 둔다.
    // 포스트에 섞여 들어오면 check-markdown.mjs 가 잡는다.
    constructs.mdx_esm = false;
    constructs.mdx_expression_flow = true;
    constructs.mdx_expression_text = true;
    constructs.mdx_jsx_flow = true;
    constructs.mdx_jsx_text = true;
    ParseOptions {
        constructs,
        gfm_strikethrough_single_tilde: true,
        math_text_single_dollar: true,
        mdx_expression_parse: None,
        mdx_esm_parse: None,
    }
}

pub fn render(body: &str) -> Result<Node, String> {
    let mut mdast = markdown::to_mdast(body, &parse_options()).map_err(|m| m.to_string())?;
    to_hast::unwrap_nested_links(&mut mdast, false);
    to_hast::unravel(&mut mdast);
    toc::apply(&mut mdast);
    let mut tree = to_hast::to_hast(&mdast);
    transforms::slug_headings(&mut tree);
    transforms::extract_code_filename(&mut tree);
    transforms::autolink_headings(&mut tree);
    math::apply(&mut tree)?;
    highlight::apply(&mut tree)?;
    mdx::resolve(&mut tree)?;
    Ok(tree)
}

#[derive(Deserialize)]
struct Request {
    body: String,
    path: Option<String>,
}

/// JSON 요청 `{body, path?}` -> JSON 응답 `{ok, hast}` 또는 `{ok: false, error}`.
pub fn render_json(input: &str) -> String {
    let result = serde_json::from_str::<Request>(input)
        .map_err(|e| format!("invalid request: {e}"))
        .and_then(|req| {
            let mut tree = render(&req.body)?;
            if let Some(path) = req.path {
                images::apply(&mut tree, &path, std::path::Path::new("/public"));
            }
            Ok(tree)
        });
    match result {
        Ok(hast) => serde_json::json!({"ok": true, "hast": hast}).to_string(),
        Err(error) => serde_json::json!({"ok": false, "error": error}).to_string(),
    }
}

// ---- wasm ABI (wasm-bindgen 없이 쓰는 최소 인터페이스) ----
// 입력: alloc 으로 받은 버퍼에 UTF-8 JSON 을 쓰고 render_json_ptr(ptr, len) 호출.
// 출력: [u32 길이 (LE)][UTF-8 JSON]. 다 읽은 뒤 free_result(ptr) 로 반납.

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut buf = Vec::<u8>::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

/// # Safety
/// `ptr`/`len` 은 `alloc(len)` 이 돌려준 값이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    drop(Vec::from_raw_parts(ptr, 0, len));
}

/// # Safety
/// `ptr`/`len` 은 유효한 UTF-8 버퍼여야 한다.
#[no_mangle]
pub unsafe extern "C" fn render_json_ptr(ptr: *const u8, len: usize) -> *mut u8 {
    let input = std::slice::from_raw_parts(ptr, len);
    let output = match std::str::from_utf8(input) {
        Ok(s) => render_json(s),
        Err(e) => {
            serde_json::json!({"ok": false, "error": format!("invalid utf-8: {e}")}).to_string()
        }
    };
    let bytes = output.into_bytes();
    let mut buf = Vec::<u8>::with_capacity(4 + bytes.len());
    buf.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
    buf.extend_from_slice(&bytes);
    let boxed = buf.into_boxed_slice();
    Box::into_raw(boxed) as *mut u8
}

/// # Safety
/// `ptr` 는 `render_json_ptr` 가 돌려준 값이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn free_result(ptr: *mut u8) {
    let len = u32::from_le_bytes([*ptr, *ptr.add(1), *ptr.add(2), *ptr.add(3)]) as usize;
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(
        ptr,
        4 + len,
    )));
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 트리를 `tag(자식,...)` 또는 `"텍스트"` 한 줄로 접어 비교하기 쉽게 만든다.
    fn sketch(node: &Node) -> String {
        match node {
            Node::Text { value } => format!("{value:?}"),
            Node::Element(el) => {
                let children: Vec<String> = el.children.iter().map(sketch).collect();
                let id = el
                    .properties
                    .get("id")
                    .and_then(|v| v.as_str())
                    .map(|v| format!("#{v}"))
                    .unwrap_or_default();
                format!("{}{}({})", el.tag_name, id, children.join(","))
            }
            Node::Root { children } => children.iter().map(sketch).collect::<Vec<_>>().join(""),
            other => format!("{other:?}"),
        }
    }

    fn render_sketch(body: &str) -> String {
        sketch(&render(body).unwrap())
    }

    #[test]
    fn korean_emphasis_closes_next_to_a_particle() {
        // remark-cjk-friendly 규칙. CommonMark 그대로면 이 강조는 닫히지 않는다.
        assert_eq!(render_sketch("**강조**는"), "p(strong(\"강조\"),\"는\")");
        assert_eq!(
            render_sketch("**(괄호)**뒤"),
            "p(strong(\"(괄호)\"),\"뒤\")"
        );
        // CommonMark 규칙 자체는 그대로다.
        assert_eq!(render_sketch("a ** b ** c"), "p(\"a ** b ** c\")");
    }

    #[test]
    fn atx_heading_keeps_an_inner_hash() {
        // `### #1. 제목` 의 안쪽 `#` 은 본문이다.
        assert_eq!(
            render_sketch("### #1. foo"),
            "h3#1-foo(a(span()),\"#1. foo\")"
        );
        // 닫는 시퀀스는 여전히 본문이 아니다.
        assert_eq!(render_sketch("## baz #"), "h2#baz(a(span()),\"baz\")");
    }

    #[test]
    fn does_not_anchor_a_heading_without_an_id() {
        // 슬러그가 비면 rehype-slug 처럼 id="" 는 남기되 앵커는 붙이지 않는다.
        // (sketch 는 빈 id 도 `#` 로 표시한다. 앵커가 있었다면 a(span()) 이 앞에 온다.)
        assert_eq!(render_sketch("## 🚀"), "h2#(\"🚀\")");
        // id 가 있으면 평소대로 앵커가 붙는다.
        assert_eq!(render_sketch("## a"), "h2#a(a(span()),\"a\")");
    }

    #[test]
    fn builds_a_table_of_contents() {
        let out = render_sketch("## Table of Contents\n\n## 첫 절\n\n### 하위\n");
        // 목차 제목 다음에 중첩 목록이 들어간다.
        assert!(
            out.contains(r#"ul("\n",li(a("첫 절"),"\n",ul("\n",li(a("하위")),"\n"),"\n"),"\n")"#),
            "{out}"
        );
        let json = serde_json::to_string(&render("## Contents\n\n## 첫 절\n").unwrap()).unwrap();
        // 링크는 제목 id 와 같은 규칙(github-slugger)으로 만들고 URI 로 인코딩한다.
        assert!(
            json.contains(r##""href":"#%EC%B2%AB-%EC%A0%88""##),
            "{json}"
        );
        assert!(json.contains(r#""id":"첫-절""#), "{json}");
    }

    #[test]
    fn splits_a_filename_off_the_language() {
        let tree = render("```json:package.json\n{}\n```\n").unwrap();
        let json = serde_json::to_string(&tree).unwrap();
        assert!(json.contains(r#""className":["language-json"]"#), "{json}");
        assert!(json.contains(r#""data-filename":"package.json""#), "{json}");
    }

    #[test]
    fn does_not_nest_a_link_inside_a_link() {
        // GFM autolink literal 은 링크 안에서는 만들어지지 않는다.
        assert_eq!(
            render_sketch("[https://a.b/c](https://a.b/c)"),
            "p(a(\"https://a.b/c\"))"
        );
    }

    #[test]
    fn rejects_mdx_expressions_without_evaluating_javascript() {
        assert!(render("a {2 + 2} b\n")
            .unwrap_err()
            .contains("MDX expression"));
        assert!(render("<Demo {...props} />")
            .unwrap_err()
            .contains("spread attribute"));
        assert!(render("<Demo height={props.height} />")
            .unwrap_err()
            .contains("must be a literal"));
        assert_eq!(
            render_sketch("import a from 'b'\n"),
            r#"p("import a from 'b'")"#
        );
        // 주석이 앞에 붙었다고 거부 경로를 우회하지 않는다.
        assert!(render("{/* c */ value}\n")
            .unwrap_err()
            .contains("MDX expression"));
        assert!(render("a {/* c */ b} c\n")
            .unwrap_err()
            .contains("MDX expression"));
    }

    #[test]
    fn resolves_mdx_literals_and_removes_comments() {
        let json = serde_json::to_value(render("<Demo height={680} enabled={false} name={'demo'} empty={null} />\n\n{/* comment */}\n").unwrap()).unwrap();
        let children = json["children"].as_array().unwrap();
        assert!(!children
            .iter()
            .any(|node| node["type"] == "mdxFlowExpression"));
        let attrs = &children[0]["attributes"];
        assert_eq!(attrs[0]["value"], 680);
        assert_eq!(attrs[1]["value"], false);
        assert_eq!(attrs[2]["value"], "demo");
        assert_eq!(attrs[3]["value"], serde_json::Value::Null);
    }
}
