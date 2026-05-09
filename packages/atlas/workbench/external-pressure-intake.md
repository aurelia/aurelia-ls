# External App Pressure Intake

This note defines how proprietary external Aurelia apps may be used as directional
pressure for Atlas and semantic-runtime work. It is a clean-room boundary, not a
place to record app details.

## Purpose

External apps can reveal scale, composition, and framework-usage pressure that a
small fixture will not naturally produce. Use them to ask:

- which Aurelia surfaces must semantic-runtime analyze;
- which Atlas views are still too blurry for large-app reasoning;
- which substrate boundaries become hard to explain without reading raw source;
- which framework concepts need better product records, claims, provenance, or
  open seams.

Do not treat these apps as canonical idiom, product spec, or fixture source.

## Clean-Room Boundary

- Do not copy source, templates, names, routes, domain models, config values, or
  business logic from the external repos into this repo.
- Do not commit source excerpts, screenshots, file listings that reveal
  proprietary structure, or detailed prose that would reconstruct the apps.
- Do not generate fixtures by translating external app code.
- Do not use exact repo/package/component names in durable notes unless the user
  explicitly says they are safe to persist.
- Durable records should name abstract pressure only: for example "nested route
  configuration with DI-provided guards" or "custom attribute with multi-binding
  value syntax", not the app's implementation.

Transient inspection notes belong under ignored `.temp/` files and should be
deleted or summarized before commit.
Manual source reads, targeted local scripts, and Atlas inquiries against the
proprietary roots are allowed as transient testing surfaces. Keep the tool
output local to the session, and promote only generalized patterns when a paper
trail is needed.

## Intake Shape

1. Build a high-level surface map without preserving proprietary detail:
   package/runtime versions, framework packages used, routing/configuration
   shape, source layout scale, resource kinds, template-feature families,
   binding/observer families, DI/service patterns, plugin/custom extension
   points, generated assets, and test/build entrypoints.
   Prefer `workspace.architecture` for this first pass when the apps are
   admitted through `ATLAS_EXTERNAL_SOURCE_ROOTS`; it gives package topology,
   conservative source-role counts, and Aurelia source-shape pressure without
   hand-written repo-specific scripts. Keep tracked observations at aggregate
   count and mechanism-category level; workspace row names, paths, source
   ranges, and summaries are local inspection handles and must not be promoted
   into durable notes for proprietary roots. Prefer the summary rollup's
   filter-aware surface-kind, mechanism, admission-role, and Aurelia-shape
   distributions, plus package-manager, build-tool-hint, external-package, and
   app-shaped aggregate sub-rollups, before paging row payloads. Treat
   workspace source-shape rows as framework-grounded signals: generic method
   names such as `.start()` or `.register(...)` should not be counted unless the
   receiver is tied back to Aurelia bootstrap or kernel container imports.
   Non-app source roles should remain visible as source-role pressure without
   being promoted into Aurelia resource/DI/router/template semantics.
   Template references should likewise come from syntactic carriers such as
   HTML imports, dynamic imports, `require(...)`, or `template`/`templateUrl`
   fields; arbitrary strings that merely end in `.html` are not durable
   framework evidence.
   Aggregate mechanism labels must also stay non-extractive: project-specific
   factory names should collapse to category labels such as
   `configuration-call`, while framework-owned API names such as `AppTask.*`,
   `container.get`, or `router.load` may remain explicit. Bindable metadata
   pressure should be summarized by framework carrier shape (`@bindable`
   decorator target/argument, static `bindables`, or resource definition object)
   rather than by property/config names from the app.
   Router pressure should prefer aggregate route-config facets before row
   paging: carrier shape, route-object field sets, component value-kind buckets,
   and child-route cardinality buckets. Do not persist route literals,
   component names, or reconstructed route maps from proprietary roots.
   Use `pressure:plugin-architecture` for the public plugin submodule and
   `pressure:framework-router` when router pressure needs a framework-grounded
   route-flow or route-recognizer substrate check before changing product code.
   The router pressure output now includes exact route-recognizer mechanic
   rows for path grammar, state graph, endpoint registration/materialization,
   recognition walks, candidate selection, cache, and lookup; treat those as
   the source authority before adding semantic-runtime route-recognizer products.
   Use `SEMANTIC_RUNTIME_PRESSURE_ROOTS` with
   `pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api` when the
   question is whether semantic-runtime app-world opening, resource
   convergence, route configuration, route-pattern parsing, bindable convergence, or open seams close over the same roots.
   That script is transient local pressure output, not a commit artifact. Its
   timing output should stay phase-oriented, not project-identified: use it to
   decide whether large-app friction sits in static evaluation, TypeChecker
   project construction, resource recognition, route-config recognition,
   route-recognizer materialization, app-world composition, or template
   compilation. Its app-root versus non-app-root split is the first
   filter for monorepos: resource-library packages can expose useful resource
   pressure without being app startup failures. The default pressure detail mode
   buckets source-assignment and open-seam reasons into generalized categories;
   use the raw detail mode only for local debugging. If any raw open-reason
   wording from proprietary roots is useful, generalize it manually before
   writing durable notes.
2. Collapse observations into abstract pressure categories:
   app topology, source admission, resource recognition, configuration
   admission, DI materialization, compiler world formation, template lowering,
   runtime rendering, controller/lifecycle flow, observation/data flow,
   TypeChecker projection, routing, validation/i18n/plugins, and Atlas
   navigation gaps.
3. Ground each pressure against Aurelia framework behavior through Atlas
   framework lenses before changing semantic-runtime. The external app is a
   direction signal; the framework remains the semantic authority.
4. Choose work that improves future understanding: typed product records,
   framework-shaped emulators, clearer flow/provenance/open-seam products,
   better Atlas projections, better source line anchors, better cost splits, or
   cleaner source organization.
5. Use tests and smoke scripts sparingly. Add them when they protect a newly
   named product boundary or catch a subtle semantic regression, not as a
   substitute for understanding.
6. Before commit, promote only durable abstractions and code changes; remove
   scratch intake notes.

## Work Selection During A Long Run

If a thread closes before time is exhausted, pick the next thread from this
order:

1. a framework-grounded semantic-runtime gap that blocks analysis of a broad app
   pattern;
2. an Atlas visibility gap that made the current reasoning expensive or
   source-heavy;
3. a product-architecture cleanup surfaced by `pressure:product-architecture`;
4. an Atlas maintenance cleanup surfaced by `pressure:self`;
5. documentation alignment that lets the next session recover the intent without
   seeing proprietary inputs.

Do not switch to filler work. If the next useful task is large, start it and
leave a durable handoff once the time box ends.

## Recursive Substrate Principle

User-directed taste: when an external pressure point exposes a gap, especially
inside the ECMAScript evaluator, treat the gap as substrate pressure rather than
as a reason to add a narrow workaround and move on.

The preferred move is to pivot downward and follow the pressure recursively:

- improve the evaluator or other low-level substrate capability that is missing;
- refactor nearby substrate shape when the new capability strains old seams;
- revisit product vocabulary, records, claims, provenance, or open-seam ontology
  when the code cannot name the concept cleanly;
- update Atlas so the new structure is visible and navigable;
- profile Atlas if the new visibility is too expensive;
- improve inquiry algebra, continuations, paging, or answer shape if the query
  spends too much context.

This is intentional. The run should seek the larger architectural challenge when
that challenge is the honest source of friction, because paying down the
substrate usually makes later app-analysis work easier.

## Durable Output Contract

Commit-worthy output may include:

- semantic-runtime product records, materializers, claims, provenance, and open
  seams;
- Atlas lenses, scripts, profile lanes, continuations, and framework-grounded
  views;
- docs that explain framework/product architecture and abstract pressure;
- fixtures that are newly designed from public/idiomatic Aurelia understanding,
  not derived from proprietary source.

Commit-worthy output should not include proprietary app facts or a diary of the
inspection process.
