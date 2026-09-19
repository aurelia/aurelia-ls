# Content transforms with existing and generated nodes

The same source runs through production JIT and strict AOT builds. Five ordered browser checkpoints check
the resulting structure, reactive updates, projected-controller removal, updates while hidden, restoration,
and complete teardown. There are no selectors, ambient accesses, markup setters, or cross-host edits in the hook.

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
- Change authored interpolation expressions through Text `data` and `nodeValue` while retaining the same Text objects.
  Uppercasing and string-length expressions must replace the authored expression, then react independently to later updates.
- Replace an element's prior text and bound child subtree through `textContent`; removed bindings do not survive.

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
- A generated fragment replaces a stamped subtree through `textContent`, then receives a comment edited through `data`.
  It carries reactive string-length interpolation text, returns the fragment from `appendChild`, and becomes empty after
  insertion. Expectations retain JIT's distinct static and bound text nodes.
- Generated row Text is edited before template cloning, and an empty `textContent` write removes another generated
  interpolation Text entirely. Readback checks retain CharacterData identity and expose detached old children.
- A generated but never inserted bound/stamped paragraph remains absent. Factory allocation alone is not compiler reach.

Finally, source `cloneNode` / `importNode` create additional independently reactive compiler input:

- A shallow copy of an authored paragraph captures its current attribute values but no children. The original is
  subsequently changed, proving snapshot independence; generated interpolation and the copied custom attribute bind normally.
- A deep copy of the generated conditional/repeat template keeps distinct template-content identities and inert content
  documents. Both copies follow the same five hide/update/restore checkpoints without sharing occurrences or row ownership.
- An authored custom-element subtree is imported from the platform document into the inert document, then inserted normally.
  Its input binding, named title projection and conditional repeated body must lower from copied, addressless syntax.
- Previously edited authored interpolation text and a generated comment are cloned independently. The comment copy is
  edited without changing its source; template copies retain the generated row's edited expression. JIT's distinct
  static/bound text nodes and all copied expression updates remain observable in the existing checkpoints.

Custom element names and templates are created using the authored donor template content's inert owner document;
ordinary native nodes can use the platform document. Insertion adopts generated content in the same way as original
content. The hook never moves its own host. Its original source, target, and donor hosts all remain under the same
scope. Expectations were checked independently against JIT using the existing scratch entry and ordinary browser
runner; lane equality alone is not the oracle. Strict AOT must emit `content-moves-app`, `move-card`, and `move-lab`
and cannot satisfy this scenario by preserving runtime compilation.
