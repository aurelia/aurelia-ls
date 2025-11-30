// Synthesis public API - code generation targets
//
// IMPORTANT: Consumers should import from this barrel, not from deep paths.
// Each synthesis target (overlay, runtime) has its own sub-barrel.

// Overlay synthesis (TTC overlay for TypeScript)
export * from "./overlay/index.js";

// Future: Runtime synthesis (AOT/SSR artifacts)
// export * from "./runtime/index.js";
