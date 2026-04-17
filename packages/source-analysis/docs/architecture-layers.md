# Architecture Layers

The package is moving toward a layered shape:

1. Structural substrate
   Cheap facts about files, packages, imports, exports, declarations, and relations.

2. Semantic analysis kernel
   Checker-backed semantic claims and evaluators over symbols, exports, aliases, declarations, references, control flow, data flow, and bounded interpretation.

3. Evaluators
   Logic that spends structural and semantic claims to classify paths, explain blockers, and answer deeper questions.

4. Derived projections
   Optional materializations, caches, or export artifacts derived from the live layers.

   `deps`, `typerefs`, and `exports` started as three ad-hoc tools that solved very specific problems:

   - `deps` made it possible to get a fast structural overview of the Aurelia framework and narrow down which files actually mattered for a question
   - `typerefs` made it possible to recover important model and IR shapes without rereading large parts of the source tree
   - `exports` made it possible to enumerate framework API identity from the outside in

   They proved the value of the approach, but they are not the intended long-term design. What they accomplish should be absorbed into better shared primitives and higher-order inquiry surfaces.

5. Inquiry surface
   The API that helps a caller discover what can be asked, ask it, recover from misses, and continue.

6. Semantic adapters
   Aurelia-specific meaning on top of the shared substrate, then later a richer program/runtime/editing layer.

The intended center of gravity is the live structural and semantic runtime. Any projections or export artifacts should be derived from that live system rather than defining it.
