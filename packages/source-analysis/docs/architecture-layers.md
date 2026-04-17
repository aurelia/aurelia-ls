# Architecture Layers

The package is moving toward a layered shape:

1. Structural substrate
   Cheap facts about files, packages, imports, exports, declarations, and relations.

2. Evaluators
   Logic that spends those facts to classify paths, explain blockers, and answer deeper semantic questions.

3. Materialized views
   Snapshots and compatibility surfaces.

   `deps`, `typerefs`, and `exports` started as three ad-hoc tools that solved very specific problems:

   - `deps` made it possible to get a fast structural overview of the Aurelia framework and narrow down which files actually mattered for a question
   - `typerefs` made it possible to recover important model and IR shapes without rereading large parts of the source tree
   - `exports` made it possible to enumerate framework API identity from the outside in

   They proved the value of the approach, but they are not the intended long-term design. What they accomplish should be absorbed into better shared primitives and higher-order inquiry surfaces.

4. Inquiry surface
   The API that helps a caller discover what can be asked, ask it, recover from misses, and continue.

5. Semantic adapters
   Aurelia-specific meaning on top of the shared substrate, then later a richer program/runtime/editing layer.

Snapshots should remain a stable contract. They only became the main storage shape because there was not yet a durable hosted program behind them. They do not have to remain the main runtime truth for live inquiry.
