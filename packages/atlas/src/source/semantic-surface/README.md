# TypeScript Semantic Surface

The TypeScript semantic surface is Atlas's shared substrate for exact, named TypeScript facts that sit between raw
source navigation and higher framework/product semantics.

It is intentionally narrower than "understand the program" and broader than "find a reference." It gives lenses a
common vocabulary for checker-backed identity, declaration surfaces, member slots, shape edges, and usage sites without
letting any one lens invent its own compatibility layer.

## Ontology

The stable nouns are:

- **Source range**: an admitted file plus editor coordinates for one syntax node.
- **Symbol identity**: a TypeChecker symbol after alias resolution, with a canonical key that prefers source mirrors over
  generated declaration files when the source file is admitted.
- **Declaration surface**: the syntax node that declares a named thing. Higher layers may call this a facet when the
  declaration is visible through a package export, module export, auLink target, or another surface.
- **Subject**: a higher-layer grouping of declaration surfaces. The source substrate does not decide which facets are the
  same semantic subject; it only gives the exact symbol, declaration, and source facts that make grouping possible.
- **Shape relation**: an exact TypeScript relation such as `class implements interface` or `interface extends interface`.
  Shape is not identity. Traversal breadth is a query policy owned by the consuming lens.
- **Member slot**: a named member surface normalized across class declarations, interfaces, type literals, accessors,
  signatures, and constructor parameter properties.
- **Member declaration**: one exact source declaration that contributes to a member slot. A slot is the compact
  navigational surface; declaration rows are the provenance detail.
- **Usage site**: an exact identifier occurrence with a syntax role such as import, type reference, constructor call,
  member call, or value reference.
- **Usage call shape**: compact call-site metadata attached to a usage site when the usage is a call: callee name,
  callee text, optional receiver text, argument texts, argument symbols, and canonical source-preferred fully qualified
  argument symbol names. This is still syntax/checker evidence, not a DI or compiler interpretation.
- **Usage call aggregate**: counted call-shape value spaces across usage-like rows. Lenses use this for compact owner
  groups without inventing their own call argument count maps.
- **Usage owner**: the source-backed declaration owner that contains a usage site, split into a top-level owner such as
  a class/function/variable and an optional class-member owner such as a method or constructor.

These nouns are deliberately calm. They should compose without knowing whether the consumer is `framework.api`,
`bridge.aulink`, enum usage, product vocabulary, or future semantic-runtime app analysis.

## Boundary

This substrate answers:

- Which admitted source node owns this source range?
- Which checker symbol does this node name after alias resolution?
- Which source declaration mirrors a generated declaration-file declaration?
- Which exported declarations are visible in this module?
- Which normalized member slots does this declaration expose?
- Which exact syntax role does this identifier usage play?
- Which compact call shape and argument symbols are attached to a call usage site?
- Which source declaration owns this usage site?

This substrate does not answer:

- Which Aurelia resource, DI key, compiler product, renderer, lifecycle phase, or observation entity a symbol represents.
- Which implementation should receive a method call through runtime control flow.
- Which semantic-runtime mirror is correct.
- Which framework API is more important.
- Which facts should become product claims, cache dependencies, or invalidation policy.
- ECMAScript evaluation, module boot, object materialization, or container resolution.

When a consumer wants those answers, it should compose these TypeScript surface facts with framework, evaluator, bridge,
or product substrates instead of widening this layer.

## Modules

- [source-ranges.ts](source-ranges.ts) owns admitted-node ranges, source spans, and range keys. Its required admitted
  file identity helper is a source-range convenience around `SourceProject.requiredSourceFileIdentity(...)`, which is
  the lower-level admission invariant. Framework/product projections should use required admitted identity when their
  roots come from owned source walks; TypeScript LanguageService projections that legitimately mention lib/external
  files should name that program-file policy explicitly instead of falling back through this layer.
- [declarations.ts](declarations.ts) owns declaration names, exported top-level declaration surfaces, package index
  checks, generated declaration-file to source mirror lookup, and usage-site owner declarations.
- [expression-text.ts](expression-text.ts) owns compact expression rendering for source-shape keys, so lens mechanisms
  can name call chains without embedding argument objects, callback bodies, or app/framework source snippets.
- [symbols.ts](symbols.ts) owns alias resolution, symbol lookup, fully qualified symbol keys, and canonical source symbol
  keys.
- [members.ts](members.ts) owns normalized member slots, declaration kinds, and constructor parameter properties.
- [usages.ts](usages.ts) owns exact identifier usage-role classification, compact usage text, compact call-shape
  metadata for call usages, and reusable call-shape aggregation.
- [ast.ts](ast.ts) owns generic AST traversal, expression unwrapping, property-name/member-access text extraction, and
  small syntax classifiers such as assignment-operator and modifier detection.

## Expansion Rule

Add to this substrate when all of these are true:

- The fact is exact TypeScript syntax/checker evidence, not a framework or product interpretation.
- The fact is source-addressed or can be joined back to source-addressed evidence.
- More than one lens or index needs it, or a lens has started duplicating a checker/syntax helper that is likely to recur.
- The value space is stable enough to name once and reuse.

Do not add:

- Heuristic ranking.
- Name-similarity matching.
- Aurelia-specific taxonomy.
- Product policy.
- Compatibility aliases that hide an ontology problem in a higher layer.

## Current Consumers

- [framework/api-usage.ts](../../framework/api-usage.ts) uses this substrate to build `framework.api`: Aurelia public
  API facets, merged subjects, implementation shapes, normalized member slots, and repo-wide usage sites.
- [inquiry/runtime/bridge-aulink-usage.ts](../../inquiry/runtime/bridge-aulink-usage.ts) uses the same member and usage
  primitives to compare Aurelia framework targets with semantic-runtime auLink mirrors.
- [enum-usage.ts](../enum-usage.ts) is adjacent prior art. Its exact enum/member/reference scans should gradually reuse
  this substrate where the same symbol, source-range, or usage-role machinery appears.

## Pressure Signals

The substrate should grow when future work repeatedly needs one of these capabilities:

- Receiver-type-aware member calls grounded by exact TypeChecker receiver types. Current call shapes preserve receiver
  text and argument symbols; they do not yet infer receiver flow or implementation dispatch.
- Generic type argument surfaces and constraint surfaces.
- Declaration merge surfaces for namespaces, overloads, ambient declarations, and module augmentation.
- Import/export alias graphs beyond direct symbol alias resolution.
- Call signatures as first-class callable surfaces rather than just member slots.
- Source edit/invalidation dependencies for claim producers.

Those are not present by default because each one changes the algebra. Add them when a real query needs them, and keep
the exact TypeScript fact separate from the framework or product meaning layered above it.
