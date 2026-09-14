# /// script
# dependencies = ["matplotlib==3.10.9"]
# ///

import json
import os
import re
from pathlib import Path
from statistics import median

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
from matplotlib.ticker import FuncFormatter, MaxNLocator

ROOT = Path(__file__).resolve().parents[4]
DATA = ROOT / "apps/blog/tests/performance/series-overall"
OUTPUT = ROOT / "apps/blog/public/2026/09/images/blog-performance"
PREVIEWS = ROOT / ".cache/series-performance/charts"
OUTPUT.mkdir(parents=True, exist_ok=True)
PREVIEWS.mkdir(parents=True, exist_ok=True)
font_manager.fontManager.addfont(
    os.environ.get("CHART_FONT", "/System/Library/Fonts/AppleSDGothicNeo.ttc")
)
font = font_manager.FontProperties(
    fname=os.environ.get("CHART_FONT", "/System/Library/Fonts/AppleSDGothicNeo.ttc")
).get_name()
plt.rcParams.update({
    "font.family": font,
    "font.size": 18,
    "text.color": "#172033",
    "axes.labelcolor": "#475569",
    "xtick.color": "#475569",
    "ytick.color": "#172033",
    "svg.fonttype": "path",
    "svg.hashsalt": "blog-performance-series-3",
    "axes.unicode_minus": False,
    "hatch.linewidth": 0.5,
})
visits = json.loads((DATA / "results.json").read_text())["results"]
builds = json.loads((DATA / "builds.json").read_text())["builds"]
routes = [
    ("홈", "/"),
    ("코드 글", "/2026/08/k8s-for-frontend-1"),
    ("수식 글", "/2020/07/math-for-programmer-chapter1-2-set"),
]
variants = ["before", "after"]
colors = ["#94a3b8", "#6955c5"]


def samples(route, visit, field, scale=1):
    return [
        [row[field] / scale for row in visits
         if row["route"] == route and row["visit"] == visit
         and row["variant"] == variant]
        for variant in variants
    ]


def chart(name, title, rows, unit, limit, subtitle, decimals=0,
          labels=("변경 전", "변경 후")):
    height = 2.8 + len(rows) * 1.02
    fig = plt.figure(figsize=(8, height), facecolor="white")
    ax = fig.add_axes([0.24, 1.05 / height, 0.64, (height - 2.45) / height])
    positions = list(reversed(range(len(rows))))
    for position, (_label, values_by_variant) in zip(positions, rows):
        for index, values in enumerate(values_by_variant):
            assert len(values) == 4, (name, _label, values)
            value = median(values)
            low, high = min(values), max(values)
            y = position + (0.2 if index == 0 else -0.2)
            ax.barh(
                y, value, height=0.3, color=colors[index],
                edgecolor="white", linewidth=0.6,
                hatch="///" if index == 0 else None, zorder=2,
            )
            ax.errorbar(
                value, y, xerr=[[value - low], [high - value]],
                fmt="none", ecolor="#172033", elinewidth=1.1,
                capsize=3.5, capthick=1.1, zorder=3,
            )
            ax.text(
                high + limit * 0.025, y, f"{value:,.{decimals}f}",
                va="center", fontsize=19, fontweight="bold" if index else "normal",
            )
    ax.set_yticks(positions, [label for label, _values in rows], fontsize=19)
    ax.set_ylim(-0.6, len(rows) - 0.4)
    ax.set_xlim(0, limit)
    ax.xaxis.set_major_locator(MaxNLocator(nbins=4, integer=True))
    ax.xaxis.set_major_formatter(FuncFormatter(lambda value, _pos: f"{value:,.0f}"))
    ax.tick_params(axis="both", length=0, pad=9, labelsize=17)
    ax.set_xlabel(unit, fontsize=17, labelpad=8)
    ax.grid(axis="x", color="#e2e8f0", linewidth=0.7, zorder=0)
    for spine in ax.spines.values():
        spine.set_visible(False)
    fig.text(0.05, 1 - 0.22 / height, title, fontsize=24, fontweight="bold", va="top")
    fig.text(0.05, 1 - 0.68 / height, subtitle, fontsize=15, color="#475569", va="top")
    fig.legend(
        handles=[
            Patch(facecolor=colors[0], hatch="///", edgecolor="white", label=labels[0]),
            Patch(facecolor=colors[1], label=labels[1]),
        ],
        loc="upper left", bbox_to_anchor=(0.22, 1 - 0.95 / height),
        ncol=2, frameon=False, fontsize=17, borderaxespad=0,
    )
    fig.text(0.05, 0.16 / height, "막대: 중앙값 / 선: 최소, 최대 / 버전별 4회", fontsize=14, color="#475569")
    svg_path = OUTPUT / f"{name}.svg"
    fig.savefig(svg_path, metadata={"Date": None, "Title": title})
    # 블로그의 SVG 크기 파서는 DTD 선언이 있는 XML을 읽지 않는다.
    svg = re.sub(r"<!DOCTYPE[^>]*>\s*", "", svg_path.read_text())
    svg_path.write_text("\n".join(line.rstrip() for line in svg.splitlines()) + "\n")
    fig.savefig(PREVIEWS / f"{name}.png", dpi=120)
    plt.close(fig)


chart(
    "first-fcp", "첫 화면 시작은 경로마다 달랐다",
    [(label, samples(route, "first", "fcpMs")) for label, route in routes],
    "FCP (ms)", 2500, "첫 방문 / 준비된 서버, 새 브라우저 / 낮을수록 빠름",
)
chart(
    "first-lcp", "수식 글의 LCP는 크게 늦어졌다",
    [(label, samples(route, "first", "lcpMs")) for label, route in routes],
    "LCP (ms)", 6700, "첫 방문 / 수식 글 +3,212ms / LCP로 기록된 요소도 달라짐",
)
chart(
    "body-dom", "본문 DOM은 언제 감지됐나",
    [(f"{label}, {visit_label}", samples(route, visit, "bodyReadyMs"))
     for label, route in routes[1:]
     for visit, visit_label in [("first", "첫 방문"), ("repeat", "재방문")]],
    "본문 DOM 감지 (ms)", 2000, "본문 텍스트 100자 초과 감지 / 전체 본문 페인트 완료가 아님", 1,
)
chart(
    "repeat-paints", "재방문에서는 실행 범위가 겹쳤다",
    [(f"{label} {metric}", samples(route, "repeat", field))
     for metric, field in [("FCP", "fcpMs"), ("LCP", "lcpMs")]
     for label, route in routes],
    "시간 (ms)", 980, "HTTP 캐시 유지 / 재방문 비교를 위해 시간 축을 확대함",
)
chart(
    "transfer", "수식 글의 첫 다운로드는 늘었다",
    [(label, samples(route, "first", "transferBytes", 1024)) for label, route in routes],
    "전체 전송량 (KiB)", 1400, "첫 방문 / HTML, RSC와 링크 prefetch를 포함한 관찰 구간 합계", 1,
)
chart(
    "fonts", "수식 글꼴에서 약 270KiB가 늘었다",
    [(label, samples(route, "first", "fontBytes", 1024)) for label, route in routes],
    "글꼴 전송량 (KiB)", 660, "첫 방문 / 공통 글꼴 포함 / 큰 LCP 지연의 단독 원인으로 단정하지 않음", 1,
)
chart(
    "build", "빌드 대기는 약 146초 줄었다",
    [("전체 빌드", [[row["wallMs"] / 1000 for row in builds
                    if row["variant"] == variant] for variant in variants])],
    "빌드 시간 (초)", 215, "매번 .next 삭제 / 의존성 설치와 WASM 재컴파일 제외", 2,
)

investigation = json.loads((DATA / "lcp-investigation.json").read_text())["results"]
conditions = [
    ("control", "기존 설정"),
    ("instant-font", "수식 글꼴\n즉시 전달"),
    ("delayed-font", "수식 글꼴 요청\n1.5초 지연"),
    ("no-view-transition", "화면 전환 해제"),
    ("system-ui", "공통 웹 글꼴 제외"),
]
markers = {"H1": "s", "P": "o", "SPAN": "^"}
fig = plt.figure(figsize=(8, 8), facecolor="white")
ax = fig.add_axes([0.29, 0.15, 0.66, 0.64])
for position, (variant, _label) in zip(reversed(range(5)), conditions):
    rows = [row for row in investigation if row["variant"] == variant]
    assert len(rows) == 3, (variant, len(rows))
    values = [row["lcp"][-1]["time"] for row in rows]
    ax.hlines(position, min(values), max(values), color="#cbd5e1", linewidth=2)
    for offset, row in zip([0.24, 0, -0.24], rows):
        lcp = row["lcp"][-1]
        ax.scatter(lcp["time"], position + offset, marker=markers[lcp["tag"]],
                   s=60, color=colors[1], zorder=3)
        ax.text(lcp["time"] + 120, position + offset, f'{lcp["time"]:,}',
                va="center", fontsize=13)
ax.set_yticks(list(reversed(range(5))), [label for _, label in conditions])
ax.set_ylim(-0.55, 4.55)
ax.set_xlim(0, 7000)
ax.set_xticks([0, 2000, 4000, 6000], ["0", "2,000", "4,000", "6,000"])
ax.tick_params(axis="both", length=0, pad=10, labelsize=16)
ax.set_xlabel("LCP (ms)", fontsize=17, labelpad=12)
ax.grid(axis="x", color="#e2e8f0", linewidth=0.7)
for spine in ax.spines.values():
    spine.set_visible(False)
title = "글꼴 전송과 LCP 대상을 나눠봤다"
fig.text(0.05, 0.97, title, fontsize=24, fontweight="bold", va="top")
fig.text(0.05, 0.91, "같은 빌드, 조건별 3회 / 점 하나가 한 번의 측정", fontsize=16, color="#475569")
fig.legend(handles=[Line2D([], [], marker=markers[tag], color=colors[1],
                           linestyle="none", label=label)
                    for tag, label in [("H1", "제목"), ("P", "본문 문단"), ("SPAN", "모집 배너")]],
           loc="upper center", bbox_to_anchor=(0.53, 0.885), ncol=3, frameon=False, fontsize=16)
fig.text(0.05, 0.035, "수식 글꼴과 MathML은 모든 조건에서 유지 / 선: 관측 범위", fontsize=14, color="#475569")
svg_path = OUTPUT / "lcp-investigation.svg"
fig.savefig(svg_path, metadata={"Date": None, "Title": title})
svg = re.sub(r"<!DOCTYPE[^>]*>\s*", "", svg_path.read_text())
svg_path.write_text("\n".join(line.rstrip() for line in svg.splitlines()) + "\n")
fig.savefig(PREVIEWS / "lcp-investigation.png", dpi=120)
plt.close(fig)
font_visits = json.loads((DATA / "font-removal-results.json").read_text())["results"]
for metric, limit in [("FCP", 2500), ("LCP", 6700)]:
    chart(
        f"font-removal-{metric.lower()}", f"일반 웹 글꼴을 제거한 뒤의 {metric}",
        [(label, [[row[f"{metric.lower()}Ms"] for row in font_visits
                   if row["route"] == route and row["variant"] == variant]
                  for variant in variants]) for label, route in routes],
        f"{metric} (ms)", limit, "실제 코드 수정 후 재빌드 / 첫 방문 / 수식 전용 글꼴 유지",
        labels=("웹 글꼴 유지", "시스템 글꼴"),
    )
print(f"Generated 10 SVG charts in {OUTPUT}")
