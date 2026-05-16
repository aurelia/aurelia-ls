import type ts from 'typescript';
import type { OpenSeamKindKey } from '../kernel/vocabulary.js';
import type { ResourceDefinitionHeader } from './resource-definition.js';
import type { ResourceCarrierKind } from './resource-kind.js';
export {
  AttributePatternObservation,
  ResourceTargetObservation,
} from './resource-observation-primitives.js';

/** Explicit unresolved pressure from a resource carrier. */
export class ResourceRecognitionOpen {
  constructor(
    /** Kernel seam vocabulary key for the unresolved resource pressure. */
    readonly openKind: OpenSeamKindKey,
    /** Short explanation suitable for IDE/tooling projections. */
    readonly summary: string,
    /** Source node where the unresolved pressure appeared. */
    readonly node: ts.Node,
  ) {}
}

/** Resource carrier observed before definition materialization or scope admission. */
export class ResourceRecognitionObservation {
  constructor(
    /** Source carrier lane that produced this observation. */
    readonly carrierKind: ResourceCarrierKind,
    /** Full carrier node, used for the primary evidence span. */
    readonly sourceNode: ts.Node,
    /** Definition expression when the carrier has one separate from the call/decorator. */
    readonly definitionNode: ts.Node | null,
    /** Definition header, or null when the carrier stayed kind-open. */
    readonly definition: ResourceDefinitionHeader | null,
    /** Unresolved points that must stay visible to later consumers. */
    readonly openSeams: readonly ResourceRecognitionOpen[] = [],
  ) {}
}
