# src

This folder contains the in-repo Atlas implementation.

## Responsibilities

- [inquiry](inquiry/README.md) defines the Atlas contract language and reusable navigation grammar.
- [source](source/README.md) owns the hot TypeScript source project and shared exact TypeScript substrates such as the
  [semantic surface](source/semantic-surface/README.md).
- [framework](framework/README.md) owns Aurelia-specific framework substrates and indexes.
- [session](session/README.md) hosts the inquiry API in a durable local daemon.
- [scripts](scripts/README.md) runs package-local verification and maintenance checks.

The dependency direction should stay boring: framework, session, and scripts may depend on inquiry contracts and runtime APIs, while inquiry contracts should not depend on daemon lifecycle, framework discovery, or script behavior.

## Growth Rule

Prefer adding broad contract surfaces before adding reader-like implementations. A new implementation should make its locus, basis, evidence, open-seam, continuation, lens, and substrate responsibilities visible in the contracts first.
