import { countBy, uniqueSortedStrings } from "../../collections.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
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
import { FrameworkResourceDefinitionKind } from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import {
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { answerBridgeAuLink } from "./bridge-lenses.js";
import { answerFrameworkAdmission } from "./framework-admission-lenses.js";
import { answerFrameworkApi } from "./framework-api-lenses.js";
import { answerFrameworkCompiler } from "./framework-compiler-lenses.js";
import { answerFrameworkComposition } from "./framework-composition-lenses.js";
import { answerFrameworkCorpus } from "./framework-corpus-lenses.js";
import { answerFrameworkDi } from "./framework-di-lenses.js";
import { answerFrameworkDiscovery } from "./framework-discovery-answerer.js";
import { answerFrameworkEvaluator } from "./framework-evaluator-lenses.js";
import { answerFrameworkLifecycle } from "./framework-lifecycle-lenses.js";
import { answerFrameworkObservation } from "./framework-observation-lenses.js";
import { answerFrameworkRendering } from "./framework-lenses.js";
import { answerFrameworkResources } from "./framework-resource-lenses.js";
import { answerFrameworkRouter } from "./framework-router-lenses.js";
import { answerPluginArchitecture } from "./plugin-architecture-lenses.js";
import { answerWorkspaceArchitecture } from "./workspace-architecture-lenses.js";
import {
  enumerateFrameworkTerritoryConstructs,
  frameworkCapabilityClusters,
  frameworkForwardCoverage,
  frameworkReverseCoverage,
  type FrameworkCapabilityCluster,
  type FrameworkForwardCoverageFamily,
  type FrameworkReverseCoverageFamily,
  type FrameworkTerritoryConstruct,
} from "./framework-capability-territory.js";
import {
  inquiryLowerStringFilter,
  inquiryNumberFilter,
  inquiryStringFilter,
  matchesAnyFilterValue,
  matchesFilterValue,
  queryMatches,
  querySignificantPartialMatches,
} from "./lens-filter-utils.js";

/** Broad Aurelia capability family before consumer-specific parameterization. */
export const enum FrameworkCapabilityDomain {
  /** Resource declaration, naming, registration, and template visibility. */
  Resource = "resource",
  /** Styling and DOM encapsulation choices. */
  Styling = "styling",
  /** Router, route context, viewport, and navigation capabilities. */
  Router = "router",
  /** App, area, component, and domain state ownership capabilities. */
  State = "state",
  /** Observation and reactivity capabilities. */
  Observation = "observation",
  /** Binding command, direction, and target-channel capabilities. */
  Binding = "binding",
  /** Built-in and plugin template controller capabilities. */
  TemplateController = "template-controller",
  /** Dynamic composition capabilities. */
  Composition = "composition",
  /** Dependency injection capabilities. */
  DependencyInjection = "dependency-injection",
  /** App configuration, bundle admission, and startup capabilities. */
  Configuration = "configuration",
  /** Plugin admission and plugin-owned surface capabilities. */
  Plugin = "plugin",
  /** Aurelia expression parsing and runtime evaluation capabilities. */
  Expression = "expression",
  /** Lifecycle and activation capabilities. */
  Lifecycle = "lifecycle",
}

/** Where a capability is normally selected or expressed by an app author. */
export const enum FrameworkCapabilityLocality {
  /** Chosen as an app-wide policy even when individual resources may opt out. */
  AppGlobal = "app-global",
  /** Exposed through package or bundle registration. */
  PackageGlobalRegistration = "package-global-registration",
  /** Chosen on one custom element, attribute, converter, behavior, or service. */
  ResourceLocal = "resource-local",
  /** Chosen inside one template or synthetic view. */
  TemplateLocal = "template-local",
  /** Chosen for one functional area of an app rather than the entire app. */
  AreaLocal = "area-local",
  /** Chosen at one binding expression, command, or DOM target. */
  BindingSite = "binding-site",
  /** Chosen for one route, route branch, or viewport outlet. */
  RouteLocal = "route-local",
}

/** Resource declaration carrier form, kept resource-scoped rather than as a global capability axis. */
export const enum FrameworkCapabilityResourceSourceForm {
  /** Name and kind derived from active Aurelia conventions. */
  Convention = "convention",
  /** Class decorator metadata such as @customElement(...), @customAttribute(...), or @valueConverter(...). */
  Decorator = "decorator",
  /** Static class-side `$au` resource definition metadata. */
  StaticAu = "static-$au",
  /** Imperative definition API such as CustomElement.define(...) or BindingCommand.define(...). */
  DefineCall = "define-call",
  /** Syntax-resource factory call such as AttributePattern.create(...). */
  AttributePatternCreate = "attribute-pattern-create",
}

/** Framework effect produced after a capability is expressed or admitted. */
export const enum FrameworkCapabilityEffect {
  /** Naming and file information become discoverable framework resources. */
  ResourceDiscovery = "resource-discovery",
  /** Resource definition metadata is read or constructed. */
  ResourceDefinition = "resource-definition",
  /** Resource names become visible to template compilation or runtime lookup. */
  ResourceVisibility = "resource-visibility",
  /** Resource definitions are registered with the framework runtime. */
  ResourceRegistration = "resource-registration",
  /** Bindable or resource metadata exposes a typed target API. */
  TargetApi = "target-api",
  /** A framework feature or bundle becomes part of the app world. */
  FeatureAdmission = "feature-admission",
  /** A plugin-owned bundle or surface becomes part of the app world. */
  PluginAdmission = "plugin-admission",
  /** DI keys, providers, aliases, factories, or slots are registered. */
  DiRegistration = "di-registration",
  /** DI keys or route/context services can be resolved from app code. */
  DiResolution = "di-resolution",
  /** App configuration materializes bundle, catalog, registry, or resource admissions. */
  ConfigurationAdmission = "configuration-admission",
  /** Component rendering uses light DOM or Shadow DOM semantics. */
  DomEncapsulation = "dom-encapsulation",
  /** Styles are attached or made available to component/template code. */
  StyleAvailability = "style-availability",
  /** Tooling transforms or imports source before the framework can consume it. */
  ToolingTransform = "tooling-transform",
  /** Router configuration admits route trees, endpoints, and routeable components. */
  RouteConfiguration = "route-configuration",
  /** Route patterns are parsed and matched by route recognizer semantics. */
  RouteRecognition = "route-recognition",
  /** Route parameter values flow into components or services. */
  RouteParameterFlow = "route-parameter-flow",
  /** Navigation instructions connect routes to links, commands, or user actions. */
  Navigation = "navigation",
  /** Viewport agents render route components into route outlets. */
  ViewportComposition = "viewport-composition",
  /** State plugin surfaces become available to app code. */
  StateStoreAdmission = "state-store-admission",
  /** Observer locator and connectable machinery observe source-side values. */
  SourceObservation = "source-observation",
  /** Target observers read or write DOM/control state. */
  TargetObservation = "target-observation",
  /** Collection observers react to array/map/set mutation or iteration. */
  CollectionObservation = "collection-observation",
  /** Binding setup moves typed values between source and target. */
  BindingDataFlow = "binding-data-flow",
  /** Aurelia expression ASTs are parsed, evaluated, connected, or transformed. */
  ExpressionEvaluation = "expression-evaluation",
  /** Template controllers create synthetic views and binding scopes. */
  SyntheticViewControlFlow = "synthetic-view-control-flow",
  /** Dynamic composition selects or creates components at runtime. */
  DynamicComposition = "dynamic-composition",
  /** App tasks run during configured app lifecycle phases. */
  AppTaskExecution = "app-task-execution",
  /** Controller, component, route, or binding lifecycle hooks are dispatched. */
  LifecycleDispatch = "lifecycle-dispatch",
  /** Runtime listener infrastructure handles browser events or native default event behavior. */
  EventHandling = "event-handling",
}

/** Requirement family for a capability prerequisite. */
export const enum FrameworkCapabilityRequirementKind {
  /** Requires another framework capability row. */
  Capability = "capability",
  /** Requires a package or plugin to be present or registered. */
  Package = "package",
  /** Requires build-tool or framework tooling support. */
  Tooling = "tooling",
}

/** Typed prerequisite for selecting or relying on a framework capability. */
export interface FrameworkCapabilityRequirementRef {
  /** Requirement family. */
  readonly kind: FrameworkCapabilityRequirementKind;
  /** Stable capability id, package id, or tooling feature id. */
  readonly id: string;
  /** Why this prerequisite is needed. */
  readonly summary: string;
}

/** Resource-kind/source-form pair supported by a resource-scoped capability row. */
export interface FrameworkCapabilityResourceSourceSupport {
  /** Resource definition kind whose source support is being described. */
  readonly resourceKind: FrameworkResourceDefinitionKind;
  /** Resource source forms that can carry this capability for that kind. */
  readonly sourceForms: readonly FrameworkCapabilityResourceSourceForm[];
}

/** Strength of the currently declared grounding for a capability row. */
export const enum FrameworkCapabilityGroundingStrength {
  /** Row points at at least one source-backed Atlas framework lens. */
  SourceBacked = "source-backed",
  /** Row is grounded only through corpus lanes such as docs or framework tests. */
  CorpusBacked = "corpus-backed",
  /** Row exists but currently has no evidence descriptor. */
  Ungrounded = "ungrounded",
}

/** Evidence family behind a curated capability row. */
export const enum FrameworkCapabilityEvidenceLane {
  /** Existing Atlas lens can inspect the framework source side. */
  AtlasLens = "atlas-lens",
  /** Existing auLink anchor connects an analyzer model to framework source. */
  AuLink = "aulink",
  /** Aurelia documentation can ground author-facing source forms. */
  FrameworkDocs = "framework-docs",
  /** Aurelia framework tests can seed behavior-grounded fixtures. */
  FrameworkTests = "framework-tests",
}

/** Curated pointer to the substrate that should prove or refine a capability row. */
export interface FrameworkCapabilityEvidenceRef {
  /** Evidence family behind this pointer. */
  readonly lane: FrameworkCapabilityEvidenceLane;
  /** Optional Atlas lens that can inspect the backing terrain. */
  readonly lensId?: LensId;
  /** Optional lens projection that is most relevant for this evidence. */
  readonly projection?: string;
  /** Optional query/filter hint for the target lens. */
  readonly query?: string;
  /** Optional framework or analyzer symbol name to inspect. */
  readonly symbolName?: string;
  /** Grounded explanation of what this evidence is expected to show. */
  readonly summary: string;
}

/** Matrix cell that makes resource-source support and non-resource capability axes inspectable. */
export interface FrameworkCapabilityMatrixRow {
  /** Stable matrix row id. */
  readonly id: string;
  /** Capability row that produced this matrix cell. */
  readonly capabilityId: string;
  /** Capability domain. */
  readonly domain: FrameworkCapabilityDomain;
  /** Capability localities represented by this cell. */
  readonly localities: readonly FrameworkCapabilityLocality[];
  /** Resource kind for resource-scoped cells, otherwise absent. */
  readonly resourceKind?: FrameworkResourceDefinitionKind;
  /** Resource source form for resource-scoped source-support cells, otherwise absent. */
  readonly resourceSourceForm?: FrameworkCapabilityResourceSourceForm;
  /** Framework effects represented by this cell. */
  readonly effects: readonly FrameworkCapabilityEffect[];
  /** Requirement ids attached to the capability. */
  readonly requirementIds: readonly string[];
  /** Compact explanation of the capability cell. */
  readonly summary: string;
}

/** One materialized evidence descriptor for a capability row. */
export interface FrameworkCapabilityEvidenceRow {
  /** Stable evidence row id. */
  readonly id: string;
  /** Capability row that owns this evidence descriptor. */
  readonly capabilityId: string;
  /** Evidence lane. */
  readonly lane: FrameworkCapabilityEvidenceLane;
  /** Grounding strength inferred from the evidence lane and target. */
  readonly groundingStrength: FrameworkCapabilityGroundingStrength;
  /** Optional Atlas lens that can inspect the backing terrain. */
  readonly lensId?: LensId;
  /** Optional lens projection that should be queried. */
  readonly projection?: string;
  /** Optional query/filter hint for the target lens. */
  readonly query?: string;
  /** Optional framework or analyzer symbol name to inspect. */
  readonly symbolName?: string;
  /** Grounded explanation of what this evidence is expected to show. */
  readonly summary: string;
}

/** Compact witness extracted from one backing answer evidence row. */
export interface FrameworkCapabilityEvidenceTraceSample {
  /** Evidence id when the backing answer supplied one. */
  readonly id?: string;
  /** Evidence classifier. */
  readonly kind: EvidenceKind;
  /** Role the backing answer assigned to this evidence row. */
  readonly role: EvidenceRole;
  /** Confidence class assigned by the backing answer. */
  readonly confidence?: EvidenceConfidence;
  /** Evidence summary from the backing answer. */
  readonly summary: string;
  /** Exact source span when the backing answer exposed one. */
  readonly source?: SourceRange;
}

/** Sampled collection field from a backing answer value. */
export interface FrameworkCapabilityEvidenceTraceCollection {
  /** Value field that contained row-like entries. */
  readonly fieldName: string;
  /** Number of entries available in the returned backing answer value. */
  readonly rowCount: number;
  /** Returned row samples from the backing answer value. */
  readonly sampleRows: readonly unknown[];
}

/** Evidence descriptor joined to a backing lens answer. */
export interface FrameworkCapabilityEvidenceTraceRow {
  /** Stable trace row id. */
  readonly id: string;
  /** Capability row that owns the evidence descriptor. */
  readonly capabilityId: string;
  /** Evidence descriptor row id. */
  readonly evidenceRowId: string;
  /** Evidence lane being traced. */
  readonly lane: FrameworkCapabilityEvidenceLane;
  /** Grounding strength inferred from the evidence lane and target. */
  readonly groundingStrength: FrameworkCapabilityGroundingStrength;
  /** Target lens that was asked, when the descriptor had one. */
  readonly lensId?: LensId;
  /** Target projection that was asked. */
  readonly projection?: string;
  /** Target query/filter hint. */
  readonly query?: string;
  /** Target symbol hint. */
  readonly symbolName?: string;
  /** Outcome from the backing lens answer, when materialized. */
  readonly targetOutcome?: OutcomeKind;
  /** Summary from the backing lens answer, when materialized. */
  readonly targetSummary?: string;
  /** Page-returned count from the backing answer, when available. */
  readonly targetReturned?: number;
  /** Page-total count from the backing answer, when available. */
  readonly targetTotal?: number;
  /** Number of evidence rows returned by the backing answer. */
  readonly targetEvidenceCount: number;
  /** Number of open seams returned by the backing answer. */
  readonly targetOpenSeamCount: number;
  /** Number of continuations returned by the backing answer. */
  readonly targetContinuationCount: number;
  /** Backing value collection samples, kept intentionally heavy for Atlas-only grounding. */
  readonly targetCollections: readonly FrameworkCapabilityEvidenceTraceCollection[];
  /** Backing evidence samples with source anchors when present. */
  readonly targetEvidenceSamples: readonly FrameworkCapabilityEvidenceTraceSample[];
  /** Compact explanation of the materialized evidence trace. */
  readonly summary: string;
}

/** Neutral grounding row derived from evidence descriptors and framework prerequisites. */
export interface FrameworkCapabilityGroundingRow {
  /** Stable grounding row id. */
  readonly id: string;
  /** Capability row being described. */
  readonly capabilityId: string;
  /** Capability domain. */
  readonly domain: FrameworkCapabilityDomain;
  /** Best grounding strength currently declared for the row. */
  readonly groundingStrength: FrameworkCapabilityGroundingStrength;
  /** Total evidence descriptors attached to the capability row. */
  readonly evidenceCount: number;
  /** Source-backed evidence descriptor count. */
  readonly sourceBackedEvidenceCount: number;
  /** Corpus-backed evidence descriptor count. */
  readonly corpusBackedEvidenceCount: number;
  /** Ungrounded evidence descriptor count. */
  readonly ungroundedEvidenceCount: number;
  /** Requirement ids that downstream consumers must account for. */
  readonly requirementIds: readonly string[];
  /** Exclusive capability ids declared by the capability row. */
  readonly exclusiveCapabilityIds: readonly string[];
  /** Factual notes about evidence and prerequisite shape. */
  readonly notes: readonly string[];
  /** Compact grounding explanation. */
  readonly summary: string;
}

/** One curated Aurelia capability row before consumer-specific policy is applied. */
export interface FrameworkCapabilityRow {
  /** Stable capability id used by Atlas filters and downstream coverage joins. */
  readonly id: string;
  /** Short human-readable capability label. */
  readonly title: string;
  /** Broad framework capability family. */
  readonly domain: FrameworkCapabilityDomain;
  /** Framework concepts that should be checked before changing this row. */
  readonly frameworkConcepts: readonly string[];
  /** Source forms an app author can use to express the capability. */
  readonly userFacingForms: readonly string[];
  /** Where the capability is selected or expressed. */
  readonly localities: readonly FrameworkCapabilityLocality[];
  /** Resource kinds directly involved in this capability, when the capability is resource-scoped. */
  readonly resourceKinds: readonly FrameworkResourceDefinitionKind[];
  /** Resource-only declaration/metadata source forms; empty for non-resource capabilities. */
  readonly resourceSourceSupport: readonly FrameworkCapabilityResourceSourceSupport[];
  /** Framework effects produced by this capability. */
  readonly effects: readonly FrameworkCapabilityEffect[];
  /** Capabilities that are usually mutually exclusive with this one. */
  readonly mutuallyExclusiveWith: readonly string[];
  /** Typed prerequisites that should exist before this capability is selected. */
  readonly requires: readonly FrameworkCapabilityRequirementRef[];
  /** Existing or intended evidence lanes for the capability. */
  readonly evidence: readonly FrameworkCapabilityEvidenceRef[];
  /** Compact rationale for future maintainers and autonomous agents. */
  readonly summary: string;
}

/** Rollup returned by the framework.capabilities lens. */
export interface FrameworkCapabilitiesValue {
  /** Number of rows after filters and before paging. */
  readonly capabilityRowCount: number;
  /** Number of curated capability rows before filters. */
  readonly totalCapabilityRowCount: number;
  /** Domain counts after filters. */
  readonly domains: Readonly<Record<string, number>>;
  /** Locality counts after filters. */
  readonly localities: Readonly<Record<string, number>>;
  /** Resource-kind counts after filters. */
  readonly resourceKinds: Readonly<Record<string, number>>;
  /** Resource source-form counts after filters. */
  readonly resourceSourceForms: Readonly<Record<string, number>>;
  /** Framework-effect counts after filters. */
  readonly effects: Readonly<Record<string, number>>;
  /** Requirement-kind counts after filters. */
  readonly requirementKinds: Readonly<Record<string, number>>;
  /** Grounding-strength counts after filters. */
  readonly groundingStrengths: Readonly<Record<string, number>>;
  /** Capability rows returned by row projections or compact summary samples. */
  readonly capabilityRows?: readonly FrameworkCapabilityRow[];
  /** Matrix rows returned by the matrix projection. */
  readonly matrixRows?: readonly FrameworkCapabilityMatrixRow[];
  /** Evidence rows returned by the evidence projection. */
  readonly evidenceRows?: readonly FrameworkCapabilityEvidenceRow[];
  /** Evidence trace rows returned by the evidence-trace projection. */
  readonly evidenceTraceRows?: readonly FrameworkCapabilityEvidenceTraceRow[];
  /** Grounding rows returned by the grounding projection. */
  readonly groundingRows?: readonly FrameworkCapabilityGroundingRow[];
  /** Source-derived concrete inventory constructs returned by the inventory projection. */
  readonly inventoryRows?: readonly FrameworkTerritoryConstruct[];
  /** Per-family reverse-coverage rows (concrete constructs vs auLink mirror) from reverse-coverage. */
  readonly reverseCoverageRows?: readonly FrameworkReverseCoverageFamily[];
  /** Per-family forward-coverage rows (concrete constructs grounded by a curated category) from coverage. */
  readonly coverageRows?: readonly FrameworkForwardCoverageFamily[];
  /** Derived capability cluster rows (concretes grouped by framework structure) from the clusters projection. */
  readonly clusterRows?: readonly FrameworkCapabilityCluster[];
}

interface FrameworkCapabilityFilters {
  readonly id?: string;
  readonly capabilityId?: string;
  readonly domain?: string;
  readonly locality?: string;
  readonly resourceKind?: string;
  readonly resourceSourceForm?: string;
  readonly effect?: string;
  readonly requirement?: string;
  readonly groundingStrength?: string;
  readonly targetRows: number;
  readonly targetEvidenceRows: number;
  readonly query?: string;
}

type CapabilityRowInit = Omit<
  FrameworkCapabilityRow,
  "mutuallyExclusiveWith" | "requires" | "evidence" | "resourceKinds" | "resourceSourceSupport"
> &
Partial<Pick<
  FrameworkCapabilityRow,
  "mutuallyExclusiveWith" | "requires" | "evidence" | "resourceKinds" | "resourceSourceSupport"
>>;

const CAPABILITY_BASIS: Basis = {
  kind: BasisKind.AtlasContract,
  closure: BasisClosure.Partial,
  authority: BasisAuthority.Contract,
  freshness: BasisFreshness.Static,
  summary:
    "Answered from curated Atlas framework capability terrain joined to existing framework lenses through evidence descriptors.",
  identity: "@aurelia-ls/atlas/framework.capabilities",
  limitations: [
    "Rows are a v1 framework terrain map, not a complete Aurelia manual.",
    "Cheap projections keep evidence as descriptors; use evidence-trace when the backing lens rows should be materialized.",
    "Rows intentionally exclude consumer-specific app-builder policy, MCP guidance, and semantic-runtime coverage state.",
  ],
};

const DEFAULT_EVIDENCE_TRACE_TARGET_ROWS = 4;
const MAX_EVIDENCE_TRACE_TARGET_ROWS = 40;
const DEFAULT_EVIDENCE_TRACE_EVIDENCE_ROWS = 4;
const MAX_EVIDENCE_TRACE_EVIDENCE_ROWS = 20;

const CAPABILITY_ROW_FAMILY = new PagedRowFamily<FrameworkCapabilityRow>({
  id: "framework.capabilities:catalog",
  rowLabel: "framework capability rows",
  evidenceForRow: (row) => capabilityEvidence(row),
  continuationsForPage: (inquiry, rows, nextOffset, limit) => {
    const continuations: Continuation[] = [];
    if (nextOffset !== undefined) {
      continuations.push(
        nextPageContinuation(
          inquiry,
          "framework.capabilities:next-page",
          "Continue the framework capability catalog.",
          nextOffset,
          limit,
          { priority: ContinuationPriority.Secondary },
        ),
      );
    }
    for (const row of rows.slice(0, 3)) {
      continuations.push(...capabilityRowContinuations(inquiry, row));
    }
    return continuations;
  },
});

const MATRIX_ROW_FAMILY = new PagedRowFamily<FrameworkCapabilityMatrixRow>({
  id: "framework.capabilities:matrix",
  rowLabel: "framework capability matrix rows",
  evidenceForRow: (row) => matrixEvidence(row),
  continuationsForPage: (inquiry, _rows, nextOffset, limit) =>
    nextOffset === undefined
      ? []
      : [
          nextPageContinuation(
            inquiry,
            "framework.capabilities:matrix:next-page",
            "Continue the framework capability matrix.",
            nextOffset,
            limit,
            { priority: ContinuationPriority.Secondary },
          ),
        ],
});

const EVIDENCE_ROW_FAMILY = new PagedRowFamily<FrameworkCapabilityEvidenceRow>({
  id: "framework.capabilities:evidence",
  rowLabel: "framework capability evidence rows",
  evidenceForRow: (row) => evidenceRowEvidence(row),
  continuationsForPage: (inquiry, _rows, nextOffset, limit) =>
    nextOffset === undefined
      ? []
      : [
          nextPageContinuation(
            inquiry,
            "framework.capabilities:evidence:next-page",
            "Continue the framework capability evidence rows.",
            nextOffset,
            limit,
            { priority: ContinuationPriority.Secondary },
          ),
      ],
});

const EVIDENCE_TRACE_ROW_FAMILY =
  new PagedRowFamily<FrameworkCapabilityEvidenceTraceRow>({
    id: "framework.capabilities:evidence-trace",
    rowLabel: "framework capability evidence trace rows",
    evidenceForRow: (row) => evidenceTraceEvidence(row),
    continuationsForPage: (inquiry, _rows, nextOffset, limit) =>
      nextOffset === undefined
        ? []
        : [
            nextPageContinuation(
              inquiry,
              "framework.capabilities:evidence-trace:next-page",
              "Continue materialized framework capability evidence traces.",
              nextOffset,
              limit,
              { priority: ContinuationPriority.Secondary },
            ),
          ],
  });

const GROUNDING_ROW_FAMILY = new PagedRowFamily<FrameworkCapabilityGroundingRow>({
  id: "framework.capabilities:grounding",
  rowLabel: "framework capability grounding rows",
  evidenceForRow: (row) => groundingEvidence(row),
  continuationsForPage: (inquiry, _rows, nextOffset, limit) =>
    nextOffset === undefined
      ? []
      : [
          nextPageContinuation(
            inquiry,
            "framework.capabilities:grounding:next-page",
            "Continue the framework capability grounding rows.",
            nextOffset,
            limit,
            { priority: ContinuationPriority.Secondary },
          ),
        ],
});

const CONVENTION_RESOURCE_KINDS: readonly FrameworkResourceDefinitionKind[] = [
  FrameworkResourceDefinitionKind.CustomElement,
  FrameworkResourceDefinitionKind.CustomAttribute,
  FrameworkResourceDefinitionKind.TemplateController,
  FrameworkResourceDefinitionKind.ValueConverter,
  FrameworkResourceDefinitionKind.BindingBehavior,
  FrameworkResourceDefinitionKind.BindingCommand,
];

const CLASS_RESOURCE_KINDS: readonly FrameworkResourceDefinitionKind[] = [
  FrameworkResourceDefinitionKind.CustomElement,
  FrameworkResourceDefinitionKind.CustomAttribute,
  FrameworkResourceDefinitionKind.TemplateController,
  FrameworkResourceDefinitionKind.ValueConverter,
  FrameworkResourceDefinitionKind.BindingBehavior,
  FrameworkResourceDefinitionKind.BindingCommand,
];

const TEMPLATE_VISIBLE_RESOURCE_KINDS: readonly FrameworkResourceDefinitionKind[] = [
  FrameworkResourceDefinitionKind.CustomElement,
  FrameworkResourceDefinitionKind.CustomAttribute,
  FrameworkResourceDefinitionKind.TemplateController,
  FrameworkResourceDefinitionKind.ValueConverter,
  FrameworkResourceDefinitionKind.BindingBehavior,
];

const METADATA_CUSTOM_ELEMENT_SOURCE_FORMS: readonly FrameworkCapabilityResourceSourceForm[] = [
  FrameworkCapabilityResourceSourceForm.Decorator,
  FrameworkCapabilityResourceSourceForm.StaticAu,
  FrameworkCapabilityResourceSourceForm.DefineCall,
];

function resourceSourceSupport(
  resourceKinds: readonly FrameworkResourceDefinitionKind[],
  sourceForms: readonly FrameworkCapabilityResourceSourceForm[],
): readonly FrameworkCapabilityResourceSourceSupport[] {
  return resourceKinds.map((resourceKind) => ({
    resourceKind,
    sourceForms,
  }));
}

export const FRAMEWORK_CAPABILITY_ROWS: readonly FrameworkCapabilityRow[] = [
  capability({
    id: "resource-source:convention",
    title: "Convention resource source form",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["conventions", "resource naming"],
    userFacingForms: ["class/file naming convention", "default resource naming"],
    localities: [FrameworkCapabilityLocality.AppGlobal],
    resourceKinds: CONVENTION_RESOURCE_KINDS,
    resourceSourceSupport: resourceSourceSupport(
      CONVENTION_RESOURCE_KINDS,
      [FrameworkCapabilityResourceSourceForm.Convention],
    ),
    effects: [
      FrameworkCapabilityEffect.ResourceDiscovery,
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ResourceVisibility,
    ],
    summary:
      "Aurelia can infer named resources from active naming conventions when the conventions capability is admitted.",
    evidence: [
      lensEvidence(LensId.FrameworkResources, "convergence", "Framework resource convergence exposes convention-discovered carriers."),
    ],
  }),
  capability({
    id: "resource-source:decorator",
    title: "Decorator resource source form",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["resource decorators", "metadata annotation"],
    userFacingForms: ["@customElement(...)", "@customAttribute(...)", "@valueConverter(...)", "@bindingBehavior(...)", "@bindingCommand(...)"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: CLASS_RESOURCE_KINDS,
    resourceSourceSupport: resourceSourceSupport(
      CLASS_RESOURCE_KINDS,
      [FrameworkCapabilityResourceSourceForm.Decorator],
    ),
    effects: [FrameworkCapabilityEffect.ResourceDefinition],
    summary:
      "Aurelia can read resource definitions from class decorator metadata on resource classes.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Framework resource convergence follows decorator carriers.")],
  }),
  capability({
    id: "resource-source:static-au",
    title: "Static $au resource source form",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["static $au", "resource definition"],
    userFacingForms: ["static $au metadata"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: CLASS_RESOURCE_KINDS,
    resourceSourceSupport: resourceSourceSupport(
      CLASS_RESOURCE_KINDS,
      [FrameworkCapabilityResourceSourceForm.StaticAu],
    ),
    effects: [FrameworkCapabilityEffect.ResourceDefinition],
    summary:
      "Aurelia can read class-side static $au resource definition metadata without decorators.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence follows static resource metadata carriers.")],
  }),
  capability({
    id: "resource-source:define-call",
    title: "Definition-call resource source form",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["define", "resource definition API"],
    userFacingForms: ["CustomElement.define(...)", "CustomAttribute.define(...)", "ValueConverter.define(...)", "BindingCommand.define(...)"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: CLASS_RESOURCE_KINDS,
    resourceSourceSupport: resourceSourceSupport(
      CLASS_RESOURCE_KINDS,
      [FrameworkCapabilityResourceSourceForm.DefineCall],
    ),
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ResourceRegistration,
    ],
    summary:
      "Aurelia can define resource metadata through imperative definition APIs on resource definition kinds.",
    evidence: [
      lensEvidence(LensId.FrameworkResources, "convergence", "Framework resource rows include define-call materialization sites."),
      lensEvidence(LensId.FrameworkEvaluator, "effects", "Static evaluator is the correct substrate for define-call effects."),
    ],
  }),
  capability({
    id: "resource-source:attribute-pattern-create",
    title: "AttributePattern.create source form",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["AttributePattern.create", "syntax resource"],
    userFacingForms: ["AttributePattern.create(...)"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.AttributePattern],
    resourceSourceSupport: resourceSourceSupport(
      [FrameworkResourceDefinitionKind.AttributePattern],
      [FrameworkCapabilityResourceSourceForm.AttributePatternCreate],
    ),
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ResourceRegistration,
    ],
    summary:
      "Aurelia attribute patterns are syntax resources created through AttributePattern.create rather than ordinary named-resource decorators.",
    evidence: [
      lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence keeps AttributePattern.create as a distinct syntax-resource carrier."),
    ],
  }),
  capability({
    id: "resource:custom-element",
    title: "Custom element resource kind",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["CustomElement", "CustomElementDefinition"],
    userFacingForms: ["component view model", "custom element tag"],
    localities: [FrameworkCapabilityLocality.ResourceLocal, FrameworkCapabilityLocality.TemplateLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ResourceVisibility,
      FrameworkCapabilityEffect.ResourceRegistration,
    ],
    summary:
      "Custom elements are template-visible component resources with view, bindable, and lifecycle semantics.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Framework resource convergence follows custom element definitions and visibility.")],
  }),
  capability({
    id: "resource:custom-attribute",
    title: "Custom attribute resource kind",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["CustomAttribute", "CustomAttributeDefinition"],
    userFacingForms: ["custom attribute", "attribute resource class"],
    localities: [FrameworkCapabilityLocality.ResourceLocal, FrameworkCapabilityLocality.TemplateLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomAttribute],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ResourceVisibility,
      FrameworkCapabilityEffect.ResourceRegistration,
    ],
    summary:
      "Custom attributes are template-visible attribute resources with bindable and target-observation implications.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Framework resource convergence includes custom attribute carriers and syntax visibility.")],
  }),
  capability({
    id: "resource:template-controller",
    title: "Template controller resource kind",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["template controller", "isTemplateController", "CustomAttributeDefinition"],
    userFacingForms: ["template controller attribute"],
    localities: [FrameworkCapabilityLocality.ResourceLocal, FrameworkCapabilityLocality.TemplateLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.TemplateController],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ResourceVisibility,
      FrameworkCapabilityEffect.ResourceRegistration,
      FrameworkCapabilityEffect.SyntheticViewControlFlow,
    ],
    summary:
      "Template controllers are custom-attribute-shaped resources that own synthetic view control-flow semantics.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence keeps template controllers distinct from ordinary custom attributes.")],
  }),
  capability({
    id: "resource:value-converter",
    title: "Value converter resource kind",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["valueConverter", "ValueConverter"],
    userFacingForms: ["value converter", "converter expression pipe"],
    localities: [
      FrameworkCapabilityLocality.ResourceLocal,
      FrameworkCapabilityLocality.BindingSite,
    ],
    resourceKinds: [FrameworkResourceDefinitionKind.ValueConverter],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ExpressionEvaluation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can register value converter resources and invoke them from binding expressions.",
    evidence: [
      lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence identifies value converter resources."),
      lensEvidence(LensId.FrameworkRendering, "summary", "Rendering lenses expose value-converter expression wiring."),
    ],
  }),
  capability({
    id: "resource:binding-behavior",
    title: "Binding behavior resource kind",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["bindingBehavior", "BindingBehavior"],
    userFacingForms: ["binding behavior", "expression & behavior"],
    localities: [
      FrameworkCapabilityLocality.ResourceLocal,
      FrameworkCapabilityLocality.BindingSite,
    ],
    resourceKinds: [FrameworkResourceDefinitionKind.BindingBehavior],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ExpressionEvaluation,
    ],
    summary:
      "Aurelia can register binding behavior resources that participate in binding lifecycle and expression semantics.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence identifies binding behavior resources.")],
  }),
  capability({
    id: "resource:binding-command",
    title: "Binding command resource kind",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["BindingCommand", "IBindingCommandResolver"],
    userFacingForms: ["binding command resource", "attribute command syntax"],
    localities: [
      FrameworkCapabilityLocality.ResourceLocal,
      FrameworkCapabilityLocality.BindingSite,
    ],
    resourceKinds: [FrameworkResourceDefinitionKind.BindingCommand],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Binding commands are compiler resources that transform attribute syntax into binding instructions.",
    evidence: [lensEvidence(LensId.FrameworkCompiler, "attribute-classification", "Compiler lens follows binding command lookup and instruction production.")],
  }),
  capability({
    id: "resource:attribute-pattern",
    title: "Attribute pattern resource kind",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["AttributePattern", "attribute syntax"],
    userFacingForms: ["attribute pattern syntax resource"],
    localities: [FrameworkCapabilityLocality.ResourceLocal, FrameworkCapabilityLocality.BindingSite],
    resourceKinds: [FrameworkResourceDefinitionKind.AttributePattern],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ExpressionEvaluation,
    ],
    summary:
      "Attribute patterns are compiler syntax resources that recognize custom attribute command shapes.",
    evidence: [lensEvidence(LensId.FrameworkCompiler, "attribute-classification", "Compiler lens follows attribute pattern classification before binding command lookup.")],
  }),
  capability({
    id: "resource:bindable",
    title: "Bindable property declaration",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["bindable", "BindableDefinition", "BindingMode"],
    userFacingForms: ["@bindable", "bindables metadata", "static bindables"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: [
      FrameworkResourceDefinitionKind.CustomElement,
      FrameworkResourceDefinitionKind.CustomAttribute,
      FrameworkResourceDefinitionKind.TemplateController,
    ],
    effects: [
      FrameworkCapabilityEffect.TargetApi,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can expose component and attribute properties as bindable target APIs with binding-mode metadata.",
    evidence: [
      lensEvidence(LensId.FrameworkResources, "convergence", "Framework resource rows expose bindable metadata lanes."),
      lensEvidence(LensId.FrameworkObservation, "summary", "Observation lens anchors bindable-backed observer and writeback behavior."),
    ],
  }),
  capability({
    id: "resource:inline-custom-element",
    title: "Inline custom element template metadata",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["inline template", "CustomElementDefinition"],
    userFacingForms: ["inline template definition", "template in definition metadata"],
    localities: [
      FrameworkCapabilityLocality.ResourceLocal,
      FrameworkCapabilityLocality.TemplateLocal,
    ],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
    resourceSourceSupport: resourceSourceSupport(
      [FrameworkResourceDefinitionKind.CustomElement],
      METADATA_CUSTOM_ELEMENT_SOURCE_FORMS,
    ),
    effects: [FrameworkCapabilityEffect.ResourceDefinition],
    summary:
      "Aurelia custom element definition metadata can carry inline template text instead of pointing at a companion template file.",
    evidence: [
      lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence can expose inline definition carriers."),
    ],
  }),
  capability({
    id: "resource:template-local-dependency",
    title: "Template-local dependency visibility",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["dependencies", "local resource lookup"],
    userFacingForms: ["dependencies array", "local resource registration"],
    localities: [FrameworkCapabilityLocality.TemplateLocal],
    resourceKinds: TEMPLATE_VISIBLE_RESOURCE_KINDS,
    effects: [FrameworkCapabilityEffect.ResourceVisibility],
    summary:
      "Local resource visibility constrains which elements, attributes, converters, and behaviors are legal in a template.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Framework resource convergence is the grounding lens for local dependency lookup.")],
  }),
  capability({
    id: "resource:as-element",
    title: "as-element aliasing",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["as-element", "resource aliasing"],
    userFacingForms: ["as-element attribute"],
    localities: [FrameworkCapabilityLocality.TemplateLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
    effects: [FrameworkCapabilityEffect.ResourceVisibility],
    summary:
      "Aurelia can apply custom element semantics through as-element aliasing in a template.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource syntax lanes identify template resource aliases.")],
  }),
  capability({
    id: "resource:containerless",
    title: "Containerless custom-element usage",
    domain: FrameworkCapabilityDomain.Resource,
    frameworkConcepts: ["containerless", "CustomElementDefinition.containerless", "HydrateElementInstruction.containerless"],
    userFacingForms: ["@containerless", "containerless definition metadata", "containerless attribute"],
    localities: [
      FrameworkCapabilityLocality.ResourceLocal,
      FrameworkCapabilityLocality.TemplateLocal,
    ],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
    resourceSourceSupport: resourceSourceSupport(
      [FrameworkResourceDefinitionKind.CustomElement],
      METADATA_CUSTOM_ELEMENT_SOURCE_FORMS,
    ),
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.DomEncapsulation,
    ],
    summary:
      "Aurelia custom elements can be declared or used as containerless, causing hydration to replace the host with render-location markers.",
    evidence: [
      lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence exposes containerless custom-element metadata."),
      lensEvidence(LensId.FrameworkCompiler, "attribute-classification", "The template compiler treats usage-site containerless as compiler-control syntax.", "containerless"),
    ],
  }),
  capability({
    id: "configuration:standard-bundle",
    title: "Standard configuration bundle",
    domain: FrameworkCapabilityDomain.Configuration,
    frameworkConcepts: ["StandardConfiguration", "bundle admission"],
    userFacingForms: ["Aurelia.register(StandardConfiguration)"],
    localities: [FrameworkCapabilityLocality.AppGlobal],
    effects: [
      FrameworkCapabilityEffect.FeatureAdmission,
      FrameworkCapabilityEffect.ConfigurationAdmission,
      FrameworkCapabilityEffect.ResourceRegistration,
      FrameworkCapabilityEffect.DiRegistration,
    ],
    summary:
      "Aurelia exposes StandardConfiguration as a bundled admission capability and a useful framework-discovery entrypoint.",
    evidence: [
      lensEvidence(LensId.FrameworkAdmission, "bundles", "Admission lens shows StandardConfiguration bundle admissions."),
      lensEvidence(LensId.FrameworkDi, "world", "DI world projection unrolls StandardConfiguration resolver and resource slots."),
      lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence joins bundle admissions to resource visibility."),
    ],
  }),
  capability({
    id: "configuration:actionless-form-submit",
    title: "Actionless form submit prevention",
    domain: FrameworkCapabilityDomain.Configuration,
    frameworkConcepts: ["AppRoot", "IAppRootConfig", "allowActionlessForm"],
    userFacingForms: ["actionless form submit", "submit.trigger on a form", "Aurelia.app({ allowActionlessForm: true })"],
    localities: [
      FrameworkCapabilityLocality.AppGlobal,
      FrameworkCapabilityLocality.TemplateLocal,
    ],
    effects: [
      FrameworkCapabilityEffect.ConfigurationAdmission,
      FrameworkCapabilityEffect.EventHandling,
    ],
    summary:
      "Aurelia prevents native submit navigation for actionless forms by default at the app root, and the app-root config can explicitly allow that native behavior.",
    evidence: [
      lensEvidence(LensId.FrameworkApi, "subjects", "Framework API rows expose IAppRootConfig.allowActionlessForm and AppRoot behavior.", "IAppRootConfig"),
      lensEvidence(LensId.BridgeAuLink, "anchors", "auLink anchors connect the semantic-runtime AppRootConfig mirror to the framework app-root config.", "runtime-html:IAppRootConfig"),
      docsEvidence("submit.trigger", "Forms documentation explains actionless form submit prevention and the allowActionlessForm override."),
    ],
  }),
  capability({
    id: "style:light-dom",
    title: "Light DOM component rendering",
    domain: FrameworkCapabilityDomain.Styling,
    frameworkConcepts: ["CustomElementDefinition", "shadowOptions"],
    userFacingForms: ["default custom element rendering"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
    effects: [FrameworkCapabilityEffect.DomEncapsulation],
    mutuallyExclusiveWith: ["style:use-shadow-dom"],
    summary:
      "Aurelia custom elements render in light DOM unless shadow DOM metadata is supplied.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Custom element definition metadata carries DOM/styling-related options.")],
  }),
  capability({
    id: "style:use-shadow-dom",
    title: "Shadow DOM component rendering",
    domain: FrameworkCapabilityDomain.Styling,
    frameworkConcepts: ["useShadowDOM", "shadowOptions"],
    userFacingForms: ["@useShadowDOM", "shadowOptions metadata"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
    resourceSourceSupport: resourceSourceSupport(
      [FrameworkResourceDefinitionKind.CustomElement],
      METADATA_CUSTOM_ELEMENT_SOURCE_FORMS,
    ),
    effects: [FrameworkCapabilityEffect.DomEncapsulation],
    mutuallyExclusiveWith: ["style:light-dom"],
    summary:
      "Aurelia custom elements can opt into shadow DOM rendering through metadata.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource metadata rows can anchor shadow DOM declaration forms.")],
  }),
  capability({
    id: "style:stylesheet-tooling",
    title: "Stylesheet tooling configuration",
    domain: FrameworkCapabilityDomain.Styling,
    frameworkConcepts: ["cssExtensions", "defaultShadowOptions", "stringModuleWrap", "useCSSModule"],
    userFacingForms: ["Aurelia plugin-conventions preprocessing options", "CSS dependency import", "CSS module dependency import", "Shadow DOM CSS dependency import"],
    localities: [FrameworkCapabilityLocality.AppGlobal, FrameworkCapabilityLocality.ResourceLocal],
    effects: [
      FrameworkCapabilityEffect.ToolingTransform,
      FrameworkCapabilityEffect.StyleAvailability,
      FrameworkCapabilityEffect.ResourceDiscovery,
    ],
    requires: [
      toolingRequirement(
        "stylesheet-transform",
        "Stylesheet discovery, imports, preprocessing, and CSS-module values depend on package/build tooling before Aurelia consumes the result.",
      ),
    ],
    summary:
      "Aurelia app tooling can discover stylesheet dependencies, choose bundler import strategy, and emit cssModules(...) or shadowCSS(...) dependencies without making semantic-runtime own CSS design semantics.",
    evidence: [
      lensEvidence(LensId.WorkspaceArchitecture, "surfaces", "Workspace architecture can expose Aurelia packages-tooling style preprocessing option surfaces.", "cssExtensions"),
    ],
  }),
  capability({
    id: "style:component-stylesheet",
    title: "Component stylesheet",
    domain: FrameworkCapabilityDomain.Styling,
    frameworkConcepts: ["component styles", "template dependencies"],
    userFacingForms: ["co-located css", "style dependency import"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
    effects: [FrameworkCapabilityEffect.StyleAvailability],
    summary:
      "Aurelia can associate styles with individual components through resource/template dependency mechanisms.",
    evidence: [docsEvidence("styling", "Framework docs and tests should seed style locality patterns.")],
  }),
  capability({
    id: "style:global-stylesheet",
    title: "Global stylesheet",
    domain: FrameworkCapabilityDomain.Styling,
    frameworkConcepts: ["global styles"],
    userFacingForms: ["app-level stylesheet import", "document-level css"],
    localities: [FrameworkCapabilityLocality.AppGlobal],
    effects: [FrameworkCapabilityEffect.StyleAvailability],
    summary:
      "Aurelia applications can include global styles as part of the app/tooling landscape.",
    evidence: [docsEvidence("styling", "Documentation corpus can seed global stylesheet setup patterns.")],
  }),
  capability({
    id: "style:css-modules",
    title: "CSS module registry dependency",
    domain: FrameworkCapabilityDomain.Styling,
    frameworkConcepts: ["cssModules", "CSSModulesProcessorRegistry", "ICssClassMapping"],
    userFacingForms: ["css module import", "cssModules(module) dependency", "class map binding"],
    localities: [FrameworkCapabilityLocality.AreaLocal, FrameworkCapabilityLocality.ResourceLocal],
    effects: [
      FrameworkCapabilityEffect.ToolingTransform,
      FrameworkCapabilityEffect.StyleAvailability,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    requires: [
      capabilityRequirement(
        "style:stylesheet-tooling",
        "CSS module registry dependencies still depend on stylesheet import/tooling support.",
      ),
      toolingRequirement(
        "css-module-import",
        "CSS module imports require package/tooling support before templates can consume generated class maps.",
      ),
    ],
    summary:
      "Aurelia can register CSS module class mappings as component dependencies after package tooling has transformed the imported stylesheet module.",
    evidence: [
      lensEvidence(LensId.FrameworkApi, "subjects", "Framework API rows expose the cssModules registry helper.", "cssModules"),
      lensEvidence(LensId.WorkspaceArchitecture, "surfaces", "Workspace architecture can expose Aurelia packages-tooling CSS module preprocessing surfaces.", "useCSSModule"),
    ],
  }),
  capability({
    id: "style:shadow-css-registry",
    title: "Shadow CSS registry dependency",
    domain: FrameworkCapabilityDomain.Styling,
    frameworkConcepts: ["shadowCSS", "ShadowDOMRegistry", "IShadowDOMStyles"],
    userFacingForms: ["shadowCSS(css) dependency", "shadow CSS import", "shadowOptions metadata"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    resourceKinds: [FrameworkResourceDefinitionKind.CustomElement],
    effects: [
      FrameworkCapabilityEffect.StyleAvailability,
      FrameworkCapabilityEffect.DomEncapsulation,
      FrameworkCapabilityEffect.DiRegistration,
    ],
    requires: [
      capabilityRequirement(
        "style:use-shadow-dom",
        "Shadow CSS registry dependencies are only meaningful when the component renders through Shadow DOM semantics.",
      ),
      capabilityRequirement(
        "style:stylesheet-tooling",
        "Imported Shadow DOM styles still depend on stylesheet import/tooling support.",
      ),
    ],
    summary:
      "Aurelia can register component-scoped Shadow DOM styles through shadowCSS(...) dependencies while leaving CSS processing to app tooling.",
    evidence: [
      lensEvidence(LensId.FrameworkApi, "subjects", "Framework API rows expose the shadowCSS registry helper.", "shadowCSS"),
      lensEvidence(LensId.FrameworkDi, "registrations", "DI registration rows can ground Shadow DOM style registry effects.", "IShadowDOMStyles"),
    ],
  }),
  capability({
    id: "router:admission",
    title: "Router admission",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["Aurelia Router", "RouterConfiguration"],
    userFacingForms: ["register router configuration", "router plugin setup"],
    localities: [FrameworkCapabilityLocality.AppGlobal],
    effects: [
      FrameworkCapabilityEffect.FeatureAdmission,
      FrameworkCapabilityEffect.ConfigurationAdmission,
    ],
    requires: [
      packageRequirement(
        "@aurelia/router",
        "Router admission requires the Aurelia router package/configuration surface to be available.",
      ),
    ],
    summary:
      "Aurelia can admit the router as an app-level feature through router configuration.",
    evidence: [
      lensEvidence(LensId.FrameworkRouter, "summary", "Router lens maps framework router, route context, and viewport architecture."),
      lensEvidence(LensId.FrameworkAdmission, "summary", "Admission lens identifies configuration entry points for feature bundles."),
    ],
  }),
  capability({
    id: "router:top-level-routes",
    title: "Top-level route configuration",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["RouteConfig", "routes"],
    userFacingForms: ["static routes", "@route", "route config array"],
    localities: [FrameworkCapabilityLocality.AppGlobal, FrameworkCapabilityLocality.RouteLocal],
    effects: [FrameworkCapabilityEffect.RouteConfiguration],
    requires: [capabilityRequirement("router:admission")],
    summary:
      "Aurelia router can declare route patterns, components, child routes, and route metadata.",
    evidence: [lensEvidence(LensId.FrameworkRouter, "flow", "Router lens exposes route config and route endpoint rows.", "RouteConfig")],
  }),
  capability({
    id: "router:routeable-component",
    title: "Routeable component",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["RouteableComponent", "route component"],
    userFacingForms: ["component referenced by route", "component with load hook"],
    localities: [FrameworkCapabilityLocality.RouteLocal, FrameworkCapabilityLocality.ResourceLocal],
    effects: [
      FrameworkCapabilityEffect.RouteConfiguration,
      FrameworkCapabilityEffect.LifecycleDispatch,
    ],
    requires: [capabilityRequirement("router:top-level-routes")],
    summary:
      "Routeability is a semantic role a component gains from route configuration, not a separate component declaration mode.",
    evidence: [lensEvidence(LensId.FrameworkRouter, "flow", "Router endpoint rows connect route patterns to component targets.", "endpoint")],
  }),
  capability({
    id: "router:load-parameters",
    title: "Route parameters through load hook",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["load", "RouteNode", "route parameters"],
    userFacingForms: ["load(parameters)", "route lifecycle hook"],
    localities: [FrameworkCapabilityLocality.RouteLocal],
    effects: [
      FrameworkCapabilityEffect.RouteParameterFlow,
      FrameworkCapabilityEffect.LifecycleDispatch,
    ],
    requires: [capabilityRequirement("router:top-level-routes")],
    summary:
      "Aurelia router can provide route parameters through route lifecycle hooks.",
    evidence: [lensEvidence(LensId.FrameworkRouter, "flow", "Router lens maps parameter reads and route context surfaces.", "parameters")],
  }),
  capability({
    id: "router:route-context-parameters",
    title: "Route context parameter reads",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["IRouteContext", "getRouteParameters"],
    userFacingForms: ["resolve(IRouteContext).getRouteParameters()", "route context read"],
    localities: [FrameworkCapabilityLocality.RouteLocal, FrameworkCapabilityLocality.ResourceLocal],
    effects: [
      FrameworkCapabilityEffect.DiResolution,
      FrameworkCapabilityEffect.RouteParameterFlow,
    ],
    requires: [capabilityRequirement("router:admission")],
    summary:
      "Aurelia router can expose route parameters through route context services.",
    evidence: [lensEvidence(LensId.FrameworkRouter, "flow", "Router lens explicitly tracks route context parameter reads.", "getRouteParameters")],
  }),
  capability({
    id: "router:navigation-instructions",
    title: "Navigation instructions",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["route href", "NavigationInstruction"],
    userFacingForms: ["load route", "href route binding", "router.load"],
    localities: [FrameworkCapabilityLocality.TemplateLocal, FrameworkCapabilityLocality.RouteLocal],
    effects: [FrameworkCapabilityEffect.Navigation],
    requires: [capabilityRequirement("router:admission")],
    summary:
      "Navigation instructions are the typed bridge from route declarations to user actions and links.",
    evidence: [lensEvidence(LensId.FrameworkRouter, "flow", "Router lens carries typed navigation instruction rows.", "navigation")],
  }),

  capability({
    id: "router:au-viewport",
    title: "au-viewport outlet",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["au-viewport", "route tree", "viewport agent"],
    userFacingForms: ["au-viewport", "named viewport", "route outlet"],
    localities: [FrameworkCapabilityLocality.TemplateLocal, FrameworkCapabilityLocality.RouteLocal],
    effects: [FrameworkCapabilityEffect.ViewportComposition],
    requires: [capabilityRequirement("router:admission")],
    summary:
      "Aurelia router can render route components into au-viewport outlets managed by viewport agents.",
    evidence: [lensEvidence(LensId.FrameworkRouter, "flow", "Router lens models viewport instructions and route-tree branching.", "au-viewport")],
  }),
  capability({
    id: "router:nested-viewports",
    title: "Nested viewport consequence",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["au-viewport", "ViewportAgent", "route tree"],
    userFacingForms: ["nested au-viewport", "child route outlet"],
    localities: [FrameworkCapabilityLocality.RouteLocal, FrameworkCapabilityLocality.TemplateLocal],
    effects: [FrameworkCapabilityEffect.ViewportComposition],
    requires: [capabilityRequirement("router:au-viewport")],
    summary:
      "Aurelia router can build nested route and viewport trees from route configuration and viewport outlets.",
    evidence: [lensEvidence(LensId.FrameworkRouter, "surfaces", "Viewport-agent rows are the grounding surface for nested viewport semantics.", "au-viewport")],
  }),
  capability({
    id: "router:route-recognizer",
    title: "Route recognition",
    domain: FrameworkCapabilityDomain.Router,
    frameworkConcepts: ["route-recognizer", "route pattern"],
    userFacingForms: ["route path patterns", "parameterized routes"],
    localities: [FrameworkCapabilityLocality.RouteLocal],
    effects: [FrameworkCapabilityEffect.RouteRecognition],
    requires: [capabilityRequirement("router:top-level-routes")],
    summary:
      "Aurelia uses route-recognizer semantics to parse route patterns and select route endpoints.",
    evidence: [lensEvidence(LensId.FrameworkRouter, "recognizer", "Router lens exposes route-recognizer state and issue rows.", "RouteRecognizer")],
  }),


  capability({
    id: "state:state-plugin-store",
    title: "State plugin store",
    domain: FrameworkCapabilityDomain.State,
    frameworkConcepts: ["@aurelia/state", "store"],
    userFacingForms: ["state plugin store", "action/reducer-like flow"],
    localities: [FrameworkCapabilityLocality.AppGlobal],
    effects: [
      FrameworkCapabilityEffect.PluginAdmission,
      FrameworkCapabilityEffect.StateStoreAdmission,
    ],
    requires: [
      packageRequirement(
        "@aurelia/state",
        "State plugin store capabilities require the Aurelia state package to be available.",
      ),
    ],
    summary:
      "The Aurelia ecosystem can provide state-management capabilities through the state plugin package.",
    evidence: [lensEvidence(LensId.PluginArchitecture, "summary", "Plugin architecture lens grounds plugin-provided store surfaces.")],
  }),
  capability({
    id: "state:binding-behavior",
    title: "State binding behavior",
    domain: FrameworkCapabilityDomain.State,
    frameworkConcepts: [
      "StateBindingBehavior",
      "BindingBehavior.define('state', ...)",
      "createStateBindingScope",
    ],
    userFacingForms: ["& state", "& state:'storeName'"],
    localities: [FrameworkCapabilityLocality.BindingSite],
    resourceKinds: [FrameworkResourceDefinitionKind.BindingBehavior],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ExpressionEvaluation,
      FrameworkCapabilityEffect.BindingDataFlow,
      FrameworkCapabilityEffect.SourceObservation,
    ],
    requires: [capabilityRequirement("state:state-plugin-store")],
    summary:
      "`& state` evaluates ordinary binding expressions against a store-backed state scope while preserving the original template scope as parent.",
    evidence: [
      lensEvidence(LensId.PluginArchitecture, "surfaces", "Plugin architecture should expose the state plugin binding behavior resource.", "StateBindingBehavior"),
      lensEvidence(LensId.FrameworkObservation, "flow-sites", "Observation flow-sites are the grounding lane for the createStateBindingScope handoff.", "state binding behavior"),
      lensEvidence(LensId.BridgeAuLink, "anchors", "auLink anchors connect the semantic-runtime StateBindingBehavior mirror to the framework plugin class.", "state:StateBindingBehavior"),
    ],
  }),
  capability({
    id: "state:binding-command",
    title: "State binding command",
    domain: FrameworkCapabilityDomain.State,
    frameworkConcepts: [
      "StateAttributePattern",
      "StateBindingCommand",
      "StateBindingInstruction",
      "StateBinding",
    ],
    userFacingForms: ["value.state=\"text\"", "value.state:storeName=\"text\""],
    localities: [FrameworkCapabilityLocality.BindingSite],
    resourceKinds: [
      FrameworkResourceDefinitionKind.AttributePattern,
      FrameworkResourceDefinitionKind.BindingCommand,
    ],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ExpressionEvaluation,
      FrameworkCapabilityEffect.TargetObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
      FrameworkCapabilityEffect.SourceObservation,
    ],
    requires: [capabilityRequirement("state:state-plugin-store")],
    summary:
      "`.state` is a plugin binding command that lowers target/store syntax into a StateBinding expression evaluated against the configured store-state scope.",
    evidence: [
      lensEvidence(LensId.PluginArchitecture, "surfaces", "Plugin architecture should expose the state attribute pattern and binding command registrations.", "StateBindingCommand"),
      lensEvidence(LensId.FrameworkCompiler, "attribute-classification", "Compiler classification grounds binding-command syntax and attribute-pattern handoff.", "state"),
      lensEvidence(LensId.BridgeAuLink, "anchors", "auLink anchors connect StateAttributePattern and StateBindingCommand mirrors to framework plugin classes.", "state:StateBindingCommand"),
    ],
  }),
  capability({
    id: "state:dispatch-binding-command",
    title: "State dispatch binding command",
    domain: FrameworkCapabilityDomain.State,
    frameworkConcepts: [
      "StateAttributePattern",
      "DispatchBindingCommand",
      "DispatchBindingInstruction",
      "StateDispatchBinding",
    ],
    userFacingForms: ["click.dispatch=\"{ type: 'save' }\"", "input.dispatch:storeName=\"{ type: 'edit', value: $event.target.value }\""],
    localities: [FrameworkCapabilityLocality.BindingSite],
    resourceKinds: [
      FrameworkResourceDefinitionKind.AttributePattern,
      FrameworkResourceDefinitionKind.BindingCommand,
    ],
    effects: [
      FrameworkCapabilityEffect.ResourceDefinition,
      FrameworkCapabilityEffect.ExpressionEvaluation,
      FrameworkCapabilityEffect.BindingDataFlow,
      FrameworkCapabilityEffect.StateStoreAdmission,
    ],
    requires: [capabilityRequirement("state:state-plugin-store")],
    summary:
      "`.dispatch` is a plugin event binding command that evaluates an action expression in the store-state scope plus listener `$event`, then dispatches the result to the selected store.",
    evidence: [
      lensEvidence(LensId.PluginArchitecture, "surfaces", "Plugin architecture should expose the state dispatch binding command and renderer registrations.", "DispatchBindingCommand"),
      lensEvidence(LensId.FrameworkCompiler, "attribute-classification", "Compiler classification grounds dispatch command syntax and attribute-pattern handoff.", "dispatch"),
      lensEvidence(LensId.BridgeAuLink, "anchors", "auLink anchors connect DispatchBindingCommand and StateDispatchBinding mirrors to framework plugin classes.", "state:DispatchBindingCommand"),
    ],
  }),
  capability({
    id: "state:from-state-decorator",
    title: "fromState decorator",
    domain: FrameworkCapabilityDomain.State,
    frameworkConcepts: ["fromState", "StateGetterBinding", "IStoreRegistry"],
    userFacingForms: ["@fromState(state => state.items)", "@fromState('storeName', state => state.items)"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    effects: [
      FrameworkCapabilityEffect.ExpressionEvaluation,
      FrameworkCapabilityEffect.SourceObservation,
      FrameworkCapabilityEffect.StateStoreAdmission,
    ],
    requires: [capabilityRequirement("state:state-plugin-store")],
    summary:
      "`@fromState` projects a selected store-state expression into a field or setter target and participates in store lookup diagnostics.",
    evidence: [
      lensEvidence(LensId.FrameworkDiscovery, "package-exports", "Framework discovery should expose the @aurelia/state decorator export.", "fromState"),
      lensEvidence(LensId.FrameworkAdmission, "relationships", "Admission relationships should expose state store registry configuration.", "IStoreRegistry"),
      lensEvidence(LensId.BridgeAuLink, "anchors", "auLink and semantic-runtime state diagnostics ground the modeled decorator target and store lookup behavior.", "state:fromState"),
      docsEvidence("fromState", "State package docs and tests should ground the promoted @fromState source forms."),
    ],
  }),
  capability({
    id: "observation:proxy-object",
    title: "Proxy object observation",
    domain: FrameworkCapabilityDomain.Observation,
    frameworkConcepts: ["ObserverLocator", "proxy observation", "connectable"],
    userFacingForms: ["ordinary class instance", "plain object state", "observed getter access"],
    localities: [FrameworkCapabilityLocality.BindingSite, FrameworkCapabilityLocality.ResourceLocal],
    effects: [
      FrameworkCapabilityEffect.SourceObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can observe ordinary object and class-instance property reads through the integrated proxy/connectable observation system.",
    evidence: [
      lensEvidence(LensId.FrameworkObservation, "flow-sites", "Observation lens maps observer locator and connectable integration."),
    ],
  }),
  capability({
    id: "observation:getter",
    title: "Getter observation",
    domain: FrameworkCapabilityDomain.Observation,
    frameworkConcepts: ["getter descriptor", "ComputedObserver", "ObserverLocator"],
    userFacingForms: ["get filteredItems()", "get selectedItem()"],
    localities: [FrameworkCapabilityLocality.ResourceLocal, FrameworkCapabilityLocality.BindingSite],
    effects: [FrameworkCapabilityEffect.SourceObservation],
    summary:
      "Getter observation is automatic through observer-locator descriptor handling and must not be confused with @computed.",
    evidence: [
      lensEvidence(LensId.FrameworkObservation, "observer-locator-decisions", "Observation lens is the correct place to verify getter descriptor handling."),
    ],
  }),
  capability({
    id: "observation:collection",
    title: "Collection observation",
    domain: FrameworkCapabilityDomain.Observation,
    frameworkConcepts: ["ArrayObserver", "CollectionLengthObserver", "ProxyObservable collection methods"],
    userFacingForms: ["array state", "map/set state", "repeat.for collection source"],
    localities: [FrameworkCapabilityLocality.BindingSite, FrameworkCapabilityLocality.ResourceLocal, FrameworkCapabilityLocality.TemplateLocal],
    effects: [
      FrameworkCapabilityEffect.SourceObservation,
      FrameworkCapabilityEffect.CollectionObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can observe array, map, and set collection access or mutation through observer-locator and proxy/connectable collection semantics.",
    evidence: [
      lensEvidence(LensId.FrameworkObservation, "collection-methods", "Observation lens exposes collection method and mutation observation policy."),
      lensEvidence(LensId.FrameworkObservation, "observer-locator-decisions", "Observer locator decisions expose array length/index and collection-size observer branches."),
    ],
  }),
  capability({
    id: "observation:computed-decorator",
    title: "Explicit computed dependencies",
    domain: FrameworkCapabilityDomain.Observation,
    frameworkConcepts: ["computed", "computedFrom"],
    userFacingForms: ["@computed", "declared getter dependencies"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    effects: [FrameworkCapabilityEffect.SourceObservation],
    summary:
      "@computed declares dependencies for cases where automatic/proxy observation is not desired or sufficient; it does not enable proxy observation.",
    evidence: [lensEvidence(LensId.FrameworkObservation, "surface-methods", "Observation lens exposes computed observer definitions separately from proxy observation.")],
  }),
  capability({
    id: "binding:native-value-channel",
    title: "Native value binding channel",
    domain: FrameworkCapabilityDomain.Binding,
    frameworkConcepts: ["value.bind", "ValueAttributeObserver"],
    userFacingForms: ["value.bind", "value.two-way"],
    localities: [FrameworkCapabilityLocality.BindingSite],
    effects: [
      FrameworkCapabilityEffect.TargetObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can observe and write native value-like target properties through specialized observer channels.",
    evidence: [
      lensEvidence(LensId.FrameworkObservation, "flow-sites", "Observation lens anchors native target observers."),
    ],
  }),
  capability({
    id: "binding:checked-channel",
    title: "Checked binding channel",
    domain: FrameworkCapabilityDomain.Binding,
    frameworkConcepts: ["checked.bind", "CheckedObserver"],
    userFacingForms: ["checked.bind", "checkbox/radio binding"],
    localities: [FrameworkCapabilityLocality.BindingSite],
    effects: [
      FrameworkCapabilityEffect.TargetObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can observe and write checked state for checkbox and radio inputs through checked observers.",
    evidence: [lensEvidence(LensId.FrameworkObservation, "flow-sites", "Observation lens anchors checked observer semantics.")],
  }),
  capability({
    id: "binding:select-channel",
    title: "Select binding channel",
    domain: FrameworkCapabilityDomain.Binding,
    frameworkConcepts: ["select", "SelectValueObserver"],
    userFacingForms: ["value.bind on select", "model.bind on option", "multiple select"],
    localities: [FrameworkCapabilityLocality.BindingSite],
    effects: [
      FrameworkCapabilityEffect.TargetObservation,
      FrameworkCapabilityEffect.CollectionObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Select observers combine target state, option model/value flow, and array semantics; they deserve shared observer/data-flow modeling.",
    evidence: [lensEvidence(LensId.FrameworkObservation, "flow-sites", "Observation lens anchors select observer semantics.")],
  }),
  capability({
    id: "binding:class-style",
    title: "Class and style bindings",
    domain: FrameworkCapabilityDomain.Binding,
    frameworkConcepts: ["class.bind", "style.bind", "interpolation"],
    userFacingForms: ["class.bind", "class interpolation", "style.bind", "style interpolation"],
    localities: [FrameworkCapabilityLocality.BindingSite],
    effects: [
      FrameworkCapabilityEffect.TargetObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
      FrameworkCapabilityEffect.StyleAvailability,
    ],
    summary:
      "Aurelia can bind class and style targets through dedicated binding and interpolation forms.",
    evidence: [lensEvidence(LensId.FrameworkRendering, "binding-effects", "Rendering and binding lanes expose class/style target operations.")],
  }),
  capability({
    id: "binding:writeback-direction",
    title: "Binding writeback direction",
    domain: FrameworkCapabilityDomain.Binding,
    frameworkConcepts: ["BindingMode", "fromView", "twoWay"],
    userFacingForms: ["from-view", "two-way", "one-way"],
    localities: [FrameworkCapabilityLocality.BindingSite],
    effects: [
      FrameworkCapabilityEffect.TargetObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can configure whether a binding reads from the view model, writes from the view, or does both.",
    evidence: [lensEvidence(LensId.FrameworkRendering, "binding-effects", "Rendering binding effects expose binding-mode and writeback behavior.")],
  }),
  capability({
    id: "template-controller:if-else",
    title: "if/else template control flow",
    domain: FrameworkCapabilityDomain.TemplateController,
    frameworkConcepts: ["if", "else", "synthetic view"],
    userFacingForms: ["if.bind", "else"],
    localities: [FrameworkCapabilityLocality.TemplateLocal],
    effects: [
      FrameworkCapabilityEffect.SyntheticViewControlFlow,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can instantiate conditional synthetic views through if/else template controllers.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence includes built-in if/else template controllers.")],
  }),
  capability({
    id: "template-controller:repeat",
    title: "repeat template control flow",
    domain: FrameworkCapabilityDomain.TemplateController,
    frameworkConcepts: ["repeat", "override context", "collection observation"],
    userFacingForms: ["repeat.for", "key/value repeat"],
    localities: [FrameworkCapabilityLocality.TemplateLocal],
    effects: [
      FrameworkCapabilityEffect.SyntheticViewControlFlow,
      FrameworkCapabilityEffect.CollectionObservation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can instantiate repeated synthetic views over observed collections with local override context.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence includes the repeat template controller.")],
  }),
  capability({
    id: "template-controller:with",
    title: "with template control flow",
    domain: FrameworkCapabilityDomain.TemplateController,
    frameworkConcepts: ["with", "binding context"],
    userFacingForms: ["with.bind"],
    localities: [FrameworkCapabilityLocality.TemplateLocal],
    effects: [
      FrameworkCapabilityEffect.SyntheticViewControlFlow,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can create a synthetic view whose current binding context is supplied by with.bind.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence includes the with template controller.")],
  }),
  capability({
    id: "template-controller:promise",
    title: "promise template control flow",
    domain: FrameworkCapabilityDomain.TemplateController,
    frameworkConcepts: ["promise", "pending", "then", "catch"],
    userFacingForms: ["promise.bind", "pending", "then", "catch"],
    localities: [FrameworkCapabilityLocality.TemplateLocal],
    effects: [
      FrameworkCapabilityEffect.SyntheticViewControlFlow,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can represent promise pending, fulfillment, and rejection branches through promise template controllers.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence includes promise/pending/then/catch template controllers.")],
  }),
  capability({
    id: "template-controller:switch",
    title: "switch/case template control flow",
    domain: FrameworkCapabilityDomain.TemplateController,
    frameworkConcepts: ["switch", "case", "default-case"],
    userFacingForms: ["switch.bind", "case", "default-case"],
    localities: [FrameworkCapabilityLocality.TemplateLocal],
    effects: [
      FrameworkCapabilityEffect.SyntheticViewControlFlow,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    summary:
      "Aurelia can select synthetic views by switch/case/default-case template controller semantics.",
    evidence: [lensEvidence(LensId.FrameworkResources, "convergence", "Resource convergence includes switch/case/default-case template controllers.")],
  }),
  capability({
    id: "template-controller:portal",
    title: "portal template controller",
    domain: FrameworkCapabilityDomain.TemplateController,
    frameworkConcepts: ["portal", "projection target"],
    userFacingForms: ["portal"],
    localities: [FrameworkCapabilityLocality.TemplateLocal],
    effects: [FrameworkCapabilityEffect.SyntheticViewControlFlow],
    summary:
      "Aurelia can project a synthetic view into a different DOM target through the portal template controller.",
    evidence: [lensEvidence(LensId.FrameworkRendering, "summary", "Rendering lens is the grounding point for portal controller materialization.")],
  }),
  capability({
    id: "composition:au-compose",
    title: "Dynamic composition",
    domain: FrameworkCapabilityDomain.Composition,
    frameworkConcepts: ["au-compose", "composition transaction"],
    userFacingForms: ["au-compose", "dynamic component composition"],
    localities: [FrameworkCapabilityLocality.TemplateLocal, FrameworkCapabilityLocality.AreaLocal],
    effects: [FrameworkCapabilityEffect.DynamicComposition],
    summary:
      "Aurelia can dynamically compose components at runtime through au-compose and composition transactions.",
    evidence: [lensEvidence(LensId.FrameworkComposition, "summary", "Composition lens maps framework composition architecture.")],
  }),
  capability({
    id: "di:resolve",
    title: "Constructor-time resolve",
    domain: FrameworkCapabilityDomain.DependencyInjection,
    frameworkConcepts: ["resolve", "IContainer"],
    userFacingForms: ["resolve(Service)", "resolve(IKey)"],
    localities: [FrameworkCapabilityLocality.ResourceLocal],
    effects: [FrameworkCapabilityEffect.DiResolution],
    summary:
      "Aurelia can resolve DI keys from framework-managed code through resolve and container lookups.",
    evidence: [lensEvidence(LensId.FrameworkDi, "lookups", "DI lens maps framework lookup and registration semantics.")],
  }),
  capability({
    id: "di:registration",
    title: "DI registration",
    domain: FrameworkCapabilityDomain.DependencyInjection,
    frameworkConcepts: ["Registration", "singleton", "transient", "container.register"],
    userFacingForms: ["Registration.singleton", "container.register", "static register"],
    localities: [FrameworkCapabilityLocality.AppGlobal, FrameworkCapabilityLocality.ResourceLocal],
    effects: [FrameworkCapabilityEffect.DiRegistration],
    summary:
      "Aurelia can register DI keys, aliases, factories, callbacks, and lifecycle-specific providers.",
    evidence: [lensEvidence(LensId.FrameworkDi, "registrations", "DI lens maps registration writes and provider associations.")],
  }),
  capability({
    id: "configuration:bundle-composition",
    title: "Bundle composition",
    domain: FrameworkCapabilityDomain.Configuration,
    frameworkConcepts: ["configuration bundle", "register"],
    userFacingForms: ["register bundle", "decompose StandardConfiguration"],
    localities: [FrameworkCapabilityLocality.AppGlobal],
    effects: [
      FrameworkCapabilityEffect.FeatureAdmission,
      FrameworkCapabilityEffect.ConfigurationAdmission,
    ],
    summary:
      "Aurelia applications can compose runtime feature bundles instead of relying only on StandardConfiguration.",
    evidence: [lensEvidence(LensId.FrameworkAdmission, "bundles", "Admission lens exposes bundle/configuration effects beyond the standard bundle.")],
  }),
  capability({
    id: "configuration:app-task",
    title: "App task lifecycle hook",
    domain: FrameworkCapabilityDomain.Configuration,
    frameworkConcepts: ["AppTask", "startup task"],
    userFacingForms: ["AppTask.creating", "AppTask.hydrated", "startup registration"],
    localities: [FrameworkCapabilityLocality.AppGlobal],
    effects: [
      FrameworkCapabilityEffect.AppTaskExecution,
      FrameworkCapabilityEffect.LifecycleDispatch,
    ],
    summary:
      "Aurelia can admit app-level lifecycle tasks through AppTask registrations.",
    evidence: [lensEvidence(LensId.FrameworkAdmission, "app-tasks", "Admission lens can expose app-task registration effects.")],
  }),
  capability({
    id: "plugin:feature-admission",
    title: "Plugin feature admission",
    domain: FrameworkCapabilityDomain.Plugin,
    frameworkConcepts: ["plugin configuration", "register"],
    userFacingForms: ["register plugin bundle", "plugin configuration object"],
    localities: [FrameworkCapabilityLocality.AppGlobal, FrameworkCapabilityLocality.PackageGlobalRegistration],
    effects: [
      FrameworkCapabilityEffect.PluginAdmission,
      FrameworkCapabilityEffect.ConfigurationAdmission,
    ],
    summary:
      "Aurelia applications can admit plugin-owned bundles, resources, DI registrations, router hooks, and state surfaces.",
    evidence: [
      lensEvidence(LensId.PluginArchitecture, "summary", "Plugin architecture lens maps plugin-owned integration surfaces."),
      lensEvidence(LensId.FrameworkAdmission, "summary", "Admission lens supplies the framework-side registration model."),
    ],
  }),
  capability({
    id: "i18n:admission",
    title: "I18n plugin admission",
    domain: FrameworkCapabilityDomain.Plugin,
    frameworkConcepts: ["@aurelia/i18n", "I18nConfiguration", "translation resources", "translation binding commands", "translation attribute patterns"],
    userFacingForms: ["register I18nConfiguration", "t / t.bind / t-params.bind", "translation value converters", "translation binding behaviors"],
    localities: [
      FrameworkCapabilityLocality.AppGlobal,
      FrameworkCapabilityLocality.PackageGlobalRegistration,
      FrameworkCapabilityLocality.TemplateLocal,
      FrameworkCapabilityLocality.BindingSite,
    ],
    resourceKinds: [
      FrameworkResourceDefinitionKind.AttributePattern,
      FrameworkResourceDefinitionKind.BindingCommand,
      FrameworkResourceDefinitionKind.ValueConverter,
      FrameworkResourceDefinitionKind.BindingBehavior,
    ],
    effects: [
      FrameworkCapabilityEffect.PluginAdmission,
      FrameworkCapabilityEffect.ConfigurationAdmission,
      FrameworkCapabilityEffect.ResourceRegistration,
      FrameworkCapabilityEffect.ResourceVisibility,
      FrameworkCapabilityEffect.BindingDataFlow,
      FrameworkCapabilityEffect.ExpressionEvaluation,
    ],
    requires: [
      packageRequirement(
        "@aurelia/i18n",
        "I18n admission requires the Aurelia i18n package and its configuration/resources to be available.",
      ),
      capabilityRequirement(
        "plugin:feature-admission",
        "I18n is a plugin-owned feature admitted through the framework plugin/bundle path.",
      ),
    ],
    summary:
      "@aurelia/i18n admits translation binding commands/patterns, value converters, binding behaviors, and configuration resources into the app world.",
    evidence: [
      lensEvidence(LensId.PluginArchitecture, "surfaces", "Plugin architecture lens grounds plugin-provided i18n resource surfaces.", "I18nConfiguration"),
      lensEvidence(LensId.FrameworkAdmission, "relationships", "Admission lens should expose package configuration and registration relationships for i18n.", "I18nConfiguration"),
    ],
  }),
  capability({
    id: "validation-html:admission",
    title: "Validation HTML plugin admission",
    domain: FrameworkCapabilityDomain.Plugin,
    frameworkConcepts: ["@aurelia/validation-html", "ValidationHtmlConfiguration", "validate binding behavior"],
    userFacingForms: ["register ValidationHtmlConfiguration", "& validate", "validation-errors", "validation-container"],
    localities: [
      FrameworkCapabilityLocality.AppGlobal,
      FrameworkCapabilityLocality.PackageGlobalRegistration,
      FrameworkCapabilityLocality.BindingSite,
      FrameworkCapabilityLocality.TemplateLocal,
    ],
    resourceKinds: [
      FrameworkResourceDefinitionKind.BindingBehavior,
      FrameworkResourceDefinitionKind.CustomAttribute,
      FrameworkResourceDefinitionKind.CustomElement,
    ],
    effects: [
      FrameworkCapabilityEffect.PluginAdmission,
      FrameworkCapabilityEffect.ConfigurationAdmission,
      FrameworkCapabilityEffect.ResourceRegistration,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    requires: [
      packageRequirement(
        "@aurelia/validation-html",
        "Validation HTML admission requires the validation-html package and its template resources.",
      ),
      packageRequirement(
        "@aurelia/validation",
        "Validation HTML source normally pairs with the core validation package for rules and controllers.",
      ),
      capabilityRequirement(
        "plugin:feature-admission",
        "Validation HTML is a plugin-owned feature admitted through the framework plugin/bundle path.",
      ),
    ],
    summary:
      "@aurelia/validation-html admits validate binding behavior and validation display resources into templates.",
    evidence: [
      lensEvidence(LensId.PluginArchitecture, "surfaces", "Plugin architecture lens grounds validation-html resource surfaces.", "ValidationHtmlConfiguration"),
      lensEvidence(LensId.BridgeAuLink, "anchors", "auLink anchors connect semantic-runtime validate binding behavior mirrors to framework plugin classes.", "validation-html:ValidateBindingBehavior"),
      docsEvidence("validation-html", "Validation docs/tests seed promoted validate binding behavior and validation display forms."),
    ],
  }),
  capability({
    id: "ui-virtualization:admission",
    title: "UI virtualization plugin admission",
    domain: FrameworkCapabilityDomain.Plugin,
    frameworkConcepts: ["@aurelia/ui-virtualization", "DefaultVirtualizationConfiguration", "virtual-repeat"],
    userFacingForms: ["register DefaultVirtualizationConfiguration", "virtual-repeat.for"],
    localities: [
      FrameworkCapabilityLocality.AppGlobal,
      FrameworkCapabilityLocality.PackageGlobalRegistration,
      FrameworkCapabilityLocality.TemplateLocal,
    ],
    resourceKinds: [FrameworkResourceDefinitionKind.TemplateController],
    effects: [
      FrameworkCapabilityEffect.PluginAdmission,
      FrameworkCapabilityEffect.ConfigurationAdmission,
      FrameworkCapabilityEffect.ResourceRegistration,
      FrameworkCapabilityEffect.DiRegistration,
      FrameworkCapabilityEffect.CollectionObservation,
      FrameworkCapabilityEffect.SyntheticViewControlFlow,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    requires: [
      packageRequirement(
        "@aurelia/ui-virtualization",
        "UI virtualization admission requires the ui-virtualization package and its default configuration.",
      ),
      capabilityRequirement(
        "plugin:feature-admission",
        "UI virtualization is a plugin-owned feature admitted through the framework plugin/bundle path.",
      ),
      capabilityRequirement(
        "resource:template-controller",
        "virtual-repeat is a template-controller-shaped resource with synthetic view control-flow semantics.",
      ),
    ],
    summary:
      "@aurelia/ui-virtualization admits the virtual-repeat template controller plus the collection-strategy and DOM-renderer services it depends on.",
    evidence: [
      lensEvidence(LensId.PluginArchitecture, "surfaces", "Plugin architecture lens grounds ui-virtualization resource and DI surfaces.", "DefaultVirtualizationConfiguration"),
      lensEvidence(LensId.FrameworkAdmission, "relationships", "Admission lens should expose DefaultVirtualizationConfiguration's registered CollectionStrategyLocator, DefaultDomRenderer, and VirtualRepeat.", "DefaultVirtualizationConfiguration"),
      docsEvidence("ui-virtualization", "UI virtualization docs/tests seed promoted virtual-repeat and scroller behavior forms."),
    ],
  }),
  capability({
    id: "expression:parser-evaluator",
    title: "Aurelia expression parsing and evaluation",
    domain: FrameworkCapabilityDomain.Expression,
    frameworkConcepts: ["expression parser", "astEvaluate", "connectable"],
    userFacingForms: ["template expression", "interpolation", "event expression"],
    localities: [FrameworkCapabilityLocality.BindingSite, FrameworkCapabilityLocality.TemplateLocal],
    effects: [
      FrameworkCapabilityEffect.ExpressionEvaluation,
      FrameworkCapabilityEffect.SourceObservation,
    ],
    summary:
      "Aurelia can parse, bind, connect, and evaluate template expressions through its expression AST/runtime pipeline.",
    evidence: [
      lensEvidence(LensId.FrameworkRendering, "summary", "Rendering and compiler lenses expose expression lowering paths."),
    ],
  }),
  capability({
    id: "expression:value-converter-call",
    title: "Value-converter expression calls",
    domain: FrameworkCapabilityDomain.Expression,
    frameworkConcepts: ["ValueConverter", "toView", "fromView"],
    userFacingForms: ["value | converter", "value | converter:arg"],
    localities: [FrameworkCapabilityLocality.BindingSite],
    effects: [
      FrameworkCapabilityEffect.ExpressionEvaluation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    requires: [capabilityRequirement("resource:value-converter")],
    summary:
      "Aurelia expressions can invoke value converter toView/fromView hooks as part of binding evaluation.",
    evidence: [lensEvidence(LensId.FrameworkRendering, "summary", "Rendering and expression lanes expose converter invocation points.")],
  }),
  capability({
    id: "expression:binding-behavior-application",
    title: "Binding behavior applications",
    domain: FrameworkCapabilityDomain.Expression,
    frameworkConcepts: ["BindingBehavior", "bind", "unbind"],
    userFacingForms: ["expression & behavior"],
    localities: [FrameworkCapabilityLocality.BindingSite],
    effects: [
      FrameworkCapabilityEffect.ExpressionEvaluation,
      FrameworkCapabilityEffect.BindingDataFlow,
    ],
    requires: [capabilityRequirement("resource:binding-behavior")],
    summary:
      "Aurelia expressions can apply binding behaviors that modify binding setup, lifecycle, or observation behavior.",
    evidence: [lensEvidence(LensId.FrameworkRendering, "binding-effects", "Rendering binding effects expose behavior application surfaces.")],
  }),


  capability({
    id: "lifecycle:component-hooks",
    title: "Component lifecycle hooks",
    domain: FrameworkCapabilityDomain.Lifecycle,
    frameworkConcepts: ["binding", "bound", "attaching", "load"],
    userFacingForms: ["component lifecycle methods", "route lifecycle hooks"],
    localities: [FrameworkCapabilityLocality.ResourceLocal, FrameworkCapabilityLocality.RouteLocal],
    effects: [FrameworkCapabilityEffect.LifecycleDispatch],
    summary:
      "Aurelia can invoke component and route lifecycle hooks during controller hydration, activation, binding, attach, detach, and disposal phases.",
    evidence: [lensEvidence(LensId.FrameworkLifecycle, "summary", "Lifecycle lens maps framework controller and binding phases.")],
  }),
] as const;

const INVENTORY_ROW_FAMILY = new PagedRowFamily<FrameworkTerritoryConstruct>({
  id: "framework.capabilities:inventory",
  rowLabel: "source-derived framework inventory constructs",
  evidenceForRow: (row) => inventoryEvidence(row),
  continuationsForPage: (inquiry, _rows, nextOffset, limit) =>
    nextOffset === undefined
      ? []
      : [
          nextPageContinuation(
            inquiry,
            "framework.capabilities:inventory:next-page",
            "Continue the source-derived framework inventory.",
            nextOffset,
            limit,
            { priority: ContinuationPriority.Secondary },
          ),
        ],
});

const REVERSE_COVERAGE_ROW_FAMILY = new PagedRowFamily<FrameworkReverseCoverageFamily>({
  id: "framework.capabilities:reverse-coverage",
  rowLabel: "framework reverse-coverage family rows",
  evidenceForRow: (row) => reverseCoverageEvidence(row),
  continuationsForPage: () => [],
});

function inventoryEvidence(row: FrameworkTerritoryConstruct): readonly Evidence[] {
  return [
    {
      id: `framework.capability.inventory:${row.family}:${row.identity}`,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Subject,
      confidence: EvidenceConfidence.Strong,
      summary: `${row.family} construct ${row.identity}`,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

function reverseCoverageEvidence(row: FrameworkReverseCoverageFamily): readonly Evidence[] {
  return [
    {
      id: `framework.capability.reverse-coverage:${row.family}`,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Support,
      confidence: EvidenceConfidence.Strong,
      summary: `${row.family}: ${row.mirrored}/${row.total} mirrored`,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

const COVERAGE_ROW_FAMILY = new PagedRowFamily<FrameworkForwardCoverageFamily>({
  id: "framework.capabilities:coverage",
  rowLabel: "framework forward-coverage family rows",
  evidenceForRow: (row) => coverageEvidence(row),
  continuationsForPage: () => [],
});

function coverageEvidence(row: FrameworkForwardCoverageFamily): readonly Evidence[] {
  return [
    {
      id: `framework.capability.coverage:${row.family}`,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Support,
      confidence: EvidenceConfidence.Strong,
      summary: `${row.family}: ${row.accounted}/${row.total} accounted by a curated category`,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

const CLUSTER_ROW_FAMILY = new PagedRowFamily<FrameworkCapabilityCluster>({
  id: "framework.capabilities:clusters",
  rowLabel: "framework capability cluster rows",
  evidenceForRow: (row) => clusterEvidence(row),
  continuationsForPage: () => [],
});

function clusterEvidence(row: FrameworkCapabilityCluster): readonly Evidence[] {
  return [
    {
      id: `framework.capability.cluster:${row.key}`,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Subject,
      confidence: EvidenceConfidence.Strong,
      summary: `${row.key} [${row.memberCount}]: ${row.members.join(", ")}`,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

/** Answer curated Aurelia capability terrain for framework orientation. */
export function answerFrameworkCapabilities(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkCapabilitiesValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = readFilters(inquiry);
  const filteredRows = FRAMEWORK_CAPABILITY_ROWS.filter((row) =>
    matchesCapabilityFilters(row, filters),
  );
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);
  const rollup = buildValue(filteredRows);

  if (projection === "summary") {
    const sampleRows = filteredRows.slice(0, Math.min(limit, 12));
    return createAnswer(
      inquiry,
      filteredRows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Mapped ${filteredRows.length} of ${FRAMEWORK_CAPABILITY_ROWS.length} curated Aurelia capability rows.`,
      {
        value: {
          ...rollup,
          capabilityRows: sampleRows,
        },
        basis: [CAPABILITY_BASIS],
        evidence: sampleRows.flatMap((row) => capabilityEvidence(row)),
        continuations: [
          projectionContinuation(
            inquiry,
            "framework.capabilities:catalog",
            "catalog",
            "Inspect the paged capability catalog rows.",
            { priority: ContinuationPriority.Primary },
          ),
          projectionContinuation(
            inquiry,
            "framework.capabilities:matrix",
            "matrix",
            "Inspect capability rows as a selection/constraint matrix.",
            { priority: ContinuationPriority.Secondary },
          ),
          projectionContinuation(
            inquiry,
            "framework.capabilities:evidence",
            "evidence",
            "Inspect materialized evidence descriptors for the capability terrain.",
            { priority: ContinuationPriority.Secondary },
          ),
          projectionContinuation(
            inquiry,
            "framework.capabilities:evidence-trace",
            "evidence-trace",
            "Materialize evidence descriptors by asking their backing Atlas lenses.",
            { priority: ContinuationPriority.Secondary },
          ),
          projectionContinuation(
            inquiry,
            "framework.capabilities:grounding",
            "grounding",
            "Inspect neutral grounding rows derived from evidence and prerequisites.",
            { priority: ContinuationPriority.Secondary },
          ),
        ],
      },
    );
  }

  if (projection === "matrix") {
    const matrixRows = buildMatrixRows(filteredRows).filter((row) =>
      matchesMatrixFilters(row, filters),
    );
    return MATRIX_ROW_FAMILY.answer({
      inquiry,
      rows: matrixRows,
      offset,
      limit,
      basis: [CAPABILITY_BASIS],
      value: (page) => ({
        ...rollup,
        matrixRows: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${matrixRows.length} capability matrix rows from ${filteredRows.length} curated Aurelia capability rows.`,
    });
  }

  if (projection === "evidence") {
    const evidenceRows = buildEvidenceRows(filteredRows);
    return EVIDENCE_ROW_FAMILY.answer({
      inquiry,
      rows: evidenceRows,
      offset,
      limit,
      basis: [CAPABILITY_BASIS],
      value: (page) => ({
        ...rollup,
        evidenceRows: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${evidenceRows.length} capability evidence rows from ${filteredRows.length} curated Aurelia capability rows.`,
    });
  }

  if (projection === "evidence-trace") {
    const evidenceTraceRows = buildEvidenceTraceRows(filteredRows, filters, sourceProject);
    return EVIDENCE_TRACE_ROW_FAMILY.answer({
      inquiry,
      rows: evidenceTraceRows,
      offset,
      limit,
      basis: [CAPABILITY_BASIS],
      value: (page) => ({
        ...rollup,
        evidenceTraceRows: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${evidenceTraceRows.length} materialized capability evidence trace rows from ${filteredRows.length} curated Aurelia capability rows.`,
    });
  }

  if (projection === "grounding") {
    const groundingRows = buildGroundingRows(filteredRows);
    return GROUNDING_ROW_FAMILY.answer({
      inquiry,
      rows: groundingRows,
      offset,
      limit,
      basis: [CAPABILITY_BASIS],
      value: (page) => ({
        ...rollup,
        groundingRows: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${groundingRows.length} capability grounding rows from ${filteredRows.length} curated Aurelia capability rows.`,
    });
  }

  if (projection === "inventory") {
    const inventoryRows = enumerateFrameworkTerritoryConstructs(sourceProject);
    return INVENTORY_ROW_FAMILY.answer({
      inquiry,
      rows: inventoryRows,
      offset,
      limit,
      basis: [CAPABILITY_BASIS],
      value: (page) => ({
        ...rollup,
        inventoryRows: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${inventoryRows.length} source-derived framework inventory constructs.`,
    });
  }

  if (projection === "clusters") {
    const clusterRows = frameworkCapabilityClusters(sourceProject);
    return CLUSTER_ROW_FAMILY.answer({
      inquiry,
      rows: clusterRows,
      offset,
      limit,
      basis: [CAPABILITY_BASIS],
      value: (page) => ({
        ...rollup,
        clusterRows: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${clusterRows.length} derived framework capability clusters.`,
    });
  }

  if (projection === "coverage") {
    const categoryCorpus = FRAMEWORK_CAPABILITY_ROWS
      .flatMap((row) => searchTextForRow(row))
      .join("\n")
      .toLowerCase();
    const coverageRows = frameworkForwardCoverage(sourceProject, categoryCorpus);
    return COVERAGE_ROW_FAMILY.answer({
      inquiry,
      rows: coverageRows,
      offset,
      limit,
      basis: [CAPABILITY_BASIS],
      value: (page) => ({
        ...rollup,
        coverageRows: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${coverageRows.length} framework forward-coverage family rows.`,
    });
  }

  if (projection === "reverse-coverage") {
    const reverseCoverageRows = frameworkReverseCoverage(sourceProject);
    return REVERSE_COVERAGE_ROW_FAMILY.answer({
      inquiry,
      rows: reverseCoverageRows,
      offset,
      limit,
      basis: [CAPABILITY_BASIS],
      value: (page) => ({
        ...rollup,
        reverseCoverageRows: page.rows,
      }),
      summary: (page) =>
        `Returned ${page.rows.length} of ${reverseCoverageRows.length} framework reverse-coverage family rows.`,
    });
  }

  return CAPABILITY_ROW_FAMILY.answer({
    inquiry,
    rows: filteredRows,
    offset,
    limit,
    basis: [CAPABILITY_BASIS],
    value: (page) => ({
      ...rollup,
      capabilityRows: page.rows,
    }),
    summary: (page) =>
      `Returned ${page.rows.length} of ${filteredRows.length} curated Aurelia capability rows for ${projection}.`,
  });
}

function readFilters(inquiry: Inquiry): FrameworkCapabilityFilters {
  return {
    id: inquiryStringFilter(inquiry, "id"),
    capabilityId: inquiryStringFilter(inquiry, "capabilityId"),
    domain: inquiryStringFilter(inquiry, "domain"),
    locality: inquiryStringFilter(inquiry, "locality"),
    resourceKind: inquiryStringFilter(inquiry, "resourceKind"),
    resourceSourceForm: inquiryStringFilter(inquiry, "resourceSourceForm"),
    effect: inquiryStringFilter(inquiry, "effect"),
    requirement: inquiryStringFilter(inquiry, "requirement"),
    groundingStrength: inquiryStringFilter(inquiry, "groundingStrength"),
    targetRows: boundedNumberFilter(
      inquiryNumberFilter(inquiry, "targetRows"),
      DEFAULT_EVIDENCE_TRACE_TARGET_ROWS,
      MAX_EVIDENCE_TRACE_TARGET_ROWS,
    ),
    targetEvidenceRows: boundedNumberFilter(
      inquiryNumberFilter(inquiry, "targetEvidenceRows"),
      DEFAULT_EVIDENCE_TRACE_EVIDENCE_ROWS,
      MAX_EVIDENCE_TRACE_EVIDENCE_ROWS,
    ),
    query: inquiryLowerStringFilter(inquiry, "query"),
  };
}

function matchesCapabilityFilters(
  row: FrameworkCapabilityRow,
  filters: FrameworkCapabilityFilters,
): boolean {
  const id = filters.id ?? filters.capabilityId;
  return (
    matchesFilterValue(row.id, id) &&
    matchesFilterValue(row.domain, filters.domain) &&
    matchesAnyFilterValue(row.localities, filters.locality) &&
    resourceKindMatches(row, filters.resourceKind) &&
    resourceSourceFormMatches(row.resourceSourceSupport, filters.resourceSourceForm) &&
    matchesAnyFilterValue(row.effects, filters.effect) &&
    requirementMatches(row.requires, filters.requirement) &&
    groundingMatches(row, filters) &&
    (queryMatches(filters.query, searchTextForRow(row)) ||
      querySignificantPartialMatches(filters.query, searchTextForRow(row)))
  );
}

function groundingMatches(
  row: FrameworkCapabilityRow,
  filters: FrameworkCapabilityFilters,
): boolean {
  const groundingRow = buildGroundingRow(row);
  return matchesFilterValue(groundingRow.groundingStrength, filters.groundingStrength);
}

function matchesMatrixFilters(
  row: FrameworkCapabilityMatrixRow,
  filters: FrameworkCapabilityFilters,
): boolean {
  return (
    matchesFilterValue(row.domain, filters.domain) &&
    matchesAnyFilterValue(row.localities, filters.locality) &&
    matchesFilterValue(row.resourceKind ?? "", filters.resourceKind) &&
    matchesFilterValue(row.resourceSourceForm ?? "", filters.resourceSourceForm) &&
    matchesAnyFilterValue(row.effects, filters.effect) &&
    (filters.requirement === undefined ||
      row.requirementIds.some((requirementId) =>
        matchesFilterValue(requirementId, filters.requirement),
      ))
  );
}

function resourceKindMatches(
  row: FrameworkCapabilityRow,
  filter: string | undefined,
): boolean {
  return matchesAnyFilterValue(resourceKindsForRow(row), filter);
}

function resourceSourceFormMatches(
  supportRows: readonly FrameworkCapabilityResourceSourceSupport[],
  filter: string | undefined,
): boolean {
  return filter === undefined ||
    supportRows.some((support) => matchesAnyFilterValue(support.sourceForms, filter));
}

function requirementMatches(
  requirements: readonly FrameworkCapabilityRequirementRef[],
  filter: string | undefined,
): boolean {
  return filter === undefined ||
    requirements.some((requirement) =>
      matchesFilterValue(requirement.kind, filter) ||
        matchesFilterValue(requirement.id, filter),
    );
}

function buildValue(
  rows: readonly FrameworkCapabilityRow[],
): FrameworkCapabilitiesValue {
  const groundingRows = buildGroundingRows(rows);
  return {
    capabilityRowCount: rows.length,
    totalCapabilityRowCount: FRAMEWORK_CAPABILITY_ROWS.length,
    domains: countBy(rows, (row) => row.domain),
    localities: countValues(rows.flatMap((row) => row.localities)),
    resourceKinds: countValues(rows.flatMap((row) => resourceKindsForRow(row))),
    resourceSourceForms: countValues(rows.flatMap((row) =>
      row.resourceSourceSupport.flatMap((support) => support.sourceForms),
    )),
    effects: countValues(rows.flatMap((row) => row.effects)),
    requirementKinds: countValues(rows.flatMap((row) =>
      row.requires.map((requirement) => requirement.kind),
    )),
    groundingStrengths: countBy(groundingRows, (row) => row.groundingStrength),
  };
}

function buildMatrixRows(
  rows: readonly FrameworkCapabilityRow[],
): readonly FrameworkCapabilityMatrixRow[] {
  return rows.flatMap((row) => {
    if (row.resourceSourceSupport.length > 0) {
      return row.resourceSourceSupport.flatMap((support) =>
        support.sourceForms.map((sourceForm) =>
          createMatrixRow(row, support.resourceKind, sourceForm),
        ),
      );
    }
    const resourceKinds = resourceKindsForRow(row);
    if (resourceKinds.length > 0) {
      return resourceKinds.map((resourceKind) =>
        createMatrixRow(row, resourceKind as FrameworkResourceDefinitionKind),
      );
    }
    return [createMatrixRow(row)];
  });
}

function createMatrixRow(
  row: FrameworkCapabilityRow,
  resourceKind?: FrameworkResourceDefinitionKind,
  resourceSourceForm?: FrameworkCapabilityResourceSourceForm,
): FrameworkCapabilityMatrixRow {
  const identityParts = [
    row.id,
    resourceKind ?? "framework",
    resourceSourceForm ?? "capability",
  ];
  return {
    id: `framework.capability.matrix:${identityParts.join(":")}`,
    capabilityId: row.id,
    domain: row.domain,
    localities: row.localities,
    resourceKind,
    resourceSourceForm,
    effects: row.effects,
    requirementIds: row.requires.map((requirement) => requirement.id),
    summary: row.summary,
  };
}

function buildEvidenceRows(
  rows: readonly FrameworkCapabilityRow[],
): readonly FrameworkCapabilityEvidenceRow[] {
  return rows.flatMap((row) =>
    row.evidence.map((evidenceRef, index) =>
      buildEvidenceRow(row, evidenceRef, index),
    ),
  );
}

function buildEvidenceTraceRows(
  rows: readonly FrameworkCapabilityRow[],
  filters: FrameworkCapabilityFilters,
  sourceProject: SourceProject,
): readonly FrameworkCapabilityEvidenceTraceRow[] {
  return rows.flatMap((row) =>
    row.evidence.map((evidenceRef, index) =>
      buildEvidenceTraceRow(row, evidenceRef, index, filters, sourceProject),
    ),
  );
}

function buildEvidenceTraceRow(
  row: FrameworkCapabilityRow,
  evidenceRef: FrameworkCapabilityEvidenceRef,
  index: number,
  filters: FrameworkCapabilityFilters,
  sourceProject: SourceProject,
): FrameworkCapabilityEvidenceTraceRow {
  const evidenceRow = buildEvidenceRow(row, evidenceRef, index);
  const targetAnswer =
    evidenceRef.lensId === undefined
      ? undefined
      : answerCapabilityEvidenceTarget(
          row,
          evidenceRef,
          filters,
          filters.targetRows,
          filters.targetEvidenceRows,
          sourceProject,
        );
  const targetCollections =
    targetAnswer === undefined
      ? []
      : targetCollectionsForAnswer(targetAnswer, filters.targetRows);
  const targetEvidenceSamples =
    targetAnswer?.evidence.slice(0, filters.targetEvidenceRows).map(evidenceTraceSample) ?? [];
  return {
    id: `framework.capability.evidence-trace:${row.id}:${index}`,
    capabilityId: row.id,
    evidenceRowId: evidenceRow.id,
    lane: evidenceRow.lane,
    groundingStrength: evidenceRow.groundingStrength,
    lensId: evidenceRow.lensId,
    projection: evidenceRow.projection,
    query: evidenceRow.query,
    symbolName: evidenceRow.symbolName,
    targetOutcome: targetAnswer?.outcome,
    targetSummary: targetAnswer?.summary,
    targetReturned: targetAnswer?.page?.returned,
    targetTotal: targetAnswer?.page?.total,
    targetEvidenceCount: targetAnswer?.evidence.length ?? 0,
    targetOpenSeamCount: targetAnswer?.openSeams.length ?? 0,
    targetContinuationCount: targetAnswer?.continuations.length ?? 0,
    targetCollections,
    targetEvidenceSamples,
    summary: evidenceTraceSummary(evidenceRow, targetAnswer),
  };
}

function buildEvidenceRow(
  row: FrameworkCapabilityRow,
  evidenceRef: FrameworkCapabilityEvidenceRef,
  index: number,
): FrameworkCapabilityEvidenceRow {
  return {
    id: `framework.capability.evidence:${row.id}:${index}`,
    capabilityId: row.id,
    lane: evidenceRef.lane,
    groundingStrength: groundingStrengthForEvidence(evidenceRef),
    lensId: evidenceRef.lensId,
    projection: evidenceRef.projection,
    query: evidenceRef.query,
    symbolName: evidenceRef.symbolName,
    summary: evidenceRef.summary,
  };
}

function buildGroundingRows(
  rows: readonly FrameworkCapabilityRow[],
): readonly FrameworkCapabilityGroundingRow[] {
  return rows.map((row) => buildGroundingRow(row));
}

function buildGroundingRow(
  row: FrameworkCapabilityRow,
): FrameworkCapabilityGroundingRow {
  const groundingStrength = groundingStrengthForCapability(row);
  const evidenceStrengths = row.evidence.map((entry) => groundingStrengthForEvidence(entry));
  const sourceBackedEvidenceCount = evidenceStrengths.filter(
    (strength) => strength === FrameworkCapabilityGroundingStrength.SourceBacked,
  ).length;
  const corpusBackedEvidenceCount = evidenceStrengths.filter(
    (strength) => strength === FrameworkCapabilityGroundingStrength.CorpusBacked,
  ).length;
  const ungroundedEvidenceCount = evidenceStrengths.filter(
    (strength) => strength === FrameworkCapabilityGroundingStrength.Ungrounded,
  ).length;
  return {
    id: `framework.capability.grounding:${row.id}`,
    capabilityId: row.id,
    domain: row.domain,
    groundingStrength,
    evidenceCount: row.evidence.length,
    sourceBackedEvidenceCount,
    corpusBackedEvidenceCount,
    ungroundedEvidenceCount,
    requirementIds: row.requires.map((requirement) => requirement.id),
    exclusiveCapabilityIds: row.mutuallyExclusiveWith,
    notes: groundingNotes(row, groundingStrength, ungroundedEvidenceCount),
    summary: groundingSummary(row, groundingStrength),
  };
}

function groundingStrengthForCapability(
  row: FrameworkCapabilityRow,
): FrameworkCapabilityGroundingStrength {
  const strengths = row.evidence.map((entry) => groundingStrengthForEvidence(entry));
  if (strengths.includes(FrameworkCapabilityGroundingStrength.SourceBacked)) {
    return FrameworkCapabilityGroundingStrength.SourceBacked;
  }
  if (strengths.includes(FrameworkCapabilityGroundingStrength.CorpusBacked)) {
    return FrameworkCapabilityGroundingStrength.CorpusBacked;
  }
  return FrameworkCapabilityGroundingStrength.Ungrounded;
}

function groundingStrengthForEvidence(
  evidenceRef: FrameworkCapabilityEvidenceRef,
): FrameworkCapabilityGroundingStrength {
  switch (evidenceRef.lane) {
    case FrameworkCapabilityEvidenceLane.AtlasLens:
    case FrameworkCapabilityEvidenceLane.AuLink:
      return evidenceRef.lensId === undefined
        ? FrameworkCapabilityGroundingStrength.Ungrounded
        : FrameworkCapabilityGroundingStrength.SourceBacked;
    case FrameworkCapabilityEvidenceLane.FrameworkDocs:
    case FrameworkCapabilityEvidenceLane.FrameworkTests:
      return FrameworkCapabilityGroundingStrength.CorpusBacked;
  }
}

function groundingNotes(
  row: FrameworkCapabilityRow,
  groundingStrength: FrameworkCapabilityGroundingStrength,
  ungroundedEvidenceCount: number,
): readonly string[] {
  const notes: string[] = [];
  if (groundingStrength === FrameworkCapabilityGroundingStrength.Ungrounded) {
    notes.push("No evidence descriptor is attached yet.");
  } else if (groundingStrength === FrameworkCapabilityGroundingStrength.CorpusBacked) {
    notes.push("Only corpus-backed evidence is attached.");
  }
  if (ungroundedEvidenceCount > 0) {
    notes.push(`${ungroundedEvidenceCount} evidence descriptor(s) currently have no source or corpus target.`);
  }
  if (row.requires.length > 0) {
    notes.push(`Prerequisites: ${row.requires.map((requirement) => requirement.id).join(", ")}.`);
  }
  if (row.mutuallyExclusiveWith.length > 0) {
    notes.push(`Exclusive alternatives: ${row.mutuallyExclusiveWith.join(", ")}.`);
  }
  return notes;
}

function groundingSummary(
  row: FrameworkCapabilityRow,
  groundingStrength: FrameworkCapabilityGroundingStrength,
): string {
  return `${row.id} has ${groundingStrength} framework grounding, ${row.evidence.length} evidence descriptor(s), ${row.requires.length} prerequisite(s), and ${row.mutuallyExclusiveWith.length} exclusive alternative(s).`;
}

function answerCapabilityEvidenceTarget(
  row: FrameworkCapabilityRow,
  evidenceRef: FrameworkCapabilityEvidenceRef,
  filters: FrameworkCapabilityFilters,
  targetRows: number,
  targetEvidenceRows: number,
  sourceProject: SourceProject,
): Answer | undefined {
  if (evidenceRef.lensId === undefined) {
    return undefined;
  }
  const inquiry = targetInquiryForEvidence(row, evidenceRef, filters, targetRows, targetEvidenceRows);
  switch (evidenceRef.lensId) {
    case LensId.BridgeAuLink:
      return answerBridgeAuLink(inquiry, sourceProject);
    case LensId.FrameworkAdmission:
      return answerFrameworkAdmission(inquiry, sourceProject);
    case LensId.FrameworkApi:
      return answerFrameworkApi(inquiry, sourceProject);
    case LensId.FrameworkCompiler:
      return answerFrameworkCompiler(inquiry, sourceProject);
    case LensId.FrameworkComposition:
      return answerFrameworkComposition(inquiry, sourceProject);
    case LensId.FrameworkCorpus:
      return answerFrameworkCorpus(inquiry, sourceProject);
    case LensId.FrameworkDi:
      return answerFrameworkDi(inquiry, sourceProject);
    case LensId.FrameworkDiscovery:
      return answerFrameworkDiscovery(inquiry, sourceProject);
    case LensId.FrameworkEvaluator:
      return answerFrameworkEvaluator(inquiry, sourceProject);
    case LensId.FrameworkLifecycle:
      return answerFrameworkLifecycle(inquiry, sourceProject);
    case LensId.FrameworkObservation:
      return answerFrameworkObservation(inquiry, sourceProject);
    case LensId.FrameworkRendering:
      return answerFrameworkRendering(inquiry, sourceProject);
    case LensId.FrameworkResources:
      return answerFrameworkResources(inquiry, sourceProject);
    case LensId.FrameworkRouter:
      return answerFrameworkRouter(inquiry, sourceProject);
    case LensId.PluginArchitecture:
      return answerPluginArchitecture(inquiry, sourceProject);
    case LensId.WorkspaceArchitecture:
      return answerWorkspaceArchitecture(inquiry, sourceProject);
    default:
      return undefined;
  }
}

function targetInquiryForEvidence(
  row: FrameworkCapabilityRow,
  evidenceRef: FrameworkCapabilityEvidenceRef,
  filters: FrameworkCapabilityFilters,
  targetRows: number,
  targetEvidenceRows: number,
): Inquiry {
  return {
    lens: evidenceRef.lensId ?? LensId.FrameworkCapabilities,
    locus: RepoRootLocus,
    projection: evidenceRef.projection ?? "summary",
    filters: targetFiltersForEvidence(row, evidenceRef, filters),
    budget: {
      rows: targetRows,
      evidencePerSubject: targetEvidenceRows,
    },
  };
}

function targetFiltersForEvidence(
  row: FrameworkCapabilityRow,
  evidenceRef: FrameworkCapabilityEvidenceRef,
  capabilityFilters: FrameworkCapabilityFilters,
): Record<string, string | number> | undefined {
  const targetFilters: Record<string, string> = {};
  const rowResourceKinds = resourceKindsForRow(row);
  const hasStructuredResourceTarget =
    evidenceRef.lensId === LensId.FrameworkResources &&
    (capabilityFilters.resourceKind !== undefined || rowResourceKinds.length === 1);
  const shouldUseFallbackQuery =
    evidenceRef.projection !== "summary" && !hasStructuredResourceTarget;
  const query = evidenceRef.query ??
    (shouldUseFallbackQuery ? targetQueryForCapability(row) : undefined);
  if (query !== undefined) {
    targetFilters.query = query;
  }
  if (evidenceRef.symbolName !== undefined) {
    targetFilters.symbolName = evidenceRef.symbolName;
  }
  if (
    evidenceRef.lensId === LensId.FrameworkResources &&
    capabilityFilters.resourceKind !== undefined &&
    row.id.startsWith("resource-source:")
  ) {
    targetFilters.resourceKind = capabilityFilters.resourceKind;
  } else if (evidenceRef.lensId === LensId.FrameworkResources) {
    const onlyResourceKind = rowResourceKinds[0];
    if (rowResourceKinds.length === 1 && onlyResourceKind !== undefined) {
      targetFilters.resourceKind = onlyResourceKind;
    }
  }
  return Object.keys(targetFilters).length === 0 ? undefined : targetFilters;
}

function targetQueryForCapability(row: FrameworkCapabilityRow): string | undefined {
  return firstSearchableAtom(row.frameworkConcepts) ??
    firstSearchableAtom(row.userFacingForms) ??
    firstSearchableAtom([row.title]);
}

function firstSearchableAtom(values: readonly string[]): string | undefined {
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
}

function targetCollectionsForAnswer(
  answer: Answer,
  targetRows: number,
): readonly FrameworkCapabilityEvidenceTraceCollection[] {
  if (answer.value === undefined || answer.value === null || typeof answer.value !== "object") {
    return [];
  }
  const collections: FrameworkCapabilityEvidenceTraceCollection[] = [];
  for (const [fieldName, value] of Object.entries(answer.value as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue;
    }
    collections.push({
      fieldName,
      rowCount: value.length,
      sampleRows: value.slice(0, targetRows),
    });
  }
  return collections;
}

function evidenceTraceSample(
  evidence: Evidence,
): FrameworkCapabilityEvidenceTraceSample {
  return {
    id: evidence.id,
    kind: evidence.kind,
    role: evidence.role,
    confidence: evidence.confidence,
    summary: evidence.summary,
    source: evidence.source,
  };
}

function evidenceTraceSummary(
  evidenceRow: FrameworkCapabilityEvidenceRow,
  targetAnswer: Answer | undefined,
): string {
  if (targetAnswer === undefined) {
    return `${evidenceRow.capabilityId} evidence descriptor has no materialized backing answer for ${evidenceRow.lensId ?? evidenceRow.lane}.`;
  }
  const target = `${evidenceRow.lensId ?? evidenceRow.lane}:${evidenceRow.projection ?? "summary"}`;
  const total = targetAnswer.page?.total;
  const countText = total === undefined
    ? `${targetAnswer.evidence.length} evidence row(s)`
    : `${targetAnswer.page?.returned ?? 0}/${total} target row(s)`;
  return `${evidenceRow.capabilityId} materialized ${target} as ${targetAnswer.outcome} with ${countText}.`;
}

function boundedNumberFilter(
  value: number | undefined,
  defaultValue: number,
  maxValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }
  return Math.max(1, Math.min(Math.trunc(value), maxValue));
}

function capability(init: CapabilityRowInit): FrameworkCapabilityRow {
  return {
    resourceKinds: [],
    resourceSourceSupport: [],
    mutuallyExclusiveWith: [],
    requires: [],
    evidence: [],
    ...init,
  };
}

function capabilityRequirement(
  id: string,
  summary = `Requires framework capability ${id}.`,
): FrameworkCapabilityRequirementRef {
  return {
    kind: FrameworkCapabilityRequirementKind.Capability,
    id,
    summary,
  };
}

function toolingRequirement(
  id: string,
  summary: string,
): FrameworkCapabilityRequirementRef {
  return {
    kind: FrameworkCapabilityRequirementKind.Tooling,
    id,
    summary,
  };
}

function packageRequirement(
  id: string,
  summary: string,
): FrameworkCapabilityRequirementRef {
  return {
    kind: FrameworkCapabilityRequirementKind.Package,
    id,
    summary,
  };
}

function resourceKindsForRow(row: FrameworkCapabilityRow): readonly string[] {
  return uniqueSortedStrings([
    ...row.resourceKinds,
    ...row.resourceSourceSupport.map((support) => support.resourceKind),
  ]);
}

function lensEvidence(
  lensId: LensId,
  projection: string,
  summary: string,
  query?: string,
): FrameworkCapabilityEvidenceRef {
  return {
    lane: FrameworkCapabilityEvidenceLane.AtlasLens,
    lensId,
    projection,
    query,
    summary,
  };
}

function docsEvidence(
  query: string,
  summary: string,
): FrameworkCapabilityEvidenceRef {
  return {
    lane: FrameworkCapabilityEvidenceLane.FrameworkDocs,
    lensId: LensId.FrameworkCorpus,
    projection: "docs",
    query,
    summary,
  };
}

function capabilityEvidence(row: FrameworkCapabilityRow): readonly Evidence[] {
  return [
    {
      id: `framework.capability:${row.id}`,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Subject,
      confidence: EvidenceConfidence.Strong,
      summary: row.summary,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

function matrixEvidence(row: FrameworkCapabilityMatrixRow): readonly Evidence[] {
  return [
    {
      id: row.id,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Subject,
      confidence: EvidenceConfidence.Strong,
      summary: row.summary,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

function evidenceRowEvidence(row: FrameworkCapabilityEvidenceRow): readonly Evidence[] {
  return [
    {
      id: row.id,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Support,
      confidence: EvidenceConfidence.Strong,
      summary: row.summary,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

function evidenceTraceEvidence(row: FrameworkCapabilityEvidenceTraceRow): readonly Evidence[] {
  return [
    {
      id: row.id,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Support,
      confidence: row.targetOutcome === undefined
        ? EvidenceConfidence.Unknown
        : EvidenceConfidence.Strong,
      summary: row.summary,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

function groundingEvidence(row: FrameworkCapabilityGroundingRow): readonly Evidence[] {
  return [
    {
      id: row.id,
      kind: EvidenceKind.MaintenanceSignal,
      role: EvidenceRole.Support,
      confidence: EvidenceConfidence.Strong,
      summary: row.summary,
      basis: CAPABILITY_BASIS,
      data: row,
    },
  ];
}

function capabilityRowContinuations(
  inquiry: Inquiry,
  row: FrameworkCapabilityRow,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  const firstLensEvidence = row.evidence.find(
    (entry) => entry.lane === FrameworkCapabilityEvidenceLane.AtlasLens &&
      entry.lensId !== undefined,
  );
  if (firstLensEvidence?.lensId !== undefined) {
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.capabilities:${row.id}:evidence`,
        firstLensEvidence.projection ?? "summary",
        `Inspect Atlas evidence for ${row.id}.`,
        {
          lens: firstLensEvidence.lensId,
          filters: firstLensEvidence.query === undefined
            ? undefined
            : { query: firstLensEvidence.query },
          priority: ContinuationPriority.Secondary,
          evidence: capabilityEvidence(row),
          basis: [BasisKind.AtlasContract],
          summary: firstLensEvidence.summary,
        },
      ),
    );
  }
  return continuations;
}

function searchTextForRow(row: FrameworkCapabilityRow): readonly string[] {
  return uniqueSortedStrings([
    row.id,
    row.title,
    row.domain,
    row.summary,
    ...row.frameworkConcepts,
    ...row.userFacingForms,
    ...row.localities,
    ...row.resourceKinds,
    ...row.resourceSourceSupport.flatMap((support) => [
      support.resourceKind,
      ...support.sourceForms,
    ]),
    ...row.effects,
    ...row.mutuallyExclusiveWith,
    ...row.requires.flatMap((requirement) => [
      requirement.kind,
      requirement.id,
      requirement.summary,
    ]),
    ...row.evidence.flatMap((entry) => [
      entry.lane,
      entry.lensId ?? "",
      entry.projection ?? "",
      entry.query ?? "",
      entry.symbolName ?? "",
      entry.summary,
    ]),
  ].filter((value) => value.length > 0));
}

function countValues(values: readonly string[]): Readonly<Record<string, number>> {
  return countBy(values, (value) => value);
}
