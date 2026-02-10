export {
  compareResourceDefinitionCandidates,
  sortResourceDefinitionCandidates,
  type ResourceDefinitionCandidate,
} from "./candidate-order.js";
export {
  canonicalSourceSortKey,
  createCanonicalSourceIdV1,
  serializeCanonicalSourceIdV1,
  type CanonicalSourceIdV1,
  type CanonicalSourceIdentityCandidate,
} from "./source-id.js";
export {
  mergeResourceDefinitionCandidates,
  type ResourceDefinitionMergeResult,
} from "./resource-merge.js";
export {
  mergePartialResourceCollections,
  mergeResolvedResourceCollections,
} from "./collections-merge.js";
