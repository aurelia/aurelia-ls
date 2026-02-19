// Language public API - semantic definitions

// Types - analyzed source types with provenance
export * from "./types.js";

// Sourced helpers - provenance-safe value unwrap/sanitize primitives
export * from "./sourced.js";

// Registry - built-in defaults and lookup
export * from "./registry.js";

// Resource graph - scope-based resource resolution
export * from "./resource-graph.js";

// Resource catalog helpers
export * from "./catalog.js";

// Per-resource confidence derivation from gap state
export * from "./confidence.js";

// Symbol id policy (shared across snapshot and workspace surfaces)
export * from "./symbol-id.js";

// Semantics snapshots (project-level seam)
export * from "./snapshot.js";
