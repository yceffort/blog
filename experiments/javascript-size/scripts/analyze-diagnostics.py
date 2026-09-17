"""Keep interaction stress tests, coverage, and traces separate from primary data."""
import gzip
import json
import sys
from collections import defaultdict
from pathlib import Path
from statistics import median

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "analysis"
OUT.mkdir(exist_ok=True)

def records(name):
    directory = ROOT / "results" / name
    assert (directory / "complete.json").exists(), f"Incomplete: {name}"
    return [json.loads(line) for line in (directory / "raw.jsonl").read_text().splitlines()]

groups = defaultdict(list)
for row in records("pulse"):
    during = [c for c in row["clicks"] if c["label"].startswith("pulse-") and c["occurredDuringLoad"]]
    settled = [c for c in row["clicks"] if c["label"].startswith("settled-")]
    assert len(settled) == 3
    groups[(row["profile"], row["kind"], row["kib"])].append({
        "repetition": row["repetition"], "duringCount": len(during),
        "maxInputDelayMs": max([c["inputDelayMs"] for c in during], default=None),
        "settledMedianInputDelayMs": median(c["inputDelayMs"] for c in settled),
        "readyMs": row["readyMs"],
    })
pulse = []
for (profile, kind, kib), runs in sorted(groups.items()):
    maxima = [r["maxInputDelayMs"] for r in runs if r["maxInputDelayMs"] is not None]
    pulse.append({"profile": profile, "kind": kind, "kib": kib, "runs": runs, "n": len(runs),
                  "runsWithLoadingSamples": len(maxima),
                  "medianOfRunMaxInputDelayMs": median(maxima) if maxima else None,
                  "medianSettledInputDelayMs": median(r["settledMedianInputDelayMs"] for r in runs)})
(OUT / "pulse-summary.json").write_text(json.dumps(pulse, indent=2) + "\n")

colors = {"comment": "#64748b", "functions": "#2563eb", "initialized": "#dc5626"}
labels = {"comment": "Comment", "functions": "Uncalled functions", "initialized": "Top-level initialization"}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False,
                     "axes.spines.right": False, "axes.grid": True, "grid.alpha": 0.18, "svg.fonttype": "none"})
fig, axes = plt.subplots(1, 2, figsize=(11, 4.7))
for kind, color in colors.items():
    selected = sorted([r for r in pulse if r["kind"] == kind and r["kib"] > 0], key=lambda r: r["kib"])
    x = [r["kib"] / 1024 for r in selected]
    for ax, metric in zip(axes, ["maxInputDelayMs", "settledMedianInputDelayMs"]):
        distributions = [[run[metric] for run in r["runs"] if run[metric] is not None] for r in selected]
        y = [median(v) if v else float("nan") for v in distributions]
        low = [np.percentile(v, 25) if v else float("nan") for v in distributions]
        high = [np.percentile(v, 75) if v else float("nan") for v in distributions]
        ax.plot(x, y, "o-", color=color, label=labels[kind], markersize=4)
        ax.fill_between(x, low, high, color=color, alpha=0.13)
        ax.set(xlabel="Uncompressed source size (MiB)", ylabel="Pointer input delay (ms)")
for ax in axes:
    ax.set_ylim(bottom=0)
axes[0].set_title("During loading: median of each run's maximum")
axes[1].set_title("After loading: median of each run's median")
axes[0].legend(frameon=False, fontsize=8)
fig.suptitle("When the input arrives changes what the measurement sees", fontsize=15)
fig.text(0.5, 0.015, "Codespaces · CPU 4x slowdown · loopback · 50 ms input pulses · 10 runs per condition · bands: IQR", ha="center", fontsize=9)
fig.tight_layout(rect=(0, 0.04, 1, 0.94))
fig.savefig(OUT / "input-pulse.png", dpi=180)
fig.savefig(OUT / "input-pulse.svg")
plt.close(fig)

if "--pulse-only" in sys.argv:
    print(f"Summarized {len(pulse)} pulse conditions")
    sys.exit(0)

coverage = []
for row in records("coverage"):
    functions = [f for script in row["coverage"] for f in script["functions"] if f["functionName"].startswith("feature_")]
    called = [f for f in functions if f["ranges"][0]["count"] > 0]
    assert len(functions) == row["functionCount"]
    assert len(called) == (row["functionCount"] if row["kind"] == "initialized" else 0)
    coverage.append({"kind": row["kind"], "kib": row["kib"], "functionCount": row["functionCount"],
                     "functionsReported": len(functions), "functionsCalled": len(called),
                     "callCounter": row["raw"]["unusedCalls"]})
(OUT / "coverage-summary.json").write_text(json.dumps(coverage, indent=2) + "\n")

# Inclusive durations by event name and thread, not additive phase totals.
trace_results = []
trace_dir = ROOT / "results" / "trace" / "traces"
for path in sorted(list(trace_dir.glob("*.json")) + list(trace_dir.glob("*.json.gz"))):
    text = gzip.open(path, "rt").read() if path.suffix == ".gz" else path.read_text()
    events = json.loads(text)["traceEvents"]
    names = {(e["pid"], e["tid"]): e.get("args", {}).get("name") for e in events if e.get("name") == "thread_name"}
    groups = defaultdict(list)
    for e in events:
        if e.get("ph") == "X" and "dur" in e and ("v8" in e.get("cat", "").lower() or e.get("name") in ["EvaluateScript", "CompileScript"]):
            groups[(names.get((e["pid"], e["tid"]), str(e["tid"])), e["name"])].append(e)
    totals = []
    for (thread, name), entries in groups.items():
        totals.append({"thread": thread, "name": name, "count": len(entries),
                       "inclusiveTotalMs": sum(e["dur"] for e in entries) / 1000,
                       "maxMs": max(e["dur"] for e in entries) / 1000,
                       "sampleArgs": entries[0].get("args")})
    trace_results.append({"file": path.name, "events": sorted(totals, key=lambda e: e["inclusiveTotalMs"], reverse=True)})
(OUT / "trace-summary.json").write_text(json.dumps(trace_results, indent=2) + "\n")
print(f"Summarized {len(pulse)} pulse conditions, {len(coverage)} coverage runs, {len(trace_results)} traces")
