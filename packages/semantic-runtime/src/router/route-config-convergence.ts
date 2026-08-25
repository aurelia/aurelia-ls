import type { ProjectBootFrame } from '../boot/frames.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import { SemanticClaim } from '../kernel/claim.js';
import { EvidenceKind, EvidenceRole } from '../kernel/evidence.js';
import type { EvidenceHandle, IdentityHandle, ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { FieldProvenance, ProvenanceRecord, readFieldProvenance } from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type { KernelStoreReadView, KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  RouteableComponentKind,
  RouteableComponentReference,
  RouterClosureKind,
  RouteConfigContributionEffectKind,
  type RouteConfigContributionModel,
  type RouteConfigContributionReference,
  RouteConfigExecutionKind,
  type RouteConfigField,
  RouteConfigFieldState,
  RouteConfigFieldStateKind,
  RouteConfigKind,
  RouteConfigModel,
  RouteConfigOriginKind,
  RouteConfigStageKind,
  type RouteConfigValueField,
  type RouterIssueModel,
} from './model.js';
import { RouterProductDetails } from './product-details.js';
import type { RouteConfigRecognitionProjectResult } from './route-config-recognition.js';
import { routerIdentityProductRecords, routerOpenSeamRecords } from './router-product-records.js';

const ROUTE_CONFIG_VALUE_FIELDS = [
  'id',
  'path',
  'title',
  'component',
  'redirectTo',
  'caseSensitive',
  'transitionPlan',
  'viewport',
  'data',
  'children',
  'fallback',
  'nav',
] as const satisfies readonly RouteConfigValueField[];

const DYNAMIC_HOOK_OPEN_FIELDS = ROUTE_CONFIG_VALUE_FIELDS.filter((field) => field !== 'component');

export class RouteConfigConvergenceLink {
  constructor(
    readonly contribution: RouteConfigContributionModel,
    readonly routeConfig: RouteConfigModel,
    readonly effectKind: RouteConfigContributionEffectKind,
  ) {}
}

/** Effective RouteConfig products and their source-contribution joins for one project. */
export class RouteConfigConvergenceProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly recognition: RouteConfigRecognitionProjectResult,
    readonly routeConfigs: readonly RouteConfigModel[],
    readonly links: readonly RouteConfigConvergenceLink[],
  ) {}

  readRouteConfigs(): readonly RouteConfigModel[] {
    return this.routeConfigs;
  }

  readContributions(): readonly RouteConfigContributionModel[] {
    return this.recognition.readContributions();
  }

  readLinks(): readonly RouteConfigConvergenceLink[] {
    return this.links;
  }

  readIssues(): readonly RouterIssueModel[] {
    return this.recognition.readIssues();
  }
}

/** Converge source contributions through RouteConfig._create and _applyChildRouteConfig semantics. */
export class RouteConfigConvergenceProjectPass {
  convergeAndEmit(
    publication: KernelPublicationContext,
    project: ProjectBootFrame,
    recognition: RouteConfigRecognitionProjectResult,
    resourceIndex: ResourceDefinitionIndex,
    configuration: ConfigurationRecognitionProjectResult,
  ): RouteConfigConvergenceProjectResult {
    return new RouteConfigConvergenceFrame(
      publication,
      project,
      recognition,
      resourceIndex,
      configuration,
    ).convergeAndEmit();
  }
}

interface RouteConfigSeed {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly ownerIdentityHandle: IdentityHandle;
  readonly stage: RouteConfigStageKind;
  readonly routeKind: RouteConfigKind;
  readonly id: string | null;
  readonly paths: readonly string[];
  readonly title: string | null;
  readonly component: RouteableComponentReference | null;
  readonly redirectTo: string | null;
  readonly caseSensitive: boolean | null;
  readonly transitionPlan: string | null;
  readonly viewport: string | null;
  readonly hasData: boolean | null;
  readonly childContributions: readonly RouteConfigContributionModel[];
  readonly fallback: RouteableComponentReference | null;
  readonly nav: boolean | null;
  readonly fieldStates: ReadonlyMap<RouteConfigValueField, RouteConfigFieldStateKind>;
  readonly openFields: Set<RouteConfigValueField>;
  readonly sourceContribution: RouteConfigContributionModel | null;
  readonly sourceAddressHandle: RouteConfigContributionModel['sourceAddressHandle'];
  readonly idSourceAddressHandle: RouteConfigContributionModel['idSourceAddressHandle'];
  readonly pathSourceAddressHandles: RouteConfigContributionModel['pathSourceAddressHandles'];
  readonly redirectToSourceAddressHandle: RouteConfigContributionModel['redirectToSourceAddressHandle'];
  readonly fieldProvenance: ReadonlyMap<RouteConfigValueField, readonly ProvenanceHandle[]>;
  readonly productProvenance: readonly ProvenanceHandle[];
  readonly openReasonKinds: OpenSeamReasonKind[];
  readonly definitionTargetIdentityHandle: IdentityHandle | null;
}

interface RouteConfigDefinitionSelection {
  readonly explicit: RouteConfigContributionModel | null;
  readonly statics: RouteConfigContributionModel | null;
  readonly hooks: readonly RouteConfigContributionModel[];
  readonly unproven: readonly RouteConfigContributionModel[];
  readonly contributions: readonly RouteConfigContributionModel[];
  readonly effects: ReadonlyMap<RouteConfigContributionModel, RouteConfigContributionEffectKind>;
  readonly executionOrderOpen: boolean;
}

class RouteConfigConvergenceFrame {
  private readonly contributions: readonly RouteConfigContributionModel[];
  private readonly contributionByIdentity = new Map<IdentityHandle, RouteConfigContributionModel>();
  private readonly definitionContributionsByTarget = new Map<IdentityHandle, readonly RouteConfigContributionModel[]>();
  private readonly definitionSeedsByTarget = new Map<IdentityHandle, RouteConfigSeed>();
  private readonly definitionLinksByTarget = new Map<IdentityHandle, ReadonlyMap<RouteConfigContributionModel, RouteConfigContributionEffectKind>>();
  private readonly modelsByIdentity = new Map<IdentityHandle, RouteConfigModel>();
  private readonly records: KernelStoreRecord[] = [];
  private readonly routeConfigs: RouteConfigModel[] = [];
  private readonly links: RouteConfigConvergenceLink[] = [];

  constructor(
    readonly publication: KernelPublicationContext,
    readonly project: ProjectBootFrame,
    readonly recognition: RouteConfigRecognitionProjectResult,
    readonly resourceIndex: ResourceDefinitionIndex,
    readonly configuration: ConfigurationRecognitionProjectResult,
  ) {
    this.contributions = recognition.readContributions();
    for (const contribution of this.contributions) {
      this.contributionByIdentity.set(contribution.identityHandle, contribution);
      const targetIdentityHandle = contribution.component?.resolvedIdentityHandle ?? null;
      if (targetIdentityHandle == null || contribution.originKind === RouteConfigOriginKind.ChildRoutesProperty) {
        continue;
      }
      this.definitionContributionsByTarget.set(targetIdentityHandle, [
        ...(this.definitionContributionsByTarget.get(targetIdentityHandle) ?? []),
        contribution,
      ]);
    }
  }

  convergeAndEmit(): RouteConfigConvergenceProjectResult {
    const demandedTargets = new Set<IdentityHandle>(this.definitionContributionsByTarget.keys());
    for (const contribution of this.contributions) {
      const targetIdentityHandle = contribution.component?.resolvedIdentityHandle ?? null;
      if (targetIdentityHandle != null) {
        demandedTargets.add(targetIdentityHandle);
      }
    }
    for (const appRoot of this.configuration.readConfiguration().appRoots) {
      const targetIdentityHandle = appRoot.component?.identityHandle ?? null;
      if (targetIdentityHandle != null) {
        demandedTargets.add(targetIdentityHandle);
      }
    }

    for (const targetIdentityHandle of demandedTargets) {
      this.materializeDefinition(targetIdentityHandle);
    }

    const childContributionIdentities = new Set(
      this.contributions.flatMap((contribution) => contribution.childRoutes.map((child) => child.identityHandle)),
    );
    for (const contribution of this.contributions) {
      if (
        childContributionIdentities.has(contribution.identityHandle)
        || contribution.originKind === RouteConfigOriginKind.ClassStaticDefaults
        || contribution.originKind === RouteConfigOriginKind.DynamicHook
        || contribution.component?.resolvedIdentityHandle != null
      ) {
        continue;
      }
      this.materializeStandaloneContribution(contribution);
    }

    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(this.records, `router-route-config-convergence:${this.project.projectKey}`),
      publishProductDetails(RouterProductDetails.RouteConfig, this.routeConfigs),
    ));
    return new RouteConfigConvergenceProjectResult(
      this.project,
      this.recognition,
      this.routeConfigs,
      this.links,
    );
  }

  private materializeDefinition(targetIdentityHandle: IdentityHandle): RouteConfigModel | null {
    const seed = this.definitionSeedForTarget(targetIdentityHandle);
    if (seed == null) {
      return null;
    }
    const effects = this.definitionLinksByTarget.get(targetIdentityHandle) ?? new Map();
    return this.materializeSeed(seed, effects, new Set());
  }

  private definitionSeedForTarget(targetIdentityHandle: IdentityHandle): RouteConfigSeed | null {
    const cached = this.definitionSeedsByTarget.get(targetIdentityHandle);
    if (cached != null) {
      return cached;
    }
    const definition = this.resourceIndex.lookupByTargetIdentity(targetIdentityHandle);
    if (definition?.type !== ResourceDefinitionKind.CustomElement) {
      return null;
    }
    const selection = this.selectDefinitionContributions(
      this.definitionContributionsByTarget.get(targetIdentityHandle) ?? [],
    );
    const local = `router-route-config-definition:${targetIdentityHandle}`;
    const seed = this.definitionSeed(local, definition, selection);
    this.definitionSeedsByTarget.set(targetIdentityHandle, seed);
    this.definitionLinksByTarget.set(targetIdentityHandle, selection.effects);
    return seed;
  }

  private selectDefinitionContributions(
    contributions: readonly RouteConfigContributionModel[],
  ): RouteConfigDefinitionSelection {
    const decorators = contributions
      .filter((contribution) => contribution.originKind === RouteConfigOriginKind.RouteDecorator)
      .sort((left, right) => left.sourceOrder - right.sourceOrder);
    const statics = contributions.find((contribution) =>
      contribution.originKind === RouteConfigOriginKind.ClassStaticDefaults
    ) ?? null;
    const hooks = contributions.filter((contribution) =>
      contribution.originKind === RouteConfigOriginKind.DynamicHook
    );
    const executedConfigures = contributions.filter((contribution) =>
      contribution.originKind === RouteConfigOriginKind.ConfigureCall
      && contribution.executionKind === RouteConfigExecutionKind.Executed
    );
    const unproven = contributions.filter((contribution) =>
      contribution.originKind === RouteConfigOriginKind.ConfigureCall
      && contribution.executionKind === RouteConfigExecutionKind.Unproven
    );
    const configureModules = new Set(executedConfigures.map((contribution) => contribution.moduleKey));
    const executionOrderOpen = configureModules.size > 1;
    const selectedConfigure = executionOrderOpen
      ? null
      : [...executedConfigures].sort((left, right) =>
          (right.executionOrder ?? -1) - (left.executionOrder ?? -1)
          || right.sourceOrder - left.sourceOrder
        )[0] ?? null;
    const selectedDecorator = decorators[0] ?? null;
    const explicit = selectedConfigure ?? selectedDecorator;
    const effects = new Map<RouteConfigContributionModel, RouteConfigContributionEffectKind>();
    for (const contribution of contributions) {
      if (contribution === explicit) {
        effects.set(contribution, RouteConfigContributionEffectKind.Selected);
      } else if (contribution === statics) {
        effects.set(
          contribution,
          explicit == null
            ? RouteConfigContributionEffectKind.Selected
            : RouteConfigContributionEffectKind.Merged,
        );
      } else if (hooks.includes(contribution)) {
        effects.set(contribution, RouteConfigContributionEffectKind.OpensDefinition);
      } else if (unproven.includes(contribution) || (executionOrderOpen && executedConfigures.includes(contribution))) {
        effects.set(contribution, RouteConfigContributionEffectKind.Unproven);
      } else {
        effects.set(contribution, RouteConfigContributionEffectKind.Overwritten);
      }
    }
    return {
      explicit,
      statics,
      hooks,
      unproven,
      contributions,
      effects,
      executionOrderOpen,
    };
  }

  private definitionSeed(
    local: string,
    definition: Extract<FullResourceDefinition, { readonly type: ResourceDefinitionKind.CustomElement }>,
    selection: RouteConfigDefinitionSelection,
  ): RouteConfigSeed {
    const explicit = selection.explicit;
    const statics = selection.statics;
    const paths = readContributionValue(explicit, 'path', (entry) => entry.paths)
      ?? readContributionValue(statics, 'path', (entry) => entry.paths)
      ?? [definition.name, ...definition.aliases.map((alias) => alias.name)];
    const id = readContributionValue(explicit, 'id', (entry) => entry.id)
      ?? readContributionValue(statics, 'id', (entry) => entry.id)
      ?? paths[0]
      ?? definition.name;
    const component = readContributionValue(explicit, 'component', (entry) => entry.component)
      ?? readContributionValue(statics, 'component', (entry) => entry.component)
      ?? routeableReferenceForDefinition(definition);
    const childContributions = [
      ...contributionChildren(explicit, this.contributionByIdentity),
      ...contributionChildren(statics, this.contributionByIdentity),
    ];
    const openFields = new Set<RouteConfigValueField>();
    for (const field of ROUTE_CONFIG_VALUE_FIELDS) {
      if (definitionFieldIsOpen(explicit, statics, field)) {
        openFields.add(field);
      }
    }
    if (fieldContribution(explicit, statics, 'id') == null && openFields.has('path')) {
      openFields.add('id');
    }
    for (const contribution of selection.unproven) {
      addAll(openFields, ROUTE_CONFIG_VALUE_FIELDS);
    }
    if (selection.hooks.length > 0) {
      addAll(openFields, DYNAMIC_HOOK_OPEN_FIELDS);
    }
    if (selection.executionOrderOpen) {
      addAll(openFields, ROUTE_CONFIG_VALUE_FIELDS);
    }

    const fieldProvenance = new Map<RouteConfigValueField, readonly ProvenanceHandle[]>();
    for (const field of ROUTE_CONFIG_VALUE_FIELDS) {
      const fieldContributions = definitionFieldContributions(explicit, statics, field);
      const handles = fieldContributions.flatMap((contribution) => contributionFieldProvenance(contribution, field));
      if (handles.length > 0) {
        fieldProvenance.set(field, unique(handles));
      }
    }
    if (!fieldProvenance.has('id') && fieldProvenance.has('path')) {
      fieldProvenance.set('id', fieldProvenance.get('path')!);
    }

    const productProvenance = selection.contributions.flatMap((contribution) =>
      contributionProductProvenance(this.publication, contribution)
    );
    if (productProvenance.length === 0 && definition.productHandle != null) {
      const provenance = readProductProvenance(this.publication, definition.productHandle);
      if (provenance != null) {
        productProvenance.push(provenance);
      }
    }
    const sourceContribution = explicit ?? statics;
    const idContribution = fieldContribution(explicit, statics, 'id');
    const pathContribution = fieldContribution(explicit, statics, 'path');
    const redirectContribution = fieldContribution(explicit, statics, 'redirectTo');
    const openReasonKinds = [
      ...(selection.hooks.length > 0 ? [OpenSeamReasonKind.RouterRouteConfigDynamicHook] : []),
      ...(selection.unproven.length > 0 ? [OpenSeamReasonKind.RouterRouteConfigExecutionUnproven] : []),
      ...(selection.executionOrderOpen ? [OpenSeamReasonKind.RouterRouteConfigExecutionOrderOpen] : []),
      ...([explicit, statics].some((contribution) =>
        contribution?.fieldStates.some((state) => state.stateKind === RouteConfigFieldStateKind.Open) === true
      )
        ? [OpenSeamReasonKind.RouterRouteConfigValueOpen]
        : []),
    ];
    return {
      productHandle: this.publication.handles.product(local),
      identityHandle: this.publication.handles.identity(local),
      ownerIdentityHandle: definition.target.identityHandle!,
      stage: RouteConfigStageKind.Definition,
      routeKind: effectiveRouteKind(explicit?.routeKind ?? statics?.routeKind ?? RouteConfigKind.Route, component, readContributionValue(explicit, 'redirectTo', (entry) => entry.redirectTo) ?? readContributionValue(statics, 'redirectTo', (entry) => entry.redirectTo)),
      id,
      paths,
      title: selectedValue(explicit, statics, 'title', (entry) => entry.title, null),
      component,
      redirectTo: selectedValue(explicit, statics, 'redirectTo', (entry) => entry.redirectTo, null),
      caseSensitive: selectedValue(explicit, statics, 'caseSensitive', (entry) => entry.caseSensitive, false),
      transitionPlan: selectedValue(explicit, statics, 'transitionPlan', (entry) => entry.transitionPlan, null),
      viewport: selectedValue(explicit, statics, 'viewport', (entry) => entry.viewport, 'default'),
      hasData: contributionProvidesField(explicit, 'data') || contributionProvidesField(statics, 'data'),
      childContributions,
      fallback: selectedValue(explicit, statics, 'fallback', (entry) => entry.fallback, null),
      nav: selectedValue(explicit, statics, 'nav', (entry) => entry.nav, true),
      fieldStates: definitionFieldStates(explicit, statics),
      openFields,
      sourceContribution,
      sourceAddressHandle: sourceContribution?.sourceAddressHandle ?? definition.sourceAddressHandle,
      idSourceAddressHandle: idContribution?.idSourceAddressHandle
        ?? definition.nameSourceAddressHandle
        ?? definition.sourceAddressHandle,
      pathSourceAddressHandles: pathContribution?.pathSourceAddressHandles
        ?? [
          definition.nameSourceAddressHandle ?? definition.sourceAddressHandle,
          ...definition.aliases.map((alias) => alias.addressHandle),
        ],
      redirectToSourceAddressHandle: redirectContribution?.redirectToSourceAddressHandle ?? null,
      fieldProvenance,
      productProvenance: unique(productProvenance),
      openReasonKinds: unique(openReasonKinds),
      definitionTargetIdentityHandle: definition.target.identityHandle,
    };
  }

  private materializeStandaloneContribution(contribution: RouteConfigContributionModel): RouteConfigModel | null {
    const local = `router-route-config-standalone:${contribution.identityHandle}`;
    const seed = this.appliedSeed(
      local,
      contribution,
      null,
      null,
      contribution.identityHandle,
    );
    return this.materializeSeed(
      seed,
      new Map([[contribution, RouteConfigContributionEffectKind.Selected]]),
      new Set(),
    );
  }

  private materializeApplied(
    contribution: RouteConfigContributionModel,
    parent: RouteConfigSeed,
    contributionAncestry: ReadonlySet<IdentityHandle>,
  ): RouteConfigModel | null {
    if (contributionAncestry.has(contribution.identityHandle)) {
      parent.openFields.add('children');
      if (!parent.openReasonKinds.includes(OpenSeamReasonKind.RouterRouteConfigRecursiveApplication)) {
        parent.openReasonKinds.push(OpenSeamReasonKind.RouterRouteConfigRecursiveApplication);
      }
      return null;
    }
    const local = `router-route-config-applied:${parent.identityHandle}:${contribution.identityHandle}`;
    const identityHandle = this.publication.handles.identity(local);
    const base = contribution.component?.resolvedIdentityHandle == null
      ? null
      : this.definitionSeedForTarget(contribution.component.resolvedIdentityHandle);
    const seed = this.appliedSeed(local, contribution, base, parent, parent.identityHandle);
    return this.materializeSeed(
      seed,
      new Map([[contribution, RouteConfigContributionEffectKind.Applied]]),
      new Set([...contributionAncestry, contribution.identityHandle]),
    );
  }

  private appliedSeed(
    local: string,
    contribution: RouteConfigContributionModel,
    base: RouteConfigSeed | null,
    parent: RouteConfigSeed | null,
    ownerIdentityHandle: IdentityHandle,
  ): RouteConfigSeed {
    const paths = contributionProvidesField(contribution, 'path')
      ? contribution.paths
      : base?.paths ?? [];
    const id = contributionProvidesField(contribution, 'id')
      ? contribution.id
      : base?.id ?? paths[0] ?? null;
    const childContributions = contributionProvidesField(contribution, 'children')
      ? contributionChildren(contribution, this.contributionByIdentity)
      : base?.childContributions ?? [];
    const component = appliedComponentReference(contribution.component, base?.component ?? null);
    const transition = appliedInheritedField(contribution, base, parent, 'transitionPlan', (entry) => entry.transitionPlan);
    const fallback = appliedInheritedField(contribution, base, parent, 'fallback', (entry) => entry.fallback);
    const openFields = appliedOpenFields(contribution, base, parent);
    const fieldProvenance = new Map<RouteConfigValueField, readonly ProvenanceHandle[]>();
    for (const field of ROUTE_CONFIG_VALUE_FIELDS) {
      let handles: readonly ProvenanceHandle[];
      if (contributionProvidesField(contribution, field)) {
        handles = contributionFieldProvenance(contribution, field);
      } else if (contributionState(contribution, field) === RouteConfigFieldStateKind.Open) {
        handles = [
          ...contributionFieldProvenance(contribution, field),
          ...(base?.fieldProvenance.get(field) ?? []),
        ];
      } else if (field === 'transitionPlan' && transition.owner === parent) {
        handles = parent?.fieldProvenance.get(field) ?? [];
      } else if (field === 'fallback' && fallback.owner === parent) {
        handles = parent?.fieldProvenance.get(field) ?? [];
      } else {
        handles = base?.fieldProvenance.get(field) ?? [];
      }
      if (handles.length > 0) {
        fieldProvenance.set(field, handles);
      }
    }
    const productProvenance = unique([
      ...contributionProductProvenance(this.publication, contribution),
      ...(base?.productProvenance ?? []),
      ...(parent == null ? [] : parent.productProvenance),
    ]);
    return {
      productHandle: this.publication.handles.product(local),
      identityHandle: this.publication.handles.identity(local),
      ownerIdentityHandle,
      stage: RouteConfigStageKind.Applied,
      routeKind: effectiveRouteKind(contribution.routeKind, component, contribution.redirectTo ?? base?.redirectTo ?? null),
      id,
      paths,
      title: appliedValue(contribution, base, 'title', (entry) => entry.title, (entry) => entry.title, null),
      component,
      redirectTo: appliedValue(contribution, base, 'redirectTo', (entry) => entry.redirectTo, (entry) => entry.redirectTo, null),
      caseSensitive: appliedValue(contribution, base, 'caseSensitive', (entry) => entry.caseSensitive, (entry) => entry.caseSensitive, false),
      transitionPlan: transition.value,
      viewport: appliedValue(contribution, base, 'viewport', (entry) => entry.viewport, (entry) => entry.viewport, 'default'),
      hasData: contributionProvidesField(contribution, 'data') ? contribution.hasData : base?.hasData ?? false,
      childContributions,
      fallback: fallback.value,
      nav: appliedValue(contribution, base, 'nav', (entry) => entry.nav, (entry) => entry.nav, true),
      fieldStates: appliedFieldStates(contribution, base, parent, transition.owner, fallback.owner),
      openFields,
      sourceContribution: contribution,
      sourceAddressHandle: contribution.sourceAddressHandle,
      idSourceAddressHandle: contributionProvidesField(contribution, 'id')
        ? contribution.idSourceAddressHandle
        : base?.idSourceAddressHandle
          ?? (contributionProvidesField(contribution, 'path')
            ? contribution.pathSourceAddressHandles[0] ?? contribution.sourceAddressHandle
            : null),
      pathSourceAddressHandles: contributionProvidesField(contribution, 'path')
        ? contribution.pathSourceAddressHandles
        : base?.pathSourceAddressHandles ?? paths.map(() => contribution.sourceAddressHandle),
      redirectToSourceAddressHandle: contributionProvidesField(contribution, 'redirectTo')
        ? contribution.redirectToSourceAddressHandle
        : base?.redirectToSourceAddressHandle ?? null,
      fieldProvenance,
      productProvenance,
      openReasonKinds: unique([
        ...(base?.openReasonKinds ?? []),
        ...(parent?.openReasonKinds ?? []),
        ...(contribution.executionKind === RouteConfigExecutionKind.Unproven
          ? [OpenSeamReasonKind.RouterRouteConfigExecutionUnproven]
          : []),
        ...(contribution.fieldStates.some((state) => state.stateKind === RouteConfigFieldStateKind.Open)
          ? [OpenSeamReasonKind.RouterRouteConfigValueOpen]
          : []),
      ]),
      definitionTargetIdentityHandle: base?.definitionTargetIdentityHandle ?? contribution.component?.resolvedIdentityHandle ?? null,
    };
  }

  private materializeSeed(
    seed: RouteConfigSeed,
    effects: ReadonlyMap<RouteConfigContributionModel, RouteConfigContributionEffectKind>,
    ancestry: ReadonlySet<IdentityHandle>,
  ): RouteConfigModel | null {
    const cached = this.modelsByIdentity.get(seed.identityHandle);
    if (cached != null) {
      return cached;
    }
    const childModels = seed.childContributions.flatMap((contribution) => {
      const child = this.materializeApplied(contribution, seed, ancestry);
      return child == null ? [] : [child];
    });
    const local = seed.stage === RouteConfigStageKind.Definition
      ? `router-route-config-definition:${seed.definitionTargetIdentityHandle ?? seed.identityHandle}`
      : `router-route-config-applied:${seed.ownerIdentityHandle}:${seed.sourceContribution?.identityHandle ?? seed.identityHandle}`;
    const provenance = this.aggregateProvenance(`${local}:provenance`, seed.productProvenance);
    const fieldProvenance = ROUTE_CONFIG_VALUE_FIELDS.flatMap((field) => {
      const handles = seed.fieldProvenance.get(field) ?? [];
      if (handles.length === 0) {
        return [];
      }
      const handle = this.aggregateProvenance(`${local}:field:${field}:provenance`, handles);
      return [new FieldProvenance<RouteConfigField>(field, handle)];
    });
    const sourceProvenance = seed.sourceContribution == null
      ? null
      : contributionProductProvenance(this.publication, seed.sourceContribution)[0] ?? null;
    if (sourceProvenance != null) {
      fieldProvenance.push(new FieldProvenance<RouteConfigField>('source', sourceProvenance));
    }
    const routeConfig = new RouteConfigModel(
      seed.productHandle,
      seed.identityHandle,
      seed.stage,
      seed.openFields.size === 0 ? RouterClosureKind.Closed : RouterClosureKind.Open,
      seed.routeKind,
      seed.id,
      seed.paths,
      seed.title,
      seed.component,
      seed.redirectTo,
      seed.caseSensitive,
      seed.transitionPlan,
      seed.viewport,
      seed.hasData,
      childModels.map((child) => child.toReference()),
      seed.fallback,
      seed.nav,
      ROUTE_CONFIG_VALUE_FIELDS.map((field) => new RouteConfigFieldState(
        field,
        seed.fieldStates.get(field) ?? RouteConfigFieldStateKind.Absent,
      )),
      [...seed.openFields],
      seed.sourceContribution?.toReference() ?? null,
      seed.sourceAddressHandle,
      seed.idSourceAddressHandle,
      seed.pathSourceAddressHandles,
      seed.redirectToSourceAddressHandle,
      fieldProvenance,
    );
    const claimRecords = [...effects].map(([contribution], index) => new SemanticClaim(
      this.publication.handles.claim(`${local}:contribution:${index}:converges`),
      contribution.productHandle,
      KernelVocabulary.Router.ConvergesToRouteConfig.key,
      routeConfig.productHandle,
      contributionProductProvenance(this.publication, contribution)[0] ?? provenance,
    ));
    const open = seed.openFields.size === 0
      ? null
      : routerOpenSeamRecords(this.publication, {
          local: `${local}:open`,
          seamKindKey: KernelVocabulary.Router.OpenRouteConfig.key,
          ownerHandle: routeConfig.identityHandle,
          summary: `RouteConfig '${routeConfig.id ?? routeConfig.paths[0] ?? '<open>'}' retains ${seed.openFields.size} open effective field(s).`,
          sourceAddressHandle: routeConfig.sourceAddressHandle,
          reasonKinds: seed.openReasonKinds.length > 0
            ? seed.openReasonKinds
            : [OpenSeamReasonKind.RouterRouteConfigValueOpen],
          evidenceKind: EvidenceKind.SemanticObservation,
          evidenceRoles: [EvidenceRole.TransformOutput, EvidenceRole.Diagnostic],
        });
    this.records.push(
      ...claimRecords,
      ...(open?.records ?? []),
      ...routerIdentityProductRecords(this.publication, {
        local,
        productHandle: routeConfig.productHandle,
        identityHandle: routeConfig.identityHandle,
        productKindKey: KernelVocabulary.Router.RouteConfig.key,
        ownerHandle: seed.ownerIdentityHandle,
        sourceAddressHandle: routeConfig.sourceAddressHandle,
        localName: routeConfig.id ?? routeConfig.paths[0] ?? null,
        provenanceHandle: provenance,
        materializationClaimHandles: claimRecords.map((claim) => claim.handle),
        materializationOpenSeamHandles: open == null ? [] : [open.openSeam.handle],
      }),
    );
    this.modelsByIdentity.set(routeConfig.identityHandle, routeConfig);
    this.routeConfigs.push(routeConfig);
    for (const [contribution, effectKind] of effects) {
      this.links.push(new RouteConfigConvergenceLink(contribution, routeConfig, effectKind));
    }
    return routeConfig;
  }

  private aggregateProvenance(local: string, handles: readonly ProvenanceHandle[]): ProvenanceHandle {
    const uniqueHandles = unique(handles);
    if (uniqueHandles.length === 1) {
      return uniqueHandles[0]!;
    }
    const handle = this.publication.handles.provenance(local);
    const evidenceHandles = unique(uniqueHandles.flatMap((provenanceHandle) =>
      provenanceEvidenceHandles(this.publication, provenanceHandle)
    ));
    this.records.push(new ProvenanceRecord(handle, evidenceHandles));
    return handle;
  }
}

function routeableReferenceForDefinition(
  definition: Extract<FullResourceDefinition, { readonly type: ResourceDefinitionKind.CustomElement }>,
): RouteableComponentReference {
  return new RouteableComponentReference(
    null,
    null,
    RouteableComponentKind.ResourceDefinition,
    definition.sourceAddressHandle,
    definition.target.localName ?? definition.name,
    definition.name,
    definition.productHandle,
    definition.target.identityHandle,
  );
}

function appliedComponentReference(
  authored: RouteableComponentReference | null,
  definition: RouteableComponentReference | null,
): RouteableComponentReference | null {
  if (authored == null) return definition;
  if (definition == null) return authored;
  return new RouteableComponentReference(
    authored.productHandle,
    authored.identityHandle,
    authored.componentKind,
    authored.sourceAddressHandle,
    authored.localName,
    definition.resolvedName ?? authored.resolvedName,
    definition.resolvedProductHandle ?? authored.resolvedProductHandle,
    definition.resolvedIdentityHandle ?? authored.resolvedIdentityHandle,
  );
}

function contributionState(
  contribution: RouteConfigContributionModel | null,
  field: RouteConfigValueField,
): RouteConfigFieldStateKind {
  return contribution?.fieldStates.find((state) => state.field === field)?.stateKind
    ?? RouteConfigFieldStateKind.Absent;
}

function contributionProvidesField(
  contribution: RouteConfigContributionModel | null,
  field: RouteConfigValueField,
): boolean {
  const state = contributionState(contribution, field);
  if (contribution == null || state === RouteConfigFieldStateKind.Absent || state === RouteConfigFieldStateKind.Open) {
    return false;
  }
  if (state === RouteConfigFieldStateKind.Referential) {
    return true;
  }
  switch (field) {
    case 'id': return contribution.id != null;
    case 'path': return contribution.paths.length > 0;
    case 'title': return contribution.title != null;
    case 'redirectTo': return contribution.redirectTo != null;
    case 'caseSensitive': return contribution.caseSensitive != null;
    case 'transitionPlan': return contribution.transitionPlan != null;
    case 'viewport': return contribution.viewport != null;
    case 'nav': return contribution.nav != null;
    case 'component':
    case 'data':
    case 'children':
    case 'fallback':
      return false;
  }
}

function readContributionValue<T>(
  contribution: RouteConfigContributionModel | null,
  field: RouteConfigValueField,
  read: (contribution: RouteConfigContributionModel) => T,
): T | null {
  return contribution != null && contributionProvidesField(contribution, field) ? read(contribution) : null;
}

function selectedValue<T>(
  explicit: RouteConfigContributionModel | null,
  statics: RouteConfigContributionModel | null,
  field: RouteConfigValueField,
  read: (contribution: RouteConfigContributionModel) => T,
  fallback: T,
): T {
  if (explicit != null && contributionProvidesField(explicit, field)) return read(explicit);
  if (statics != null && contributionProvidesField(statics, field)) return read(statics);
  return fallback;
}

function appliedValue<T>(
  contribution: RouteConfigContributionModel,
  base: RouteConfigSeed | null,
  field: RouteConfigValueField,
  readContribution: (contribution: RouteConfigContributionModel) => T,
  readBase: (base: RouteConfigSeed) => T,
  fallback: T,
): T {
  if (contributionProvidesField(contribution, field)) return readContribution(contribution);
  if (base == null) return fallback;
  return readBase(base);
}

function appliedInheritedField<T>(
  contribution: RouteConfigContributionModel,
  base: RouteConfigSeed | null,
  parent: RouteConfigSeed | null,
  field: 'transitionPlan' | 'fallback',
  read: (contribution: RouteConfigContributionModel) => T,
): { readonly value: T | null; readonly owner: RouteConfigSeed | RouteConfigContributionModel | null } {
  if (contributionProvidesField(contribution, field)) {
    return { value: read(contribution), owner: contribution };
  }
  const baseValue = base == null
    ? null
    : field === 'transitionPlan' ? base.transitionPlan : base.fallback;
  const baseState = base?.fieldStates.get(field) ?? RouteConfigFieldStateKind.Absent;
  if (baseValue != null || baseState === RouteConfigFieldStateKind.Referential || baseState === RouteConfigFieldStateKind.Open) {
    return { value: baseValue as T | null, owner: base };
  }
  const parentValue = parent == null
    ? null
    : field === 'transitionPlan' ? parent.transitionPlan : parent.fallback;
  return { value: parentValue as T | null, owner: parent };
}

function fieldContribution(
  explicit: RouteConfigContributionModel | null,
  statics: RouteConfigContributionModel | null,
  field: RouteConfigValueField,
): RouteConfigContributionModel | null {
  return explicit != null && contributionProvidesField(explicit, field)
    ? explicit
    : statics != null && contributionProvidesField(statics, field)
      ? statics
      : null;
}

function definitionFieldIsOpen(
  explicit: RouteConfigContributionModel | null,
  statics: RouteConfigContributionModel | null,
  field: RouteConfigValueField,
): boolean {
  const explicitState = contributionState(explicit, field);
  const staticState = contributionState(statics, field);
  if (field === 'data' || field === 'children') {
    return explicitState === RouteConfigFieldStateKind.Open || staticState === RouteConfigFieldStateKind.Open;
  }
  if (contributionProvidesField(explicit, field)) {
    return false;
  }
  if (explicitState === RouteConfigFieldStateKind.Open) {
    return true;
  }
  if (contributionProvidesField(statics, field)) {
    return false;
  }
  return staticState === RouteConfigFieldStateKind.Open;
}

function definitionFieldContributions(
  explicit: RouteConfigContributionModel | null,
  statics: RouteConfigContributionModel | null,
  field: RouteConfigValueField,
): readonly RouteConfigContributionModel[] {
  if (field === 'data' || field === 'children') {
    return [explicit, statics].filter((entry): entry is RouteConfigContributionModel =>
      contributionProvidesField(entry, field) || contributionState(entry, field) === RouteConfigFieldStateKind.Open
    );
  }
  const provider = fieldContribution(explicit, statics, field);
  const openContributions = [explicit, statics].filter((entry): entry is RouteConfigContributionModel =>
    contributionState(entry, field) === RouteConfigFieldStateKind.Open
  );
  return unique([
    ...openContributions,
    ...(provider == null ? [] : [provider]),
  ]);
}

function contributionChildren(
  contribution: RouteConfigContributionModel | null,
  contributionsByIdentity: ReadonlyMap<IdentityHandle, RouteConfigContributionModel>,
): readonly RouteConfigContributionModel[] {
  if (contribution == null || !contributionProvidesField(contribution, 'children')) return [];
  return contribution.childRoutes.flatMap((reference) => {
    const child = contributionsByIdentity.get(reference.identityHandle);
    return child == null ? [] : [child];
  });
}

function contributionFieldProvenance(
  contribution: RouteConfigContributionModel,
  field: RouteConfigValueField,
): readonly ProvenanceHandle[] {
  const provenance = readFieldProvenance(contribution.fieldProvenance, field);
  return provenance == null ? [] : [provenance];
}

function contributionProductProvenance(
  store: KernelStoreReadView,
  contribution: RouteConfigContributionModel,
): readonly ProvenanceHandle[] {
  const provenance = readProductProvenance(store, contribution.productHandle);
  return provenance == null ? [] : [provenance];
}

function readProductProvenance(
  store: KernelStoreReadView,
  productHandle: ProductHandle,
): ProvenanceHandle | null {
  const product = store.read(productHandle);
  return product?.kind === 'materialized-product' ? product.provenanceHandle : null;
}

function provenanceEvidenceHandles(
  store: KernelStoreReadView,
  provenanceHandle: ProvenanceHandle,
): readonly EvidenceHandle[] {
  const provenance = store.read(provenanceHandle);
  return provenance?.kind === 'provenance-record' ? provenance.evidenceHandles : [];
}

function definitionFieldStates(
  explicit: RouteConfigContributionModel | null,
  statics: RouteConfigContributionModel | null,
): ReadonlyMap<RouteConfigValueField, RouteConfigFieldStateKind> {
  const states = new Map<RouteConfigValueField, RouteConfigFieldStateKind>();
  for (const field of ROUTE_CONFIG_VALUE_FIELDS) {
    if (field === 'component' || field === 'data' || field === 'children') {
      states.set(field, RouteConfigFieldStateKind.Referential);
      continue;
    }
    const source = fieldContribution(explicit, statics, field);
    states.set(field, source == null ? RouteConfigFieldStateKind.Closed : contributionState(source, field));
  }
  return states;
}

function appliedFieldStates(
  contribution: RouteConfigContributionModel,
  base: RouteConfigSeed | null,
  parent: RouteConfigSeed | null,
  transitionOwner: RouteConfigSeed | RouteConfigContributionModel | null,
  fallbackOwner: RouteConfigSeed | RouteConfigContributionModel | null,
): ReadonlyMap<RouteConfigValueField, RouteConfigFieldStateKind> {
  const states = new Map<RouteConfigValueField, RouteConfigFieldStateKind>();
  for (const field of ROUTE_CONFIG_VALUE_FIELDS) {
    if (contributionProvidesField(contribution, field)) {
      states.set(field, contributionState(contribution, field));
      continue;
    }
    if (field === 'transitionPlan') {
      states.set(field, inheritedFieldState(transitionOwner, field));
      continue;
    }
    if (field === 'fallback') {
      states.set(field, inheritedFieldState(fallbackOwner, field));
      continue;
    }
    states.set(field, base?.fieldStates.get(field) ?? defaultFieldState(field));
  }
  return states;
}

function inheritedFieldState(
  owner: RouteConfigSeed | RouteConfigContributionModel | null,
  field: 'transitionPlan' | 'fallback',
): RouteConfigFieldStateKind {
  if (owner == null) return RouteConfigFieldStateKind.Closed;
  return 'stage' in owner
    ? owner.fieldStates.get(field) ?? RouteConfigFieldStateKind.Closed
    : contributionState(owner, field);
}

function defaultFieldState(field: RouteConfigValueField): RouteConfigFieldStateKind {
  return field === 'component' || field === 'data' || field === 'children'
    ? RouteConfigFieldStateKind.Referential
    : RouteConfigFieldStateKind.Closed;
}

function appliedOpenFields(
  contribution: RouteConfigContributionModel,
  base: RouteConfigSeed | null,
  parent: RouteConfigSeed | null,
): Set<RouteConfigValueField> {
  const open = new Set<RouteConfigValueField>();
  for (const field of ROUTE_CONFIG_VALUE_FIELDS) {
    if (contributionProvidesField(contribution, field)) {
      continue;
    }
    if (contributionState(contribution, field) === RouteConfigFieldStateKind.Open) {
      open.add(field);
      continue;
    }
    if (base?.openFields.has(field)) {
      open.add(field);
      continue;
    }
    if ((field === 'transitionPlan' || field === 'fallback') && parent?.openFields.has(field)) {
      open.add(field);
    }
  }
  return open;
}

function addAll<T>(target: Set<T>, values: readonly T[]): void {
  for (const value of values) target.add(value);
}

function effectiveRouteKind(
  routeKind: RouteConfigKind,
  component: RouteableComponentReference | null,
  redirectTo: string | null,
): RouteConfigKind {
  return redirectTo != null && component == null ? RouteConfigKind.Redirect : routeKind;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
