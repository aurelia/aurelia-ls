# Boot Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Boot is the clean-room admission layer above the kernel. It creates workspace and project frames, admits source
files, and records why those inputs are present in the hot kernel store.

Boot does not interpret Aurelia semantics. It must not scan resources, configurations, registrations, templates,
or DI. Those belong to later materializers that consume admitted sources and emit their own evidence, derivations,
claims, products, and seams.

## Responsibilities

- Create a `KernelStore` or populate a supplied one.
- Admit workspace/project/source frames in deterministic order.
- Discover source files only as input admission.
- Preserve any host-supplied discovery limit through `SourceDiscoveryResult`.
- Emit source-file addresses, admission evidence, and direct provenance.

## Non-Responsibilities

- TypeScript module evaluation.
- Aurelia resource recognition.
- Configuration or DI world formation.
- Query answer ranking or consumer policy.
- Reconnecting to the older eager `Workspace` / `Project` constructors.

## Design Pressure

Boot is allowed to know host and filesystem facts. It is not allowed to turn those facts into app semantics. A
missing root, scan limit, host-supplied file list, or excluded directory is boot/admission pressure. Whether a
file declares a custom element, exports configuration, or registers a DI key is materializer pressure layered later.
