# Semantic Conformance

This folder contains semantic-runtime conformance assertions and the current known-gap ledger.

The conformance matrix is the high-volume semantic layer in a three-layer IDE campaign, not a replacement for its
supporting corpus contract or downstream boundaries:

- supporting fixture verification checks reopened app product facts;
- semantic conformance checks public query behavior, source precision, answer closure, and cross-query agreement;
- lane snapshots check LSP protocol projection;
- extension-host tests check VS Code boundary behavior.

Adapter/unit tests support these layers but do not replace them. Start a semantic or cross-query question here; add a
lane probe when LSP projection can lose or reshape the answer, and add an extension-host journey only when VS Code state,
dirty buffers, cancellation, edit application, diagnostics publication, or undo/redo behavior is part of the contract.

The stable requirement lives in `matrix.json`. It should describe what must be true, not whether the implementation
currently satisfies it.

Fixture truth is part of the contract. A fixture that expects app-root or template behavior must prove its root custom
element through explicit resource metadata or through the build-transform admission the fixture is specifically testing;
`.app({ component })` is not itself a custom-element definition. Prefer explicit `@customElement({ name, template })`
outside convention-policy fixtures. Pair absence assertions with a positive app-root, compilation, or neighboring-row
control so an unopened app cannot make a requirement pass vacuously.

`matrix.json` and `known-gaps.json` both carry local JSON schemas. The runner also enforces the core schema fields so
schema drift fails in CI without relying on an editor or an extra validator package.

Matrix metadata is operational:

- `aureliaDomain` is the framework/semantic subdomain under pressure, and can be filtered with `--aurelia-domain`
  or `--subdomain`;
- `domainAxis` is the semantic pressure area, and can be filtered with `--domain`;
- `capability` is the product/query capability under pressure, and can be filtered with `--capability`;
- `coverageIntent` explains why the row exists, and can be filtered with `--intent`;
- `assertionKind`, `fixture`, and assertion id fragments can be filtered with `--assertion-kind`, `--fixture`, and `--id`.

The runner prints grouped counts for Aurelia domains, semantic pressure domains, coverage intents, capabilities, and
the behavior query kinds actually exercised by each Aurelia domain. Query-kind coverage is derived from expectation
data rather than duplicated as metadata. That is deliberate: these fields are not tags for decoration. Unknown values
are rejected so the matrix does not grow parallel taxonomies by accident.
Unknown CLI flags are rejected for the same reason.

Source loci are also validated before any runtime query or known-gap classification. A `marker`, `startMarker`, or
`endMarker` must occur exactly once in its selected source file unless `markerOccurrence`, `startMarkerOccurrence`, or
`endMarkerOccurrence` explicitly selects a positive one-based occurrence. Within a marker-anchored span, `occurrence`
selects the one-based occurrence of `token` after that anchor; it does not select the marker. Ambiguous loci are test
infrastructure defects and abort the run, so they cannot be hidden by a known-gap row. Prefer a more specific marker
when it communicates the semantic witness; use an explicit occurrence for deliberately repeated gallery examples.

Focused examples:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime contract:semantic-conformance -- --subdomain template-controller-scope
pnpm --filter @aurelia-ls/semantic-runtime contract:semantic-conformance -- --domain plugin-capabilities
pnpm --filter @aurelia-ls/semantic-runtime contract:semantic-conformance -- --intent domain-contract
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

- `domain-contract`: durable Aurelia-domain or semantic-runtime behavior, including pressure cases that originally
  exposed unknowns or data-loss seams;
- `regression-contract`: a known behavior or migrated focused contract that should stay stable;
- `boundary-contract`: public API or catalog vocabulary that other consumers use to choose safe calls;

Coverage intent is durable. Whether a requirement currently fails is recorded only in `known-gaps.json`; resolving a
gap must not require changing the requirement's intent.

Transient verdict state lives in `known-gaps.json`:

- a known gap lets the default contract stay green while reporting the failing requirement;
- `--strict` treats known gaps as failures;
- if a known gap starts passing, the contract fails as a resolved gap until the ledger is updated.

This keeps the north-star requirements durable while making today's implementation gaps explicit.

Current matrix scale, as of 2026-07-12:

- public app-query catalog boundary assertions;
- source precision and cross-query agreement canaries;
- semantic token source exactness over the source gallery, including plugin syntax and template controllers;
- folding range and inlay hint source exactness;
- bindable contract rows for decorator, inherited decorator, class-level decorator, inherited/nearest static, static
  record, and definition-object metadata; merge precedence; coercion/setter policy; open configuration honesty; public
  attribute aliases; binding modes and data flows; cursor/completion surfaces; references; template- and TS-origin
  rename plans; diagnostics; inlay hints; and semantic-token source projection;
- custom-element resource references and rename edit plans;
- resource registration across effective declaration forms, aliases, component-local and compiler-local scopes,
  expression resources, syntax resources, exact duplicate authority, and source-backed convention-transform admission;
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

Current default output: 447 active assertions pass with 13 known gaps. The bindable-contracts subdomain has 82 assertion
rows: 76 active passes and 6 known-gap witnesses. Its remaining gaps cover inline multi-binding segment projection,
coercion policy, cursor type projection, interceptor-reference convergence, and custom-attribute compiler-policy
projection. The router-composition subdomain has 110 active assertion rows and no current known gaps; the
resource-registration subdomain has 90 active assertion rows and no current known gaps; the runtime-composition
subdomain has 4 active assertion rows.

The matrix is intentionally structural rather than exhaustive. New assertion families should be added when they expose
a new semantic axis, a new answer contract, or a known data-loss risk. Do not add duplicate rows merely to raise the
count.

When expanding the matrix, prefer starting from the Aurelia domain map and uncovered semantic axes rather than migrating
existing focused tests. Existing tests are useful regression contracts, but they should not be mistaken for the main
goal of this matrix: finding the pressure cases we have not modeled crisply yet.

Keep the matrix in one file until a domain becomes too large to review comfortably. Use `--domain` and `--intent` for
focused runs before introducing physical shards.
