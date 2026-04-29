# Expression Parser Integration

This note tracks the intended handoff from template/compiler authored values
into the expression parser.

Unlike [README.md](./README.md), this file is allowed to change as caller-side
integration closes. Keep it short and operational:

- what the current seams are
- what the next honest integration slice is
- what still belongs above the parser

Do not turn this into a second architecture document for the parser itself.

## Stable Boundary

The parser does **not** own:

- binding-command-to-entry-family ownership policy
- text-node vs attribute interpolation provenance
- semicolon-separated multi-binding splitting
- attribute-pattern selection and normalized attribute syntax
- runtime instruction spend or binding materialization

Those are template/compiler responsibilities above the parser.

## Current Handoff State

The parser now has the surfaces it needs:

- direct family entry points in `expression-parser.ts`
- parser-owned result algebra in `parse-result-algebra.ts`
- parser-owned inspection helpers in `parse-result-inspection.ts`

The previous integration layer has been removed. The current handoff is rebuilt
on top of the new template/compiler substrate through
`../template/value-site.ts` and
`../template/value-site-producer.ts`.

This is not a declaration that the expression parser is finished. It only means
the handoff no longer depends on a compatibility selector/router inside the
parser. The parser remains provisional until its grammar corridors, recovery
publication, source/provenance shape, and inquiry behavior have been reviewed
against the runtime grammar and the new value-site/lowering producers.

## Current Honest Integration Slice

The compiler-owned value-site layer classifies each authored value into an
ownership family such as:

- text interpolation
- attribute interpolation
- command-owned value
- custom-attribute primary value
- custom-attribute multi-binding segment value

For each site, it decides:

- whether the parser owns the site at all
- which parser entry family to invoke when it does
- when ownership is transferred to a secondary grammar or raw-value carrier
- which provenance stays attached to the authored site above the parser

## Important Constraint

Even when two sites share the same parser family, they should remain distinct
above the parser if they materialize differently later.

Examples:

- text interpolation and attribute interpolation both route to the parser's
  `Interpolation` family
- but they should remain distinct template/compiler carriers because they lower
  into different compiler/runtime products

- multi-binding segment values may individually route to `IsProperty`,
  `Interpolation`, or a command-owned value path
- but semicolon splitting and segment provenance still belong to the
  template/compiler layer, not to the parser

## Current Concrete Seams

Binding-command values and custom-attribute multi-binding values currently
publish value sites but no parser publications. That is intentional: the
command/compiler layer must own command-specific preprocessing and secondary
grammars before final expression parsing or instruction lowering can be honest.

If a future integration change starts pushing template-specific ownership into
`packages/source-analysis/src/aurelia/expression/`, pause and re-check whether
that logic actually belongs above the parser instead.

If future inquiry work needs to expand parser publications from the kernel
store, add typed parser-publication product details or a product-detail catalog.
Do not add generic payloads to kernel products and do not make the expression
parser a hidden kernel producer just to make expansion convenient.
