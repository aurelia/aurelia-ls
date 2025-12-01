// Synthesis public API - code generation targets
//
// IMPORTANT: Consumers should import from this barrel, not from deep paths.
// Each synthesis target (overlay, aot) has its own sub-barrel.

// Overlay synthesis (TTC overlay for TypeScript)
export * from "./overlay/index.js";

// AOT synthesis (Ahead-of-Time compilation artifacts)
export * from "./aot/index.js";

