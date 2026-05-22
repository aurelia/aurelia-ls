# semantic-runtime

`semantic-runtime` is the in-repo Aurelia semantic substrate for the language server, Atlas, AI-assisted authoring, and
future compiler or analysis work.

It owns product semantics: kernel records, auLink anchors, static evaluation, resource recognition, configuration
admission, DI world construction, template/compiler modeling, expression parsing, TypeChecker-backed projection,
application topology, authoring plans, and verification pressure. It does not own the retired snapshot/query CLI
surface.

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
pnpm --filter @aurelia-ls/semantic-runtime contract:suite -- --route authoring
pnpm --filter @aurelia-ls/semantic-runtime contract:suite -- --domain forms --tier route
```

The suite builds once, then runs the selected row-backed contracts or authoring smokes directly. Use `--list` to see the
available routes, domains, tiers, and scripts. Route filters accept exact route IDs or dotted route prefixes, so
`--route authoring` selects the `authoring.*` generated-fixture and policy contracts. This is the first lightweight
contract lane for bold refactors: it checks semantic effects and public product rows, not snapshots or internal helper
shapes. Successful child scripts are compact by default; pass `--verbose` when a contract needs its full JSON output
during debugging.

Run the inquiry-aware construction/query telemetry lane with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime profile:app-telemetry
```

That profiler compares analysis depth and inquiry profile, reports phase memory/kernel deltas, shows product/detail,
handle-character, and source-span-role density when kernel breakdowns are enabled, prints TypeSystemProject subphases,
Program source-file composition, and compiler-host cache counts, and separates app-world construction cost from public
query projection cost and query-claim retention. Use it before changing cache policy, materialization depth, hot details,
source-address storage, or app-opening defaults.
Aggregate output intentionally keeps per-root, analysis-depth, and inquiry-profile groups before printing global totals.
Use those grouped rows for depth-policy decisions: a global aggregate can show the total memory/time load, but the grouped
rows show which depth or profile actually introduced the extra products, TypeScript Program bulk, or retained query
claims.

Its default input set is discovered from `fixtures/authoring/generated-*`, `fixtures/authoring/storefront`, and every
subfolder under `fixtures/pressure`, so adding a durable fixture makes it part of the broad aggregate lane without
updating the script.
Use `--fixture <name>` for a focused authoring or pressure fixture (`pressure:<name>` and `authoring:<name>` are accepted
when the folder name exists in both lanes). Use `--root <path>` for one custom app root or a fixture collection root. The
direct CLI filters are the preferred first narrowing step during semantic-runtime work because they make the selected
locus visible in the printed request shape and avoid relying on lingering environment variables.

Refresh durable generated authoring fixtures from their recipe source plans with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime fixtures:authoring
```

Set `SEMANTIC_RUNTIME_PRESSURE_ROOTS` to a path-delimited list of external roots when using external clean-room apps as a
transient pressure surface. Treat the output as local inspection material: do not promote exact paths, project keys,
row names, source text, or app-specific open-reason details from external clean-room roots into tracked files. The pressure
script defaults to `SEMANTIC_RUNTIME_PRESSURE_DETAIL=compact`, which keeps route-friendly aggregate buckets first; use
`SEMANTIC_RUNTIME_PRESSURE_DETAIL=summary` for wider bucket detail and `SEMANTIC_RUNTIME_PRESSURE_DETAIL=raw` only for
local, non-committed debugging.
For deep monorepos, keep the first pass broad and then narrow app-world opening with
`SEMANTIC_RUNTIME_PRESSURE_PROJECT_KEYS`, `SEMANTIC_RUNTIME_PRESSURE_PROJECT_ROOT_DIRS`, or
`SEMANTIC_RUNTIME_PRESSURE_PROJECT_DISCOVERY=single-root|package-tsconfig`. Project-root filters may be absolute or
relative to each pressure root; use them to profile a selected app without turning unrelated packages into deep
semantic-runtime work.
Large selected apps can still need an explicit Node heap while app-world memory work is in progress:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
```

Use `SEMANTIC_RUNTIME_APP_ANALYSIS_DEPTH=runtime-topology` as the first large-app depth, then deepen to
`binding-targets` or `binding-observation` only when the question needs binding/type products.
It also defaults to `SEMANTIC_RUNTIME_PRESSURE_OUTPUT=aggregate` because the built-in fixture list is broad and
future-you usually needs the combined cross-root pressure shape before opening per-input detail. Use
`SEMANTIC_RUNTIME_PRESSURE_OUTPUT=inputs` for a single isolated root, and `SEMANTIC_RUNTIME_PRESSURE_OUTPUT=both` only
when comparing a combined signal with its contributing roots.
The authoring pressure section prints both value counts and axis-keyed counts/open reasons so broad ontology axes do
not hide unobserved narrow surfaces such as validation ownership, template rendering boundaries, or style resource
ownership. It also prints focused taste sections for style binding, style ownership, form value channels, state
ownership, and validation ownership because those low-count values are often the exact signal needed for the next
authoring or fixture pass. Build-tool profile is also printed as a focused taste section because generated recipe
fixtures intentionally distinguish host-selected build-tool policy from observed typecheck-only project tooling.
Recipe expected-effect output has three lanes: the intent-recipe lane uses the fixture folder name to check the recipe
the fixture is meant to prove, the applicable-recipe lane keeps partial recipe candidates visible, and the all-recipe
lane keeps cross-recipe contrast visible. Use the intent lane for generated fixture health; use applicable/all-candidate
rows only after deciding whether a partial recipe candidate is actually relevant.
Its timing section is phase-oriented: `open-app` is decomposed into app-world pass phases such as static evaluation,
TypeChecker project construction, resource recognition, app-world composition, and template compilation so large-app
friction can be attributed before deciding whether a manual deep dive is worth it.

Keep durable semantics in typed records, vocabulary, claims, provenance, materialized products, and open seams. Use Atlas as the live orientation and inspection layer over this package instead of maintaining parallel static document packets. When a semantic-runtime note should guide future autonomous work, promote its durable essence into `packages/atlas/memory` and link back to the owning README or workbench rather than relying on `.temp` notes.

For the durable folder map, read [src/README.md](src/README.md). For recent context while the package is still settling,
read [src/WORKBENCH.md](src/WORKBENCH.md). Recommendable generated and hand-authored fixture lanes are documented in
[fixtures/authoring/README.md](fixtures/authoring/README.md); analyzer stress fixtures that should not become authoring
recommendations are documented in [fixtures/pressure/README.md](fixtures/pressure/README.md).
