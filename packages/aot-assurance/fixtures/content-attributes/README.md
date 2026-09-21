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

Source-hook document affiliation is checked through DOM readbacks in the same seven interaction checkpoints.
`ProjectionLab.processContent` records the original inert owner on each probe before extraction; the probe's own
hook then sees the platform document for direct and flattened projections, but stays inert inside a retained
template's content. `AttributeLab` also observes the inert authored root and its child before projection.
The same `ProjectionProbe` resource covers its own `if` (hook still inert before wrapping), a plain-element `if`
ancestor (hook subsequently sees the platform document), and a retained-template `if` ancestor (hook stays inert).
Every probe compares host, ordinary child, nested template element, nested template content and its inner child:
adoption into the platform document moves the template element but preserves the inert boundary of its content.
These are compile-time readbacks, not guesses from the final connected DOM. The existing local-template scenario
separately checks inert document reads in `OwnedDependency.processContent` inside extracted local definitions.

The independent pinned-JIT run establishes the expected values. `CompilationContext.h` explicitly adopts generated
template content into the platform document (`aurelia/packages/template-compiler/src/template-compiler.ts:1560`),
whereas `TemplateElementFactory.t` creates authored template content without adoption
(`aurelia/packages/template-compiler/src/template-element-factory.ts:24`). A single platform-document or inert-document
reference would misrepresent one of these cases. This fixture does not use document factories, explicit adoption,
registry access, or document traversal from source hooks; support for identity reads does not imply those APIs.

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

The same checkpoints also exercise parser-created native range state, independently of source hooks. Static ranges
cover min/max defaults, step-constrained defaults, explicit values, and a type-last authored attribute order. Their
values must be `90`, `43`, `84`, and `90`; writing the same attributes sequentially onto a fresh input does not preserve
the first two parser defaults. An `if` view and repeated views carry the same controls through initial import, cached
cloning, hide/restore, and collection growth. Every checkpoint records live value, defaultValue and exact attribute
order. The second checkpoint dirties one control before changing its value attribute and changes a clean control's
value attribute; the fifth resets only this dedicated form. This distinguishes parser initialization from a sticky
value override and checks ordinary browser form behavior without a new scenario or resource definition.

Two no-op custom attributes test compiler-owned removal of native input attributes. `AttributeCard` registers `min`
only in its own dependency scope; its parsed range starts at `90`, then the compiler consumes `min="80"` while the
native value remains `90`. `ProjectionLab` separately registers `type`; consuming `type="range"` leaves a native text
input whose current value is still `90`. The cases capture current type, value, defaultValue and ordered surviving
attributes. Final attributes alone cannot recreate these states. Separate resource scopes keep both custom
attributes away from the ordinary range cases and preserve the same five compiled custom-element definitions.

The existing shared assurance harness runs seven browser checkpoints and teardown. Multiple-select model order is
intentionally separate from selected-options DOM order: RC2 retains the already selected `b` and appends newly
selected `a` to the model array. The scenario requires five AOT artifacts and no JIT fallback.
