"""Summarize complete measurements; diagnostic/pilot data require explicit selection."""
import csv
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
NAMES = sys.argv[1:] or ["cold"]
OUT = ROOT / "analysis"
OUT.mkdir(exist_ok=True)
(OUT / "analysis-environment.json").write_text(json.dumps({
    "python": sys.version, "numpy": np.__version__, "matplotlib": matplotlib.__version__,
    "datasets": NAMES, "bootstrapSeed": 20260916, "bootstrapResamples": 5000,
    "scriptSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
}, indent=2) + "\n")
GROUPS = defaultdict(list)
for name in NAMES:
    folder = ROOT / "results" / name
    assert (folder / "complete.json").exists(), f"Incomplete dataset: {name}"
    env = json.loads((folder / "environment.json").read_text())
    assert not env["trace"] and not env["coverage"], "Instrumented runs cannot enter primary statistics"
    rows = [json.loads(line) for line in (folder / "raw.jsonl").read_text().splitlines()]
    assert len(rows) == json.loads((folder / "complete.json").read_text())["completed"]
    for row in rows:
        assert row["phase"] == "measured"
        assert len(row["clicks"]) == 5 and all(x["isTrusted"] for x in row["clicks"])
        assert row["raw"]["unusedCalls"] == (row["functionCount"] if row["kind"] == "initialized" else 0)
        row["click25Ms"] = row["clicks"][0]["inputDelayMs"]
        row["click100Ms"] = row["clicks"][1]["inputDelayMs"]
        row["settledClickMs"] = float(np.median([c["inputDelayMs"] for c in row["clicks"][2:]]))
        payload = next(r for r in row["raw"]["resources"] if f'/{row["kind"]}-{row["kib"]}.js?' in r["name"])
        assert payload["decodedBodySize"] == row["sourceBytes"]
        row["transferBytes"] = payload["transferSize"]
        row["heapDeltaMiB"] = row["heapDeltaBytes"] / 2**20
        GROUPS[(name, row["profile"], row["kind"], row["kib"])].append(row)
    counts = [len(v) for k, v in GROUPS.items() if k[0] == name]
    assert all(n == env["repetitions"] for n in counts), f"Unbalanced dataset: {name}"

METRICS = ["readyMs", "resourceMs", "afterResponseMs", "mainThreadTaskMs", "scriptDurationMs",
           "longTaskMaxMs", "blockingOver50Ms", "heapDeltaMiB", "click25Ms", "click100Ms",
           "settledClickMs", "loadingFrameMaxMs", "settledFrameMaxMs", "transferBytes"]
rng = np.random.default_rng(20260916)
summary = []
for key, rows in sorted(GROUPS.items()):
    item = dict(zip(["dataset", "profile", "kind", "kib"], key))
    item["n"] = len(rows)
    item["sourceBytes"] = rows[0]["sourceBytes"]
    item["gzipBytes"] = rows[0]["gzipBytes"]
    for metric in METRICS:
        values = np.array([row[metric] for row in rows])
        draws = np.median(rng.choice(values, (5000, len(values)), replace=True), axis=1)
        item[metric] = {"median": float(np.median(values)), "p25": float(np.percentile(values, 25)),
                        "p75": float(np.percentile(values, 75)), "min": float(min(values)), "max": float(max(values)),
                        "medianCi95Low": float(np.percentile(draws, 2.5)), "medianCi95High": float(np.percentile(draws, 97.5))}
    summary.append(item)
(OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
flat = []
for item in summary:
    row = {k: v for k, v in item.items() if k not in METRICS}
    for metric in METRICS:
        row.update({f"{metric}_{stat}": value for stat, value in item[metric].items()})
    flat.append(row)
with (OUT / "summary.csv").open("w") as f:
    writer = csv.DictWriter(f, fieldnames=list(flat[0]))
    writer.writeheader()
    writer.writerows(flat)

colors = {"comment": "#64748b", "functions": "#2563eb", "initialized": "#dc5626"}
labels = {"comment": "Comment", "functions": "Uncalled functions", "initialized": "Top-level initialization"}
profiles = ["local-1x", "local-4x", "network-4x"]
profile_labels = {"local-1x": "Codespace CPU, loopback", "local-4x": "4x CPU slowdown, loopback",
                  "network-4x": "4x CPU + 4 Mbps / 80 ms, gzip"}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False,
                     "axes.spines.right": False, "figure.facecolor": "white", "axes.grid": True,
                     "grid.alpha": 0.18, "svg.fonttype": "none"})
for metric, title, ylabel in [
    ("readyMs", "Time until the added JavaScript is ready", "Time (ms)"),
    ("mainThreadTaskMs", "Main-thread task time during loading", "Task time (ms)"),
    ("blockingOver50Ms", "Blocking portions of long tasks during loading", "Sum of max(task - 50 ms, 0)"),
    ("click25Ms", "Input delay for a pointer sent about 25 ms after start", "Input delay (ms)"),
    ("heapDeltaMiB", "JS heap change at payload readiness", "JS heap delta (MiB; no forced GC)"),
]:
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.7))
    for ax, profile in zip(axes, profiles):
        for kind in colors:
            selected = [x for x in summary if x["dataset"] == "cold" and x["profile"] == profile and (x["kind"] == kind or x["kib"] == 0)]
            selected.sort(key=lambda x: x["kib"])
            if not selected:
                continue
            x = [s["kib"] / 1024 for s in selected]
            y = [s[metric]["median"] for s in selected]
            low = [s[metric]["p25"] for s in selected]
            high = [s[metric]["p75"] for s in selected]
            ax.plot(x, y, "o-", color=colors[kind], label=labels[kind], markersize=4)
            ax.fill_between(x, low, high, color=colors[kind], alpha=0.13)
        ax.set(title=profile_labels[profile], xlabel="Uncompressed source size (MiB)", ylabel=ylabel)
        ax.set_ylim(bottom=0)
    axes[0].legend(frameon=False, fontsize=8)
    fig.suptitle(title, fontsize=16)
    fig.text(0.5, 0.015, "GitHub Codespaces: 2 vCPU / 8 GB · Chromium 153 · cold cache · median and IQR · synthetic payloads", ha="center", fontsize=9, color="#475569")
    fig.tight_layout(rect=(0, 0.035, 1, 0.94))
    fig.savefig(OUT / f"{metric}.png", dpi=180)
    fig.savefig(OUT / f"{metric}.svg")
    plt.close(fig)

# Descriptive linear fit, including the baseline. Not a model-selection claim.
fits = []
for profile in profiles:
    for kind in colors:
        rows = [x for x in summary if x["dataset"] == "cold" and x["profile"] == profile and (x["kind"] == kind or x["kib"] == 0)]
        if len(rows) < 3:
            continue
        x = np.array([r["kib"] / 1024 for r in rows])
        y = np.array([r["readyMs"]["median"] for r in rows])
        slope, intercept = np.polyfit(x, y, 1)
        residual = y - (slope * x + intercept)
        fits.append({"profile": profile, "kind": kind, "slopeMsPerMiB": float(slope),
                     "interceptMs": float(intercept), "rSquared": float(1 - np.sum(residual**2) / np.sum((y - y.mean())**2)),
                     "maxAbsoluteResidualMs": float(max(abs(residual)))})
(OUT / "linear-descriptive-fit.json").write_text(json.dumps(fits, indent=2) + "\n")

lines = ["# 측정 집계", "", "각 셀은 중앙값. 분포와 95% bootstrap 중앙값 구간은 summary.csv 참조.", ""]
for name in NAMES:
    for profile in profiles:
        selected = [x for x in summary if x["dataset"] == name and x["profile"] == profile]
        if not selected:
            continue
        lines += [f"## {name} / {profile}", "", "| 종류 | MiB | n | 준비 ms | 메인 작업 ms | blocking ms | +25ms 입력 지연 | 안정 후 입력 지연 | 힙 증가 MiB |",
                  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
        for s in selected:
            values = [s[m]["median"] for m in ["readyMs", "mainThreadTaskMs", "blockingOver50Ms", "click25Ms", "settledClickMs", "heapDeltaMiB"]]
            lines.append(f'| {s["kind"]} | {s["kib"]/1024:g} | {s["n"]} | ' + " | ".join(f"{v:.2f}" for v in values) + " |")
        lines.append("")
(OUT / "tables.md").write_text("\n".join(lines))
print(f"Summarized {sum(len(rows) for rows in GROUPS.values())} runs into {OUT}")
