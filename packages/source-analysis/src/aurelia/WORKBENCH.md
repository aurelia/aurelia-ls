# Aurelia Source Analysis Workbench

This file is an intentionally temporary scratchpad for the current dirty worktree. It is here so long-running refactors
can survive context compaction without pretending the in-flight shape is finished.

## Rehydration

For a fresh agent, start by reading the MCP semantic delta for this folder:

1. `ls2.semanticDelta` summary over `packages/source-analysis/src/aurelia`
2. follow the returned continuations for layers, model surfaces, vocabulary, claim graph, producers, and links
3. use HEAD-basis `sourceTreeish` continuations for removed rows when the replacement path is unclear
4. only then read targeted source files

The current delta is intentionally large because this slice deletes the older `*Producer`/bridge-style scaffold and
replaces it with runtime-shaped materializers, recognizers, composers, stores, and TypeChecker projection surfaces. The
important question for handoff is not "why is so much deleted?", but whether the live layers still expose the semantic
chain from configuration/resource admission through DI, compiler world, template compilation, rendering, scopes, and
completion.

## Current Goal

Finish as much of the compiler/rendering/type-system handoff slice as is sensible before committing:

- keep compiler products grounded in Aurelia runtime/compiler semantics
- make compiled-template products the boundary before renderer/controller emulation
- keep runtime-value evaluation and TypeChecker-backed authoring projection separate
- thread provenance, claims, product details, and open seams through the handoff
- make autocomplete answers consume explicit scope/resource/expression/type products instead of rescanning source

Current checkpoint:

- compiled-template materialization now assembles render targets, instruction sequences, and runtime-shaped instruction
  rows from HTML, classification, value-site, and command-lowering products
- runtime Rendering emulation now consumes compiled-template target rows instead of raw command-lowering products
- project-level orchestration now carries app-world construction through template compilation, renderer emulation, and
  binding-scope projection
- binding-scope materialization now spends checker-projected type members into context slots so runtime `Scope` lookup
  and completion candidate production use the same name surface
- controller hot details are attached after binding-scope projection so their scope references are hydrated rather than
  frozen as null during renderer emulation
- repeat-local projection now walks binding patterns and spends runtime repeat collection semantics, including
  synthetic map-entry tuples for `[key, value] of map`
- expression type projection now carries call/construct result references on type shapes, synthesizes conservative
  union shapes for conditional and short-circuit branches, and can model arrow-function shapes without crossing back
  into runtime-value evaluation
- expression type projection now spends compiler resource scope for value converters: it resolves the visible
  `ValueConverterDefinition`, projects the target instance type, reads `toView`, and carries that return type into
  member-completion and repeat/let scope projection
- cursor completion now has an adapter from a materialized template resource emission into the product-handle inquiry
  query consumed by the completion answer
- custom-attribute inline multi-binding now has first-class segment and lowering products. Lowering splits the authored
  value through the attribute parser machine, resolves segment bindables/commands, emits segment-owned expression
  parses, and feeds the resulting instructions into compiled-template rows.
- compiled-template assembly now treats custom-element `processContent` as an owned compiler DOM transform. It records a
  compiler seam and does not compile authored children through as if the hook had not run. Projection/containerless
  child content also uses compiler seam vocabulary instead of generic open-instruction vocabulary.
- evaluation kernel emission is one-way and narrow (`EvaluationKernelEmitter`): evaluator-local seams become source
  spans, evidence, provenance, and open seams, but the evaluation layer does not learn Aurelia product semantics.
- kernel product validation now enforces that a product's advertised claim handles touch the product handle, identity,
  or address. Renderer materialization keeps instruction-renderer dispatch claims separate from binding-owned claim
  handles, and the built-in resource/syntax/renderer catalogs smoke through that invariant.

## Architectural Compass

Runtime-shaped lane:

- module/static evaluation
- configuration and registration admission
- DI world construction
- compiler-world construction
- HTML/attribute parsing
- binding-command lowering
- compiled-template/render-target/instruction-sequence assembly

TypeChecker projection lane:

- activation-dependent controller/view state
- nested template-controller view instances
- repeated view instances
- userland view-model member surfaces
- expression/member completion and navigation

Do not collapse these lanes. If a product crosses the boundary, make the crossing visible through a product, claim,
provenance record, or open seam.

## Active Watchpoints

- Runtime renderer emulation must consume compiled-template render targets, not raw lowering outputs.
- Controller/scope products must not imply full hydration when they are speculative checker projections.
- Expression type evaluation should emulate Aurelia AST lookup semantics, but produce type-shape handles rather than
  runtime values.
- Synthetic unions should stay common-member-only. Branch-specific completion belongs in inquiry continuations, not in
  a widened type-shape product.
- Value-converter type projection currently uses the visible `toView` return surface. Argument-sensitive converter
  overload selection and `fromView` direction belong to the binding/assignment lane when that lane has the needed
  direction metadata.
- Cursor inquiry should spend compiled template/runtime/scope products first; falling back to source rescans should be
  treated as a missing product integration, not as a competing answer path.
- Kernel vocabulary should be promoted when inquiry relations become durable graph truth.
- Product details are current-run hydration, not hidden semantic payloads.
- Inline multi-binding is now a compiler-lowering product family. Do not reintroduce a compiled-template-only
  multi-binding seam unless runtime semantics expose a genuinely unmodeled case.
- Product `claimHandles` are not a loose explanation bag. Cross-product or dispatch claims belong in the store and
  materialization record; product envelopes should advertise only claims by or about their handle, identity, or address.
- Template/compiler materializers now spend both outgoing and incoming product-edge claims in product envelopes where
  the claims are available in the same emission. If a product must be emitted before a later claim can be formed,
  prefer reordering the materialization over leaving the product envelope permanently under-explained.
- Binding-scope products now receive scope-effect ownership claims during binding-scope materialization itself, so
  template-scope construction does not bolt those relationships on in a later side batch.
- Compiled-template-owned instruction products are emitted after render-target and instruction-sequence claims are
  known. Command-lowering-owned instructions remain owned by command lowering and are only referenced by compiled
  template sequences.
- Runtime binding products now anticipate same-pass controller ownership claim handles, matching the runtime shape
  where `Rendering.render` adds bindings to the rendering controller while child controllers act as binding targets.
- Aurelia app-frame materialization now emits container and app-root product envelopes after app-frame claims are known,
  so `Aurelia owns container` / `Aurelia has app root` are visible from both sides of the product edge.
- Template completion now de-duplicates candidates before presentation sorting so nearest scope/resource discovery wins
  over arbitrary product-handle ordering when the same authored name appears in multiple visible lanes.
- Built-in resource, syntax, and runtime-renderer catalog smoke currently materializes 154 products and 179 claims.
- Parent step/operation `produces product` edges remain parent-side graph facts, but child product envelopes now carry
  the deterministic parent claim handles when those claims are emitted in the same batch. `AppRootConfig` is explained
  through a real `AppRootUsesConfig` edge rather than relying only on step production.
- A manual compiler/render/scope smoke over `<let foo.bind="bar"></let><div repeat.for="item of items">${item.name}</div>`
  now reaches 3 HTML nodes, 2 attributes, 2 syntaxes, 2 classifications, 3 value sites, 2 lowerings, 5 compiled
  instructions, 2 render targets, 2 runtime bindings, 2 controllers, 2 scope effects, and 4 scopes. The one rendering
  open seam is the intentional child-container handoff.
- The smoke exposed two graph/detail bugs that are now fixed: value-site products recorded route claim handles without
  committing the route claims, and compiled-template registration tried to re-own command-lowering instruction details.
- Cursor completion smoke with source spans now selects the deeper repeated-item scope when a synthetic template
  controller scope and its repeated-view scope share the same element span. The expression site returns repeat locals
  and override-context names (`item`, `$index`, `$first`, …) plus outer `let` locals through normal scope traversal.
- Repeat-local type projection now hydrates checker member value types on demand when a scope slot carries a
  handle-less `CheckerTypeReference` from an owning `TypeMember` product. A throwaway app smoke over
  `<div repeat.for="item of items">${item.name}</div>` projects `items: Item[]` into `item: Item` and member completion
  at `item.` offers `name: string` and `count: number` with no missing inputs.
- Template scope construction now records the runtime-order scope active for each instruction-owned expression. This
  fixes sequential scope effects that cannot be selected by source-span containment alone: `<let first.bind="items[0]">`
  now evaluates its own expression under the parent scope, while later `${first.name}` completion sees the `let` scope.
  Destructuring repeats such as `[key, value] of map` also select the repeated-item scope for child interpolations.
- Instruction-to-scope application is now a signed kernel edge (`configuration.instruction-uses-binding-scope`) in
  addition to the hot inquiry map, because autocomplete depends on this relation as semantic graph truth rather than
  as a presentation-only heuristic.
- Cursor completion now selects command-owned value sites and expression parses before parser-owned placeholder sites.
  Binding-command expression parses carry the authored value span separately from the full attribute/instruction span,
  so cursors inside `repeat.for` and `.bind` spend the lowered command expression while attribute-name cursors remain
  syntax-owned. Command expressions use the runtime-order scope active at their instruction, while child interpolation
  expressions use the template-controller/repeated-view scope produced by rendering emulation.
- Runtime rendering now preserves the distinction between binding ownership and binding target. This mirrors the
  runtime renderer contract: nested bindable/property instructions add bindings to the rendering controller, but the
  target can be a child/custom-attribute controller. The durable graph records that as
  `binding.runtime-binding-targets-controller` only when the target controller differs from the rendering controller.
- TypeChecker-projected type members now preserve declaration source spans when their declarations belong to admitted
  source files. Member completion over `let`, `repeat.for`, and map destructuring can now return `Item` members with
  navigation-ready source addresses instead of anonymous checker names.
- Bindable definitions now preserve source addresses for the metadata entry or member declaration that produced them,
  and template attribute completion spends those bindable-level addresses. Empty start-tag attribute positions such as
  `<child-card |>` classify as `attribute-name` from the materialized element/template-source span even before an HTML
  attribute product exists.
- Interpolation parser publication is now cursor-aware through `ExpressionParseContext.activeOffset`. Template
  completion spends the existing interpolation value-site detail with that active offset, so multiple incomplete holes
  in one text node select the frontier under the cursor (`|` offers value converters, `&` offers binding behaviors)
  without changing the compiler's batch interpolation product.
- Cursor completion now distinguishes value-site materialization from expression-site ownership. Plain text and plain
  attribute values no longer offer scope names merely because they have interpolation parse products, while command-owned
  expressions and interpolation holes still enter expression/member completion through their product handles.
- Inline template sources now preserve a decoded-markup-to-authored-source offset map when string/template-literal
  escapes make raw TypeScript offsets diverge from compiler markup offsets. HTML parsing and start-tag cursor
  classification spend that map so escaped quotes do not break attribute-value, attribute-name, repeat-scope, or
  member-completion ownership.
- A richer smoke over an app-root inline template now reaches the full app/config/DI/compiler/render/scope/typechecker
  handoff: 3 resource definitions, 1 app root, 1 compiler world, 2 template resources, 10 HTML nodes, 3 attributes,
  10 compiled instructions, 6 runtime bindings, 3 controllers, and 5 binding scopes. Completion at repeat/let member
  sites offers `Item` members, `<child-card |>` offers the `title` bindable with a source address, and value-converter
  completion sees both `sanitize` and userland `trace`.
- Backtick-authored inline templates with escaped interpolation (`\${...}`) now source-map correctly through the same
  template materialization path. The decoder treats `\$` as an authored escape so editor offsets still map back to
  decoded compiler markup.

## Commit Readiness Check

Before committing this slice, a fresh pass should confirm:

- `pnpm --filter @aurelia-ls/source-analysis build` passes
- MCP changed-file diagnostics report no errors or warnings
- MCP substrate/semantic-delta summaries report no graph issues or watchpoints for the live dirty scope
- a smoke path still reaches configuration/app-world, DI/compiler-world, HTML parsing, attribute classification,
  binding-command lowering, compiled templates, runtime rendering, binding scopes, TypeChecker projection, and template
  completion
- any root-level dirty files outside `packages/source-analysis/src/aurelia` are intentional to include in the same commit

## MCP Follow-Up Notes

The new semantic-delta packet is useful enough to be the default rehydration route after compaction. The next MCP/product
improvements that would reduce future token pressure are:

- a compact "pipeline trace" projection that follows product/claim routes from app configuration to template completion
- a smoke-scenario projection or product-owned smoke contract so the MCP can report end-to-end coverage without source
  reading
- an open-seam projection that distinguishes intentional seams from defect candidates
- richer signed-claim continuations from changed predicates to the materializers that emit them

Keep these as MCP/substrate follow-up pressure, not product blockers for this commit.
