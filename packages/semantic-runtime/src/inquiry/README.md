# Inquiry Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Inquiry is the answer algebra above the kernel. It turns selectors and loci into answers without creating a second
semantic store or making transport, presentation, or consumer policy own the core model.

Core inquiry pressure comes from editor, Atlas, tooling, and agent use: a caller often starts from a workspace, project,
file, cursor, range, or known kernel handle and needs a truthful answer plus a navigable follow-up move.

## Responsibilities

- Represent query loci such as workspace, project, source file, source cursor, source range, and kernel record.
- Preserve outcomes such as hit, miss, ambiguous, open, partial, unsupported, and reroute.
- Carry answer basis, projection lanes, expansions, evidence handles, provenance handles, claim handles, open seams,
  page state, and continuations.
- Resolve host selectors into the narrowest currently known inquiry locus.
- Share answer-assembly helpers such as source-file-address narrowing and ordered de-duplication through the inquiry
  helper modules so answer surfaces do not grow private copies of the same selector vocabulary.
- Expand materialized products through typed product-detail slots when a consumer asks for detail rather than handles.
- Answer template/expression completion from already-materialized parser, scope, resource, and definition details.
- Keep confidence, ranking, actionability, and UI/AI policy above the kernel.

## Non-Responsibilities

- Producing kernel facts.
- Interpreting TypeScript, Aurelia configuration, resources, DI, or templates.
- Hiding uncertainty behind empty result arrays.
- Treating projection shape as semantic authority.
- Treating inquiry relations as durable app graph edges before a real materializer has earned a kernel claim predicate.

## Design Pressure

Inquiry is where answer shape is separated from produced facts. Kernel records can preserve that a materializer was
partial or blocked; an inquiry answer can expose the seams, continuations, source context, and graph handles needed by later
presentation or policy layers without changing what the kernel facts mean.

Compiler and editor pressure comes from integrating HTML parsing, attribute classification, expression parsing, and
instruction lowering. Those flows need to serve batch-like compiler questions and live IDE questions from the same
semantic substrate. Cursor and range loci, recovery frontiers, candidate sets, explanation paths, and pagination should
be modeled here or in answer envelopes, not smuggled into kernel claims or compiler products.

Projection lanes are intentionally consumer-neutral. A transport or presentation adapter can map LSP, Atlas, tooling, a visual
workbench, diagnostics, AOT, or agent-facing APIs onto compact, detail, explanation, source-context, or graph
projections outside the intent taxonomy. Those are projections over the same substrate, not separate meanings of the
substrate.

Inquiry does not carry a parallel intent ontology. Query shape, locus, projection, basis, and continuation kind should
be enough for callers to understand what an answer attempted. If a relation starts carrying real app meaning across
materializers, promote it into kernel vocabulary and signed claim predicates rather than only naming it in answer
metadata.

This layer should not encode ranking, actionability, UI copy, transport defaults, or consumer personas. Materializers
should preserve what they observed, what they could derive, and which seams remained open. Inquiry answers expose
enough typed shape for later policy layers to decide how much to show, how to rank it, which continuation is useful
next, and whether a caller can act on it.

`template-completion.ts` is the concrete completion answer surface. It deliberately assumes cursor-to-template-site
classification already happened: the query supplies a site kind and optional product handles for binding scope,
resource scope, selected resource definition, expression parse, and optionally a checker-projected member owner type.
The answer spends those typed details and reports missing inputs rather than re-scanning templates or inventing
candidates. Member completion after `foo.` can derive the member-owner type from the parser's closed owner subtree,
the visible binding scope, and the TypeChecker expression evaluator. That is an answer-local type projection, not
runtime execution and not completion ranking.

`templateCompletionQueryForCursor` is the cursor adapter over the horizontal compiler/runtime path. It consumes a
materialized `TemplateResourceRuntimeAnalysisEmission`, picks the smallest HTML/value/scope products around the cursor,
classifies the site, and returns the same product-handle `TemplateCompletionQuery` used by the answer. Empty start-tag
attribute positions, such as `<my-element |>` before an authored attribute product exists, are still classified from
the materialized element and template-source span rather than by rescanning project source. That keeps cursor-sensitive
editor/tooling entry points above the compiler products without creating a second completion path.

Interpolation completion adds one extra answer-local projection over the same value-site product: when a text value
contains multiple incomplete `${...}` holes, the cursor adapter reparses that product with an active offset so the
parser publishes the hole under the cursor. The compiler's batch interpolation product remains unchanged; inquiry only
selects the active frontier needed for the current answer. The value-site product itself does not make the whole text
or attribute value an expression-completion site: cursor classification only enters expression inquiry when the cursor
is inside an interpolation hole, command-owned expression, or expression/member frontier span. Plain text and plain
attribute values remain non-expression sites even though the compiler may have materialized interpolation parse
products for the surrounding authored value.
