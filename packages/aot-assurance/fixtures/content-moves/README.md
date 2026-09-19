# Existing-node content transforms

The same source runs through production JIT and strict AOT builds. Five ordered browser checkpoints check
the resulting structure, reactive updates, projected-controller removal, updates while hidden, restoration,
and complete teardown. There are no factory calls, selectors, ambient accesses, or cross-host edits in the hook.

`MoveLab.processContent` transforms only original descendants:

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

The hook never moves its own host or inserts a new node. Its original source, target, and donor hosts all remain
under the same scope. Expectations were first checked independently against JIT using the ordinary browser runner;
lane equality alone is not the oracle. Strict AOT must emit `content-moves-app`, `move-card`, and `move-lab` and cannot
satisfy this scenario by preserving runtime compilation.
