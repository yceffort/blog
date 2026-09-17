"""Plot the article's figures, including the comment control, from the full analysis."""

import hashlib
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "analysis" / "article"
OUT.mkdir(parents=True, exist_ok=True)
SUMMARY = ROOT / "analysis" / "summary.json"
PULSE = ROOT / "analysis" / "pulse-summary.json"
FIT = ROOT / "analysis" / "linear-descriptive-fit.json"
summary = json.loads(SUMMARY.read_text())
pulse = json.loads(PULSE.read_text())
fit = json.loads(FIT.read_text())
colors = {"comment": "#64748b", "functions": "#2563eb", "initialized": "#dc5626"}
labels = {
    "comment": "Comment control (same bytes)",
    "functions": "Uncalled functions",
    "initialized": "Top-level initialization",
}
profiles = {
    "local-1x": "Codespace CPU, loopback",
    "local-4x": "4x CPU slowdown, loopback",
    "network-4x": "4x CPU + 4 Mbps / 80 ms, gzip",
}
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": "white", "axes.grid": True,
    "grid.alpha": 0.18, "svg.fonttype": "none",
})


def draw(ax, x, values, lows, highs, kind):
    ax.plot(x, values, "o-", color=colors[kind], label=labels[kind], markersize=4)
    ax.fill_between(x, lows, highs, color=colors[kind], alpha=0.13)


def save(fig, name, footer):
    fig.text(0.5, 0.015, footer, ha="center", fontsize=9, color="#475569")
    fig.tight_layout(rect=(0, 0.04, 1, 0.94))
    for extension in ("png", "svg"):
        fig.savefig(OUT / f"{name}.{extension}", dpi=180)
    plt.close(fig)


for metric, title, ylabel in [
    ("readyMs", "Time until the added JavaScript is ready", "Time (ms)"),
    ("mainThreadTaskMs", "Main-thread task time during loading", "Task time (ms)"),
]:
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.7))
    for ax, (profile, profile_label) in zip(axes, profiles.items()):
        for kind in colors:
            selected = sorted([
                row for row in summary
                if row["dataset"] == "cold" and row["profile"] == profile
                and (row["kind"] == kind or row["kib"] == 0)
            ], key=lambda row: row["kib"])
            assert len(selected) == 7 and all(row["n"] == 15 for row in selected)
            draw(ax, [row["kib"] / 1024 for row in selected],
                 [row[metric]["median"] for row in selected],
                 [row[metric]["p25"] for row in selected],
                 [row[metric]["p75"] for row in selected], kind)
        ax.set(title=profile_label, xlabel="Uncompressed source size (MiB)", ylabel=ylabel)
        ax.set_ylim(bottom=0)
    axes[0].legend(frameon=False, fontsize=8)
    fig.suptitle(title, fontsize=16)
    save(fig, metric, "Codespaces 2 vCPU / 8 GB, Chromium 153, cold cache, median and IQR, 0 MiB = 101 B baseline")

fig, ax = plt.subplots(figsize=(9, 4.6))
kinds = ["functions", "initialized"]
positions = np.arange(len(profiles))
width = 0.34
for offset, kind in zip((-width / 2, width / 2), kinds):
    extra = []
    for profile in profiles:
        rows = {row["kind"]: row["slopeMsPerMiB"] for row in fit if row["profile"] == profile}
        extra.append(rows[kind] - rows["comment"])
    bars = ax.bar(positions + offset, extra, width, color=colors[kind], label=labels[kind])
    ax.bar_label(bars, fmt="%.1f", fontsize=9, padding=2, color="#334155")
ax.set(xticks=positions, ylabel="Extra ready time (ms per MiB)",
       title="What the code form adds on top of the same bytes")
ax.set_xticklabels(list(profiles.values()), fontsize=9)
ax.set_ylim(0, 225)
ax.legend(frameon=False, fontsize=9)
save(fig, "slope", "Slope of a linear fit over 0 to 10 MiB, minus the comment control's slope (R2 0.945 to 0.9999)")

fig, axes = plt.subplots(1, 2, figsize=(11, 4.7))
for kind in colors:
    selected = sorted([
        row for row in pulse
        if row["profile"] == "local-4x" and row["kind"] == kind and row["kib"] > 0
    ], key=lambda row: row["kib"])
    assert len(selected) == 3 and all(row["n"] == 10 for row in selected)
    for ax, metric in zip(axes, ["maxInputDelayMs", "settledMedianInputDelayMs"]):
        points = [
            (row["kib"] / 1024, [run[metric] for run in row["runs"] if run[metric] is not None])
            for row in selected
        ]
        points = [(size, values) for size, values in points if len(values) == 10]
        draw(ax, [size for size, _ in points],
             [np.median(values) for _, values in points],
             [np.percentile(values, 25) for _, values in points],
             [np.percentile(values, 75) for _, values in points], kind)
        ax.set(xlabel="Uncompressed source size (MiB)", ylabel="Pointer input delay (ms)")
axes[0].set_ylim(bottom=0)
axes[1].set_ylim(0, 50)
axes[0].set_title("During loading: median of each run's maximum")
axes[1].set_title("After loading: median of each run's median (note the 50 ms scale)")
axes[0].legend(frameon=False, fontsize=8)
fig.suptitle("When the input arrives changes what the measurement sees", fontsize=15)
save(fig, "input-pulse", "Codespaces, CPU 4x slowdown, loopback, 50 ms input pulses, 10 runs per condition, bands: IQR")

(OUT / "provenance.json").write_text(json.dumps({
    "displayedKinds": list(colors),
    "matplotlib": matplotlib.__version__, "numpy": np.__version__,
    "sourceHashes": {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                     for path in [SUMMARY, PULSE, FIT, Path(__file__)]},
}, indent=2) + "\n")
print(f"Created four article figures in {OUT}")
