/**
 * @aurelia-ls/build - DEPRECATED
 *
 * This package has been split into focused packages:
 * - @aurelia-ls/ssr - SSR rendering core
 * - @aurelia-ls/ssg - Static site generation
 * - @aurelia-ls/vite-plugin - Vite integration
 *
 * This re-export layer exists for backward compatibility.
 * Migrate to the new packages for future development.
 */

// Re-export everything from @aurelia-ls/ssr
export * from "@aurelia-ls/ssr";

// Re-export everything from @aurelia-ls/ssg
export * from "@aurelia-ls/ssg";
