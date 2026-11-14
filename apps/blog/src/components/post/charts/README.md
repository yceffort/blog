# Markdown charts

Store a version 1 chart document under `apps/blog/public/charts/`, then embed it in a post:

```mdx
<Chart src="/charts/nextjs-memory/heap.json" />
```

`Chart` validates the JSON on the server and renders the caption, description and data table in the initial HTML. Only the canvas renderer loads near the viewport.

Chart.js runs in a shared Web Worker through `OffscreenCanvas`. The main thread sends plain data, dimensions, device pixel ratio and pointer coordinates; callbacks and drawing stay in `chartEngine.ts`. Resize, dark mode, condition buttons and touch tooltips work in both renderers. Browsers without canvas transfer, a blocked worker, a worker error or a startup timeout fall back to a lazily loaded main-thread renderer.

The last chart releasing its worker lease terminates the worker, including when React Activity hides the page. A restored chart gets a new canvas because an offscreen transfer cannot be repeated. The main-thread fallback destroys its Chart.js instance and all observers and listeners are removed during cleanup.

Run `pnpm --filter blog exec vitest run src/components/post/charts/chartWorkerPool.test.ts` to check shared ownership, crash recovery and unsupported browsers. For browser checks, `[data-chart-thread]` reports `worker` or `main`, and `[data-chart-state="ready"]` marks a completed render. To exercise the main renderer, disable `HTMLCanvasElement.prototype.transferControlToOffscreen` before page scripts run.

The current adapter supports numeric lines, optional minimum/maximum bands, step lines, vertical bars, grouped horizontal bars and selectable views. Add other Chart.js controllers or plugins only when a post needs them.

```json
{
  "version": 1,
  "locale": "en",
  "title": "Update task duration",
  "description": "Mean of three runs; whiskers show the observed range.",
  "views": [
    {
      "id": "default",
      "label": "Comparison",
      "kind": "bar",
      "horizontal": true,
      "xLabel": "Version",
      "yLabel": "Duration (ms)",
      "unit": "ms",
      "decimals": 1,
      "domain": [0, 20],
      "series": [
        {
          "id": "task",
          "label": "Update task",
          "color": 1,
          "values": [{"x": "v1", "y": 12, "low": 11, "high": 13}]
        }
      ]
    }
  ]
}
```

- Keep source precision in JSON. `decimals` controls display precision; the downloadable file retains the original values.
- Both range endpoints are required and must contain the value. They represent the statistic described in the caption, not an implied confidence interval.
- Bar series must share category labels in the same order, with a value domain beginning at zero.
- Lines use numeric `x` values. Set `xDomain` when comparisons need a fixed extent and `stepped: true` for discrete changes.
- Add entries to `views` for condition or metric buttons. Keep comparable conditions on the same scale.
- `source` can link to a local measurement artifact. Translate chart documents along with their posts.
- Regenerate the four memory charts with `node apps/blog/scripts/generate-memory-charts.mjs`. Do not edit the recorded measurement file.

Titles, legends, descriptions and tables stay in HTML. Axis text and values use 14px type; long labels and tooltips wrap at the available width. Preserve experimental demos, diagrams and original measurement screenshots when they carry information beyond a numeric chart.
