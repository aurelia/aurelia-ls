# Semantic Conformance

This folder contains semantic-runtime conformance assertions and the current known-gap ledger.

The conformance matrix is a query/locus contract layer, not a replacement for fixture verification or lane snapshots:

- fixture verification checks reopened app product facts;
- semantic conformance checks public query behavior, source precision, answer closure, and cross-query agreement;
- lane snapshots check LSP protocol projection;
- extension-host tests check VS Code boundary behavior.

The stable requirement lives in `matrix.json`. It should describe what must be true, not whether the implementation
currently satisfies it.

`matrix.json` and `known-gaps.json` both carry local JSON schemas. The runner also enforces the core schema fields so
schema drift fails in CI without relying on an editor or an extra validator package.

Matrix metadata is operational:

- `aureliaDomain` is the framework/semantic subdomain under pressure, and can be filtered with `--aurelia-domain`
  or `--subdomain`;
- `domainAxis` is the semantic pressure area, and can be filtered with `--domain`;
- `capability` is the product/query capability under pressure, and can be filtered with `--capability`;
- `coverageIntent` explains why the row exists, and can be filtered with `--intent`;
- `assertionKind`, `fixture`, and assertion id fragments can be filtered with `--assertion-kind`, `--fixture`, and `--id`.

The runner prints grouped counts for Aurelia domains, semantic pressure domains, coverage intents, and capabilities.
That is deliberate: these fields are not tags for decoration. Unknown values are rejected so the matrix does not grow
parallel taxonomies by accident.
Unknown CLI flags are rejected for the same reason.

Focused examples:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime contract:semantic-conformance -- --subdomain template-controller-scope
pnpm --filter @aurelia-ls/semantic-runtime contract:semantic-conformance -- --domain plugin-capabilities
pnpm --filter @aurelia-ls/semantic-runtime contract:semantic-conformance -- --intent domain-canary
pnpm --filter @aurelia-ls/semantic-runtime contract:semantic-conformance -- --capability template-diagnostics
```

Aurelia domain vocabulary:

- `template-binding-syntax`: authored binding command, attribute-pattern, and binding-language syntax;
- `template-controller-scope`: template controllers, locals, lexical scopes, and scope-introducing syntax;
- `template-expression-typing`: template expression member/type behavior, overlays, completions, and weak/open answers;
- `bindable-contracts`: bindable properties, public attribute names, aliases, and bindable diagnostics;
- `resource-registration`: custom elements/attributes, value converters, binding behaviors, and resource identity;
- `router-composition`: router resources, `load`, `href`, route configs, route recognizer state, and viewports;
- `runtime-composition`: runtime-html dynamic composition surfaces such as `au-compose`;
- `plugin-capability-admission`: framework capability detection, missing plugin registrations, and plugin-owned resources;
- `runtime-api-boundary`: semantic-runtime API/catalog assertions that are not themselves Aurelia framework semantics.

Coverage intents:

- `domain-canary`: an Aurelia-domain or semantic-runtime pressure case meant to expose unknowns and data-loss seams;
- `regression-contract`: a known behavior or migrated focused contract that should stay stable;
- `boundary-contract`: public API or catalog vocabulary that other consumers use to choose safe calls;
- `known-gap-witness`: a stable requirement that currently fails and is tracked in `known-gaps.json`.

Transient verdict state lives in `known-gaps.json`:

- a known gap lets the default contract stay green while reporting the failing requirement;
- `--strict` treats known gaps as failures;
- if a known gap starts passing, the contract fails as a resolved gap until the ledger is updated.

This keeps the north-star requirements durable while making today's implementation gaps explicit.

Current matrix scale, as of 2026-07-09:

- public app-query catalog boundary assertions;
- source precision and cross-query agreement canaries;
- semantic token source exactness over the source gallery, including plugin syntax and template controllers;
- folding range and inlay hint source exactness;
- bindable alias references and rename edit plans;
- custom-element resource references and rename edit plans;
- router resource cursor/completion/diagnostic/refusal surfaces, router instruction cursor/completion/diagnostic
  projection, router topology, route recognizer, route-resource instruction closure, route config declaration/routeable
  identity forms, routeable string resolution, router diagnostics, active-link state, static redirect controls, and the
  current router view-model hook completion vocabulary boundary;
- `au-compose` runtime composition rows for component/model/template resolution, recursive resource analysis context,
  activation handoff evidence, and static framework-error diagnostics;
- template-controller scope behavior over repeat locals, nested repeats, `<let>`, `with`, promise branches,
  switch/case, portal, app-owned template controllers, completions, diagnostics, references, and rename edit plans;
- template diagnostics, compiler diagnostics, plugin capability diagnostics, and overlay diagnostic provenance;
- completion member metadata and state-projected owner completion boundaries;
- code-action edit-plan provenance, including safe no-action cases;
- framework capability demand rows before diagnostic/code-action projection.

Current default output: 223 active assertions pass with 19 known gaps. The router-composition subdomain has 64 assertion
rows, including the current router known-gap witnesses; the runtime-composition subdomain has 4 assertion rows.

The matrix is intentionally structural rather than exhaustive. New assertion families should be added when they expose
a new semantic axis, a new answer contract, or a known data-loss risk. Do not add duplicate rows merely to raise the
count.

When expanding the matrix, prefer starting from the Aurelia domain map and uncovered semantic axes rather than migrating
existing focused tests. Existing tests are useful regression contracts, but they should not be mistaken for the main
goal of this matrix: finding the pressure cases we have not modeled crisply yet.

Keep the matrix in one file until a domain becomes too large to review comfortably. Use `--domain` and `--intent` for
focused runs before introducing physical shards.
