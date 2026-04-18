/**
 * Capability discovery sibling protocol for the read/adjudicate kernel.
 *
 * Scope:
 * - describe which parts of the read kernel an authority supports
 * - describe selector, operation, world, and posture support
 * - give clients a typed alternative to learning support only by failure
 *
 * Explicitly out of scope:
 * - semantic query execution
 * - control-plane lifecycle
 * - write or materialization capabilities
 * - transport negotiation details
 *
 * Design intent:
 * - keep discovery sibling-shaped rather than collapsing it into the read result
 * - let clients learn support before issuing expensive or doomed reads
 * - keep capability claims scoped to the read kernel
 */

import {
  PROTOCOL_READ_KERNEL_SCHEMA_VERSION,
  type AspectId,
  type CompletenessState,
  type ContinuationKind,
  type ExtensibleString,
  type FreshnessState,
  type IdentityUniquenessLevel,
  type JsonObject,
  type OutcomeTag,
  type ReadOperation,
  type RegimeTag,
  type SelectorRuleRef,
  type SelectorScheme,
  type SubjectKind,
} from './protocol-read-kernel.js';

export const PROTOCOL_READ_CAPABILITIES_SCHEMA_VERSION = 'v1alpha2' as const;

/**
 * CapabilitySupportLevel distinguishes hard absence from supported but
 * conditional support.
 */
export const CAPABILITY_SUPPORT_LEVELS = [
  // The capability is part of the supported contract.
  'supported',
  // The capability exists, but only under stated conditions. (provisional)
  'conditional',
  // The capability is outside the supported contract.
  'unsupported',
] as const;

export type CapabilitySupportLevel =
  ExtensibleString<typeof CAPABILITY_SUPPORT_LEVELS[number]>;

/**
 * CapabilityCondition keeps support qualifiers explicit instead of hiding them
 * in prose.
 */
export interface CapabilityCondition {
  readonly summary: string; // Conditions should remain legible to humans and agents.
  readonly ref?: string; // Stable refs help conditions stay addressable. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for richer capability policy detail. (provisional)
}

/**
 * CapabilityQuery lets clients ask for the whole descriptor or a filtered view.
 */
export interface CapabilityQuery {
  readonly operation?: ReadOperation; // Useful when a client only needs one operation family.
  readonly subject?: SubjectKind; // Useful when support depends on subject kind.
  readonly selectorScheme?: SelectorScheme; // Useful when selector support is the main question.
  readonly worldKind?: string; // Useful when clients care about one semantic world. (provisional)
  readonly aspect?: AspectId; // Useful when aspect support is narrower than operation support. (provisional)
}

/**
 * SelectorCapability describes whether a selector shape is supported for a
 * given subject kind.
 */
export interface SelectorCapability {
  readonly subject: SubjectKind; // Selector support is often subject-sensitive.
  readonly scheme: SelectorScheme; // Selector scheme is a durable capability dimension.
  readonly level: CapabilitySupportLevel; // Support should be explicit, not inferred from examples.
  readonly portable?: boolean; // Useful when a selector shape survives across delivery surfaces. (provisional)
  readonly identitySchemes?: readonly string[]; // Useful when identity issuance is scheme-specific. (provisional)
  readonly identityUniqueness?: readonly IdentityUniquenessLevel[]; // Useful when identity guarantees vary by scope. (provisional)
  readonly anchorSchemes?: readonly string[]; // Useful when anchor relocation schemes are discoverable. (provisional)
  readonly rules?: readonly SelectorRuleRef[]; // Stable rule refs keep selector requirements addressable. (provisional)
  readonly conditions?: readonly CapabilityCondition[]; // Conditional support should be first-class. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for selector-specific discovery detail. (provisional)
}

/**
 * OperationCapability tells clients what burden an operation can honestly
 * discharge here.
 */
export interface OperationCapability {
  readonly operation: ReadOperation; // Operation identity is the primary capability slot.
  readonly level: CapabilitySupportLevel; // Support should be explicit.
  readonly supportedSubjects?: readonly SubjectKind[]; // Useful when the operation is not universal across subjects. (provisional)
  readonly supportedSelectorSchemes?: readonly SelectorScheme[]; // Useful when the operation depends on selector form. (provisional)
  readonly requiresSingleResolution?: boolean; // Helpful when clients must resolve before calling. (provisional)
  readonly producesResolution?: boolean; // Helpful when the operation is a canonical identity-closure step. (provisional)
  readonly dominantOutcomes?: readonly OutcomeTag[]; // Useful when clients want burden-shaped expectations. (provisional)
  readonly continuationKinds?: readonly ContinuationKind[]; // Useful when discoverability patterns are capability-shaped. (provisional)
  readonly conditions?: readonly CapabilityCondition[]; // Conditional support should stay explicit. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for operation-specific discovery detail. (provisional)
}

/**
 * AspectCapability keeps aspect vocabulary open while still letting authorities
 * advertise known supported aspects.
 */
export interface AspectCapability {
  readonly aspect: AspectId; // Aspect identity should remain explicit.
  readonly level: CapabilitySupportLevel; // Support should be explicit.
  readonly operations?: readonly ReadOperation[]; // Useful when an aspect is only meaningful for some operations. (provisional)
  readonly conditions?: readonly CapabilityCondition[]; // Conditional support should stay explicit. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for aspect-local discovery detail. (provisional)
}

/**
 * WorldCapability advertises supported semantic worlds without freezing the
 * world taxonomy here.
 */
export interface WorldCapability {
  readonly kind: string; // World identity should remain open-ended. (provisional)
  readonly level: CapabilitySupportLevel; // Support should be explicit.
  readonly requiresScope?: boolean; // Useful when a world only exists inside a specific authority scope. (provisional)
  readonly conditions?: readonly CapabilityCondition[]; // Conditional support should stay explicit. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for world-local discovery detail. (provisional)
}

/**
 * PostureCapability advertises which posture constraints are meaningful to this
 * authority.
 */
export interface PostureCapability {
  readonly freshnessStates?: readonly FreshnessState[]; // Useful when only some freshness burdens are meaningful.
  readonly completenessStates?: readonly CompletenessState[]; // Useful when completeness burdens are constrained. (provisional)
  readonly regimeTags?: readonly RegimeTag[]; // Useful when regime is part of the supported contract. (provisional)
  readonly costUnits?: readonly string[]; // Useful when max-cost units are discoverable. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for posture-local discovery detail. (provisional)
}

/**
 * ReadCapabilityDescriptor is the advertised support surface for one authority.
 */
export interface ReadCapabilityDescriptor {
  readonly readKernelVersion: typeof PROTOCOL_READ_KERNEL_SCHEMA_VERSION; // Discovery should identify the kernel version it describes.
  readonly authorityRef?: string; // Useful when descriptors are cached or routed. (provisional)
  readonly selectors: readonly SelectorCapability[]; // Selector support is part of the public discovery surface.
  readonly operations: readonly OperationCapability[]; // Operation support is part of the public discovery surface.
  readonly aspects?: readonly AspectCapability[]; // Useful when aspects are discoverable independently. (provisional)
  readonly worlds?: readonly WorldCapability[]; // Useful when world support is narrower than kernel shape. (provisional)
  readonly posture?: PostureCapability; // Useful when posture burdens are discoverable. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for future discovery detail. (provisional)
}

/**
 * ReadCapabilityDiscoveryRequest asks an authority to describe its supported
 * read-kernel surface.
 */
export interface ReadCapabilityDiscoveryRequest {
  readonly query?: CapabilityQuery; // Callers may request the whole descriptor or a filtered slice. (provisional)
  readonly includeConditions?: boolean; // Callers may opt into verbose conditional support details. (provisional)
  readonly includeAttributes?: boolean; // Callers may opt into extension metadata. (provisional)
}

/**
 * ReadCapabilityDiscoveryResult is the durable discovery envelope.
 */
export interface ReadCapabilityDiscoveryResult {
  readonly schemaVersion: typeof PROTOCOL_READ_CAPABILITIES_SCHEMA_VERSION; // Versioning should be explicit.
  readonly request?: ReadCapabilityDiscoveryRequest; // Echoing the request improves auditability. (provisional)
  readonly descriptor: ReadCapabilityDescriptor; // Discovery returns a capability descriptor rather than a semantic answer.
}
