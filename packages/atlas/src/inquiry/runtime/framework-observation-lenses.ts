import ts from "typescript";

import { lowerFirst } from "../../text-case.js";
import {
  FrameworkRelationshipMechanism,
  FrameworkRelationshipRelation,
} from "../../framework/relationships.js";
import {
  sourceRangeForSourceFileNode,
  sourceRangeKey,
  type SourceProject,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { RepoRootLocus, type SourceRange } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset, rowLimit } from "../paging.js";
import {
  FrameworkBindingEffectKind,
  type FrameworkBindingEffectRow,
  type FrameworkBindingSetupRow,
  type FrameworkObserverEntityRow,
} from "./framework-entities.js";
import {
  filtersFromInquiry,
  type FrameworkDiscoveryFilters,
} from "./framework-filters.js";
import {
  FrameworkObservationFlowSiteKind,
  FrameworkObservationSurfaceKind,
  readFrameworkObservationFlowEntityLinks,
  readFrameworkObservationFlowSites,
  readFrameworkObservationInternalRelationships,
  readFrameworkObservationSurfaceMethods,
  type FrameworkObservationFlowEntityLinkRow,
  type FrameworkObservationFlowSiteRow,
  type FrameworkObservationInternalRelationshipRow,
  type FrameworkObservationSurfaceMethodRow,
} from "./framework-observation-internals.js";
import {
  readFrameworkObserverEntities,
  sourceRangeForObserverEntity,
} from "./framework-observer-entities.js";
import { readFrameworkBindingEffects, readFrameworkBindingSetups } from "./framework-rendering-graph.js";
import {
  readFrameworkRenderingRelationships,
  type FrameworkRenderingRelationshipRow,
} from "./framework-rendering-relationships.js";
import {
  checkerBasis,
  countBy,
  frameworkPagedAnswer,
  sourceIndexBasis,
} from "./framework-support.js";
import { evidenceForObserverEntity } from "./framework-evidence.js";
import {
  FrameworkRowContinuationBuilder,
  FrameworkSemanticRouteBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";
import { queryMatches, stringFilter } from "./lens-filter-utils.js";

/** Value returned by framework.observation. */
export interface FrameworkObservationValue {
  readonly observerCount?: number;
  readonly bindingLookupCount?: number;
  readonly bindingSetupCount?: number;
  readonly relationshipCount?: number;
  readonly surfaceMethodCount?: number;
  readonly flowSiteCount?: number;
  readonly dependencyCircuitCount?: number;
  readonly collectionMethodCount?: number;
  readonly observerLocatorDecisionCount?: number;
  readonly flowEntityLinkCount?: number;
  readonly observerKinds?: Readonly<Record<string, number>>;
  readonly observerCapabilities?: Readonly<Record<string, number>>;
  readonly bindingLookupNames?: Readonly<Record<string, number>>;
  readonly bindingSetupKinds?: Readonly<Record<string, number>>;
  readonly surfaceKinds?: Readonly<Record<string, number>>;
  readonly flowSiteKinds?: Readonly<Record<string, number>>;
  readonly dependencyCircuitRoles?: Readonly<Record<string, number>>;
  readonly collectionMethodSurfaceKinds?: Readonly<Record<string, number>>;
  readonly collectionMethodReceiverKinds?: Readonly<Record<string, number>>;
  readonly collectionMethodActionKinds?: Readonly<Record<string, number>>;
  readonly observerLocatorDecisionKinds?: Readonly<Record<string, number>>;
  readonly observerLocatorRuntimeBranches?: Readonly<Record<string, number>>;
  readonly flowEntityMatchBases?: Readonly<Record<string, number>>;
  readonly relationshipRelations?: Readonly<Record<string, number>>;
  readonly relationshipMechanisms?: Readonly<Record<string, number>>;
  readonly relationshipPhases?: Readonly<Record<string, number>>;
  readonly observers?: readonly FrameworkObserverEntityRow[];
  readonly bindingLookups?: readonly FrameworkBindingEffectRow[];
  readonly bindingSetups?: readonly FrameworkBindingSetupRow[];
  readonly surfaceMethods?: readonly FrameworkObservationSurfaceMethodRow[];
  readonly flowSites?: readonly FrameworkObservationFlowSiteRow[];
  readonly dependencyCircuits?: readonly FrameworkObservationDependencyCircuitRow[];
  readonly collectionMethods?: readonly FrameworkObservationCollectionMethodRow[];
  readonly observerLocatorDecisions?: readonly FrameworkObserverLocatorDecisionRow[];
  readonly flowEntityLinks?: readonly FrameworkObservationFlowEntityLinkRow[];
  readonly relationships?: readonly FrameworkObservationRelationshipRow[];
}

export interface FrameworkObservationFilters extends FrameworkDiscoveryFilters {
  readonly surfaceKind?: string;
  readonly siteKind?: string;
  readonly methodName?: string;
  readonly targetName?: string;
  readonly circuitRole?: string;
  readonly receiverKind?: string;
  readonly actionKind?: string;
  readonly decisionKind?: string;
  readonly matchBasis?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
}

/** Runtime branch in Aurelia's ObserverLocator decision tree. */
export const enum FrameworkObserverLocatorDecisionKind {
  /** `getObserver` saw a primitive target before ordinary property observation. */
  PrimitiveTarget = "primitive-target",
  /** `getObserver` received a function key and created a ComputedObserver directly. */
  FunctionKeyComputedObserver = "function-key-computed-observer",
  /** Node targets delegated observer lookup to INodeObserverLocator. */
  NodeObserverDelegation = "node-observer-delegation",
  /** Node targets delegated accessor lookup to INodeObserverLocator. */
  NodeAccessorDelegation = "node-accessor-delegation",
  /** Ordinary getAccessor fallback returned the shared PropertyAccessor. */
  PropertyAccessorFallback = "property-accessor-fallback",
  /** Collection target reads selected array length or map/set size observers. */
  CollectionLengthOrSizeObserver = "collection-length-or-size-observer",
  /** Array index reads selected the array index observer. */
  ArrayIndexObserver = "array-index-observer",
  /** Object-observation adapters were allowed to claim an accessor descriptor. */
  ObjectAdapterObserver = "object-adapter-observer",
  /** A getter supplied its own ObservableGetter.getObserver hook. */
  GetterOwnedObserver = "getter-owned-observer",
  /** Configurable accessor descriptor fallback called ObserverLocator.getComputedObserver. */
  AccessorDescriptorComputedObserver = "accessor-descriptor-computed-observer",
  /** Computed metadata without explicit deps selected ComputedObserver. */
  ComputedObserverAutoDependencies = "computed-observer-auto-dependencies",
  /** Computed metadata with explicit deps selected ControlledComputedObserver. */
  ControlledComputedObserverExplicitDependencies = "controlled-computed-observer-explicit-dependencies",
  /** Accessor descriptors that cannot use a computed observer fall back to dirty checking. */
  AccessorDescriptorDirtyCheck = "accessor-descriptor-dirty-check",
  /** Ordinary object data properties and missing keys select SetterObserver. */
  OrdinaryDataSetterObserver = "ordinary-data-setter-observer",
  /** `getExpressionObserver` creates the expression observer path for string dependency expressions. */
  ExpressionObserver = "expression-observer",
  /** Default runtime node locator returns the shared PropertyAccessor. */
  DefaultNodePropertyAccessor = "default-node-property-accessor",
  /** NodeObserverLocator constructor registers node/property observer configs. */
  NodeObserverConfigRegistration = "node-observer-config-registration",
  /** NodeObserverLocator constructor registers accessor overrides. */
  NodeAccessorOverrideRegistration = "node-accessor-override-registration",
  /** NodeObserverLocator.getAccessor delegates an overridden accessor to getObserver. */
  NodeAccessorOverrideDelegation = "node-accessor-override-delegation",
  /** NodeObserverLocator uses a configured ValueAttributeObserver/CheckedObserver/SelectValueObserver. */
  NodeConfiguredObserver = "node-configured-observer",
  /** NodeObserverLocator selects ClassAttributeAccessor or StyleAttributeAccessor. */
  NodeClassStyleAccessor = "node-class-style-accessor",
  /** NodeObserverLocator selects AttributeNSAccessor from the namespace attribute table. */
  NodeNamespaceAttributeAccessor = "node-namespace-attribute-accessor",
  /** NodeObserverLocator selects the attribute accessor for attr/data/aria/SVG attribute lanes. */
  NodeAttributeAccessor = "node-attribute-accessor",
  /** NodeObserverLocator.getAccessor falls back to elementPropertyAccessor. */
  NodeElementPropertyAccessor = "node-element-property-accessor",
  /** NodeObserverLocator.getObserver dirty-checks known native node properties when allowed. */
  NodeNativePropertyDirtyCheck = "node-native-property-dirty-check",
  /** NodeObserverLocator.getObserver creates a SetterObserver for missing native node properties. */
  NodeMissingPropertySetterObserver = "node-missing-property-setter-observer",
}

/** Compact decision-table row over the source-backed ObserverLocator flow sites. */
export interface FrameworkObserverLocatorDecisionRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly decisionKind: FrameworkObserverLocatorDecisionKind;
  readonly trigger: string;
  readonly runtimeBranch: string;
  readonly runtimeProduct: string;
  readonly ownerName: string;
  readonly methodName: string;
  readonly siteKind: FrameworkObservationFlowSiteKind;
  readonly targetName: string;
  readonly expressionText: string;
  readonly sourceFlowSiteId: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export type FrameworkObservationRelationshipRow =
  | FrameworkRenderingRelationshipRow
  | FrameworkObservationInternalRelationshipRow;

/** Collection carrier that owns a framework-observed method. */
export const enum FrameworkObservationCollectionReceiverKind {
  Array = "array",
  Map = "map",
  Set = "set",
  MapOrSet = "map-or-set",
  Collection = "collection",
}

/** Runtime action modeled for a collection method in the observation circuit. */
export const enum FrameworkObservationCollectionMethodActionKind {
  /** Template `astEvaluate` marks this array method as collection-observed. */
  TemplateArrayAutoObserve = "template-array-auto-observe",
  /** `ProxyObservable` wrapper calls `observeCollection(...)` for this method. */
  ProxyWrapperCollects = "proxy-wrapper-collects",
  /** `ProxyObservable` returns a wrapper but the wrapper does not collect the collection. */
  ProxyWrapperNoCollectionCollect = "proxy-wrapper-no-collection-collect",
}

/** Compact method inventory for template and proxy collection observation. */
export interface FrameworkObservationCollectionMethodRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly surfaceKind: FrameworkObservationSurfaceKind;
  readonly receiverKind: FrameworkObservationCollectionReceiverKind;
  readonly methodName: string;
  readonly sourceMethodName: string;
  readonly actionKind: FrameworkObservationCollectionMethodActionKind;
  readonly callbackConnectable: boolean;
  readonly wrapsCallbackValue: boolean;
  readonly wrapsResult: boolean;
  readonly source: SourceRange;
  readonly summary: string;
}

interface FrameworkObservationRollupParts {
  readonly observers?: readonly FrameworkObserverEntityRow[];
  readonly bindingLookups?: readonly FrameworkBindingEffectRow[];
  readonly bindingSetups?: readonly FrameworkBindingSetupRow[];
  readonly surfaceMethods?: readonly FrameworkObservationSurfaceMethodRow[];
  readonly flowSites?: readonly FrameworkObservationFlowSiteRow[];
  readonly dependencyCircuits?: readonly FrameworkObservationDependencyCircuitRow[];
  readonly collectionMethods?: readonly FrameworkObservationCollectionMethodRow[];
  readonly observerLocatorDecisions?: readonly FrameworkObserverLocatorDecisionRow[];
  readonly flowEntityLinks?: readonly FrameworkObservationFlowEntityLinkRow[];
  readonly relationships?: readonly FrameworkObservationRelationshipRow[];
}

/** Product-facing role of an observation flow site inside the dependency circuit. */
export const enum FrameworkObservationDependencyCircuitRole {
  /** Template expression property/key reads entering IConnectable through astEvaluate. */
  TemplateExpressionRead = "template-expression-read",
  /** Template expression collection reads entering IConnectable through astEvaluate. */
  TemplateCollectionRead = "template-collection-read",
  /** Arrow callback body evaluation that reuses the caller's active connectable. */
  TemplateCallbackEvaluation = "template-callback-evaluation",
  /** Explicit connectable activation boundaries around dependency collection. */
  ConnectableBoundary = "connectable-boundary",
  /** @watch/@computed/trackable expression dependency handoff. */
  TrackableExpressionDependency = "trackable-expression-dependency",
  /** `astBind` wrapper handoffs and bind-time argument evaluation before later source reads. */
  BindingExpressionBindTime = "binding-expression-bind-time",
  /** Proxy wrapping, creation, eligibility, and raw/proxy identity cache operations. */
  ProxyIdentity = "proxy-identity",
  /** Raw/proxy exit operations that avoid handing a proxy to code that should see the raw value. */
  ProxyEscape = "proxy-escape",
  /** Object property trap dependency collection through the active connectable. */
  ProxyPropertyDependency = "proxy-property-dependency",
  /** Array/Map/Set trap dependency collection through the active connectable. */
  ProxyCollectionDependency = "proxy-collection-dependency",
  /** Trackable method dependency capture and callback invocation inside ProxyObservable. */
  ProxyTrackableDependency = "proxy-trackable-dependency",
  /** Runtime ComputedObserver and ControlledComputedObserver dependency collection or explicit dependency observer lookup. */
  ComputedObserverDependency = "computed-observer-dependency",
  /** Watcher/effect dependency boundaries after expressions have been admitted. */
  WatcherEffectDependency = "watcher-effect-dependency",
  /** Observer and accessor location that feeds the lower-level binding observation circuit. */
  ObserverLocation = "observer-location",
  /** Observation setup, scheduling, parsing, or notification sites adjacent to dependency capture. */
  ObservationAdjacency = "observation-adjacency",
}

/** Compact row that groups low-level observation flow sites by their dependency-circuit role. */
export interface FrameworkObservationDependencyCircuitRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly circuitRole: FrameworkObservationDependencyCircuitRole;
  readonly surfaceKind: FrameworkObservationSurfaceKind;
  readonly siteKind: FrameworkObservationFlowSiteKind;
  readonly ownerName: string;
  readonly methodName: string;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly targetName: string;
  readonly expressionText: string;
  readonly sourceFlowSiteId: string;
  readonly source: SourceRange;
  readonly summary: string;
}

const OBSERVATION_ENTITY_ROW_FAMILY =
  new PagedRowFamily<FrameworkObserverEntityRow>({
    id: "framework.observation:entities",
    rowLabel: "framework observer entity row(s)",
    evidenceForRow: evidenceForObserverEntity,
    continuationsForPage: entityContinuations,
  });

const OBSERVATION_BINDING_LOOKUP_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingEffectRow>({
    id: "framework.observation:binding-lookups",
    rowLabel: "framework binding observer lookup row(s)",
    evidenceForRow: evidenceForBindingLookup,
    continuationsForPage: bindingLookupContinuations,
  });

const OBSERVATION_BINDING_SETUP_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingSetupRow>({
    id: "framework.observation:binding-setups",
    rowLabel: "framework binding observation setup row(s)",
    evidenceForRow: evidenceForObservationBindingSetup,
    continuationsForPage: observationBindingSetupContinuations,
  });

const OBSERVATION_SURFACE_METHOD_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationSurfaceMethodRow>({
    id: "framework.observation:surface-methods",
    rowLabel: "framework observation surface method row(s)",
    evidenceForRow: evidenceForObservationTypeFactRow,
    continuationsForPage: surfaceMethodContinuations,
  });

const OBSERVATION_FLOW_SITE_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationFlowSiteRow>({
    id: "framework.observation:flow-sites",
    rowLabel: "framework observation flow site row(s)",
    evidenceForRow: evidenceForObservationTypeFactRow,
    continuationsForPage: flowSiteContinuations,
  });

const OBSERVATION_DEPENDENCY_CIRCUIT_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationDependencyCircuitRow>({
    id: "framework.observation:dependency-circuit",
    rowLabel: "framework observation dependency circuit row(s)",
    evidenceForRow: evidenceForObservationTypeFactRow,
    continuationsForPage: dependencyCircuitContinuations,
  });

const OBSERVATION_COLLECTION_METHOD_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationCollectionMethodRow>({
    id: "framework.observation:collection-methods",
    rowLabel: "framework observation collection method row(s)",
    evidenceForRow: evidenceForObservationTypeFactRow,
    continuationsForPage: collectionMethodContinuations,
  });

const OBSERVER_LOCATOR_DECISION_ROW_FAMILY =
  new PagedRowFamily<FrameworkObserverLocatorDecisionRow>({
    id: "framework.observation:observer-locator-decisions",
    rowLabel: "framework ObserverLocator decision row(s)",
    evidenceForRow: evidenceForObservationTypeFactRow,
    continuationsForPage: observerLocatorDecisionContinuations,
  });

const OBSERVATION_FLOW_ENTITY_LINK_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationFlowEntityLinkRow>({
    id: "framework.observation:flow-entity-links",
    rowLabel: "framework observation flow-to-entity link row(s)",
    evidenceForRow: evidenceForFlowEntityLink,
    continuationsForPage: flowEntityLinkContinuations,
  });

const OBSERVATION_RELATIONSHIP_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationRelationshipRow>({
    id: "framework.observation:relationships",
    rowLabel: "framework observation relationship row(s)",
    evidenceForRow: evidenceForObservationTypeFactRow,
    continuationsForPage: observationRelationshipContinuations,
  });

/** Answer framework.observation inquiries from observer entities and binding observer rows. */
export function answerFrameworkObservation(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkObservationValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = observationFiltersFromInquiry(inquiry);
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);

  switch (projection) {
    case "entities": {
      const observers = readFrameworkObserverEntities(sourceProject, filters);
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_ENTITY_ROW_FAMILY,
        observationBaseValue({ observers }),
        observers,
        offset,
        limit,
        "observers",
      );
    }
    case "binding-lookups": {
      const bindingLookups = readFrameworkBindingEffects(sourceProject, {
        ...filters,
        effectKind: FrameworkBindingEffectKind.ObserverLookup,
      });
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_BINDING_LOOKUP_ROW_FAMILY,
        observationBaseValue({ bindingLookups }),
        bindingLookups,
        offset,
        limit,
        "bindingLookups",
      );
    }
    case "binding-setups": {
      const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_BINDING_SETUP_ROW_FAMILY,
        observationBaseValue({ bindingSetups }),
        bindingSetups,
        offset,
        limit,
        "bindingSetups",
      );
    }
    case "surface-methods": {
      const surfaceMethods = readFrameworkObservationSurfaceMethods(
        sourceProject,
        filters,
      );
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_SURFACE_METHOD_ROW_FAMILY,
        observationBaseValue({ surfaceMethods }),
        surfaceMethods,
        offset,
        limit,
        "surfaceMethods",
      );
    }
    case "flow-sites": {
      const flowSites = readFrameworkObservationFlowSites(
        sourceProject,
        filters,
      );
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_FLOW_SITE_ROW_FAMILY,
        observationBaseValue({ flowSites }),
        flowSites,
        offset,
        limit,
        "flowSites",
      );
    }
    case "dependency-circuit": {
      const dependencyCircuits = readFrameworkObservationDependencyCircuits(
        sourceProject,
        filters,
      );
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_DEPENDENCY_CIRCUIT_ROW_FAMILY,
        observationBaseValue({ dependencyCircuits }),
        dependencyCircuits,
        offset,
        limit,
        "dependencyCircuits",
      );
    }
    case "collection-methods": {
      const collectionMethods = readFrameworkObservationCollectionMethods(
        sourceProject,
        filters,
      );
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_COLLECTION_METHOD_ROW_FAMILY,
        observationBaseValue({ collectionMethods }),
        collectionMethods,
        offset,
        limit,
        "collectionMethods",
      );
    }
    case "observer-locator-decisions": {
      const observerLocatorDecisions = readFrameworkObserverLocatorDecisions(
        sourceProject,
        filters,
      );
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVER_LOCATOR_DECISION_ROW_FAMILY,
        observationBaseValue({ observerLocatorDecisions }),
        observerLocatorDecisions,
        offset,
        limit,
        "observerLocatorDecisions",
      );
    }
    case "flow-entity-links": {
      const flowEntityLinks = readFrameworkObservationFlowEntityLinks(
        sourceProject,
        filters,
      );
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_FLOW_ENTITY_LINK_ROW_FAMILY,
        observationBaseValue({ flowEntityLinks }),
        flowEntityLinks,
        offset,
        limit,
        "flowEntityLinks",
      );
    }
    case "relationships": {
      const relationships = readFrameworkObservationRelationships(
        sourceProject,
        filters,
      );
      return frameworkPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_RELATIONSHIP_ROW_FAMILY,
        observationBaseValue({ relationships }),
        relationships,
        offset,
        limit,
        "relationships",
      );
    }
    case "summary":
    default: {
      const observers = readFrameworkObserverEntities(sourceProject, filters);
      const bindingLookups = readFrameworkBindingEffects(sourceProject, {
        ...filters,
        effectKind: FrameworkBindingEffectKind.ObserverLookup,
      });
      const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
      const surfaceMethods = readFrameworkObservationSurfaceMethods(
        sourceProject,
        filters,
      );
      const flowSites = readFrameworkObservationFlowSites(
        sourceProject,
        filters,
      );
      const dependencyCircuits = dependencyCircuitsForFlowSites(
        flowSites,
        filters,
      );
      const collectionMethods = readFrameworkObservationCollectionMethods(
        sourceProject,
        filters,
      );
      const observerLocatorDecisions = observerLocatorDecisionsForFlowSites(
        flowSites,
        filters,
      );
      const flowEntityLinks = readFrameworkObservationFlowEntityLinks(
        sourceProject,
        filters,
      );
      const relationships = readFrameworkObservationRelationships(
        sourceProject,
        filters,
      );
      const baseValue = observationBaseValue({
        observers,
        bindingLookups,
        bindingSetups,
        surfaceMethods,
        flowSites,
        dependencyCircuits,
        collectionMethods,
        observerLocatorDecisions,
        flowEntityLinks,
        relationships,
      });
      return createAnswer(
        inquiry,
        OutcomeKind.Hit,
        `Framework observation index has ${observers.length} observer entity row(s), ${bindingLookups.length} binding lookup row(s), ${bindingSetups.length} binding setup row(s), ${surfaceMethods.length} observation surface method row(s), ${flowSites.length} flow site row(s), ${dependencyCircuits.length} dependency-circuit row(s), ${collectionMethods.length} collection method row(s), ${observerLocatorDecisions.length} ObserverLocator decision row(s), ${flowEntityLinks.length} flow-to-entity link row(s), and ${relationships.length} relationship row(s).`,
        {
          value: baseValue,
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: [
            ...observers.slice(0, 2).map(evidenceForObserverEntity),
            ...bindingLookups.slice(0, 2).map(evidenceForBindingLookup),
            ...flowSites.slice(0, 2).map(evidenceForObservationTypeFactRow),
            ...flowEntityLinks.slice(0, 2).map(evidenceForFlowEntityLink),
            ...relationships.slice(0, 2).map(evidenceForObservationTypeFactRow),
          ],
          continuations: observationSummaryContinuations(inquiry),
        },
      );
    }
  }
}

function observationBaseValue(
  parts: FrameworkObservationRollupParts,
): FrameworkObservationValue {
  const {
    observers,
    bindingLookups,
    bindingSetups,
    surfaceMethods,
    flowSites,
    dependencyCircuits,
    collectionMethods,
    observerLocatorDecisions,
    flowEntityLinks,
    relationships,
  } = parts;
  return {
    observerCount: observers?.length,
    observerKinds: observers === undefined
      ? undefined
      : countBy(
          observers.flatMap((row) => row.observerKinds),
          (value) => value,
        ),
    observerCapabilities: observers === undefined
      ? undefined
      : countBy(
          observers.flatMap((row) => row.observerCapabilities),
          (value) => value,
        ),
    bindingLookupCount: bindingLookups?.length,
    bindingLookupNames: bindingLookups === undefined
      ? undefined
      : countBy(bindingLookups, (row) => row.effectName),
    bindingSetupCount: bindingSetups?.length,
    bindingSetupKinds: bindingSetups === undefined
      ? undefined
      : countBy(bindingSetups, (row) => row.setupKind),
    surfaceMethodCount: surfaceMethods?.length,
    surfaceKinds: surfaceMethods === undefined
      ? undefined
      : countBy(surfaceMethods, (row) => row.surfaceKind),
    flowSiteCount: flowSites?.length,
    flowSiteKinds: flowSites === undefined
      ? undefined
      : countBy(flowSites, (row) => row.siteKind),
    dependencyCircuitCount: dependencyCircuits?.length,
    dependencyCircuitRoles: dependencyCircuits === undefined
      ? undefined
      : countBy(dependencyCircuits, (row) => row.circuitRole),
    collectionMethodCount: collectionMethods?.length,
    collectionMethodSurfaceKinds: collectionMethods === undefined
      ? undefined
      : countBy(collectionMethods, (row) => row.surfaceKind),
    collectionMethodReceiverKinds: collectionMethods === undefined
      ? undefined
      : countBy(collectionMethods, (row) => row.receiverKind),
    collectionMethodActionKinds: collectionMethods === undefined
      ? undefined
      : countBy(collectionMethods, (row) => row.actionKind),
    observerLocatorDecisionCount: observerLocatorDecisions?.length,
    observerLocatorDecisionKinds: observerLocatorDecisions === undefined
      ? undefined
      : countBy(observerLocatorDecisions, (row) => row.decisionKind),
    observerLocatorRuntimeBranches: observerLocatorDecisions === undefined
      ? undefined
      : countBy(observerLocatorDecisions, (row) => row.runtimeBranch),
    flowEntityLinkCount: flowEntityLinks?.length,
    flowEntityMatchBases: flowEntityLinks === undefined
      ? undefined
      : countBy(flowEntityLinks, (row) => row.matchBasis),
    relationshipCount: relationships?.length,
    relationshipRelations: relationships === undefined
      ? undefined
      : countBy(relationships, (row) => row.relation),
    relationshipMechanisms: relationships === undefined
      ? undefined
      : countBy(relationships, (row) => row.mechanism),
    relationshipPhases: relationships === undefined
      ? undefined
      : countBy(relationships, (row) => row.phase),
    dependencyCircuits,
    collectionMethods,
    observerLocatorDecisions,
  };
}

export function readFrameworkObservationDependencyCircuits(
  sourceProject: SourceProject,
  filters: FrameworkObservationFilters,
): readonly FrameworkObservationDependencyCircuitRow[] {
  return dependencyCircuitsForFlowSites(
    readFrameworkObservationFlowSites(sourceProject, {
      ...filters,
      query: undefined,
    }),
    filters,
  );
}

export function readFrameworkObservationCollectionMethods(
  sourceProject: SourceProject,
  filters: FrameworkObservationFilters,
): readonly FrameworkObservationCollectionMethodRow[] {
  return [
    ...readAstEvaluatorCollectionMethods(sourceProject, filters),
    ...readProxyObservableCollectionMethods(sourceProject, filters),
  ]
    .filter((row) => collectionMethodMatches(row, filters))
    .sort(compareCollectionMethods);
}

export function readFrameworkObserverLocatorDecisions(
  sourceProject: SourceProject,
  filters: FrameworkObservationFilters,
): readonly FrameworkObserverLocatorDecisionRow[] {
  if (
    filters.surfaceKind !== undefined &&
    filters.surfaceKind !== FrameworkObservationSurfaceKind.ObserverLocator &&
    filters.surfaceKind !== FrameworkObservationSurfaceKind.NodeObserverLocator
  ) {
    return [];
  }
  return observerLocatorDecisionsForFlowSites(
    readFrameworkObservationFlowSites(sourceProject, {
      ...filters,
      query: undefined,
    }),
    filters,
  );
}

const AST_EVALUATOR_FILE_PATH = "aurelia/packages/runtime/src/ast.eval.ts";
const PROXY_OBSERVATION_FILE_PATH = "aurelia/packages/runtime/src/proxy-observation.ts";

const TEMPLATE_ARRAY_CALLBACK_METHODS: ReadonlySet<string> = new Set([
  "map",
  "filter",
  "find",
  "findIndex",
  "flatMap",
  "reduce",
  "reduceRight",
  "every",
  "some",
  "sort",
]);

function readAstEvaluatorCollectionMethods(
  sourceProject: SourceProject,
  filters: FrameworkObservationFilters,
): readonly FrameworkObservationCollectionMethodRow[] {
  if (
    filters.surfaceKind !== undefined &&
    filters.surfaceKind !== FrameworkObservationSurfaceKind.AstEvaluator
  ) {
    return [];
  }
  const sourceFile = sourceProject.readSourceFile(AST_EVALUATOR_FILE_PATH);
  if (sourceFile === null) {
    return [];
  }
  const declaration = findVariableDeclaration(
    sourceFile,
    "autoObserveArrayMethods",
  );
  if (declaration === null || declaration.initializer === undefined) {
    return [];
  }
  const names = stringListFromSplitCall(declaration.initializer);
  const source = sourceRangeForSourceFileNode(
    AST_EVALUATOR_FILE_PATH,
    sourceFile,
    declaration,
  );
  return names.map((methodName) => ({
    id: `runtime:ast-evaluator:autoObserveArrayMethods:${methodName}`,
    packageId: "runtime",
    packageName: "@aurelia/runtime",
    surfaceKind: FrameworkObservationSurfaceKind.AstEvaluator,
    receiverKind: FrameworkObservationCollectionReceiverKind.Array,
    methodName,
    sourceMethodName: "autoObserveArrayMethods",
    actionKind:
      FrameworkObservationCollectionMethodActionKind.TemplateArrayAutoObserve,
    callbackConnectable: TEMPLATE_ARRAY_CALLBACK_METHODS.has(methodName),
    wrapsCallbackValue: false,
    wrapsResult: false,
    source,
    summary:
      `astEvaluate auto-observes array method '${methodName}' through IConnectable.observeCollection before evaluating the call.`,
  }));
}

function readProxyObservableCollectionMethods(
  sourceProject: SourceProject,
  filters: FrameworkObservationFilters,
): readonly FrameworkObservationCollectionMethodRow[] {
  if (
    filters.surfaceKind !== undefined &&
    filters.surfaceKind !== FrameworkObservationSurfaceKind.ProxyObservable
  ) {
    return [];
  }
  const sourceFile = sourceProject.readSourceFile(PROXY_OBSERVATION_FILE_PATH);
  if (sourceFile === null) {
    return [];
  }
  const functionDeclarations = namedFunctionDeclarations(sourceFile);
  const surfaceMethods = readFrameworkObservationSurfaceMethods(
    sourceProject,
    { packageId: filters.packageId, surfaceKind: FrameworkObservationSurfaceKind.ProxyObservable },
  );
  return surfaceMethods.flatMap((method) => {
    const descriptor = proxyCollectionMethodDescriptor(method.methodName);
    if (descriptor === null) {
      return [];
    }
    const declaration = functionDeclarations.get(method.methodName);
    if (declaration === undefined) {
      return [];
    }
    const callbackCalls = callbackInvocationCalls(declaration, "cb");
    const collectsCollection = nodeContainsCallToIdentifier(
      declaration.body,
      "observeCollection",
    );
    const callbackConnectable =
      method.parameterNames.includes("cb") || callbackCalls.length > 0;
    const wrapsCallbackValue = callbackCalls.some((call) =>
      call.arguments.some((argument) =>
        nodeContainsCallToIdentifier(argument, "wrap")
      )
    );
    const wrapsResult = returnExpressionCallsAnyIdentifier(
      declaration,
      new Set(["wrap", "getProxy"]),
    );
    const actionKind = collectsCollection
      ? FrameworkObservationCollectionMethodActionKind.ProxyWrapperCollects
      : FrameworkObservationCollectionMethodActionKind.ProxyWrapperNoCollectionCollect;
    const source = sourceRangeForSourceFileNode(
      PROXY_OBSERVATION_FILE_PATH,
      sourceFile,
      declaration,
    );
    return [{
      id: `runtime:proxy-observable:${descriptor.receiverKind}:${descriptor.methodName}:${method.methodName}`,
      packageId: method.packageId,
      packageName: method.packageName,
      surfaceKind: FrameworkObservationSurfaceKind.ProxyObservable,
      receiverKind: descriptor.receiverKind,
      methodName: descriptor.methodName,
      sourceMethodName: method.methodName,
      actionKind,
      callbackConnectable,
      wrapsCallbackValue,
      wrapsResult,
      source,
      summary:
        `ProxyObservable exposes ${descriptor.receiverKind}.${descriptor.methodName} through ${method.methodName}; ${collectsCollection ? "the wrapper collects the collection" : "the wrapper does not collect the collection"}${callbackConnectable ? " and invokes the callback inside the active connectable turn" : ""}.`,
    }];
  });
}

interface ProxyCollectionMethodDescriptor {
  readonly receiverKind: FrameworkObservationCollectionReceiverKind;
  readonly methodName: string;
}

function proxyCollectionMethodDescriptor(
  sourceMethodName: string,
): ProxyCollectionMethodDescriptor | null {
  if (sourceMethodName.startsWith("wrappedArray")) {
    return {
      receiverKind: FrameworkObservationCollectionReceiverKind.Array,
      methodName: lowerFirst(sourceMethodName.slice("wrappedArray".length)),
    };
  }
  switch (sourceMethodName) {
    case "wrappedReduce":
      return {
        receiverKind: FrameworkObservationCollectionReceiverKind.Array,
        methodName: "reduce",
      };
    case "wrappedReduceRight":
      return {
        receiverKind: FrameworkObservationCollectionReceiverKind.Array,
        methodName: "reduceRight",
      };
    case "wrappedForEach":
    case "wrappedHas":
    case "wrappedClear":
    case "wrappedDelete":
      return {
        receiverKind: FrameworkObservationCollectionReceiverKind.MapOrSet,
        methodName: lowerFirst(sourceMethodName.slice("wrapped".length)),
      };
    case "wrappedGet":
    case "wrappedSet":
      return {
        receiverKind: FrameworkObservationCollectionReceiverKind.Map,
        methodName: lowerFirst(sourceMethodName.slice("wrapped".length)),
      };
    case "wrappedAdd":
      return {
        receiverKind: FrameworkObservationCollectionReceiverKind.Set,
        methodName: "add",
      };
    case "wrappedKeys":
    case "wrappedValues":
    case "wrappedEntries":
      return {
        receiverKind: FrameworkObservationCollectionReceiverKind.Collection,
        methodName: lowerFirst(sourceMethodName.slice("wrapped".length)),
      };
    default:
      return null;
  }
}

function findVariableDeclaration(
  sourceFile: ts.SourceFile,
  variableName: string,
): ts.VariableDeclaration | null {
  let found: ts.VariableDeclaration | null = null;
  const visit = (node: ts.Node): void => {
    if (found !== null) {
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName
    ) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return found;
}

function namedFunctionDeclarations(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.FunctionDeclaration> {
  const declarations = new Map<string, ts.FunctionDeclaration>();
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      declarations.set(node.name.text, node);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return declarations;
}

function callbackInvocationCalls(
  declaration: ts.FunctionDeclaration,
  callbackName: string,
): readonly ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isCallbackInvocation(node, callbackName)) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  if (declaration.body !== undefined) {
    ts.forEachChild(declaration.body, visit);
  }
  return calls;
}

function isCallbackInvocation(
  node: ts.CallExpression,
  callbackName: string,
): boolean {
  if (ts.isIdentifier(node.expression)) {
    return node.expression.text === callbackName;
  }
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "call" &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === callbackName
  );
}

function nodeContainsCallToIdentifier(
  node: ts.Node | undefined,
  identifierName: string,
): boolean {
  if (node === undefined) {
    return false;
  }
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isCallExpression(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === identifierName
    ) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function returnExpressionCallsAnyIdentifier(
  declaration: ts.FunctionDeclaration,
  identifierNames: ReadonlySet<string>,
): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isReturnStatement(node) &&
      node.expression !== undefined &&
      isCallToAnyIdentifier(node.expression, identifierNames)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  if (declaration.body !== undefined) {
    ts.forEachChild(declaration.body, visit);
  }
  return found;
}

function isCallToAnyIdentifier(
  expression: ts.Expression,
  identifierNames: ReadonlySet<string>,
): boolean {
  return (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    identifierNames.has(expression.expression.text)
  );
}

function stringListFromSplitCall(expression: ts.Expression): readonly string[] {
  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "split"
  ) {
    return stringListLiteralText(expression.expression.expression);
  }
  return stringListLiteralText(expression);
}

function stringListLiteralText(expression: ts.Expression): readonly string[] {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text.split(/\s+/u).filter((item) => item.length > 0);
  }
  return [];
}

function dependencyCircuitsForFlowSites(
  flowSites: readonly FrameworkObservationFlowSiteRow[],
  filters: FrameworkObservationFilters,
): readonly FrameworkObservationDependencyCircuitRow[] {
  return flowSites
    .map(dependencyCircuitForFlowSite)
    .filter((row) => dependencyCircuitMatches(row, filters))
    .sort(compareDependencyCircuits);
}

function dependencyCircuitMatches(
  row: FrameworkObservationDependencyCircuitRow,
  filters: FrameworkObservationFilters,
): boolean {
  return (
    (filters.circuitRole === undefined ||
      row.circuitRole === filters.circuitRole) &&
    queryMatches(filters.query, [
      row.packageId,
      row.surfaceKind,
      row.siteKind,
      row.ownerName,
      row.methodName,
      row.relation,
      row.mechanism,
      row.targetName,
      row.expressionText,
      row.circuitRole,
      row.summary,
    ])
  );
}

function dependencyCircuitForFlowSite(
  row: FrameworkObservationFlowSiteRow,
): FrameworkObservationDependencyCircuitRow {
  const circuitRole = dependencyCircuitRoleForFlowSite(row);
  return {
    id: `${row.id}:dependency-circuit`,
    packageId: row.packageId,
    packageName: row.packageName,
    circuitRole,
    surfaceKind: row.surfaceKind,
    siteKind: row.siteKind,
    ownerName: row.ownerName,
    methodName: row.methodName,
    relation: row.relation,
    mechanism: row.mechanism,
    targetName: row.targetName,
    expressionText: row.expressionText,
    sourceFlowSiteId: row.id,
    source: row.source,
    summary: `${row.ownerName}.${row.methodName} participates in ${circuitRole} through ${row.siteKind}: ${row.summary}`,
  };
}

function observerLocatorDecisionsForFlowSites(
  flowSites: readonly FrameworkObservationFlowSiteRow[],
  filters: FrameworkObservationFilters,
): readonly FrameworkObserverLocatorDecisionRow[] {
  return flowSites
    .map(observerLocatorDecisionForFlowSite)
    .filter((row): row is FrameworkObserverLocatorDecisionRow => row !== null)
    .filter((row) => observerLocatorDecisionMatches(row, filters))
    .sort(compareObserverLocatorDecisions);
}

function observerLocatorDecisionForFlowSite(
  row: FrameworkObservationFlowSiteRow,
): FrameworkObserverLocatorDecisionRow | null {
  if (
    row.surfaceKind !== FrameworkObservationSurfaceKind.ObserverLocator &&
    row.surfaceKind !== FrameworkObservationSurfaceKind.NodeObserverLocator
  ) {
    return null;
  }
  const decision = observerLocatorDecisionDetails(row);
  if (decision === null) {
    return null;
  }
  return {
    id: `${row.id}:observer-locator-decision`,
    packageId: row.packageId,
    packageName: row.packageName,
    decisionKind: decision.decisionKind,
    trigger: decision.trigger,
    runtimeBranch: decision.runtimeBranch,
    runtimeProduct: decision.runtimeProduct,
    ownerName: row.ownerName,
    methodName: row.methodName,
    siteKind: row.siteKind,
    targetName: row.targetName,
    expressionText: row.expressionText,
    sourceFlowSiteId: row.id,
    source: row.source,
    summary: `${decision.trigger} selects ${decision.runtimeProduct} through ${decision.runtimeBranch}.`,
  };
}

type ObserverLocatorDecisionDetails = {
  readonly decisionKind: FrameworkObserverLocatorDecisionKind;
  readonly trigger: string;
  readonly runtimeBranch: string;
  readonly runtimeProduct: string;
};

function observerLocatorDecisionDetails(
  row: FrameworkObservationFlowSiteRow,
): ObserverLocatorDecisionDetails | null {
  if (row.surfaceKind === FrameworkObservationSurfaceKind.NodeObserverLocator) {
    return nodeObserverLocatorDecisionDetails(row);
  }
  switch (row.siteKind) {
    case FrameworkObservationFlowSiteKind.PrimitiveObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.PrimitiveTarget,
        trigger: "primitive target",
        runtimeBranch: "ObserverLocator.getObserver primitive branch",
        runtimeProduct: "PrimitiveObserver",
      };
    case FrameworkObservationFlowSiteKind.ComputedObserver:
      return computedObserverDecision(row);
    case FrameworkObservationFlowSiteKind.ControlledComputedObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.ControlledComputedObserverExplicitDependencies,
        trigger: "computed metadata with explicit dependencies",
        runtimeBranch: "ObserverLocator.getComputedObserver controlled branch",
        runtimeProduct: "ControlledComputedObserver",
      };
    case FrameworkObservationFlowSiteKind.NodeLocatorObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.NodeObserverDelegation,
        trigger: "node target observer lookup",
        runtimeBranch: "ObserverLocator.createObserver node delegation",
        runtimeProduct: "INodeObserverLocator.getObserver",
      };
    case FrameworkObservationFlowSiteKind.NodeLocatorAccessor:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.NodeAccessorDelegation,
        trigger: "node target accessor lookup",
        runtimeBranch: "ObserverLocator.getAccessor node delegation",
        runtimeProduct: "INodeObserverLocator.getAccessor",
      };
    case FrameworkObservationFlowSiteKind.NodeAccessor:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.PropertyAccessorFallback,
        trigger: "ordinary object accessor lookup",
        runtimeBranch: "ObserverLocator.getAccessor fallback",
        runtimeProduct: "PropertyAccessor",
      };
    case FrameworkObservationFlowSiteKind.CollectionLengthObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.CollectionLengthOrSizeObserver,
        trigger: "collection length or size property",
        runtimeBranch: "ObserverLocator.createObserver collection branch",
        runtimeProduct: row.targetName,
      };
    case FrameworkObservationFlowSiteKind.CollectionIndexObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.ArrayIndexObserver,
        trigger: "array numeric index property",
        runtimeBranch: "ObserverLocator.createObserver array-index branch",
        runtimeProduct: row.targetName,
      };
    case FrameworkObservationFlowSiteKind.AdapterObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.ObjectAdapterObserver,
        trigger: "accessor descriptor accepted by object-observation adapter",
        runtimeBranch: "ObserverLocator.createObserver adapter branch",
        runtimeProduct: "IObjectObservationAdapter.getObserver",
      };
    case FrameworkObservationFlowSiteKind.GetterObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.GetterOwnedObserver,
        trigger: "accessor descriptor getter supplies getObserver",
        runtimeBranch: "ObserverLocator.createObserver getter-hook branch",
        runtimeProduct: "ObservableGetter.getObserver",
      };
    case FrameworkObservationFlowSiteKind.DirtyCheckProperty:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.AccessorDescriptorDirtyCheck,
        trigger: "accessor descriptor without adapter/getter/computed observer",
        runtimeBranch: "ObserverLocator.createObserver dirty-check fallback",
        runtimeProduct: "IDirtyChecker.createProperty",
      };
    case FrameworkObservationFlowSiteKind.SetterObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.OrdinaryDataSetterObserver,
        trigger: "ordinary data property or missing key",
        runtimeBranch: "ObserverLocator.createObserver data-property fallback",
        runtimeProduct: "SetterObserver",
      };
    case FrameworkObservationFlowSiteKind.ExpressionObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.ExpressionObserver,
        trigger: "string dependency expression",
        runtimeBranch: "ObserverLocator.getExpressionObserver",
        runtimeProduct: "ExpressionObserver",
      };
    default:
      return null;
  }
}

function nodeObserverLocatorDecisionDetails(
  row: FrameworkObservationFlowSiteRow,
): ObserverLocatorDecisionDetails | null {
  switch (row.siteKind) {
    case FrameworkObservationFlowSiteKind.NodeObserverConfig:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.NodeObserverConfigRegistration,
        trigger: "constructor-time node observer configuration",
        runtimeBranch: `${row.ownerName}.${row.methodName} config branch`,
        runtimeProduct: row.targetName,
      };
    case FrameworkObservationFlowSiteKind.NodeAccessorOverride:
      return nodeAccessorOverrideDecision(row);
    case FrameworkObservationFlowSiteKind.NodeObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.NodeConfiguredObserver,
        trigger: "configured node/property observer",
        runtimeBranch: "NodeObserverLocator.getNodeObserver configured observer branch",
        runtimeProduct: row.targetName,
      };
    case FrameworkObservationFlowSiteKind.NodeAccessor:
      return nodeAccessorDecision(row);
    case FrameworkObservationFlowSiteKind.DirtyCheckProperty:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.NodeNativePropertyDirtyCheck,
        trigger: "known native node property with dirty checking allowed",
        runtimeBranch: "NodeObserverLocator.getObserver dirty-check branch",
        runtimeProduct: "IDirtyChecker.createProperty",
      };
    case FrameworkObservationFlowSiteKind.SetterObserver:
      return {
        decisionKind: FrameworkObserverLocatorDecisionKind.NodeMissingPropertySetterObserver,
        trigger: "missing native node property",
        runtimeBranch: "NodeObserverLocator.getObserver missing-property branch",
        runtimeProduct: "SetterObserver",
      };
    default:
      return null;
  }
}

function nodeAccessorOverrideDecision(
  row: FrameworkObservationFlowSiteRow,
): ObserverLocatorDecisionDetails {
  if (row.methodName === "getAccessor") {
    return {
      decisionKind: FrameworkObserverLocatorDecisionKind.NodeAccessorOverrideDelegation,
      trigger: "overridden node accessor property",
      runtimeBranch: "NodeObserverLocator.getAccessor override branch",
      runtimeProduct: "NodeObserverLocator.getObserver",
    };
  }
  return {
    decisionKind: FrameworkObserverLocatorDecisionKind.NodeAccessorOverrideRegistration,
    trigger: "constructor-time node accessor override registration",
    runtimeBranch: `${row.ownerName}.${row.methodName} override registration`,
    runtimeProduct: row.targetName,
  };
}

function nodeAccessorDecision(
  row: FrameworkObservationFlowSiteRow,
): ObserverLocatorDecisionDetails {
  if (row.targetName === "PropertyAccessor") {
    return {
      decisionKind: FrameworkObserverLocatorDecisionKind.DefaultNodePropertyAccessor,
      trigger: "default node observer locator fallback",
      runtimeBranch: `${row.ownerName}.${row.methodName} property accessor fallback`,
      runtimeProduct: "PropertyAccessor",
    };
  }
  if (row.targetName === "ClassAttributeAccessor" || row.targetName === "StyleAttributeAccessor") {
    return {
      decisionKind: FrameworkObserverLocatorDecisionKind.NodeClassStyleAccessor,
      trigger: "class/style/css node property",
      runtimeBranch: "NodeObserverLocator.getObserver class/style branch",
      runtimeProduct: row.targetName,
    };
  }
  if (row.targetName === "AttributeNSAccessor.forNs") {
    return {
      decisionKind: FrameworkObserverLocatorDecisionKind.NodeNamespaceAttributeAccessor,
      trigger: "namespace node attribute property",
      runtimeBranch: `NodeObserverLocator.${row.methodName} namespace attribute branch`,
      runtimeProduct: "AttributeNSAccessor",
    };
  }
  if (row.targetName === "attrAccessor") {
    return {
      decisionKind: FrameworkObserverLocatorDecisionKind.NodeAttributeAccessor,
      trigger: "attribute-like node property",
      runtimeBranch: `NodeObserverLocator.${row.methodName} attribute/data attribute branch`,
      runtimeProduct: "attrAccessor",
    };
  }
  if (row.targetName === "elementPropertyAccessor") {
    return {
      decisionKind: FrameworkObserverLocatorDecisionKind.NodeElementPropertyAccessor,
      trigger: "ordinary node property accessor",
      runtimeBranch: "NodeObserverLocator.getAccessor element property fallback",
      runtimeProduct: "elementPropertyAccessor",
    };
  }
  return {
    decisionKind: FrameworkObserverLocatorDecisionKind.NodeElementPropertyAccessor,
    trigger: "node accessor branch",
    runtimeBranch: `NodeObserverLocator.${row.methodName} accessor branch`,
    runtimeProduct: row.targetName,
  };
}

function computedObserverDecision(
  row: FrameworkObservationFlowSiteRow,
): ObserverLocatorDecisionDetails {
  if (row.methodName === "getObserver") {
    return {
      decisionKind: FrameworkObserverLocatorDecisionKind.FunctionKeyComputedObserver,
      trigger: "function property key",
      runtimeBranch: "ObserverLocator.getObserver function-key branch",
      runtimeProduct: "ComputedObserver",
    };
  }
  if (row.methodName === "createObserver") {
    return {
      decisionKind: FrameworkObserverLocatorDecisionKind.AccessorDescriptorComputedObserver,
      trigger: "configurable accessor descriptor",
      runtimeBranch: "ObserverLocator.createObserver computed fallback",
      runtimeProduct: "ObserverLocator.getComputedObserver",
    };
  }
  return {
    decisionKind: FrameworkObserverLocatorDecisionKind.ComputedObserverAutoDependencies,
    trigger: "computed metadata without explicit dependencies",
    runtimeBranch: "ObserverLocator.getComputedObserver auto-dependency branch",
    runtimeProduct: "ComputedObserver",
  };
}

function observerLocatorDecisionMatches(
  row: FrameworkObserverLocatorDecisionRow,
  filters: FrameworkObservationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.siteKind === undefined || row.siteKind === filters.siteKind) &&
    (filters.methodName === undefined ||
      row.methodName === filters.methodName) &&
    (filters.targetName === undefined ||
      row.targetName === filters.targetName ||
      row.runtimeProduct === filters.targetName) &&
    (filters.decisionKind === undefined ||
      row.decisionKind === filters.decisionKind) &&
    queryMatches(filters.query, [
      row.packageId,
      row.decisionKind,
      row.trigger,
      row.runtimeBranch,
      row.runtimeProduct,
      row.ownerName,
      row.methodName,
      row.siteKind,
      row.targetName,
      row.expressionText,
      row.summary,
    ])
  );
}

function collectionMethodMatches(
  row: FrameworkObservationCollectionMethodRow,
  filters: FrameworkObservationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.surfaceKind === undefined || row.surfaceKind === filters.surfaceKind) &&
    (filters.methodName === undefined ||
      row.methodName === filters.methodName ||
      row.sourceMethodName === filters.methodName) &&
    (filters.receiverKind === undefined ||
      row.receiverKind === filters.receiverKind) &&
    (filters.actionKind === undefined ||
      row.actionKind === filters.actionKind) &&
    queryMatches(filters.query, [
      row.packageId,
      row.surfaceKind,
      row.receiverKind,
      row.methodName,
      row.sourceMethodName,
      row.actionKind,
      row.summary,
    ])
  );
}

function dependencyCircuitRoleForFlowSite(
  row: FrameworkObservationFlowSiteRow,
): FrameworkObservationDependencyCircuitRole {
  switch (row.siteKind) {
    case FrameworkObservationFlowSiteKind.ExpressionAccessScopeDependency:
    case FrameworkObservationFlowSiteKind.ExpressionAccessMemberDependency:
    case FrameworkObservationFlowSiteKind.ExpressionAccessKeyedDependency:
      return FrameworkObservationDependencyCircuitRole.TemplateExpressionRead;
    case FrameworkObservationFlowSiteKind.ExpressionCollectionDependency:
      return FrameworkObservationDependencyCircuitRole.TemplateCollectionRead;
    case FrameworkObservationFlowSiteKind.ExpressionCallbackBodyEvaluation:
      return FrameworkObservationDependencyCircuitRole.TemplateCallbackEvaluation;
    case FrameworkObservationFlowSiteKind.ExpressionConnectableEnter:
    case FrameworkObservationFlowSiteKind.ExpressionConnectableExit:
    case FrameworkObservationFlowSiteKind.WatcherDependencyEnter:
    case FrameworkObservationFlowSiteKind.WatcherDependencyExit:
    case FrameworkObservationFlowSiteKind.EffectDependencyEnter:
    case FrameworkObservationFlowSiteKind.EffectDependencyExit:
      return FrameworkObservationDependencyCircuitRole.ConnectableBoundary;
    case FrameworkObservationFlowSiteKind.ExpressionTrackableDependency:
    case FrameworkObservationFlowSiteKind.ExpressionTrackableProxyWrap:
    case FrameworkObservationFlowSiteKind.WatchExpressionBranch:
    case FrameworkObservationFlowSiteKind.WatchExpressionParse:
    case FrameworkObservationFlowSiteKind.WatchAccessScopeAst:
      return FrameworkObservationDependencyCircuitRole.TrackableExpressionDependency;
    case FrameworkObservationFlowSiteKind.BindingBehaviorBindArgumentEvaluation:
    case FrameworkObservationFlowSiteKind.BindingBehaviorBindExpressionHandoff:
    case FrameworkObservationFlowSiteKind.ValueConverterBindExpressionHandoff:
      return FrameworkObservationDependencyCircuitRole.BindingExpressionBindTime;
    case FrameworkObservationFlowSiteKind.ProxyEligibilityCheck:
    case FrameworkObservationFlowSiteKind.ProxyWrap:
    case FrameworkObservationFlowSiteKind.ProxyCacheRead:
    case FrameworkObservationFlowSiteKind.ProxyCacheWrite:
    case FrameworkObservationFlowSiteKind.ProxyCreate:
      return FrameworkObservationDependencyCircuitRole.ProxyIdentity;
    case FrameworkObservationFlowSiteKind.ProxyUnwrap:
    case FrameworkObservationFlowSiteKind.ProxyRawRead:
      return FrameworkObservationDependencyCircuitRole.ProxyEscape;
    case FrameworkObservationFlowSiteKind.ProxyDependencyCollect:
      return FrameworkObservationDependencyCircuitRole.ProxyPropertyDependency;
    case FrameworkObservationFlowSiteKind.ProxyCollectionDependencyCollect:
      return FrameworkObservationDependencyCircuitRole.ProxyCollectionDependency;
    case FrameworkObservationFlowSiteKind.ProxyTrackableDependencyCollect:
    case FrameworkObservationFlowSiteKind.ProxyTrackableCallbackInvoke:
      return FrameworkObservationDependencyCircuitRole.ProxyTrackableDependency;
    case FrameworkObservationFlowSiteKind.ComputedObserverProxyWrap:
    case FrameworkObservationFlowSiteKind.ComputedObserverProxyUnwrap:
    case FrameworkObservationFlowSiteKind.ComputedObserverGetterInvoke:
    case FrameworkObservationFlowSiteKind.ComputedObserverSetterInvoke:
    case FrameworkObservationFlowSiteKind.ComputedObserverDependencyClear:
    case FrameworkObservationFlowSiteKind.ControlledComputedDependencyBranch:
    case FrameworkObservationFlowSiteKind.ControlledComputedExpressionDependency:
    case FrameworkObservationFlowSiteKind.ControlledComputedObserverDependency:
    case FrameworkObservationFlowSiteKind.ControlledComputedDeepObserver:
    case FrameworkObservationFlowSiteKind.ControlledComputedDeepPropertyDependency:
    case FrameworkObservationFlowSiteKind.ControlledComputedDeepCollectionDependency:
    case FrameworkObservationFlowSiteKind.ControlledComputedProxyUnwrap:
    case FrameworkObservationFlowSiteKind.ControlledComputedGetterInvoke:
    case FrameworkObservationFlowSiteKind.ControlledComputedSubscribe:
    case FrameworkObservationFlowSiteKind.ControlledComputedUnsubscribe:
      return FrameworkObservationDependencyCircuitRole.ComputedObserverDependency;
    case FrameworkObservationFlowSiteKind.ComputedObserverConnectableEnter:
    case FrameworkObservationFlowSiteKind.ComputedObserverConnectableExit:
      return FrameworkObservationDependencyCircuitRole.ConnectableBoundary;
    case FrameworkObservationFlowSiteKind.ComputedObserverQueue:
    case FrameworkObservationFlowSiteKind.ComputedObserverNotify:
    case FrameworkObservationFlowSiteKind.ControlledComputedQueue:
    case FrameworkObservationFlowSiteKind.ControlledComputedNotify:
      return FrameworkObservationDependencyCircuitRole.WatcherEffectDependency;
    case FrameworkObservationFlowSiteKind.ComputedWatcher:
    case FrameworkObservationFlowSiteKind.ExpressionWatcher:
    case FrameworkObservationFlowSiteKind.WatcherQueue:
    case FrameworkObservationFlowSiteKind.WatcherCompute:
    case FrameworkObservationFlowSiteKind.WatcherDependencyClear:
    case FrameworkObservationFlowSiteKind.WatcherCallbackInvoke:
    case FrameworkObservationFlowSiteKind.EffectRunner:
    case FrameworkObservationFlowSiteKind.EffectWatchExpression:
    case FrameworkObservationFlowSiteKind.EffectWatchGetter:
    case FrameworkObservationFlowSiteKind.EffectSubscribe:
    case FrameworkObservationFlowSiteKind.EffectCleanup:
    case FrameworkObservationFlowSiteKind.EffectStop:
      return FrameworkObservationDependencyCircuitRole.WatcherEffectDependency;
    case FrameworkObservationFlowSiteKind.ObserverLocatorObserver:
    case FrameworkObservationFlowSiteKind.ObserverLocatorAccessor:
    case FrameworkObservationFlowSiteKind.NodeLocatorHandles:
    case FrameworkObservationFlowSiteKind.NodeLocatorObserver:
    case FrameworkObservationFlowSiteKind.NodeLocatorAccessor:
    case FrameworkObservationFlowSiteKind.ObserverCacheRead:
    case FrameworkObservationFlowSiteKind.ObserverCacheWrite:
    case FrameworkObservationFlowSiteKind.PrimitiveObserver:
    case FrameworkObservationFlowSiteKind.ComputedObserver:
    case FrameworkObservationFlowSiteKind.ExpressionObserver:
    case FrameworkObservationFlowSiteKind.ControlledComputedObserver:
    case FrameworkObservationFlowSiteKind.CollectionObserver:
    case FrameworkObservationFlowSiteKind.CollectionLengthObserver:
    case FrameworkObservationFlowSiteKind.CollectionIndexObserver:
    case FrameworkObservationFlowSiteKind.AdapterObserver:
    case FrameworkObservationFlowSiteKind.GetterObserver:
    case FrameworkObservationFlowSiteKind.SetterObserver:
    case FrameworkObservationFlowSiteKind.DefaultNodeObserverLocator:
    case FrameworkObservationFlowSiteKind.NodeObserverConfig:
    case FrameworkObservationFlowSiteKind.NodeAccessorOverride:
    case FrameworkObservationFlowSiteKind.NodeObserver:
    case FrameworkObservationFlowSiteKind.NodeAccessor:
    case FrameworkObservationFlowSiteKind.NodeObserverSubscribe:
    case FrameworkObservationFlowSiteKind.NodeObserverUnsubscribe:
    case FrameworkObservationFlowSiteKind.NodeObserverNotify:
    case FrameworkObservationFlowSiteKind.NodeObserverValueSync:
    case FrameworkObservationFlowSiteKind.NodeObserverCollectionSync:
    case FrameworkObservationFlowSiteKind.NodeObserverDomMutationObserver:
    case FrameworkObservationFlowSiteKind.NodeObserverDiagnostic:
      return FrameworkObservationDependencyCircuitRole.ObserverLocation;
    default:
      return FrameworkObservationDependencyCircuitRole.ObservationAdjacency;
  }
}

export function readFrameworkObservationRelationships(
  sourceProject: SourceProject,
  filters: FrameworkObservationFilters,
): readonly FrameworkObservationRelationshipRow[] {
  const internalRelationships = shouldReadInternalObservationRelationships(
    filters,
  )
    ? readFrameworkObservationInternalRelationships(sourceProject, filters)
    : [];
  const renderingRelationships = shouldReadRenderingObservationRelationships(
    filters,
  )
    ? readFrameworkRenderingRelationships(sourceProject, filters).filter(
        isObservationRelationship,
      )
    : [];
  return [...renderingRelationships, ...internalRelationships];
}

function shouldReadInternalObservationRelationships(
  filters: FrameworkObservationFilters,
): boolean {
  return (
    filters.mechanism === undefined ||
    internalObservationMechanisms.has(
      filters.mechanism as FrameworkRelationshipMechanism,
    )
  );
}

function shouldReadRenderingObservationRelationships(
  filters: FrameworkObservationFilters,
): boolean {
  if (
    filters.surfaceKind !== undefined ||
    filters.siteKind !== undefined ||
    filters.methodName !== undefined ||
    filters.matchBasis !== undefined
  ) {
    return false;
  }
  if (
    filters.relation !== undefined &&
    filters.relation !== FrameworkRelationshipRelation.LooksUpObserver &&
    filters.relation !== FrameworkRelationshipRelation.ConfiguresObservation
  ) {
    return false;
  }
  return (
    filters.mechanism === undefined ||
    renderingObservationMechanisms.has(
      filters.mechanism as FrameworkRelationshipMechanism,
    )
  );
}

const internalObservationMechanisms: ReadonlySet<FrameworkRelationshipMechanism> =
  new Set([
    FrameworkRelationshipMechanism.ObserverLocator,
    FrameworkRelationshipMechanism.NodeObserverLocator,
    FrameworkRelationshipMechanism.DirtyChecker,
    FrameworkRelationshipMechanism.Connectable,
    FrameworkRelationshipMechanism.CollectionObserver,
    FrameworkRelationshipMechanism.ProxyObservable,
    FrameworkRelationshipMechanism.ComputedDecorator,
    FrameworkRelationshipMechanism.WatchDecorator,
    FrameworkRelationshipMechanism.WatchRegistry,
    FrameworkRelationshipMechanism.WatchMetadata,
    FrameworkRelationshipMechanism.Watcher,
    FrameworkRelationshipMechanism.Effect,
  ]);

const renderingObservationMechanisms: ReadonlySet<FrameworkRelationshipMechanism> =
  new Set([
    FrameworkRelationshipMechanism.ObserverLookup,
    FrameworkRelationshipMechanism.BindingSetup,
  ]);

function isObservationRelationship(
  row: FrameworkRenderingRelationshipRow,
): boolean {
  return (
    row.relation === FrameworkRelationshipRelation.LooksUpObserver ||
    row.relation === FrameworkRelationshipRelation.ConfiguresObservation
  );
}

function observationFiltersFromInquiry(
  inquiry: Inquiry,
): FrameworkObservationFilters {
  return {
    ...filtersFromInquiry(inquiry),
    ...axisFiltersFromRecord(inquiry.subject),
    ...axisFiltersFromRecord(inquiry.filters),
  };
}

function axisFiltersFromRecord(value: unknown): FrameworkObservationFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "surfaceKind"),
    ...stringFilter(source, "siteKind"),
    ...stringFilter(source, "methodName"),
    ...stringFilter(source, "targetName"),
    ...stringFilter(source, "circuitRole"),
    ...stringFilter(source, "receiverKind"),
    ...stringFilter(source, "actionKind"),
    ...stringFilter(source, "decisionKind"),
    ...stringFilter(source, "matchBasis"),
    ...stringFilter(source, "relation"),
    ...stringFilter(source, "mechanism"),
    ...stringFilter(source, "phase"),
  };
}

function evidenceForBindingLookup(row: FrameworkBindingEffectRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.bindingName}.${row.methodName} looks up observation through ${row.effectName}.`,
    source: row.source,
    data: row,
  };
}

function evidenceForObservationBindingSetup(row: FrameworkBindingSetupRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.producerName} configures ${row.bindingName} observation through ${row.setupMethodName}.`,
    source: row.source,
    data: row,
  };
}

interface FrameworkObservationTypeFactEvidenceRow {
  readonly id: string;
  readonly summary: string;
  readonly source: SourceRange;
}

function evidenceForObservationTypeFactRow<T extends FrameworkObservationTypeFactEvidenceRow>(
  row: T,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForFlowEntityLink(
  row: FrameworkObservationFlowEntityLinkRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence:
      row.matchBasis === "fully-qualified-name"
        ? EvidenceConfidence.Exact
        : EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function observationSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.observation:entities",
      "entities",
      "Inspect observer/reactivity entity rows.",
      { basis: [], summary: "framework.observation:entities" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:binding-lookups",
      "binding-lookups",
      "Inspect binding observer/accessor lookup rows.",
      { basis: [], summary: "framework.observation:binding-lookups" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:binding-setups",
      "binding-setups",
      "Inspect binding observation setup override rows.",
      { basis: [], summary: "framework.observation:binding-setups" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:surface-methods",
      "surface-methods",
      "Inspect observer-locator, connectable, ast-evaluator, proxy-observable, watcher, effect, registry, and metadata surface methods.",
      { basis: [], summary: "framework.observation:surface-methods" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites",
      "flow-sites",
      "Inspect source-backed observation flow sites inside locator, dirty-checker, connectable, ast-evaluator, and proxy-observable surfaces.",
      { basis: [], summary: "framework.observation:flow-sites" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:dependency-circuit",
      "dependency-circuit",
      "Inspect compact observation dependency-circuit roles derived from source-backed flow sites.",
      { basis: [], summary: "framework.observation:dependency-circuit" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:collection-methods",
      "collection-methods",
      "Inspect collection observation methods across astEvaluate auto-observe and ProxyObservable wrappers.",
      { basis: [], summary: "framework.observation:collection-methods" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:observer-locator-decisions",
      "observer-locator-decisions",
      "Inspect the compact ObserverLocator decision table derived from source-backed flow sites.",
      { basis: [], summary: "framework.observation:observer-locator-decisions" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-entity-links",
      "flow-entity-links",
      "Inspect flow-site targets linked back to public observer entity rows.",
      { basis: [], summary: "framework.observation:flow-entity-links" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:relationships",
      "relationships",
      "Inspect normalized observation relationships.",
      { basis: [], summary: "framework.observation:relationships" },
    ),
  ];
}

function entityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObserverEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...observerEntitySourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:entities",
      "Continue observer entity rows.",
      "Inspect observer entity source.",
    ),
    ...rows.slice(0, 3).map((row, index) =>
      observerEntityFlowLinksContinuation(
        row,
        index,
        evidenceForObserverEntity(row),
      ),
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:entities:lookups",
      "binding-lookups",
      "Jump from observer entities to binding lookup consumers.",
      { basis: [], summary: "framework.observation:binding-lookups" },
    ),
  ];
}

function bindingLookupContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingEffectRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:binding-lookups",
      "Continue binding observer lookup rows.",
      "Inspect binding observer lookup source.",
    ),
    ...rows.slice(0, 3).map((row, index) =>
      observerCapabilityContinuation(
        row.effectName,
        index,
        evidenceForBindingLookup(row),
      ),
    ),
    ...rows.slice(0, 3).map((row, index) =>
      observerLookupFlowContinuation(
        row,
        index,
        evidenceForBindingLookup(row),
      ),
    ),
    ...rows.slice(0, 3).map((row, index) =>
      observerLookupEntityLinkContinuation(
        row,
        index,
        evidenceForBindingLookup(row),
      ),
    ),
  ];
}

function observationBindingSetupContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingSetupRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return sourceContinuations(
    inquiry,
    rows,
    nextOffset,
    limit,
    "framework.observation:binding-setups",
    "Continue binding observation setup rows.",
    "Inspect binding observation setup source.",
  );
}

function surfaceMethodContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationSurfaceMethodRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return sourceContinuations(
    inquiry,
    rows,
    nextOffset,
    limit,
    "framework.observation:surface-methods",
    "Continue observation surface method rows.",
    "Inspect observation surface method source.",
  );
}

function flowSiteContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationFlowSiteRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:flow-sites",
      "Continue observation flow site rows.",
      "Inspect observation flow site source.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites:dependency-circuit",
      "dependency-circuit",
      "Jump from observation flow sites to compact dependency-circuit roles.",
      { basis: [], summary: "framework.observation:dependency-circuit" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites:collection-methods",
      "collection-methods",
      "Jump from observation flow sites to collection observation method inventory.",
      { basis: [], summary: "framework.observation:collection-methods" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites:observer-locator-decisions",
      "observer-locator-decisions",
      "Jump from observation flow sites to the compact ObserverLocator decision table.",
      { basis: [], summary: "framework.observation:observer-locator-decisions" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites:entity-links",
      "flow-entity-links",
      "Jump from observation flow sites to public observer entity links.",
      { basis: [], summary: "framework.observation:flow-entity-links" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites:relationships",
      "relationships",
      "Jump from observation flow sites to normalized observation relationships.",
      { basis: [], summary: "framework.observation:relationships" },
    ),
  ];
}

function dependencyCircuitContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationDependencyCircuitRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:dependency-circuit",
      "Continue observation dependency-circuit rows.",
      "Inspect dependency-circuit source flow site.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:dependency-circuit:flow-sites",
      "flow-sites",
      "Jump from compact dependency-circuit rows back to source-backed observation flow sites.",
      { basis: [], summary: "framework.observation:flow-sites" },
    ),
  ];
}

function collectionMethodContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationCollectionMethodRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:collection-methods",
      "Continue collection observation method rows.",
      "Inspect collection observation method source.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:collection-methods:dependency-circuit",
      "dependency-circuit",
      "Jump from collection method inventory back to the dependency-circuit rows.",
      { basis: [], summary: "framework.observation:dependency-circuit" },
    ),
  ];
}

function observerLocatorDecisionContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObserverLocatorDecisionRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:observer-locator-decisions",
      "Continue ObserverLocator decision rows.",
      "Inspect the source flow site behind this ObserverLocator decision.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:observer-locator-decisions:flow-sites",
      "flow-sites",
      "Jump from ObserverLocator decisions back to source-backed observation flow sites.",
      { basis: [], summary: "framework.observation:flow-sites" },
    ),
  ];
}

function flowEntityLinkContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationFlowEntityLinkRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:flow-entity-links",
      "Continue observation flow-to-entity link rows.",
      "Inspect observation flow site source.",
    ),
  ];
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const semanticRoute = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.observation:flow-entity-links",
      index,
    );
    continuations.push(
      semanticRoute.continuation(
        FrameworkSemanticRoutes.ObservationToEntities,
        "entity",
        {
          filters: {
            packageId: row.entityPackageId,
            exportName: row.entityExportName,
          },
          rationale:
            "Jump to the public observer entity row linked from this flow site.",
          routeSummary:
            "Observation flow-to-entity link back to observer entity catalog.",
        },
      ),
    );
    if (row.entitySource === undefined) {
      continue;
    }
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.observation:flow-entity-links",
      index,
    );
    continuations.push(
      builder.source(
        "entity-source",
        row.entitySource,
        "Inspect the public observer entity declaration linked from this flow site.",
        "Source for linked observer entity declaration.",
        { priority: ContinuationPriority.Secondary },
      ),
    );
  }
  return continuations;
}

function observationRelationshipContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationRelationshipRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return sourceContinuations(
    inquiry,
    rows,
    nextOffset,
    limit,
    "framework.observation:relationships",
    "Continue observation relationship rows.",
    "Inspect observation relationship source.",
  );
}

function observerCapabilityContinuation(
  effectName: string,
  index: number,
  evidence: Evidence,
): Continuation {
  const semanticRoute = new FrameworkSemanticRouteBuilder(
    {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "binding-lookups",
    },
    "framework.observation:binding-lookups",
    index,
    evidence,
  );
  return semanticRoute.continuation(
    FrameworkSemanticRoutes.ObservationToEntities,
    "observer-capability",
    {
      filters: { observerCapability: observerCapabilityForLookup(effectName) },
      rationale:
        "Inspect observer entities with the capability implied by this binding lookup.",
      routeSummary: "Binding observer lookup to observer capability catalog.",
      priority: ContinuationPriority.Secondary,
    },
  );
}

function observerEntityFlowLinksContinuation(
  row: FrameworkObserverEntityRow,
  index: number,
  evidence: Evidence,
): Continuation {
  const semanticRoute = new FrameworkSemanticRouteBuilder(
    {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "entities",
    },
    "framework.observation:entities",
    index,
    evidence,
  );
  return semanticRoute.continuation(
    FrameworkSemanticRoutes.ObservationToFlowEntityLinks,
    "flow-entity-links",
    {
      filters: {
        exportName: row.exportEntry.exportName,
      },
      rationale:
        "Inspect observation subsystem flow sites linked to this public observer entity.",
      routeSummary: "Observer entity catalog to observation subsystem flow links.",
    },
  );
}

function observerLookupFlowContinuation(
  row: FrameworkBindingEffectRow,
  index: number,
  evidence: Evidence,
): Continuation {
  const semanticRoute = new FrameworkSemanticRouteBuilder(
    {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "binding-lookups",
    },
    "framework.observation:binding-lookups",
    index,
    evidence,
  );
  return semanticRoute.continuation(
    FrameworkSemanticRoutes.ObservationToFlowSites,
    "flow-sites",
    {
      filters: { methodName: row.effectName },
      rationale:
        "Jump from a binding observer lookup API to matching observation subsystem flow sites.",
      routeSummary: "Binding observer lookup to ObserverLocator flow sites.",
    },
  );
}

function observerLookupEntityLinkContinuation(
  row: FrameworkBindingEffectRow,
  index: number,
  evidence: Evidence,
): Continuation {
  const semanticRoute = new FrameworkSemanticRouteBuilder(
    {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "binding-lookups",
    },
    "framework.observation:binding-lookups",
    index,
    evidence,
  );
  return semanticRoute.continuation(
    FrameworkSemanticRoutes.ObservationToFlowEntityLinks,
    "flow-entity-links",
    {
      filters: { methodName: row.effectName },
      rationale:
        "Jump from a binding observer lookup API to linked observer entity rows inside the observation subsystem.",
      routeSummary: "Binding observer lookup to observer entity links.",
      priority: ContinuationPriority.Secondary,
    },
  );
}

function observerEntitySourceContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObserverEntityRow[],
  nextOffset: number | undefined,
  limit: number,
  idPrefix: string,
  nextPageRationale: string,
  sourceRationale: string,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        `${idPrefix}:next-page`,
        nextPageRationale,
        nextOffset,
        limit,
        { priority: ContinuationPriority.Secondary },
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceRangeForObserverEntity(row);
    if (source === null) {
      continue;
    }
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      idPrefix,
      index,
    );
    continuations.push(
      builder.source(
        "source",
        source,
        sourceRationale,
        "Source for observer entity row.",
      ),
    );
  }
  return continuations;
}

function observerCapabilityForLookup(effectName: string): string {
  switch (effectName) {
    case "getAccessor":
      return "locate-accessor";
    case "getArrayObserver":
    case "getMapObserver":
    case "getSetObserver":
      return "locate-collection-observer";
    default:
      return "locate-observer";
  }
}

function compareCollectionMethods(
  left: FrameworkObservationCollectionMethodRow,
  right: FrameworkObservationCollectionMethodRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.surfaceKind.localeCompare(right.surfaceKind) ||
    left.receiverKind.localeCompare(right.receiverKind) ||
    left.methodName.localeCompare(right.methodName) ||
    left.actionKind.localeCompare(right.actionKind) ||
    left.sourceMethodName.localeCompare(right.sourceMethodName) ||
    sourceRangeKey(left.source).localeCompare(sourceRangeKey(right.source))
  );
}

function compareDependencyCircuits(
  left: FrameworkObservationDependencyCircuitRow,
  right: FrameworkObservationDependencyCircuitRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.circuitRole.localeCompare(right.circuitRole) ||
    left.surfaceKind.localeCompare(right.surfaceKind) ||
    left.ownerName.localeCompare(right.ownerName) ||
    left.methodName.localeCompare(right.methodName) ||
    left.siteKind.localeCompare(right.siteKind) ||
    sourceRangeKey(left.source).localeCompare(sourceRangeKey(right.source))
  );
}

function compareObserverLocatorDecisions(
  left: FrameworkObserverLocatorDecisionRow,
  right: FrameworkObserverLocatorDecisionRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.decisionKind.localeCompare(right.decisionKind) ||
    left.runtimeBranch.localeCompare(right.runtimeBranch) ||
    left.ownerName.localeCompare(right.ownerName) ||
    left.methodName.localeCompare(right.methodName) ||
    sourceRangeKey(left.source).localeCompare(sourceRangeKey(right.source))
  );
}

function sourceContinuations<TRow extends { readonly source: SourceRange }>(
  inquiry: Inquiry,
  rows: readonly TRow[],
  nextOffset: number | undefined,
  limit: number,
  idPrefix: string,
  nextPageRationale: string,
  sourceRationale: string,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        `${idPrefix}:next-page`,
        nextPageRationale,
        nextOffset,
        limit,
        { priority: ContinuationPriority.Secondary },
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      idPrefix,
      index,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        sourceRationale,
        "Source for observation row.",
      ),
    );
  }
  return continuations;
}
