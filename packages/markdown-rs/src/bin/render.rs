//! 디버그용: stdin 으로 마크다운 본문을 받아 hast JSON 을 출력한다.
use std::io::Read;

fn main() {
    let mut body = String::new();
    std::io::stdin().read_to_string(&mut body).expect("stdin");
    let request = serde_json::json!({"body": body}).to_string();
    println!("{}", markdown_rs::render_json(&request));
}
