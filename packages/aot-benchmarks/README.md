# `@aurelia-ls/aot-benchmarks`

Private reproducible performance and size portfolio for the same-source Aurelia JIT and AOT production lanes.

This package owns scenario manifests, build/artifact identity, compression accounting, browser measurement, immutable
machine results, and benchmark-only fixture entries. It does not own semantic analysis, AOT emission, Vite product
integration, ordinary correctness goldens, or framework semantics.

The normative measurement and workload contracts live in the ignored AOT north-star packet:

- `.temp/aot-north-star-v0.1/PERFORMANCE-MEASUREMENT-CONTRACT.md`
- `.temp/aot-north-star-v0.1/PERFORMANCE-WORKLOAD-PORTFOLIO.md`

`aot-assurance` remains the correctness-first browser-oracle owner. This package reuses those oracles against the exact
minified production artifacts it measures, then joins them to semantic/AOT receipts.

Run the manually promoted portfolio from the repository root with:

```powershell
pnpm benchmark:aot
```

The runner requires a clean repository and RC2 framework checkout. It writes one immutable run under
`.temp/aot-benchmarks/runs/`, including raw Tachometer output, exact build/evidence files, `run.json`, `result.json`,
and `report.md`. Set `AURELIA_AOT_BENCHMARK_CHROME` to select a specific installed Chrome binary; otherwise the runner
locates stable Google Chrome and records its exact executable hash and version.
