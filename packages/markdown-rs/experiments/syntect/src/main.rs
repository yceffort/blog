use std::{env, fs, time::Instant};
use syntect_probe::{init, load_json, run, syntaxes};

fn measure(f: impl FnOnce() -> u32) -> (f64, u32) {
    let start = Instant::now();
    let result = f();
    (start.elapsed().as_secs_f64() * 1000.0, result)
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args[1] == "list" {
        let list: Vec<_> = syntaxes()
            .syntaxes()
            .iter()
            .map(|s| serde_json::json!({"name": s.name, "extensions": s.file_extensions}))
            .collect();
        println!("{}", serde_json::to_string(&list).unwrap());
        return;
    }
    let input = fs::read(&args[1]).unwrap();
    let (init_ms, _) = measure(|| init() as u32);
    let (load_ms, count) = measure(|| load_json(&input) as u32);
    let (cold_ms, checksum) = measure(|| run(0, count as usize));
    let mut trials = Vec::new();
    for _ in 0..6 {
        let (ms, result) = measure(|| run(0, count as usize));
        assert_eq!(result, checksum);
        trials.push(ms);
    }
    println!(
        "{}",
        serde_json::json!({
            "initMs": init_ms, "loadMs": load_ms, "coldMs": cold_ms,
            "trialsMs": trials, "checksum": checksum, "blocks": count,
            "engine": if cfg!(feature = "onig") { "onig" } else { "fancy" },
        })
    );
}
