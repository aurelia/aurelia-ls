import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import type { BindableDefinition } from '../resources/bindable-definition.js';
import {
  resourceDefinitionNameSourceAddressHandle,
  taxonomyResourceKindForDefinition,
  type FullResourceDefinition,
} from '../resources/resource-definition.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { ResourceIssue } from '../resources/resource-issue.js';
import type { ResourceDependencyReference } from '../resources/resource-reference.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import type {
  WatchCallbackDefinition,
  WatchDefinition,
  WatchExpressionDefinition,
} from '../resources/watch-definition.js';
import {
  describeAddress,
} from './source-reference.js';
import type {
  SemanticResourceDefinitionBindableRow,
  SemanticResourceDefinitionAliasRow,
  SemanticResourceDefinitionDependencyRow,
  SemanticResourceDeclarationMode,
  SemanticResourceDefinitionPatternRow,
  SemanticResourceDefinitionRow,
  SemanticResourceDefinitionTemplateRow,
  SemanticResourceDefinitionWatchRow,
  SemanticResourceIssueRow,
  SemanticResourceIssuesResult,
  SemanticRuntimePageInput,
} from './contracts.js';
import { pageProjectedRows } from './answer-helpers.js';
import {
  projectBindableDefinitionSources,
  projectBindableDefinitionSurface,
} from './bindable-projection.js';

export type ResourceDefinitionCoreProjection = Pick<
  SemanticResourceDefinitionRow,
  | 'aliases'
  | 'bindables'
  | 'declarationModes'
  | 'defaultProperty'
  | 'source'
  | 'nameSource'
  | 'targetSource'
  | 'targetDeclarationSource'
>;

export type ResourceDefinitionSourceProjection = Pick<
  ResourceDefinitionCoreProjection,
  'source' | 'nameSource' | 'targetSource' | 'targetDeclarationSource'
>;

interface ResourceDefinitionPageCandidate {
  readonly definition: FullResourceDefinition;
  readonly resourceKind: SemanticResourceDefinitionRow['resourceKind'];
  readonly name: SemanticResourceDefinitionRow['name'];
  readonly targetName: SemanticResourceDefinitionRow['targetName'];
  readonly sourceProjection: ResourceDefinitionSourceProjection;
  readonly orderingKey: string;
  readonly cursorKey: string;
  readonly ordinal: number;
}

export function readResourceDefinitionPage(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
  page?: SemanticRuntimePageInput,
) {
  const candidates = emission.resources.readDefinitions()
    .map((definition, ordinal) => resourceDefinitionPageCandidate(store, definition, ordinal))
    .sort((left, right) => left.orderingKey.localeCompare(right.orderingKey) || left.ordinal - right.ordinal);
  let issues: readonly ResourceIssue[] | null = null;
  return pageProjectedRows(
    candidates,
    page,
    (candidate) => resourceDefinitionRow(
      emission,
      store,
      candidate,
      issues ??= readProjectResourceIssues(emission, store),
      handles,
    ),
    {
      unboundCursorBasis: () => [
        'resource-definitions',
        emission.project.projectKey,
        emission.project.inputGeneration.revision,
        emission.analysisDepth,
        handles,
        candidates.map((candidate) => candidate.cursorKey),
      ],
    },
  );
}

export function readResourceIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticResourceIssuesResult['rows'] {
  const definitions = emission.resources.readDefinitions();
  return readProjectResourceIssues(emission, store)
    .map((issue) => resourceIssueRow(store, issue, definitionForIssue(definitions, issue), handles))
    .sort((left, right) =>
      `${left.phase}:${left.issueKind}:${left.resource.name ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.phase}:${right.issueKind}:${right.resource.name ?? ''}:${right.source?.label ?? ''}`)
    );
}

function resourceDefinitionRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  candidate: ResourceDefinitionPageCandidate,
  issues: readonly ResourceIssue[],
  handles: boolean,
): SemanticResourceDefinitionRow {
  const definition = candidate.definition;
  const core = readResourceDefinitionCoreProjection(
    emission,
    store,
    definition,
    true,
    candidate.sourceProjection,
  );
  return {
    projectKey: emission.project.projectKey,
    resourceKind: candidate.resourceKind,
    declarationModes: core.declarationModes,
    name: candidate.name,
    aliases: core.aliases,
    key: readDefinitionKey(definition),
    targetName: candidate.targetName,
    captureKind: 'capture' in definition ? definition.capture.kind : null,
    template: 'template' in definition ? templateRow(definition.template, store) : null,
    bindables: core.bindables,
    watches: 'watches' in definition ? watchRows(definition.watches, store) : [],
    issues: issues
      .filter((issue) => issue.ownerDefinitionIdentityHandle === definition.identityHandle)
      .map((issue) => resourceIssueRow(store, issue, definition, handles)),
    dependencies: 'dependencies' in definition ? dependencyRows(definition.dependencies) : [],
    isTemplateController: 'isTemplateController' in definition ? definition.isTemplateController : null,
    containerStrategy: 'containerStrategy' in definition ? definition.containerStrategy : null,
    defaultProperty: core.defaultProperty,
    noMultiBindings: 'noMultiBindings' in definition ? definition.noMultiBindings : null,
    containerless: 'containerless' in definition ? definition.containerless : null,
    shadowMode: 'shadowOptions' in definition ? definition.shadowOptions?.mode ?? null : null,
    hasSlots: 'hasSlots' in definition ? definition.hasSlots : null,
    needsCompile: 'needsCompile' in definition ? definition.needsCompile : null,
    patterns: 'patterns' in definition ? definition.patterns.map((pattern): SemanticResourceDefinitionPatternRow => ({
      pattern: pattern.pattern,
      symbols: pattern.symbols,
      source: describeAddress(store, pattern.addressHandle),
    })) : [],
    source: core.source,
    nameSource: core.nameSource,
    targetSource: core.targetSource,
    targetDeclarationSource: core.targetDeclarationSource,
    ...(handles ? {
      handles: {
        definitionProductHandle: definition.productHandle,
        identityHandle: definition.identityHandle,
        targetIdentityHandle: definition.target.identityHandle,
        sourceAddressHandle: definition.sourceAddressHandle,
        nameSourceAddressHandle: resourceDefinitionNameSourceAddressHandle(definition),
        targetAddressHandle: definition.target.addressHandle,
        targetDeclarationSourceAddressHandle: definition.target.declarationSourceAddressHandle,
      },
    } : {}),
  };
}

/**
 * Project the definition facts shared by full definition reads and resource discovery.
 *
 * ResourceDefinitions always requests the canonical checker-backed bindable surface. ResourceInventory can omit that
 * surface and the broader watches, issues, dependencies, and template metadata without re-deriving the common facts.
 */
export function readResourceDefinitionCoreProjection(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  definition: FullResourceDefinition,
  includeTypeSurfaces: boolean,
  sources: ResourceDefinitionSourceProjection = readResourceDefinitionSourceProjection(store, definition),
): ResourceDefinitionCoreProjection {
  return {
    aliases: readDefinitionAliases(definition, store),
    bindables: 'bindables' in definition
      ? bindableRows(
          definition.bindables,
          definition.target,
          store,
          emission.templates.expressionWorld.projector,
          includeTypeSurfaces,
        )
      : [],
    declarationModes: declarationModesForDefinition(definition),
    defaultProperty: 'defaultProperty' in definition ? definition.defaultProperty : null,
    ...sources,
  };
}

function resourceDefinitionPageCandidate(
  store: KernelStore,
  definition: FullResourceDefinition,
  ordinal: number,
): ResourceDefinitionPageCandidate {
  const resourceKind = taxonomyResourceKindForDefinition(definition);
  const name = readDefinitionName(definition);
  const targetName = definition.target.localName;
  const sourceProjection = readResourceDefinitionSourceProjection(store, definition);
  const orderingKey = `${resourceKind}:${name ?? ''}:${targetName ?? ''}:${sourceProjection.source?.label ?? ''}`;
  return {
    definition,
    resourceKind,
    name,
    targetName,
    sourceProjection,
    orderingKey,
    cursorKey: `${orderingKey}:${String(definition.productHandle)}:${String(definition.identityHandle)}:${ordinal}`,
    ordinal,
  };
}

/** Project source roles without forcing bindable or TypeChecker work. */
export function readResourceDefinitionSourceProjection(
  store: KernelStore,
  definition: FullResourceDefinition,
): ResourceDefinitionSourceProjection {
  return {
    source: describeAddress(store, definition.sourceAddressHandle),
    nameSource: describeAddress(store, resourceDefinitionNameSourceAddressHandle(definition)),
    targetSource: describeAddress(store, definition.target.addressHandle),
    targetDeclarationSource: describeAddress(store, definition.target.declarationSourceAddressHandle),
  };
}

function readProjectResourceIssues(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): readonly ResourceIssue[] {
  return store.productDetails.readBySlot(ResourceProductDetails.Issue)
    .map((entry) => entry.detail)
    .filter((issue) => issue.projectKey === emission.project.projectKey);
}

function definitionForIssue(
  definitions: readonly FullResourceDefinition[],
  issue: ResourceIssue,
): FullResourceDefinition | null {
  return definitions.find((definition) =>
    definition.identityHandle === issue.ownerDefinitionIdentityHandle
  ) ?? null;
}

function resourceIssueRow(
  store: KernelStore,
  issue: ResourceIssue,
  definition: FullResourceDefinition | null,
  handles: boolean,
): SemanticResourceIssueRow {
  return {
    projectKey: issue.projectKey,
    phase: issue.phase,
    issueKind: issue.issueKind,
    diagnosticAuthority: issue.frameworkErrorCode == null ? 'semantic-runtime-product' : 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: issue.severity,
    message: issue.message,
    source: describeAddress(store, issue.sourceAddressHandle),
    relatedInformation: issue.relatedInformation.map((related) => ({
      message: related.message,
      source: describeAddress(store, related.sourceAddressHandle),
    })),
    resource: {
      resourceKind: definition == null ? null : taxonomyResourceKindForDefinition(definition),
      name: definition == null ? null : readDefinitionName(definition),
      key: definition == null ? null : readDefinitionKey(definition),
      source: definition == null ? null : describeAddress(store, definition.sourceAddressHandle),
    },
    ...(handles ? {
      handles: {
        productHandle: issue.productHandle,
        identityHandle: issue.identityHandle,
        ownerDefinitionIdentityHandle: issue.ownerDefinitionIdentityHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
        relatedSourceAddressHandles: issue.relatedInformation
          .map((related) => related.sourceAddressHandle)
          .filter((addressHandle): addressHandle is NonNullable<typeof addressHandle> => addressHandle != null),
      },
    } : {}),
  };
}

function declarationModesForDefinition(definition: FullResourceDefinition): readonly SemanticResourceDeclarationMode[] {
  const modes = new Set<SemanticResourceDeclarationMode>();
  for (const contribution of definition.contributions) {
    const mode = declarationModeForContributionKind(String(contribution.contributionKind));
    if (mode != null) {
      modes.add(mode);
    }
  }
  return [...modes].sort((left, right) => left.localeCompare(right));
}

function declarationModeForContributionKind(kind: string): SemanticResourceDeclarationMode | null {
  switch (kind) {
    case 'annotation':
      return 'decorator';
    case 'type-static-property':
      return 'static-property';
    case 'definition-object':
      return 'definition-object';
    case 'create-call':
      return 'factory-call';
    case 'convention':
      return 'convention';
    case 'local-template':
      return 'local-template';
    case 'header':
      return 'header';
    case 'bindable-metadata':
    case 'watch-metadata':
      return null;
    default:
      return null;
  }
}

function readDefinitionName(definition: FullResourceDefinition): string | null {
  return 'name' in definition ? definition.name : null;
}

function readDefinitionAliases(
  definition: FullResourceDefinition,
  store: KernelStore,
): readonly SemanticResourceDefinitionAliasRow[] {
  return 'aliases' in definition
    ? definition.aliases.map((alias) => ({
        name: alias.name,
        source: describeAddress(store, alias.addressHandle),
      }))
    : [];
}

function readDefinitionKey(definition: FullResourceDefinition): string | null {
  return 'key' in definition ? definition.key : null;
}

function templateRow(
  template: Extract<FullResourceDefinition, { readonly type: ResourceDefinitionKind.CustomElement }>['template'],
  store: KernelStore,
): SemanticResourceDefinitionTemplateRow | null {
  if (template == null) {
    return null;
  }
  return {
    kind: template.kind,
    hasMarkup: template.markup != null && template.markup.length > 0,
    source: describeAddress(store, template.addressHandle),
  };
}

function bindableRows(
  bindables: readonly BindableDefinition[],
  target: FullResourceDefinition['target'],
  store: KernelStore,
  projector: CheckerTypeProjector,
  includeTypeSurfaces = true,
): readonly SemanticResourceDefinitionBindableRow[] {
  return bindables
    .map((bindable): SemanticResourceDefinitionBindableRow => ({
      name: bindable.name,
      attribute: bindable.attribute,
      callback: bindable.callback,
      mode: bindable.mode,
      ...projectBindableDefinitionSurface(store, projector, bindable, target, {
        includeTypeSurface: includeTypeSurfaces,
      }),
      ...projectBindableDefinitionSources(store, bindable),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function watchRows(
  watches: readonly WatchDefinition[],
  store: KernelStore,
): readonly SemanticResourceDefinitionWatchRow[] {
  return watches
    .map((watch): SemanticResourceDefinitionWatchRow => ({
      expressionKind: watch.expression.kind,
      expressionPropertyKeyKind: watch.expression.propertyKey?.kind ?? null,
      expressionPropertyKeyText: watch.expression.propertyKey?.text ?? null,
      expressionSource: watchExpressionSource(watch.expression, store),
      callbackKind: watch.callback.kind,
      callbackPropertyKeyKind: watch.callback.methodName?.kind ?? null,
      callbackPropertyKeyText: watch.callback.methodName?.text ?? null,
      callbackSource: watchCallbackSource(watch.callback, store),
      flush: watch.flush,
    }))
    .sort((left, right) =>
      `${left.expressionKind}:${left.expressionPropertyKeyText ?? ''}:${left.callbackKind}:${left.callbackPropertyKeyText ?? ''}:${left.flush}`
        .localeCompare(`${right.expressionKind}:${right.expressionPropertyKeyText ?? ''}:${right.callbackKind}:${right.callbackPropertyKeyText ?? ''}:${right.flush}`)
    );
}

function watchExpressionSource(
  expression: WatchExpressionDefinition,
  store: KernelStore,
) {
  return describeAddress(store, expression.propertyKey?.target?.addressHandle ?? expression.target?.addressHandle ?? null);
}

function watchCallbackSource(
  callback: WatchCallbackDefinition,
  store: KernelStore,
) {
  return describeAddress(store, callback.methodName?.target?.addressHandle ?? callback.target?.addressHandle ?? null);
}

function dependencyRows(
  dependencies: readonly ResourceDependencyReference[],
): readonly SemanticResourceDefinitionDependencyRow[] {
  return dependencies
    .map((dependency): SemanticResourceDefinitionDependencyRow => ({
      dependencyKind: dependency.dependencyKind,
      keyName: dependency.keyName,
      localName: dependency.localName,
      registryKind: dependency.registryKind,
      hasIdentity: dependency.identityHandle != null,
    }))
    .sort((left, right) =>
      `${left.dependencyKind}:${left.registryKind ?? ''}:${left.keyName ?? ''}:${left.localName ?? ''}:${left.hasIdentity}`
        .localeCompare(`${right.dependencyKind}:${right.registryKind ?? ''}:${right.keyName ?? ''}:${right.localName ?? ''}:${right.hasIdentity}`)
    );
}
