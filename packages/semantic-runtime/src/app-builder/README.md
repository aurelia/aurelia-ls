# App Builder

`app-builder` is legacy/internal semantic-runtime substrate for app-building
research, source-lowering experiments, SourcePlan assembly, and generated
fixture pressure.

It is not the current public app-building product surface. Public MCP guidance
now goes through **Aurelia Patterns**:

```text
pattern menu/search
  -> pattern example fetch by stable patternId
  -> adapt source into the target app
  -> verify the adapted project with semantic-runtime diagnostics/app queries
```

Do not expose the old app-builder catalog/readiness/preflight/source-lowering
ladder as public MCP guidance unless a later product decision explicitly
reopens that design.

## Current Boundary

The old public workflow failed for AI callers because it asked the caller to
understand and supply too much before receiving useful source:

```text
caller intent
  -> ontology/detail/readiness queries
  -> explicit domain, source, policy, style, accessibility, and routing inputs
  -> source-lowering invocation/composition/SourcePlan request envelopes
  -> generated source and verification artifacts
```

That machinery can still contain useful evidence, but it should be treated as
internal substrate. The current public surface should not ask callers to author
domain models, choose policy axes, inspect target catalogs, satisfy
input-readiness rows, or navigate source-lowering preflight before seeing an
example.

## Relationship To Patterns

`packages/patterns` owns the clean-slate pattern contract, admitted catalog,
evidence review loop, and future GitBook-aware semantic corpus parser.

Use app-builder material only as background pressure for patterns when it is
actually helpful:

- SourcePlan and SourcePlan contribution provenance;
- source-lowering helpers and request-field coverage;
- generated fixture indexes;
- expected effects and semantic verification snapshots;
- native/accessibility review pressure;
- handoff notes and generated-source quality canaries.

Do not leak app-builder vocabulary into public pattern responses. In
particular, avoid public request or response fields based on target catalogs,
input readiness, recommendation policy, status matrices, source-lowering
preflight, SourcePlan request fields, or caller-supplied domain models.

## Ownership

- `ontology/` owns the legacy app-builder ontology, relation graph, input
  contracts, readiness, detail projections, policy/style/control/application
  rows, source-lowering surfaces, and preflight logic.
- `part-*.ts` catalogs own reusable framework-grounded source parts. They
  should reference semantic-runtime resource and syntax catalogs instead of
  redeclaring built-in Aurelia names, aliases, package dependencies, or binding
  command identity.
- `source-lowering-*.ts`, `*-source.ts`, and `source-plan-*.ts` own executable
  lowerers and pressure galleries. They may spend ontology rows only through
  explicit request payloads and must preserve contribution origins.
- `domain-*.ts` and `seed-data.ts` own legacy caller/domain input shapes and
  sample records. Sample domains are pressure inputs, not durable public
  pattern identity.
- `policy/` owns legacy recommendation/status projections for app-builder
  review. Those projections are not public Aurelia Patterns vocabulary.
- `../source-plan` owns neutral file/source/tooling envelopes. Keep
  app-builder policy out of SourcePlan primitives.
- `../fixture-verification` owns effect verification. App-builder should use
  semantic-runtime contracts and pressure fixtures instead of owning a bespoke
  verifier.

## Semantic Runtime API

`api/app-builder.ts` can remain as an internal semantic-runtime facade while the
substrate is being harvested, tested, or rewritten. It should not be registered
as public MCP tooling by default.

The retired public MCP tools were:

- `aurelia_app_builder_catalog`
- `aurelia_app_builder_query`

The current MCP app-building guidance tools are:

- `aurelia_pattern_menu`
- `aurelia_pattern_example`

If app-builder APIs are used by scripts, fixtures, or future internal adapters,
keep them selector-sensitive and compact. Do not re-expand the old request
algebra into startup schemas, prompts, or public docs.

## Source Lowering

Callable source-lowering surfaces are still registered in
`ontology/source-lowering-surface.ts`. Treat that registry as internal evidence
for which exact ontology targets can produce fragments, compositions, or
SourcePlan previews.

Important boundaries:

- `source-lowering-preflight` is a legacy/internal gate, not the public pattern
  front door.
- `canRequestSourceLowering` is an eligibility bit after durable input,
  policy-satisfaction, and target-specific facts are ready; it does not mean
  every per-call request field has already been supplied.
- Invocation/composition/SourcePlan answers do not write files.
- SourcePlan witness rows, generated control-use inventory rows, selected
  lowerer result details, and decision-bundle expansion rows are detail-mode
  evidence, not default public pattern payload.

## Pressure Fixtures

Tracked generated app-code contracts live under:

```text
packages/semantic-runtime/fixtures/app-builder
```

Refresh them with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder-generated
```

Runtime-smoke runnable generated fixtures with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime check:fixture-runtime
```

Focused source-lowering/analyzer pressure fixtures live under:

```text
packages/semantic-runtime/fixtures/pressure/app-builder-*
```

Refresh them with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder-pressure
```

Use generated fixture indexes as review maps, not as proof that the old public
product shape is correct:

- `packages/semantic-runtime/fixtures/app-builder/generated-fixture-index.json`
- `packages/semantic-runtime/fixtures/pressure/app-builder-source-lowering-fixture-index.json`

These indexes are useful for request-field usage, SourcePlan target coverage,
domain/model coverage, generated source quality, expected effects, and semantic
reopen checks. They should inform pattern evidence and regression pressure, not
force patterns to reuse app-builder request grammar.

## Ground Rules

- Public app-building source guidance starts in `packages/patterns`, not here.
- App-builder rows should be explicit about whether they are ontology facts,
  executable source-lowering targets, pressure fixtures, or deferred terrain.
- Keep sample domains, sample data, presentation copy, and CSS out of reusable
  mechanics unless the input is explicitly caller-supplied or fixture pressure.
- Prefer strengthening shared semantic-runtime substrates over adding
  app-builder-local verification, parsing, source-reference, or diagnostic
  workarounds.
- When app-builder material exposes a useful pattern, curate it through the
  Aurelia Patterns admission/evidence loop instead of exposing the old
  app-builder request flow.
