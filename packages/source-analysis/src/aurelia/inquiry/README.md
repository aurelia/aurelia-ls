# Inquiry Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

Inquiry is the answer algebra above the kernel. It turns selectors and loci into answers without creating a second
semantic store.

The first pressure comes from IDE, MCP, and agent use: a caller often starts from a workspace, project, file,
cursor, range, or known kernel handle and needs a truthful answer plus the next useful move.

## Responsibilities

- Represent query loci such as workspace, project, source file, source cursor, source range, and kernel record.
- Preserve outcomes such as hit, miss, ambiguous, open, partial, unsupported, and reroute.
- Carry answer basis, evidence handles, provenance handles, claim handles, open seams, page state, and continuations.
- Resolve host selectors into the narrowest currently known inquiry locus.
- Keep confidence, ranking, actionability, and UI/AI policy above the kernel.

## Non-Responsibilities

- Producing kernel facts.
- Interpreting TypeScript, Aurelia configuration, resources, DI, or templates.
- Hiding uncertainty behind empty result arrays.
- Treating projection shape as semantic authority.

## Design Pressure

Inquiry is where consumer-specific meaning belongs. A derivation can say a producer was partial or blocked; an
inquiry answer decides whether that means an autocomplete candidate is useful, a rename is safe, an MCP response
needs a continuation, or an AOT path is unsupported.

The first serious pressure will come from integrating HTML parsing, attribute classification, expression parsing, and
instruction lowering. Those flows need to serve batch-like compiler questions and live IDE questions from the same
semantic substrate. Cursor and range loci, recovery frontiers, candidate sets, explanation paths, and pagination should
be modeled here or in answer envelopes, not smuggled into kernel claims or compiler products.

This layer is also where false-positive policy belongs. Producers should preserve what they observed, what they could
derive, and which seams remained open. Inquiry answers decide how much to show, how to rank it, which continuation is
useful next, and whether a consumer can act on it.
