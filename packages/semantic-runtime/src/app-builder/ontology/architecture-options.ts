import {
  AppBuilderAffordanceId,
} from './affordance.js';
import {
  AppBuilderApplicationPatternId,
} from './application-pattern.js';
import {
  AppBuilderInputContractId,
} from './input.js';
import {
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  AppBuilderSourceLoweringSurfaceKind,
} from './source-lowering-surface.js';

/** Existing-code context for app-builder architecture option menus. */
export enum AppBuilderArchitectureContextKind {
  /** The caller is creating a new app or isolated generated area. */
  BlankSlate = 'blank-slate',
  /** The caller is adding to or reshaping an existing app that the AI should inspect separately. */
  ExistingApp = 'existing-app',
}

/** Stable value list for architecture-option context transport schemas. */
export const APP_BUILDER_ARCHITECTURE_CONTEXT_KINDS = [
  AppBuilderArchitectureContextKind.BlankSlate,
  AppBuilderArchitectureContextKind.ExistingApp,
] as const;

/** Coarse complexity rung for architecture option menus. */
export enum AppBuilderArchitectureScaleHint {
  /** Smallest honest app shape that avoids unnecessary source files or indirection. */
  Compact = 'compact',
  /** Ordinary first useful structure for maintainable generated app sections. */
  Balanced = 'balanced',
  /** Larger navigable structure for app areas that need addressability and service boundaries. */
  Scalable = 'scalable',
}

/** Stable value list for architecture-option scale transport schemas. */
export const APP_BUILDER_ARCHITECTURE_SCALE_HINTS = [
  AppBuilderArchitectureScaleHint.Compact,
  AppBuilderArchitectureScaleHint.Balanced,
  AppBuilderArchitectureScaleHint.Scalable,
] as const;

/** Concrete architecture option ids returned before source lowering. */
export enum AppBuilderArchitectureOptionId {
  /** One component owns local state and native controls for a narrow app section. */
  SingleComponentLocalState = 'single-component-local-state',
  /** A component resolves an ordinary TypeScript DI state/domain class for shared state or behavior. */
  DiStateComponentSection = 'di-state-component-section',
  /** A routed list/detail area coordinates router, service/adaptor, and DI state boundaries. */
  RouterBackedListDetailService = 'router-backed-list-detail-service',
}

/** Stable value list for architecture-option transport schemas. */
export const APP_BUILDER_ARCHITECTURE_OPTION_IDS = [
  AppBuilderArchitectureOptionId.SingleComponentLocalState,
  AppBuilderArchitectureOptionId.DiStateComponentSection,
  AppBuilderArchitectureOptionId.RouterBackedListDetailService,
] as const;

/** Public request for architecture option menus; this does not parse user prose or choose defaults. */
export interface AppBuilderArchitectureOptionsRequest {
  /** Contexts to keep; omitted means both blank-slate and existing-app options are returned. */
  readonly contextKinds?: readonly (AppBuilderArchitectureContextKind | `${AppBuilderArchitectureContextKind}`)[] | null;
  /** Scale rungs to keep; omitted means all rungs are returned. */
  readonly scaleHints?: readonly (AppBuilderArchitectureScaleHint | `${AppBuilderArchitectureScaleHint}`)[] | null;
  /** Include shaped follow-up app-builder queries; defaults to true for MCP ergonomics. */
  readonly includeQueryPlan?: boolean | null;
}

/** One follow-up app-builder query that an AI can invoke after choosing an architecture option. */
export interface AppBuilderArchitectureOptionQueryStep {
  /** Compact purpose of this follow-up query. */
  readonly summary: string;
  /** Query payload shaped for the public MCP app-builder query tool. */
  readonly appBuilderQuery: Readonly<Record<string, unknown>>;
}

/** One concrete implementation shape that can guide a requested app without guessing source details. */
export interface AppBuilderArchitectureOptionRow {
  /** Stable option id. */
  readonly optionId: AppBuilderArchitectureOptionId;
  /** Display title for AI-facing menus. */
  readonly title: string;
  /** Compact explanation of the implementation shape. */
  readonly summary: string;
  /** Creation/editing contexts where this option can honestly be considered. */
  readonly contextKinds: readonly AppBuilderArchitectureContextKind[];
  /** Coarse complexity rung for this option. */
  readonly scaleHint: AppBuilderArchitectureScaleHint;
  /** User/task situations where this option is a good fit. */
  readonly bestFor: readonly string[];
  /** Situations where the option should not be the default shape. */
  readonly notFor: readonly string[];
  /** Ontology rows that ground the option. */
  readonly targetRefs: readonly AppBuilderOntologyRowRef[];
  /** Input contracts that normally need caller, policy, app-fact, or preset values before generation. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Source-lowering surfaces expected to be useful once required inputs are present. */
  readonly sourceLoweringSurfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[];
  /** Important wiring notes that prevent common AI misuse of generated artifacts. */
  readonly implementationNotes: readonly string[];
  /** Optional next public app-builder queries for inspecting and spending this option. */
  readonly queryPlan?: readonly AppBuilderArchitectureOptionQueryStep[];
}

/** Architecture option menu result for AI-guided app building. */
export interface AppBuilderArchitectureOptionsResult {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Returned option rows. */
  readonly rows: readonly AppBuilderArchitectureOptionRow[];
  /** Whether the caller requested shaped follow-up queries. */
  readonly queryPlanIncluded: boolean;
}

/** Return concrete architecture implementation shapes without selecting one from user prose. */
export function appBuilderArchitectureOptions(
  request: AppBuilderArchitectureOptionsRequest = {},
): AppBuilderArchitectureOptionsResult {
  const contextKinds = request.contextKinds == null || request.contextKinds.length === 0
    ? null
    : new Set(request.contextKinds);
  const scaleHints = request.scaleHints == null || request.scaleHints.length === 0
    ? null
    : new Set(request.scaleHints);
  const includeQueryPlan = request.includeQueryPlan !== false;
  const rows = APP_BUILDER_ARCHITECTURE_OPTION_ROWS
    .filter((row) =>
      (contextKinds == null || row.contextKinds.some((contextKind) => contextKinds.has(contextKind)))
      && (scaleHints == null || scaleHints.has(row.scaleHint))
    )
    .map((row) => includeQueryPlan ? row : withoutQueryPlan(row));
  return {
    displayText: `App-builder architecture options: ${rows.length}/${APP_BUILDER_ARCHITECTURE_OPTION_ROWS.length} option(s), queryPlanIncluded=${includeQueryPlan}; this menu does not infer user intent from prose.`,
    rows,
    queryPlanIncluded: includeQueryPlan,
  };
}

const APP_BUILDER_ARCHITECTURE_OPTION_ROWS: readonly AppBuilderArchitectureOptionRow[] = [
  architectureOption({
    optionId: AppBuilderArchitectureOptionId.SingleComponentLocalState,
    title: 'Single Component With Local State',
    summary: 'Use one custom element/component pair with local view-model state, native controls, and optional collection display.',
    contextKinds: [
      AppBuilderArchitectureContextKind.BlankSlate,
      AppBuilderArchitectureContextKind.ExistingApp,
    ],
    scaleHint: AppBuilderArchitectureScaleHint.Compact,
    bestFor: [
      'Small forms, simple controls, local demos, or one-off sections where an extra state class would add noise.',
      'Existing apps where the AI can safely integrate a narrow local component without changing app-wide architecture.',
    ],
    notFor: [
      'Shared domain behavior, multiple routes, cross-component state, or service/persistence boundaries.',
    ],
    targetRefs: [
      affordanceRef(AppBuilderAffordanceId.CreateSubmitForm),
      affordanceRef(AppBuilderAffordanceId.CollectionBrowse),
      applicationPatternRef(AppBuilderApplicationPatternId.LocalViewModelState),
      applicationPatternRef(AppBuilderApplicationPatternId.NativeControlBinding),
      applicationPatternRef(AppBuilderApplicationPatternId.NativeSubmitForm),
      applicationPatternRef(AppBuilderApplicationPatternId.CollectionList),
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.VisualStyleInput,
      AppBuilderInputContractId.ControlAccessibility,
    ],
    sourceLoweringSurfaceKinds: [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
    implementationNotes: [
      'Keep state directly on the view-model only when it is genuinely local to the component.',
      'Use native form/control bindings first; avoid plugin-specific binding behaviors unless explicit project policy calls for them.',
    ],
  }),
  architectureOption({
    optionId: AppBuilderArchitectureOptionId.DiStateComponentSection,
    title: 'Component Section With DI State Class',
    summary: 'Use a component pair that resolves an ordinary TypeScript state/domain class for reusable state and behavior.',
    contextKinds: [
      AppBuilderArchitectureContextKind.BlankSlate,
      AppBuilderArchitectureContextKind.ExistingApp,
    ],
    scaleHint: AppBuilderArchitectureScaleHint.Balanced,
    bestFor: [
      'Generated app sections with shared domain behavior, reusable query/action state, or multiple controls over the same model.',
      'Aurelia-first code that should stay compact while preserving ordinary TypeScript/OOP state boundaries.',
    ],
    notFor: [
      'Tiny one-field controls where a DI class is only indirection.',
      'State that must already live in a caller-owned store, external service, or existing app boundary.',
    ],
    targetRefs: [
      affordanceRef(AppBuilderAffordanceId.AddAppSection),
      affordanceRef(AppBuilderAffordanceId.CreateSubmitForm),
      affordanceRef(AppBuilderAffordanceId.CollectionBrowse),
      applicationPatternRef(AppBuilderApplicationPatternId.AppSection),
      applicationPatternRef(AppBuilderApplicationPatternId.DiStateClass),
      applicationPatternRef(AppBuilderApplicationPatternId.DomainBackedSubmitForm),
      applicationPatternRef(AppBuilderApplicationPatternId.CollectionList),
      applicationPatternRef(AppBuilderApplicationPatternId.CollectionCard),
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.CollectionProjection,
      AppBuilderInputContractId.SeedData,
      AppBuilderInputContractId.VisualStyleInput,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.InteractionFeedback,
    ],
    sourceLoweringSurfaceKinds: [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ],
    implementationNotes: [
      'A generated DI state class should be resolved/injected by the component; constructing it with `new` loses the intended Aurelia DI topology.',
      'Keep domain behavior in ordinary TypeScript methods and let Aurelia observation make the state visible to templates.',
    ],
  }),
  architectureOption({
    optionId: AppBuilderArchitectureOptionId.RouterBackedListDetailService,
    title: 'Router-Backed List/Detail With Service Boundary',
    summary: 'Use an app shell or area with route-backed list/detail navigation plus an injected service/adaptor boundary.',
    contextKinds: [
      AppBuilderArchitectureContextKind.BlankSlate,
      AppBuilderArchitectureContextKind.ExistingApp,
    ],
    scaleHint: AppBuilderArchitectureScaleHint.Scalable,
    bestFor: [
      'Addressable list/detail flows, reloadable navigation, larger generated apps, or app areas that need service/persistence seams.',
      'User requests where routing itself is part of the product experience rather than only a local display toggle.',
    ],
    notFor: [
      'Small local widgets, non-addressable pop-in details, or apps where router admission is explicitly disabled by policy.',
      'Remote/server behavior that has not been supplied by the caller; current source can scaffold local service/adaptor shape but not invent APIs.',
    ],
    targetRefs: [
      affordanceRef(AppBuilderAffordanceId.RouteBackedArea),
      affordanceRef(AppBuilderAffordanceId.CollectionBrowse),
      applicationPatternRef(AppBuilderApplicationPatternId.AppShell),
      applicationPatternRef(AppBuilderApplicationPatternId.RouterBackedListDetail),
      applicationPatternRef(AppBuilderApplicationPatternId.ServiceBackedLoadSave),
      applicationPatternRef(AppBuilderApplicationPatternId.DiStateClass),
      applicationPatternRef(AppBuilderApplicationPatternId.CollectionList),
      applicationPatternRef(AppBuilderApplicationPatternId.LoadingEmptyErrorState),
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.CollectionProjection,
      AppBuilderInputContractId.ExistingAppFacts,
      AppBuilderInputContractId.SeedData,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    sourceLoweringSurfaceKinds: [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
    implementationNotes: [
      'Router-backed sections should be chosen by user/app policy; nested viewport layout is a consequence of area routing, not a global default.',
      'Generated service source is a local service/adaptor scaffold unless explicit remote API details are supplied.',
    ],
  }),
];

function architectureOption(
  row: Omit<AppBuilderArchitectureOptionRow, 'queryPlan'>,
): AppBuilderArchitectureOptionRow {
  return {
    ...row,
    queryPlan: architectureOptionQueryPlan(row),
  };
}

function architectureOptionQueryPlan(
  row: Omit<AppBuilderArchitectureOptionRow, 'queryPlan'>,
): readonly AppBuilderArchitectureOptionQueryStep[] {
  return [
    {
      summary: 'Inspect selected target rows with readiness and source-lowering request-field coverage.',
      appBuilderQuery: {
        queryKind: 'target-catalog',
        targetCatalog: {
          targetRefs: row.targetRefs,
          includeInputReadiness: true,
          includeSourceLoweringRequestFields: true,
        },
      },
    },
    {
      summary: 'Ask which input contracts/facets are still missing before source can be honest.',
      appBuilderQuery: {
        queryKind: 'input-readiness',
        inputReadiness: {
          targetRefs: row.targetRefs,
          includeInputFacets: true,
        },
      },
    },
    {
      summary: 'Open payload schemas for the input contracts this option normally needs.',
      appBuilderQuery: {
        queryKind: 'input-contract-detail',
        inputContractDetail: {
          inputContractIds: row.inputContractIds,
          includePayloadSchemas: true,
          includeSourceLoweringConsumers: true,
          includeSourceLoweringValueSupport: true,
        },
      },
    },
    {
      summary: 'Run source-lowering preflight only after target selection and supplied inputs are available.',
      appBuilderQuery: {
        queryKind: 'source-lowering-preflight',
        sourceLoweringPreflight: {
          targetRefs: row.targetRefs,
          includeSourceLoweringRequestFields: true,
          includeInputDependencies: true,
        },
      },
    },
  ];
}

function withoutQueryPlan(
  row: AppBuilderArchitectureOptionRow,
): AppBuilderArchitectureOptionRow {
  const { queryPlan: _queryPlan, ...rest } = row;
  return rest;
}

function affordanceRef(
  id: AppBuilderAffordanceId,
): AppBuilderOntologyRowRef {
  return appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, id);
}

function applicationPatternRef(
  id: AppBuilderApplicationPatternId,
): AppBuilderOntologyRowRef {
  return appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, id);
}
