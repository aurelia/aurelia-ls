# Content transforms with existing and generated nodes

The same source runs through production JIT and strict AOT builds. Five ordered browser checkpoints check
the resulting structure, reactive updates, projected-controller removal, updates while hidden, restoration,
and complete teardown. There are no selectors, ambient accesses, markup setters, cloning, or cross-host edits in the hook.

`MoveLab.processContent` first transforms original descendants:

- Append authored nodes into an initially empty wrapper and reorder siblings with `insertBefore`.
- Remove and reinsert the same node twice, checking return values and identity-based sibling relationships.
- Replace a child with an existing node from another parent; reinsert the returned child in its original source.
- Remove a bound node permanently: neither the element nor its custom attribute may survive compilation.
- Move a custom element with named projections, custom attributes, interpolation, `if`, and `repeat` into the wrapper.
- Extract an authored child from retained `template.content`. An outer projection has already adopted the lab into
  the platform document, but the retained template contents remain inert. Insertion must adopt the child without
  changing the donor fragment's document identity.
- Reorder original interpolation text siblings into adjacency. JIT compiles the resulting text order, not authored
  source order, and the shared-runtime compiler must retain both expressions' source ownership.
- Move authored text into an originally empty HTML script. The template parser's hidden inert-script state must
  survive compiled-carrier construction and runtime cloning; the script never executes when connected.
- Move a bound child under an authored input. The DOM permits children under HTML void elements even though HTML
  serialization cannot represent that tree; emitted construction must retain the child's binding and custom attribute.

The same hook then builds compiler input using `createElement`, `createTextNode`, `createComment`, and
`createDocumentFragment`:

- A generated native wrapper carries `title.bind` and the existing `stamp` custom attribute, and receives an
  authored bound paragraph without losing its original bindings or custom attribute.
- Generated `template if.bind` and nested `template repeat.for` introduce the `item` local for a generated
  interpolated and stamped paragraph. Hiding, changing the collection while hidden, and restoring exercise the
  same scope/lifecycle path as the authored controller content.
- A generated `move-card` binds its input and receives generated named title/body projections. The body has its
  own generated `if` template, so projection extraction and controller compilation must compose for new nodes.
- A generated `let` binds a derived local used by both generated interpolation and a custom attribute. A generated
  named `au-slot` exercises reactive fallback and removes two distinct generated children carrying `au-slot` attributes.
- A generated fragment carries a static comment and reactive interpolation text, returns the fragment from
  `appendChild`, and becomes empty after insertion. Expectations retain JIT's distinct static and bound text nodes.
- A generated but never inserted bound/stamped paragraph remains absent. Factory allocation alone is not compiler reach.

Custom element names and templates are created using the authored donor template content's inert owner document;
ordinary native nodes can use the platform document. Insertion adopts generated content in the same way as original
content. The hook never moves its own host. Its original source, target, and donor hosts all remain under the same
scope. Expectations were checked independently against JIT using the existing scratch entry and ordinary browser
runner; lane equality alone is not the oracle. Strict AOT must emit `content-moves-app`, `move-card`, and `move-lab`
and cannot satisfy this scenario by preserving runtime compilation.
