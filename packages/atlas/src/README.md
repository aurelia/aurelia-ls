# src

This folder contains the in-repo Atlas implementation.

## Responsibilities

- [inquiry](inquiry/README.md) defines the Atlas contract language and reusable navigation grammar.
- [framework](framework/README.md) keeps the Aurelia-specific discovery spine and future framework indexes.
- [session](session/README.md) hosts the inquiry API in a durable local daemon.
- [scripts](scripts/README.md) runs package-local verification and maintenance checks.

The dependency direction should stay boring: framework, session, and scripts may depend on inquiry contracts and runtime APIs, while inquiry contracts should not depend on daemon lifecycle, framework discovery, or script behavior.

## Growth Rule

Prefer adding broad contract surfaces before adding reader-like implementations. A new implementation should make its locus, basis, evidence, open-seam, continuation, lens, and substrate responsibilities visible in the contracts first.
