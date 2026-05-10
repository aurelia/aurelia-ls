# Expression Parser

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.
See [INTEGRATION.md](./INTEGRATION.md) for template/compiler handoff notes.

This directory contains the provisional Aurelia expression parser used by
`packages/semantic-runtime`.

The parser is intentionally narrower than the compiler that consumes it. The
grammar and canonical AST are useful ore, but the parser predates the kernel and
should not be allowed to absorb compiler ownership just because it already has a
convenient hook. Keep template-specific value-site ownership, binding-command preprocessing,
multi-binding splitting, and lowering above this folder.

This document is meant to be durable. Update it when the parser's public
contract, ownership boundaries, or major internal decomposition change. Do not
rewrite it just because one more consumer starts calling into the parser. It is
also intentionally self-contained: historical implementations may have helped
pressure the current design, but they are not the authority for this document.

The parser is not exempt from the current clean-room rebuild. It is provisionally
retained because its ownership boundaries are clearer than the removed
template/compiler scaffold, but later template work may still rewrite it if the
new authored-template model reveals better primitives.

This folder has not yet had the same full semantic re-integration pass as the
new kernel, resources, configuration, DI, and template substrates. Treat it as
useful parser machinery with a native result algebra, not as a finished materializer
or durable app-map layer. It emits no kernel records by itself; template and
binding-command materializers decide when parser results become products, claims,
open seams, or inquiry answers.

## Public Contract

- `expression-parser.ts` is the public facade.
- `ExpressionParser.parse(...)` defaults to `IsProperty` when no entry family is
  selected explicitly.
- `parsePropertyLike(...)`, `parseIterator(...)`, `parseInterpolation(...)`, and
  `parseCustom(...)` are the direct family entry points for callers that
  already know ownership.
- `ExpressionParseContext.activeOffset` is an inquiry-owned cursor hint for parser families that can expose multiple
  incomplete regions, currently interpolation holes. It selects which frontier is published without changing completed
  AST truth.
- Non-owning transfer is not a parser result. Callers decide whether the
  expression parser owns an authored value before invoking this facade.
- `parse-result-algebra.ts` is parser-owned publication.
- `parse-result-inspection.ts` is the stable query surface for downstream
  consumers that should not rebuild sibling-kind switches locally.

## Core Design Decisions

- Canonical AST stays canonical.
- Parser-owned partial or incomplete input never re-enters the AST as fake
  partial nodes.
- Incomplete input is published through companion result families, not through
  `BadExpression`-style sentinels.
- Completed-input grammar and parser-owned companion publication are separate.
- Parser result algebra is native. There is no public adapter layer on top of a
  legacy parser return shape.
- Parser-local failure state is internal only.
- Parser publication enums are string-valued where they can escape into product
  records or inquiry payloads. Numeric bitmasks remain internal classifier
  helpers only.

## Internal Ownership Map

- `ast.ts`
  Canonical AST carriers plus local/source span carriers.
- `expression-scanner.ts`
  Tokenization, token flags, and scanner hot path. The top-level scan path
  dispatches to token-family helpers for punctuation/operators so new lexical
  grammar should land in the relevant family method instead of regrowing the
  main scanner branch.
- `expression-parser.ts`
  Public facade and family dispatch for expression-owned input.
- `parse-result-algebra.ts`
  Public result families, frontier/gap vocabulary, interpolation and iterator
  companion envelopes.
- `parse-result-inspection.ts`
  Stable family/outcome inspection helpers for consumers.
- `completed-input-parser-state.ts`
  Parser state engine: scanner cursor, checkpoints, delimiter tracking,
  rebasing, retained failure/provenance helpers.
- `completed-input-companion-builder.ts`
  Parser-local companion shaping and widening.
- `completed-input-publication.ts`
  Lift from parser-local failure state to public property-like and iterator
  result families.
- `interpolation-parser.ts`
  Interpolation-specific scanning, ordered-hole ownership, and interpolation
  companion publication.
- `expression-boundary-scanner.ts`
  Template-aware `${...}` delimiter lookahead shared by HTML interpolation and
  JavaScript template-literal parsing.

## Completed-Input Corridors

`CompletedInputParser` now acts as a precedence pipeline over shared parser
state, with special corridors split out by ownership:

- `completed-input-primary-corridor.ts`
  Literal primaries, identifiers, scope/global access roots, arrays, objects,
  and parens. Object literal parsing keeps entry/value/separator recovery as
  separate helpers so future object grammar can attach to the right point
  without reopening one giant primary branch.
- `completed-input-left-hand-side-corridor.ts`
  `new`, member access, optional chaining, keyed access, calls, and tagged
  template handoff.
- `completed-input-tail-corridor.ts`
  Value-converter and binding-behavior tails.
- `completed-input-arrow-corridor.ts`
  Arrow-head ownership, committed invalid heads, and arrow-owned body gaps.
- `completed-input-template-corridor.ts`
  Template literal scanning plus nested `${...}` hole handoff.
- `completed-input-iterator-corridor.ts`
  Iterator header grammar, `of` separator law, iterable handoff, object/array
  binding patterns, and raw `;` tail visibility. Header publication plus
  array/object binding pattern entry/rest/separator handling are intentionally
  split inside the corridor; keep new iterator recovery law on the matching
  helper rather than rebuilding a monolithic `repeat.for` parser.

If another parser feature arrives, the first question should be "which corridor
owns this?" rather than "which giant parser method do we patch?"

Interpolation uses a template-aware boundary lookahead before it invokes the
completed-input parser. The interpolation layer detects authored `${` starts,
uses `expression-boundary-scanner.ts` to find the matching top-level `}` across
strings, comments, object literals, and nested template-literal holes, and then
hands the completed-input parser only the expression slice it owns. The same
lookahead is shared by `completed-input-template-corridor.ts`, so HTML
interpolation and JavaScript template literals agree on `${...}` delimiter
truth without asking EOF to stand in for a maybe-closed hole.

Interpolation publication is a separate frame from boundary extraction. The
frame owns active-hole selection, suppressed-hole promotion when the cursor is
outside all holes, strict missing-close publication, and absolute source-span
rebasing. If future work needs more interpolation scanner residue, add it beside
that publication frame rather than weakening the completed-input parser or
reintroducing nullable span fallbacks.

## Important Provisional Decisions

- The parser has been trimmed away from caller-side selection and non-owning
  transfer, but its grammar corridors and recovery publication still deserve a
  deeper audit against runtime grammar and the new inquiry/value-site substrate.
- `IsFunction` currently shares the property-like grammar core. If function-only
  grammar or recovery ever diverges materially, split it at the corridor level,
  not by duplicating the whole parser.
- Iterator tails after `;` are intentionally preserved as raw visibility rather
  than fully parsed grammar. That is a runtime-shaped split point and may stay
  optional tooling enrichment.
- Interpolation currently publishes:
  - ordered closed holes
  - one active hole companion
  - later suppressed malformed-hole visibility
  This is enough for honest parser-owned recovery today. If later consumers
  need richer interpolation scanner residue, add a dedicated scan-state carrier
  beside the current hole carriers instead of overloading the existing
  boundary-state objects.
- Aurelia's runtime parser can accept a final interpolation hole at EOF. The
  semantic-runtime parser keeps that framework behavior visible as pressure but
  publishes a successful expression with a missing interpolation `}` as an
  interpolation frontier. That gives authoring tools honest incomplete-input
  truth while preserving the parsed expression subtree.
- Runtime/compiler consumers that need Aurelia-accepted expression semantics
  should not weaken the parser publication to get it. The template layer owns
  that projection in `../template/expression-parse-projection.ts`, so the parse
  product can keep a companion/frontier state while binding data-flow still
  spends the runtime-accepted expression lane.
- Inquiry follows the same split: a final missing interpolation close can stay
  visible as cursor-info/diagnostic truth without suppressing expression-scope
  completions for the accepted expression body.
- Cursor-aware interpolation does not create a second AST family. It uses the caller's active offset to choose the
  active companion hole while preserving the same ordered closed/suppressed hole model.
- `parse()` still defaults to `IsProperty`. If later callers need a true
  tri-state of explicit family, inferred family, and parser-declined ownership,
  grow that above the parser in the caller-owned template/compiler layer.

## What The Parser Explicitly Does Not Own

- Binding-command-to-entry-family ownership policy.
- Text-node vs attribute interpolation provenance.
- Multi-binding splitting for semicolon-separated custom-attribute syntax.
- Attribute-pattern selection and normalized attribute syntax.
- Runtime instruction spend or binding materialization.

Those are template/compiler concerns above the parser.

## Integration Boundary

The parser itself is meant to stay stable while template/compiler callers evolve.
Current handoff status, template/compiler ownership seams, and integration pressure live in
[INTEGRATION.md](./INTEGRATION.md).

Keep this README focused on parser contract and ownership. If a note is mainly
about how current compiler callers have or have not spent the parser yet, it
probably belongs in `INTEGRATION.md` instead.

## Current Integration Slice

`../template/value-site.ts` and
`../template/value-site-materializer.ts` are now the compiler-owned
value-site layer above the parser.

That layer decides, for each authored value site:

- which authored site family this is
- whether the parser owns the site
- which parser entry family to invoke when it does
- when ownership is transferred to a secondary grammar or command-owned carrier
- which provenance stays attached to the authored site above the parser

The parser should continue to receive one expression-owned value at a time with
an entry family. Non-owning transfer stays above it. It should not become aware
of semicolon-separated multi-binding strings, attribute-pattern policy, or
text-vs-attribute interpolation distinctions.

The current integration still carries a product-detail pressure: parser results
are rich in-process objects attached to template value-site emissions and parse
products. The kernel product envelope records only the product handle, kind,
identity, address, provenance, and claims. If inquiry later needs durable parser
publication expansion, add a typed product-detail layer for parser publications
rather than serializing arbitrary parser objects through `MaterializedProduct`.

## If You Need To Change Something

- Grammar or recovery law:
  start in the relevant completed-input corridor or `interpolation-parser.ts`.
- Public result shape:
  start in `parse-result-algebra.ts` and `parse-result-inspection.ts`.
- Caller ownership:
  start in the template/compiler value-site layer above the parser.
- Span/provenance or parser-local retained state:
  start in `ast.ts`, `completed-input-parser-state.ts`, or
  `parse-companion-state.ts`.

When in doubt, preserve the separation:

- caller chooses ownership
- parser publishes parsing truth
- template/compiler layers spend authored-site provenance above that
