# semantic-runtime

`semantic-runtime` is the shared in-repo project model used by the language
server, MCP, Atlas, and IDE features, with room for future analysis consumers.
It owns project discovery, framework and template analysis, type projection,
diagnostics, explanations, and query currentness. Internal app-builder and
fixture tooling also live here; the snapshot/query CLI and recipe-authoring APIs
are retired.

Build the package with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime build
```

Run the aggregate app API pressure lane with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api -- --fixture typescript-project-diagnostics
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api -- --fixture app-builder:task-form-validated-starter
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api -- --root packages/semantic-runtime/fixtures/pressure
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api -- --fixture pressure:app-builder-part-source-gallery --query binding-value-channel-summary --rows 20
```

Use `--query`/`--queries` to focus a probe on one or more `SemanticAppQueryKind` values, including query families that
are not part of the default aggregate set. `--rows` overrides the bounded page size for query families that page rows.
Fixture names without a prefix resolve under `fixtures/pressure`; use `pressure:<name>` for an explicit pressure fixture,
including current app-builder pressure fixtures.

Run route-scoped semantic contracts with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime contract:suite -- --route observation
pnpm --filter @aurelia-ls/semantic-runtime contract:suite -- --route app-pattern.policy
pnpm --filter @aurelia-ls/semantic-runtime contract:suite -- --domain forms --tier fast
```

The suite builds once, then runs the selected row-backed contracts. Use `--list`
to see available routes, domains, tiers, and scripts. Route filters accept exact
route IDs or dotted prefixes. The contracts check semantic effects and exported
product rows without depending on snapshots or internal helper structure.
Successful child scripts are compact by default; use `--verbose` for full JSON
while debugging.

Run generic fixture typechecking or manifest-backed effect verification with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime check:fixture-typecheck
pnpm --filter @aurelia-ls/semantic-runtime check:fixture-manifests
```

Fixture lanes have distinct roles. `fixtures/pressure` contains analyzer
pressure, including migrated app-pattern fixtures. Its `app-builder-*` entries
contain internal app-builder output examples. Public MCP authoring guidance comes
from `packages/patterns`.

Run the inquiry-aware construction/query telemetry lane with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime profile:app-telemetry
```

The profiler separates app construction, query projection, and retained-query
costs. Optional breakdowns cover kernel/product density, TypeScript project and
cache work, source-file composition, and serialized answer and continuation
size. Use it before changing cache policy, materialization depth, hot details,
source-address storage, continuation presentation, or app-opening defaults.

Set `SEMANTIC_RUNTIME_PRESSURE_ROOTS` to a path-delimited list of external roots when using external clean-room apps as a
transient pressure surface. Treat the output as local inspection material: do not promote exact paths, project keys, row
names, source text, or app-specific open-reason details from external clean-room roots into tracked files. Use
`SEMANTIC_RUNTIME_APP_ANALYSIS_DEPTH=runtime-topology` as the first large-app depth, then deepen to `binding-targets` or
`binding-observation` only when the question needs binding/type products.

Large selected apps can still need an explicit Node heap while app-world memory work is in progress:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
```

Keep durable semantics in typed records, vocabulary, claims, provenance,
materialized products, and open seams. Atlas is the live orientation and
inspection layer over this package. Promote durable guidance into
`packages/atlas/memory` and link it to the owning README or workbench.

For the durable folder map, read [src/README.md](src/README.md). For recent context while the package is still settling,
read [src/WORKBENCH.md](src/WORKBENCH.md). Pressure fixtures, including current app-builder pressure fixtures, are
documented in [fixtures/pressure/README.md](fixtures/pressure/README.md).
