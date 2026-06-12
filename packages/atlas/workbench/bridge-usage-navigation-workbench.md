# Bridge Usage Navigation Workbench

## Aim

Turn `bridge.aulink` usage comparison from a count surface into a navigable inquiry surface. The useful API should let an agent move from a bridge row to the exact member-level and source-site evidence that explains why semantic-runtime is shallow, divergent, intentionally product-shaped, or blocked by a missing Atlas primitive.

## Pressure That Shaped The API

- `usage-comparison` shows useful rollups, but counts alone do not explain what to do next.
- Product-side usage needs exact source-site access for the rows behind product-only or product-shallow member observations.
- Framework-side usage needs a route into `framework.api` when the target is public or implementation-shaped, and exact target-declaration fallback rows when it is not.
- Member divergence is the natural middle layer between link rollups and individual source sites. Without that layer the API jumps from broad bridge rows to raw source reading.

## Working Hypothesis

The missing inquiry primitive is not another gap enum. It is a bridge-local comparison grain:

```text
link target -> member comparison row -> side-specific usage sites -> source/type continuations
```

The member comparison row should be exact and dull: member name, side presence, usage counts, roles, first framework site, first product site, and source continuations. Interpretation stays with the caller.

## Experiment Notes

- Start by using the existing `usage-comparison` rows to find a gap that has a concrete likely resolution path.
- Improve the API only where the experiment gets stuck.
- Prefer filters over categorical verdicts: `linkId`, `memberName`, `side`, `presence`, `productArea`, `packageId`.

## Implemented Result

- Added two usage drill-down grains: `usage-members` and `usage-sites`.
- Added `member-surface` as a separate declaration-surface grain. This matters because semantic-runtime may faithfully declare/implement a framework member without internally using it yet.
- Added exact `query` filtering to the base auLink substrate so `anchors` can be used as a small entrypoint (`Container`, `TemplateCompiler`, `Rendering`, `Renderer`) instead of paging through expression-parser rows.
- Fixed a framework API usage split-brain where TypeChecker usage symbols resolved through `dist/types` while declaration subjects were grounded in framework `src`. Canonicalizing those symbol keys exposed rendering/DI call sites such as `Rendering` calling `this._ctn.getAll(IRenderer, false)`.
- Deduped member declaration provenance and compacted `member-surface` evidence data. The row still carries declaration sources for provenance, but evidence no longer repeats the full row.
- Added constructor parameter properties to member-surface extraction. This corrected a false gap where `TemplateRenderingService`'s `readonly renderers` constructor parameter was not being counted as a product declaration.
- Added exact declaration-kind counts to `member-surface`, using the existing normalized member slot kinds. This keeps method/property/accessor/parameter-property pressure visible without inventing a new mismatch taxonomy.
- Extracted repeated checker/source/member/usage helpers into the shared TypeScript semantic surface substrate at
  `packages/atlas/src/source/semantic-surface`. Bridge usage and framework API now share usage-role and member-slot
  primitives instead of maintaining parallel value spaces.
- Compactified `usage-comparison` answer rows and continuation evidence. Per-link rows now carry member-name counts
  rather than full member-name arrays; callers use `usage-members`, `member-surface`, or `usage-sites` when names or
  provenance are the question. This keeps broad bridge probes from paying detail cost before the agent has picked a
  row/member/site layer.
- Scoped `query` by projection. `usage-comparison` treats query as a link/target/source orientation filter; detail
  projections can still let member/site text admit the owning link. This avoids broad first-pass rows being widened by
  hidden member names or high-fanout implementation-shape subjects.
- Promoted continuation evidence compaction into `inquiry/evidence.ts` as `evidenceBreadcrumb(...)`. Bridge usage
  continuations now carry a source-backed breadcrumb instead of repeating the full comparison row payload through every
  projection/source hop.
- Split the `bridge.aulink` usage answer family out of the base bridge lens. `bridge-aulink-usage-lenses.ts` now owns
  `usage-comparison`, `member-surface`, `usage-members`, `usage-consumers`, and `usage-sites`, while
  `bridge-aulink-lens-support.ts` owns the common bridge basis/route/source-hop helpers. This keeps usage navigation
  extendable without making the base bridge lens absorb every product/framework comparison grain.
- Added usage owner grouping. `usage-sites` now carries a source-backed owner declaration, and `usage-consumers` groups
  exact source sites by side, link/member, top-level owner, and owning class member. This gives DI/compiler/rendering
  probes a middle grain between member counts and raw source rows, e.g. "which product class or materializer is consuming
  `TemplateCompiler.compile`?"
- Added `usageRole` filtering for bridge usage projections. This keeps import/export/type-reference rows inspectable but
  lets compiler/runtime probes ask directly for `member-call` consumers when the question is control flow rather than
  module surface.
- Reused the same usage-owner fields in `framework.api:usages` filters (`ownerName`, `ownerKind`,
  `ownerMemberName`) so owner grouping is a shared TypeScript surface capability rather than a bridge-only trick.
- Added bridge-to-framework owner continuations. Framework-side `bridge.aulink:usage-consumers` rows can now jump to
  `framework.api:usage-consumers` with matching implementation/member/owner/role filters, so bridge comparison can
  hand off to the native framework API view when the caller wants framework-only context.
- Added compact call-shape facts and filters to bridge usage rows. `usage-sites` and `usage-consumers` can now filter
  by exact call callee and argument symbol/text, and bridge-to-framework continuations preserve singleton call filters.
  This made the framework edge `kernel:Container.get(ITemplateCompiler)` land directly on `Rendering.compile` without
  source-reading or language ranking.

## DI / Compiler / Rendering Probe History

This section records the pressure that shaped the bridge API and the subsequent semantic-runtime compiler-service
refactor. Re-run the live `bridge.aulink` projections before treating any concrete product/framework member comparison
below as the current mirror state.

The useful question became: "does semantic-runtime declare the framework member, and does semantic-runtime's own flow exercise it?"

For `kernel:Container`, `get`, `getAll`, `invoke`, `register`, `find`, and `createChild` are all declared on both sides. Treat this as the local control case: the DI emulator was closely reviewed and its public runtime-shaped surface largely mirrors Aurelia while adding product-owned read/provenance helpers.

The first `template-compiler:TemplateCompiler` probe showed a framework-shaped service boundary problem: framework
member-call consumers exposed the real `TemplateCompiler` internal compile graph (`_compileElement`,
`_classifyAttributes`, `_compileNode`, etc.), while semantic-runtime had spread much of that responsibility through
project passes and materializers. That was useful gap data because the bridge localized product design drift rather than
only reporting missing member names. The follow-up semantic-runtime refactor moved the compiler front door onto
`TemplateCompilerService.compile(...)` / `compileSpread(...)` and routed collaborators through service-shaped APIs; the
remaining mirror question should be answered by fresh `usage-comparison`, `member-surface`, and `usage-consumers`
reads.

For `runtime-html:Rendering`, `render` and `renderers` are declared on both sides. `compile` and `getViewFactory` remain framework-only. Rendering is therefore in better shape than TemplateCompiler, but it still shows a service-boundary split: framework `Rendering.compile(...)` bridges into `TemplateCompiler`, while semantic-runtime compiles earlier in the project pass and then hands compiled-template products to rendering.
Owner grouping confirmed the split: semantic-runtime has a product `render` consumer in
`RuntimeRenderingMaterializer.recordsForRendering`, while `compile` has no product-side owner row. This is not an Atlas
bug; it is a visible product design choice or smell that the bridge can now localize without raw source reading.

For DI-to-compiler stitching, `bridge.aulink:usage-consumers` with `linkId: "kernel:Container"`, `memberName: "get"`,
`usageRole: "member-call"`, `side: "framework"`, and `callArgumentSymbolName: "ITemplateCompiler"` returns the single
owner row `Rendering.compile`. The row also offers two TypeScript call-site hops: one for all calls inside the owner
member and one filtered to the consumed API callee.

Earlier compiler collaborator probes were mixed. `runtime-html:ResourceResolver` looked fairly mirror-like (`el`, `attr`,
`bindables`), while `template-compiler:IBindingCommandResolver` and `template-compiler:IAttributeParser` exposed
service-shape drift that has since been partially addressed in semantic-runtime. Keep using these collaborator rows as
compiler-boundary canaries, but do not preserve old product method names here as architecture truth.

## Remaining Pressure

- Querying by broad merged subjects such as `IContainer` still surfaces too much because framework API shape merging can make common interfaces appear on many high-traffic subjects. That is not a reason to hide the data; it points to a missing interpretation layer over merged type/API roles.
- `usage-consumers` is still syntax-owner grouping, not semantic responsibility modeling. The next useful grain for
  DI/compiler/rendering may need to join owner groups with framework role evidence and product auLink placement so a
  caller can see whether a method divergence is implemented by a mirror service, a pass/materializer, or an unmodeled
  product obligation.
- Outside the DI emulator, semantic-runtime should remain suspect until the bridge can show clean mirrors or an explicit, framework-grounded reason for divergence. Product-shaped helpers are useful, but they should not hide missing framework-shaped service entrypoints.
