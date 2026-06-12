import {
  AppBuilderOntologyRowKind,
  appBuilderOntologyDomainForRowKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  AppBuilderOntologyDomain,
} from './status.js';
import {
  appBuilderOntologyRowDescriptor,
} from './row-descriptor.js';

/** AI-facing compact selector for an ontology target before exact row refs are needed. */
export interface AppBuilderOntologyTargetSelector {
  /** Fine-grained row family; the domain can be derived from this. */
  readonly kind: AppBuilderOntologyRowKind;
  /** Row id inside the selected row family. */
  readonly id: string;
  /** Optional caller-supplied domain used only as a consistency check. */
  readonly domain?: AppBuilderOntologyDomain | null;
}

/** Issue kind produced while normalizing compact target selectors to exact row refs. */
export enum AppBuilderOntologyTargetSelectionIssueKind {
  /** The selected kind/id pair or exact ref is not admitted by the app-builder ontology. */
  UnknownTarget = 'unknown-target',
  /** A compact selector supplied a domain that does not match the selected row kind. */
  TargetSelectorDomainMismatch = 'target-selector-domain-mismatch',
}

/** Stable value list for app-builder target-selection issue transport schemas. */
export const APP_BUILDER_ONTOLOGY_TARGET_SELECTION_ISSUE_KINDS = [
  AppBuilderOntologyTargetSelectionIssueKind.UnknownTarget,
  AppBuilderOntologyTargetSelectionIssueKind.TargetSelectorDomainMismatch,
] as const;

/** Typed issue produced by the shared exact-ref/compact-selector normalization layer. */
export interface AppBuilderOntologyTargetSelectionIssue {
  /** Stable issue category. */
  readonly issueKind: AppBuilderOntologyTargetSelectionIssueKind;
  /** Exact target ref involved in the issue when available or derivable. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** Compact selector involved in the issue when supplied. */
  readonly targetSelector?: AppBuilderOntologyTargetSelector;
  /** Domain derived from selector kind when a supplied selector domain disagrees. */
  readonly expectedDomain?: AppBuilderOntologyDomain;
  /** Compact explanation suitable for public answer surfaces. */
  readonly summary: string;
}

/** Normalized target-selection result for public app-builder read-model queries. */
export interface AppBuilderOntologyTargetSelection {
  /** Exact admitted target refs in caller order. */
  readonly targetRefs: readonly AppBuilderOntologyRowRef[];
  /** Issues found while resolving exact refs or compact selectors. */
  readonly issues: readonly AppBuilderOntologyTargetSelectionIssue[];
  /** Whether the caller supplied any target selection at all. */
  readonly selectionProvided: boolean;
}

/** Normalize exact refs plus compact kind/id selectors into admitted exact ontology row refs. */
export function appBuilderNormalizeOntologyTargetSelection(
  request: {
    readonly targetRefs?: readonly AppBuilderOntologyRowRef[] | null;
    readonly targetSelectors?: readonly AppBuilderOntologyTargetSelector[] | null;
  },
): AppBuilderOntologyTargetSelection {
  const targetRefs = request.targetRefs ?? [];
  const targetSelectors = request.targetSelectors ?? [];
  const normalizedTargetRefs: AppBuilderOntologyRowRef[] = [];
  const issues: AppBuilderOntologyTargetSelectionIssue[] = [];
  for (const targetRef of targetRefs) {
    if (appBuilderOntologyRowDescriptor(targetRef) == null) {
      issues.push({
        issueKind: AppBuilderOntologyTargetSelectionIssueKind.UnknownTarget,
        targetRef,
        summary: `App-builder target selection does not know ontology target '${targetRef.kind}:${targetRef.id}'.`,
      });
      continue;
    }
    normalizedTargetRefs.push(targetRef);
  }
  for (const targetSelector of targetSelectors) {
    const expectedDomain = appBuilderOntologyDomainForRowKind(targetSelector.kind);
    const targetRef = appBuilderOntologyRowRef(targetSelector.kind, targetSelector.id);
    if (targetSelector.domain != null && targetSelector.domain !== expectedDomain) {
      issues.push({
        issueKind: AppBuilderOntologyTargetSelectionIssueKind.TargetSelectorDomainMismatch,
        targetRef,
        targetSelector,
        expectedDomain,
        summary: `App-builder target selector '${targetSelector.kind}:${targetSelector.id}' belongs to domain '${expectedDomain}', not '${targetSelector.domain}'.`,
      });
    }
    if (appBuilderOntologyRowDescriptor(targetRef) == null) {
      issues.push({
        issueKind: AppBuilderOntologyTargetSelectionIssueKind.UnknownTarget,
        targetRef,
        targetSelector,
        summary: `App-builder target selector does not know ontology target '${targetSelector.kind}:${targetSelector.id}'.`,
      });
      continue;
    }
    normalizedTargetRefs.push(targetRef);
  }
  return {
    targetRefs: normalizedTargetRefs,
    issues,
    selectionProvided: targetRefs.length > 0 || targetSelectors.length > 0,
  };
}
