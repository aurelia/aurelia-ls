/**
 * Re-exports third-party merge utilities from @aurelia-ls/compiler.
 *
 * The canonical implementations now live in the compiler package
 * (packages/compiler/src/project-semantics/third-party/merge.ts).
 */
export {
  buildThirdPartyResources,
  hasThirdPartyResources,
  mergeResourceCollections,
  mergeScopeResources,
} from "@aurelia-ls/compiler/project-semantics/third-party/merge.js";
