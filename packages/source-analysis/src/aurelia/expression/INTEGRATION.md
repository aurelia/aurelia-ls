# Expression Parser Integration

This note tracks the current handoff from compiler-side authored values into
the expression parser.

Unlike [README.md](./README.md), this file is allowed to change as caller-side
integration closes. Keep it short and operational:

- what the current seams are
- what the next honest integration slice is
- what still belongs above the parser

Do not turn this into a second architecture document for the parser itself.

## Stable Boundary

The parser does **not** own:

- binding-command-to-entry-family routing policy
- text-node vs attribute interpolation provenance
- semicolon-separated multi-binding splitting
- attribute-pattern selection and normalized attribute syntax
- runtime instruction spend or binding materialization

Those are compiler-side responsibilities above the parser.

## Current Handoff State

The parser now has the surfaces it needs:

- direct family entry points in `expression-parser.ts`
- caller-owned selection/request algebra in `parse-selection.ts`
- parser-owned result algebra in `parse-result-algebra.ts`
- parser-owned inspection helpers in `parse-result-inspection.ts`

The remaining integration work is on the compiler side:

- `packages/source-analysis/src/aurelia/compiler/compiler-value-parser.ts`
  - command-owned value planning now normalizes legacy parser-entry seeds onto
    canonical parser selection
  - but it still only closes the binding-command-owned planning slice
- `packages/source-analysis/src/aurelia/compiler/template-compilation-engine.ts`
  - text nodes still only detect interpolation-like syntax
  - they do not yet publish parser requests over text-node value sites
- `packages/source-analysis/src/aurelia/compiler/custom-attribute-binding-lowering.ts`
  - custom-attribute/template-controller lowering still only detects
    interpolation candidates
  - multi-binding splitting is closed structurally, but segment values still do
    not publish parser requests

## Next Honest Integration Slice

Build a compiler-owned value-routing layer above the parser.

That layer should classify each authored value site into a routing family such
as:

- text interpolation
- attribute interpolation
- command-owned value
- custom-attribute primary value
- custom-attribute multi-binding segment value

For each site, it should decide:

- whether the parser owns the site at all
- which parser selection/request to publish when it does
- when ownership is transferred to a secondary grammar or raw-value carrier
- which provenance stays attached to the authored site above the parser

## Important Constraint

Even when two sites share the same parser family, they should remain distinct
above the parser if they materialize differently later.

Examples:

- text interpolation and attribute interpolation both route to the parser's
  `Interpolation` family
- but they should remain distinct compiler-side carriers because they lower
  into different compiler/runtime products

- multi-binding segment values may individually route to `IsProperty`,
  `Interpolation`, or a command-owned value path
- but semicolon splitting and segment provenance still belong to the compiler,
  not to the parser

## Current Concrete Seams

These are the local files to revisit when doing the next integration pass:

- `packages/source-analysis/src/aurelia/compiler/compiler-value-parser.ts`
- `packages/source-analysis/src/aurelia/compiler/template-compilation-engine.ts`
- `packages/source-analysis/src/aurelia/compiler/custom-attribute-binding-lowering.ts`
- `packages/source-analysis/src/aurelia/compiler/compilation-context.ts`

If a future integration change starts pushing template-specific routing into
`packages/source-analysis/src/aurelia/expression/`, pause and re-check whether
that logic actually belongs above the parser instead.
