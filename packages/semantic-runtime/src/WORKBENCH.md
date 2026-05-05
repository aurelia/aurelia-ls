# Semantic Runtime Workbench

This note keeps active context close to the code while the package is still settling. It is not a roadmap and it should
not become a procedural dossier. If a detail stops being useful for orientation, delete it or promote the durable part
into the owning README or source contract.

Product-pressure grounding lives in [../../atlas/workbench/product-specific-pressures.md](../../atlas/workbench/product-specific-pressures.md).
Use that note when deciding whether a semantic concept belongs in product records, claims, provenance, inquiry answers,
or Atlas-only navigation.

Durable package boundaries live in [README.md](./README.md). Authoring durable context lives in
[authoring/README.md](./authoring/README.md), [authoring/ONTOLOGY.md](./authoring/ONTOLOGY.md), and
[authoring/CAPABILITY_CHECKLIST.md](./authoring/CAPABILITY_CHECKLIST.md). Keep this workbench focused on live context
that should not be mistaken for stable contract.

## Standing Context

The repo has consolidated around two internal surfaces:

- `packages/semantic-runtime` owns the Aurelia semantic product model.
- `packages/atlas` owns live orientation, inquiry contracts, and the hot local session used by Codex-facing work.

The static document packet and snapshot/query shell have been removed. The intent is for product semantics to live in typed substrate, vocabulary, auLink anchors, claims, provenance, materialized products, and open seams, with Atlas reading those surfaces directly instead of relying on parallel summaries.

## Package Shape

The broad horizontal substrate is present but not finished end to end. The active layers are:

- `kernel` for handles, vocabulary, records, claims, provenance, materialization, product details, and auLink.
- `boot` for source admission before semantic interpretation.
- `application` for framework-normal app topology shared by analysis and authoring.
- `authoring` for semantic app-creation intent, operation, plan, capability, and verification contracts.
- `evaluation` for static module/value evaluation and explicit open seams.
- `resources`, `configuration`, `registration`, and `di` for Aurelia world construction.
- `template` and `expression` for authored template/compiler surfaces and parser-owned recovery.
- `type-system` for TypeChecker-backed projection where runtime emulation should stop.
- `router` for router model anchors that are not yet deeply wired into passes.

This breadth is intentional. The useful work is not to preserve compatibility with retired readers, but to let real
consumers pressure these layers and then refactor horizontally when the boundaries become clearer.

## Working Rules

- Start repo work through `pnpm --filter @aurelia-ls/atlas orient`.
- Build this package with `pnpm --filter @aurelia-ls/semantic-runtime build`.
- Keep `auLink` narrow: framework-symbol anchors only, not product taxonomy.
- Put durable semantics in product records and vocabulary, not in documentation tables.
- Keep uncertainty explicit with open seams instead of flattening partial knowledge into resolved-looking facts.
- Treat package-local READMEs as boundary notes. Keep them short enough that future agents actually read them.

## Active Pressure

Atlas should increasingly learn from this package through typed contracts:

- read terrain and source-surface inventory from typed product records, vocabulary, and claims;
- follow auLink anchors into the framework checkout;
- report stale, missing, or overlapping typed declarations where the product model itself exposes them;
- expose continuations that move between Atlas self-maintenance, semantic-runtime source, and framework anchors;
- avoid growing private product-specific inference tables when the product model itself can carry the intent.

The expression parser remains useful but provisional. It has grammar, AST, and recovery algebra, yet it predates the current kernel shape. Keep it callable parser machinery above source text until template/compiler ownership proves where its products should land.

The operational API boundary now lives in `api`. It opens an app by composing source admission, static module
evaluation, resource recognition, configuration admission, DI world construction, compiler-world formation, template
compilation, rendering dispatch, and TypeChecker-backed scope products. Keep initial answers compact; expose opaque
kernel handles only through explicit detail projections so the API can serve app developers and AI callers without
forcing every query into full graph expansion.

The previous analyzer-shaped fixture was removed because it optimized for current recognizer closure rather than
idiomatic app authoring. Future fixtures should split stress coverage from authoring examples: stress fixtures can be
dense, while `../fixtures/authoring` should contain framework-normal app shapes once the substrate can analyze them.

The authoring spine is intentionally non-operational for the moment. It exists to make future codegen land inside a
typed plan/verification structure instead of drifting into ad hoc scaffold templates.

## Template Compiler Emulation Notes

The compiler front door now lives on `TemplateCompilerService` instead of only in `TemplateCompilationProjectPass`.
`compile(...)` owns the runtime short-circuit branches and delegates product materialization to a host. Compiler
collaborators should be used through their service models (`IAttributeParser.parse`, `IBindingCommandResolver.get`,
`IExpressionParser.parse`, `AttrMapper.map/isTwoWay`) rather than through local aliases or duplicated helper logic.

`compileSpread(...)` is wired from runtime rendering back into `TemplateCompilerService`, but dynamic spread instruction
materialization is intentionally still open. The runtime path now preserves the captured AttrSyntax handles and emits
open pressure when the spread compiler cannot close; future work should fill that host with real instruction emission
rather than bypassing the compiler service again.
