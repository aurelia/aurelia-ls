# Source-hook attribute transforms

`AttributeLab.processContent` operates on the supplied host and its existing descendants, using only invocation-local
state and authored `data-case` values. It does not use selectors, create/move nodes, assign markup, or consult mutable
captured state. The strict AOT lane must lower the resulting attributes through ordinary compiler semantics.

Cases cover new/replaced/removed/readded attributes and order, toggle return values, generated property/two-way
bindings, a custom attribute, an `as-element` custom element, generated `if`/`repeat`, and the select `multiple`-before-
`value` rule despite opposite attribute creation order. HTML and SVG classList operations normalize tokens, while
namespaced href removal/readdition and XML language creation preserve qualified names and namespaces.
The generated repeat's inner `if` reads its iteration variable and excludes `two`, so reversing controller nesting
cannot pass by evaluating only a global condition.
An uppercase null-namespace attribute created through `setAttributeNS` keeps its case even on an HTML element;
namespace-aware and ordinary HTML lookups therefore differ. Both hook readback and final browser state preserve this.
The input starts with two real authored bindings to a deliberately wrong-valued property: one is removed permanently,
the other is removed and recreated with a different expression. Stale authored binding reuse therefore changes visible output.

`ProjectionProbe.processContent` runs inside two named projection groups, a bare named template that flattens into
its group, and a named template with nested `repeat`/`if` controllers. It records the post-projection host attribute
view through ordinary and namespace-aware reads, recreates the consumed `au-slot` qualified name as a fresh host
attribute, and generates a live title binding. The hook also removes and recreates its child's authored slot assignment
to target its own named outlet, adding a live custom-attribute binding. Readbacks are written into DOM attributes;
no hook inputs or results are retained in captured mutable state.

JIT characterization of the same fixture found `host.ownerDocument === platform.document` is false for `AttributeLab`
in the authored root and for `ProjectionProbe` inside retained template-controller content, but true for direct
named probes and the flattened bare-template probe. `CompilationContext.h` explicitly adopts generated template
content into the platform document (`aurelia/packages/template-compiler/src/template-compiler.ts:1560`), whereas
`TemplateElementFactory.t` creates authored template content without adoption
(`aurelia/packages/template-compiler/src/template-element-factory.ts:24`). This characterization is not an assertion
of the strict golden: source hooks refuse `ownerDocument` reads until document affiliation is modeled together with
native inert-template construction. A single platform-document or inert-document reference would misrepresent one
of these cases.

The browser harness registers an autonomous native custom element and two customized button built-ins before any
application modules load. The fixture's `before-app` event verifies that loading compiler-final definitions did not
construct any of them. Constructors record their existing attributes, child element, and connection state without
mutating the DOM. The seven ordinary interaction checkpoints also cover:

- The inert root, named and flattened projections, and a native-element `if` view (restored from its cache).
- Native-element `repeat` views whose generated template contents are platform-owned: every new instance upgrades
  before connection, including growth after the first instance.
- An authored `<template repeat>` and repeated `AttributeCard` definitions whose contents remain inert: the first
  imported instance upgrades before connection; later cached-template clones upgrade only when connected.
- An ordinary retained template whose contents remain in the template-contents document and never upgrade.
- Hook removal and rewriting of an original `is="native-button"`: both instances still upgrade as the original
  customized built-in. Adding an `is` attribute to a plain button does not give it a custom-element identity.

These are independently checked against the pinned JIT, not just compared between two unknown lane outcomes.
The native registry is harness-owned so observation instrumentation does not add authored framework demands or
require support for source-hook document/registry access. The existing five resource definitions remain the complete
strict AOT cohort.

The existing shared assurance harness runs seven browser checkpoints and teardown. Multiple-select model order is
intentionally separate from selected-options DOM order: RC2 retains the already selected `b` and appends newly
selected `a` to the model array. The scenario requires five AOT artifacts and no JIT fallback.
