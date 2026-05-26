# semantic-runtime

`semantic-runtime` is the in-repo Aurelia semantic substrate for the language server, Atlas, MCP, IDE features, and
future compiler or analysis work.

It owns product semantics: kernel records, auLink anchors, static evaluation, resource recognition, configuration
admission, DI world construction, template/compiler modeling, expression parsing, TypeChecker-backed projection,
application topology, app-builder substrate, diagnostics, query answers, and fixture verification pressure. It does not
own the retired snapshot/query CLI surface or the retired legacy recipe-authoring API.

The package is intentionally source-first while the substrate is still moving. Build it with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime build
```

Run the aggregate app API pressure lane with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api -- --fixture typescript-project-diagnostics
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api -- --root packages/semantic-runtime/fixtures/pressure
```

Run route-scoped semantic contracts with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime contract:suite -- --route observation
pnpm --filter @aurelia-ls/semantic-runtime contract:suite -- --route app-pattern.policy
pnpm --filter @aurelia-ls/semantic-runtime contract:suite -- --domain forms --tier route
```

The suite builds once, then runs the selected row-backed contracts directly. Use `--list` to see available routes,
domains, tiers, and scripts. Route filters accept exact route IDs or dotted route prefixes. This is the first
lightweight contract lane for bold refactors: it checks semantic effects and public product rows, not snapshots or
internal helper shapes. Successful child scripts are compact by default; pass `--verbose` when a contract needs its full
JSON output during debugging.

Run generic fixture typechecking or manifest-backed effect verification with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime check:fixture-typecheck
pnpm --filter @aurelia-ls/semantic-runtime check:fixture-manifests
```

The fixture lanes are roleful. `fixtures/pressure` contains analyzer pressure, including migrated app-pattern fixtures
that used to live under the deleted recipe-authoring folder. `fixtures/app-builder/goldens` contains current app-builder
output examples. App-builder is the future public generation path; fixture verification is a neutral test/pressure layer,
not the generation API.

Run the inquiry-aware construction/query telemetry lane with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime profile:app-telemetry
```

That profiler compares analysis depth and inquiry profile, reports phase memory/kernel deltas, shows product/detail,
handle-character, and source-span-role density when kernel breakdowns are enabled, prints TypeSystemProject subphases,
Program source-file composition, and compiler-host cache counts, and separates app-world construction cost from public
query projection cost and query-claim retention. Query rows report value JSON bytes, full answer-envelope JSON bytes, and
continuation count/bytes separately so follow-up richness and MCP token pressure stay visible. Use it before changing
cache policy, materialization depth, hot details, source-address storage, continuation presentation, or app-opening
defaults.

Set `SEMANTIC_RUNTIME_PRESSURE_ROOTS` to a path-delimited list of external roots when using external clean-room apps as a
transient pressure surface. Treat the output as local inspection material: do not promote exact paths, project keys, row
names, source text, or app-specific open-reason details from external clean-room roots into tracked files. Use
`SEMANTIC_RUNTIME_APP_ANALYSIS_DEPTH=runtime-topology` as the first large-app depth, then deepen to `binding-targets` or
`binding-observation` only when the question needs binding/type products.

Large selected apps can still need an explicit Node heap while app-world memory work is in progress:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
```

Keep durable semantics in typed records, vocabulary, claims, provenance, materialized products, and open seams. Use Atlas
as the live orientation and inspection layer over this package instead of maintaining parallel static document packets.
When a semantic-runtime note should guide future autonomous work, promote its durable essence into `packages/atlas/memory`
and link back to the owning README or workbench rather than relying on `.temp` notes.

For the durable folder map, read [src/README.md](src/README.md). For recent context while the package is still settling,
read [src/WORKBENCH.md](src/WORKBENCH.md). Pressure fixtures are documented in
[fixtures/pressure/README.md](fixtures/pressure/README.md); app-builder goldens live under
[fixtures/app-builder](fixtures/app-builder).
