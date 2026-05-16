import ts from 'typescript';
import type { AppRoot } from '../configuration/app-root.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import type { ConfigurationStep } from '../configuration/configuration-sequence.js';
import type { SourceFileAdmission } from '../boot/frames.js';
import type { AddressHandle, IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  readApplicationServiceTopology,
  readApplicationStyleAssetSites,
  supportSourceRoleForPath,
  type ApplicationFileRole,
  type ApplicationServiceClassSite,
  type ApplicationServiceInjectionSite,
  type ApplicationServiceInteractionOperationKind,
  type ApplicationServiceInteractionSite,
  type ApplicationStyleAssetKind,
  type ApplicationStyleAssetSite,
  type ApplicationStyleSourceKind,
  type ApplicationSupportSourceRole,
} from '../application/index.js';
import { BindableBindingMode } from '../resources/bindable-definition.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { ResourceDependencyReferenceKind } from '../resources/resource-reference.js';
import {
  RuntimeBindingDataFlowDirection,
  RuntimeBindingDataFlowSourceKind,
  RuntimeBindingValueChannelKind,
} from '../observation/runtime-binding-observation.js';
import {
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetOperationKind,
} from '../template/runtime-binding.js';
import { RuntimeControllerCreationKind } from '../template/runtime-controller.js';
import {
  classifyCheckerTypeShape,
  type CheckerTypeShapeKind,
} from '../type-system/type-shape.js';
import {
  normalizeTypeSystemSourceFileName,
  typeSystemSourcePathIndex,
} from '../type-system/source-path-index.js';
import type { TemplateCompilerWorldEmission } from '../template/compiler-world-materializer.js';
import type {
  RouteConfigModel,
  RouteConfigOriginKind,
  RouteConfigValueKind,
} from '../router/model.js';
import { projectBindableTypeSurface } from './bindable-type-projection.js';
import {
  readBindingTargetAccessRows,
  readBindingDataFlowRows,
  readTargetOperationRows,
} from './binding-projections.js';
import { readRuntimeControllerRows } from './controller-projections.js';
import type {
  SemanticBindingDataFlowRow,
  SemanticBindingTargetAccessRow,
  SemanticRuntimeControllerRow,
  SemanticTargetOperationRow,
} from './contracts.js';
import { compilerWorldLabel, describeAddress, type SemanticSourceReference } from './source-reference.js';

export interface SemanticApplicationBindableRow {
  readonly name: string;
  readonly attribute: string;
  readonly mode: BindableBindingMode | `${BindableBindingMode}`;
  readonly valueType: string | null;
  readonly valueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly effectiveValueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly valueTypeHasCallSignature: boolean | null;
  readonly valueTypeHasMembers: boolean | null;
  readonly valueTypeIsWeak: boolean | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticApplicationDependencyRow {
  readonly dependencyKind: ResourceDependencyReferenceKind | `${ResourceDependencyReferenceKind}`;
  readonly keyName: string | null;
  readonly localName: string | null;
  readonly registryKind: string | null;
  readonly componentName: string | null;
  readonly componentClassName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly identityHandle: IdentityHandle | null;
    readonly definitionProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticApplicationTemplateAsset {
  readonly sourceKind: string;
  readonly source: SemanticSourceReference | null;
  readonly htmlNodes: number | null;
  readonly runtimeBindings: number | null;
  readonly runtimeTargetOperations: number | null;
  readonly runtimeRendererTargetOperations: number | null;
  readonly runtimeBindingTargetAccesses: number | null;
  readonly runtimeBindingTargetOperations: number | null;
  readonly runtimeBindingSourceOperations: number | null;
  readonly runtimeBindingValueChannels: number | null;
  readonly runtimeBindingDataFlows: number | null;
  readonly openSeams: number | null;
  readonly handles?: {
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticApplicationStyleAsset {
  readonly ownerKind: 'component' | 'global';
  readonly assetKind: ApplicationStyleAssetKind | `${ApplicationStyleAssetKind}`;
  readonly sourceKind: ApplicationStyleSourceKind | `${ApplicationStyleSourceKind}`;
  readonly ownerSourcePath: string;
  readonly ownerClassName: string | null;
  readonly ownerElementName: string | null;
  readonly moduleSpecifier: string;
  readonly stylePath: string | null;
  readonly source: SemanticSourceReference | null;
  readonly evidenceSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly sourceAddressHandle: AddressHandle | null;
    readonly evidenceSourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticApplicationComponentReference {
  readonly className: string | null;
  readonly elementName: string;
  readonly aliases: readonly string[];
  readonly source: SemanticSourceReference | null;
  readonly template: SemanticApplicationTemplateAsset | null;
  readonly styles: readonly SemanticApplicationStyleAsset[];
  readonly roles: readonly SemanticApplicationComponentRoleRow[];
  readonly bindables: readonly SemanticApplicationBindableRow[];
  readonly dependencies: readonly SemanticApplicationDependencyRow[];
  readonly handles?: {
    readonly definitionProductHandle: ProductHandle | null;
    readonly definitionIdentityHandle: IdentityHandle | null;
    readonly targetIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly templateSourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticApplicationRootRow {
  readonly source: SemanticSourceReference | null;
  readonly host: SemanticSourceReference | null;
  readonly component: SemanticApplicationComponentReference | null;
  readonly compilerWorld: string | null;
  readonly configurationSequences: number;
  readonly configurationSteps: number;
  readonly registrationAdmissions: number;
  readonly compiledTemplates: number;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly hostAddressHandle: AddressHandle | null;
    readonly compilerWorldProductHandle: ProductHandle | null;
  };
}

export interface SemanticApplicationComponentRow extends SemanticApplicationComponentReference {
  readonly appRootCount: number;
  readonly visibleCompilerWorlds: number;
  readonly templateCompilations: number;
}

export const enum SemanticApplicationComponentRoleKind {
  /** Component is a configured Aurelia app root. */
  AppRoot = 'app-root',
  /** Component is referenced as a router component by route configuration or routed-controller materialization. */
  RoutedComponent = 'routed-component',
  /** Component template hydrates child custom elements or custom attributes. */
  ComponentCompositionHost = 'component-composition-host',
  /** Component template hydrates built-in template controllers or their synthetic views. */
  TemplateCompositionHost = 'template-composition-host',
  /** Component template uses repeat/iterator controller semantics. */
  ListRenderer = 'list-renderer',
  /** Component template uses promise controller semantics as an async display boundary. */
  AsyncBoundary = 'async-boundary',
  /** Component template has runtime target-to-source or two-way value flow excluding ref assignments. */
  DataEntrySurface = 'data-entry-surface',
  /** Component template subscribes target events through listener bindings. */
  EventSurface = 'event-surface',
  /** Component receives captured attributes or bindings that are forwarded into its own render target surface. */
  AttributeForwarder = 'attribute-forwarder',
}

export const enum SemanticApplicationComponentRoleEvidenceKind {
  /** Evidence comes from app-root configuration. */
  AppRootConfiguration = 'app-root-configuration',
  /** Evidence comes from authored route config component references. */
  RouteConfig = 'route-config',
  /** Evidence comes from routed controller materialization. */
  RoutedController = 'routed-controller',
  /** Evidence comes from child controller creation during rendering. */
  ChildController = 'child-controller',
  /** Evidence comes from built-in template-controller flow semantics. */
  TemplateControllerFlow = 'template-controller-flow',
  /** Evidence comes from binding data-flow direction and value-channel semantics. */
  BindingDataFlow = 'binding-data-flow',
  /** Evidence comes from listener target-operation materialization. */
  ListenerOperation = 'listener-operation',
  /** Evidence comes from forwarded captured attributes or bindings with parent-template provenance. */
  CapturedAttributeForwarding = 'captured-attribute-forwarding',
}

export interface SemanticApplicationComponentRoleRow {
  readonly roleKind: SemanticApplicationComponentRoleKind | `${SemanticApplicationComponentRoleKind}`;
  readonly evidenceKind: SemanticApplicationComponentRoleEvidenceKind | `${SemanticApplicationComponentRoleEvidenceKind}`;
  readonly evidenceCount: number;
  readonly source: SemanticSourceReference | null;
  readonly summary: string;
}

export interface SemanticApplicationFileRow {
  readonly path: string;
  readonly roles: readonly ApplicationFileRole[];
  readonly source: SemanticSourceReference | null;
}

export interface SemanticApplicationRouteRow {
  readonly id: string | null;
  readonly paths: readonly string[];
  readonly routeKind: string;
  readonly originKind: RouteConfigOriginKind | `${RouteConfigOriginKind}`;
  readonly valueKind: RouteConfigValueKind | `${RouteConfigValueKind}`;
  readonly componentName: string | null;
  readonly viewport: string | null;
  readonly childRouteCount: number;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticApplicationServiceRow {
  readonly path: string;
  readonly role: Extract<ApplicationFileRole, 'service-source' | 'state-source' | 'model-source'>;
  readonly className: string;
  readonly isExported: boolean;
  readonly resolveCallCount: number;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticApplicationInjectionRow {
  readonly mechanism: 'resolve-call';
  readonly consumerPath: string;
  readonly consumerClassName: string | null;
  readonly consumerMemberName: string | null;
  readonly consumerMemberKind: string;
  readonly consumerMemberStatic: boolean;
  readonly executionContextKind: string;
  readonly activeContainerExpectation: string;
  readonly keyExpressionText: string | null;
  readonly argumentCount: number;
  readonly nullishKeyArguments: readonly {
    readonly index: number;
    readonly kind: string;
    readonly text: string;
  }[];
  readonly keyName: string | null;
  readonly keyDeclarationKind: string;
  readonly keyDeclarationName: string | null;
  readonly keyDeclarationSourcePath: string | null;
  readonly keyDeclarationRole: ApplicationFileRole | null;
  readonly keyImportModuleSpecifier: string | null;
  readonly keyImportName: string | null;
  readonly keyImportKind: string;
  readonly source: SemanticSourceReference | null;
  readonly keyDeclarationSource: SemanticSourceReference | null;
}

export interface SemanticApplicationServiceInteractionRow {
  readonly operationKind: ApplicationServiceInteractionOperationKind | `${ApplicationServiceInteractionOperationKind}`;
  readonly consumerPath: string;
  readonly consumerRole: ApplicationFileRole | null;
  readonly consumerClassName: string | null;
  readonly consumerMemberName: string | null;
  readonly targetSourcePath: string;
  readonly targetRole: ApplicationSupportSourceRole | `${ApplicationSupportSourceRole}`;
  readonly targetClassName: string;
  readonly memberName: string;
  readonly argumentCount: number;
  readonly isSelfInteraction: boolean;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticApplicationServiceInteractionBindingRow {
  readonly definitionName: string;
  readonly componentClassName: string;
  readonly bindingSourceKind: RuntimeBindingDataFlowSourceKind | `${RuntimeBindingDataFlowSourceKind}`;
  readonly bindingSourceName: string;
  readonly bindingSourceRootName: string;
  readonly bindingDirection: RuntimeBindingDataFlowDirection | `${RuntimeBindingDataFlowDirection}`;
  readonly bindingTargetProperty: string | null;
  readonly interactionOperationKind: ApplicationServiceInteractionOperationKind | `${ApplicationServiceInteractionOperationKind}`;
  readonly interactionTargetRole: ApplicationSupportSourceRole | `${ApplicationSupportSourceRole}`;
  readonly interactionTargetClassName: string;
  readonly interactionMemberName: string;
  readonly interactionIsSelfInteraction: boolean;
  readonly bindingSource: SemanticSourceReference | null;
  readonly interactionSource: SemanticSourceReference | null;
}

export interface SemanticApplicationStateCompositionRow {
  readonly ownerPath: string;
  readonly ownerClassName: string;
  readonly memberName: string;
  readonly memberKind: 'property';
  readonly valueType: string;
  readonly valueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}`;
  readonly valueDeclarationKind: string;
  readonly valueDeclarationName: string | null;
  readonly valueDeclarationSourcePath: string | null;
  readonly valueDeclarationRole: ApplicationFileRole | null;
  readonly source: SemanticSourceReference | null;
  readonly valueDeclarationSource: SemanticSourceReference | null;
}

export interface SemanticApplicationTopologyResult {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly files: readonly SemanticApplicationFileRow[];
  readonly appRoots: readonly SemanticApplicationRootRow[];
  readonly components: readonly SemanticApplicationComponentRow[];
  readonly services: readonly SemanticApplicationServiceRow[];
  readonly injections: readonly SemanticApplicationInjectionRow[];
  readonly serviceInteractions: readonly SemanticApplicationServiceInteractionRow[];
  readonly serviceInteractionBindings: readonly SemanticApplicationServiceInteractionBindingRow[];
  readonly stateCompositions: readonly SemanticApplicationStateCompositionRow[];
  readonly styles: readonly SemanticApplicationStyleAsset[];
  readonly routes: readonly SemanticApplicationRouteRow[];
}

export function readSemanticApplicationTopology(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  handles: boolean,
): SemanticApplicationTopologyResult {
  const configuration = emission.configuration.readConfiguration();
  const appRootCounts = appRootCountByDefinitionProduct(emission);
  const componentRoles = applicationComponentRoleRowsByDefinition(store, emission, appRootCounts);
  const componentDefinitions = uniqueCustomElementDefinitions(emission);
  const styles = applicationStyleRows(store, emission, componentDefinitions, handles);
  const stylesByDefinition = applicationStyleRowsByDefinition(styles);
  const appRoots = configuration.appRoots.map((appRoot) =>
    applicationRootRow(store, emission, configuration, appRoot, componentRoles, stylesByDefinition, handles)
  );
  const components = applicationComponentRows(store, emission, componentDefinitions, appRootCounts, componentRoles, stylesByDefinition, handles);
  const serviceTopology = readApplicationServiceTopology(emission.project, emission.typeSystem);
  const services = applicationServiceRows(store, emission, serviceTopology.services);
  const injections = applicationInjectionRows(store, emission, serviceTopology.injections);
  const serviceInteractions = applicationServiceInteractionRows(store, emission, components, serviceTopology.interactions);
  const serviceInteractionBindings = applicationServiceInteractionBindingRows(store, emission, components, serviceInteractions);
  const stateCompositions = applicationStateCompositionRows(store, emission);
  const routes = applicationRouteRows(store, emission);
  const files = applicationFileRows(store, emission, appRoots, components, styles, routes);
  return {
    projectKey: emission.project.projectKey,
    rootDir: emission.project.rootDir,
    files,
    appRoots,
    components,
    services,
    injections,
    serviceInteractions,
    serviceInteractionBindings,
    stateCompositions,
    styles,
    routes,
  };
}

function applicationRootRow(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  configuration: ConfigurationKernelEmission,
  appRoot: AppRoot,
  componentRoles: ComponentRoleRowsByDefinition,
  stylesByDefinition: ReadonlyMap<string, readonly SemanticApplicationStyleAsset[]>,
  handles: boolean,
): SemanticApplicationRootRow {
  const candidateDefinition = emission.resourceIndex.lookupByTargetReference(appRoot.component);
  const definition = candidateDefinition instanceof CustomElementDefinition ? candidateDefinition : null;
  const compilerWorld = compilerWorldForAppRoot(emission.appWorld.compilerWorlds, appRoot);
  const steps = configurationStepsForAppRoot(configuration, appRoot);
  const registrationAdmissions = uniqueProductHandles(steps.flatMap((step) => step.registrationAdmissionProductHandles)).size;
  const compiledTemplates = definition == null
    ? 0
    : templateCompilationsForDefinition(emission, definition).length;
  return {
    source: describeAddress(store, appRoot.sourceAddressHandle),
    host: describeAddress(store, appRoot.hostAddressHandle),
    component: definition == null
      ? null
      : applicationComponentReference(store, emission, definition, componentRoles, stylesByDefinition, handles),
    compilerWorld: compilerWorld == null ? null : compilerWorldLabel(store, compilerWorld),
    configurationSequences: configuration.sequences.filter((sequence) =>
      sequence.appRoot?.productHandle === appRoot.productHandle
    ).length,
    configurationSteps: steps.length,
    registrationAdmissions,
    compiledTemplates,
    ...(handles ? {
      handles: {
        productHandle: appRoot.productHandle,
        identityHandle: appRoot.identityHandle,
        sourceAddressHandle: appRoot.sourceAddressHandle,
        hostAddressHandle: appRoot.hostAddressHandle,
        compilerWorldProductHandle: compilerWorld?.world.productHandle ?? null,
      },
    } : {}),
  };
}

function applicationComponentRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  definitions: readonly CustomElementDefinition[],
  appRootCounts: ReadonlyMap<ProductHandle, number>,
  componentRoles: ComponentRoleRowsByDefinition,
  stylesByDefinition: ReadonlyMap<string, readonly SemanticApplicationStyleAsset[]>,
  handles: boolean,
): readonly SemanticApplicationComponentRow[] {
  const rows = definitions.map((definition) => {
    const reference = applicationComponentReference(store, emission, definition, componentRoles, stylesByDefinition, handles);
    return {
      ...reference,
      appRootCount: definition.productHandle == null ? 0 : appRootCounts.get(definition.productHandle) ?? 0,
      visibleCompilerWorlds: visibleCompilerWorldsForDefinition(emission, definition).length,
      templateCompilations: templateCompilationsForDefinition(emission, definition).length,
    };
  });
  return rows.sort((left, right) =>
    `${left.elementName}:${left.className ?? ''}`.localeCompare(`${right.elementName}:${right.className ?? ''}`)
  );
}

function appRootCountByDefinitionProduct(
  emission: AureliaAppWorldProjectEmission,
): ReadonlyMap<ProductHandle, number> {
  const counts = new Map<ProductHandle, number>();
  for (const appRoot of emission.configuration.readConfiguration().appRoots) {
    const definition = emission.resourceIndex.lookupByTargetReference(appRoot.component);
    if (definition instanceof CustomElementDefinition && definition.productHandle != null) {
      counts.set(definition.productHandle, (counts.get(definition.productHandle) ?? 0) + 1);
    }
  }
  return counts;
}

function uniqueCustomElementDefinitions(
  emission: AureliaAppWorldProjectEmission,
): readonly CustomElementDefinition[] {
  const definitions: CustomElementDefinition[] = [];
  const seen = new Set<string>();
  for (const entry of emission.resourceIndex.entries) {
    const definition = entry.definition;
    if (!(definition instanceof CustomElementDefinition)) {
      continue;
    }
    const key = definition.productHandle ?? `${entry.moduleKey}:${entry.localName}:${definition.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      definitions.push(definition);
    }
  }
  return definitions;
}

type ComponentRoleRowsByDefinition = ReadonlyMap<string, readonly SemanticApplicationComponentRoleRow[]>;

interface ComponentRoleAccumulator {
  readonly roleKind: SemanticApplicationComponentRoleKind;
  readonly evidenceKind: SemanticApplicationComponentRoleEvidenceKind;
  evidenceCount: number;
  source: SemanticSourceReference | null;
}

interface ComponentRoleDefinitionIndex {
  readonly definitions: readonly CustomElementDefinition[];
  readonly keyByProductHandle: ReadonlyMap<ProductHandle, string>;
  readonly keyByElementName: ReadonlyMap<string, string>;
  readonly keyByClassName: ReadonlyMap<string, string>;
  readonly templateSourcePathByKey: ReadonlyMap<string, string>;
}

function applicationComponentRoleRowsByDefinition(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  appRootCounts: ReadonlyMap<ProductHandle, number>,
): ComponentRoleRowsByDefinition {
  const index = componentRoleDefinitionIndex(store, emission);
  const roles = new Map<string, Map<string, ComponentRoleAccumulator>>();
  addAppRootRoleRows(roles, index, appRootCounts, store, emission);
  addRouteRoleRows(roles, index, store, emission);
  addControllerRoleRows(roles, index, readRuntimeControllerRows(emission, store, false));
  addBindingDataFlowRoleRows(
    roles,
    index,
    readBindingDataFlowRows(emission, store, true),
    nativeFormTargetAccessSources(readBindingTargetAccessRows(emission, store, true)),
  );
  addTargetOperationRoleRows(roles, index, readTargetOperationRows(emission, store, false));
  return finalizeComponentRoleRows(roles);
}

function componentRoleDefinitionIndex(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
): ComponentRoleDefinitionIndex {
  const definitions = uniqueCustomElementDefinitions(emission);
  const keyByProductHandle = new Map<ProductHandle, string>();
  const keyByElementName = new Map<string, string>();
  const keyByClassName = new Map<string, string>();
  const templateSourcePathByKey = new Map<string, string>();
  for (const definition of definitions) {
    const key = componentDefinitionRoleKey(definition);
    if (definition.productHandle != null) {
      keyByProductHandle.set(definition.productHandle, key);
    }
    keyByElementName.set(definition.name, key);
    if (definition.target.localName != null) {
      keyByClassName.set(definition.target.localName, key);
    }
    const templateSource = describeAddress(store, definition.template?.addressHandle ?? null);
    if (templateSource?.path != null) {
      templateSourcePathByKey.set(key, templateSource.path);
    }
  }
  return {
    definitions,
    keyByProductHandle,
    keyByElementName,
    keyByClassName,
    templateSourcePathByKey,
  };
}

function addAppRootRoleRows(
  roles: Map<string, Map<string, ComponentRoleAccumulator>>,
  index: ComponentRoleDefinitionIndex,
  appRootCounts: ReadonlyMap<ProductHandle, number>,
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
): void {
  for (const definition of index.definitions) {
    if (definition.productHandle == null || (appRootCounts.get(definition.productHandle) ?? 0) === 0) {
      continue;
    }
    const appRoot = emission.configuration.readConfiguration().appRoots.find((candidate) => {
      const candidateDefinition = emission.resourceIndex.lookupByTargetReference(candidate.component);
      return candidateDefinition instanceof CustomElementDefinition
        && candidateDefinition.productHandle === definition.productHandle;
    }) ?? null;
    addComponentRole(
      roles,
      componentDefinitionRoleKey(definition),
      SemanticApplicationComponentRoleKind.AppRoot,
      SemanticApplicationComponentRoleEvidenceKind.AppRootConfiguration,
      describeAddress(store, appRoot?.sourceAddressHandle ?? definition.sourceAddressHandle),
    );
  }
}

function addRouteRoleRows(
  roles: Map<string, Map<string, ComponentRoleAccumulator>>,
  index: ComponentRoleDefinitionIndex,
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
): void {
  for (const routeConfig of emission.routes.readRouteConfigs()) {
    const key = componentRoleKeyForRoute(routeConfig, index);
    if (key == null) {
      continue;
    }
    addComponentRole(
      roles,
      key,
      SemanticApplicationComponentRoleKind.RoutedComponent,
      SemanticApplicationComponentRoleEvidenceKind.RouteConfig,
      describeAddress(store, routeConfig.component?.sourceAddressHandle ?? routeConfig.sourceAddressHandle),
    );
  }
}

function addControllerRoleRows(
  roles: Map<string, Map<string, ComponentRoleAccumulator>>,
  index: ComponentRoleDefinitionIndex,
  rows: readonly SemanticRuntimeControllerRow[],
): void {
  for (const row of rows) {
    const renderedKey = index.keyByElementName.get(row.renderingDefinitionName);
    const controllerKey = componentRoleKeyForController(row, index);
    if (controllerKey != null && row.creationKind === RuntimeControllerCreationKind.RoutedCustomElement) {
      addComponentRole(
        roles,
        controllerKey,
        SemanticApplicationComponentRoleKind.RoutedComponent,
        SemanticApplicationComponentRoleEvidenceKind.RoutedController,
        row.source,
      );
    }
    if (renderedKey == null) {
      continue;
    }
    if (
      row.creationKind === RuntimeControllerCreationKind.CustomElement
      || row.creationKind === RuntimeControllerCreationKind.CustomAttribute
    ) {
      addComponentRole(
        roles,
        renderedKey,
        SemanticApplicationComponentRoleKind.ComponentCompositionHost,
        SemanticApplicationComponentRoleEvidenceKind.ChildController,
        row.source,
      );
    }
    if (row.templateControllerFlowKind != null) {
      addComponentRole(
        roles,
        renderedKey,
        SemanticApplicationComponentRoleKind.TemplateCompositionHost,
        SemanticApplicationComponentRoleEvidenceKind.TemplateControllerFlow,
        row.source,
      );
      if (row.templateControllerFlowKind === 'iteration') {
        addComponentRole(
          roles,
          renderedKey,
          SemanticApplicationComponentRoleKind.ListRenderer,
          SemanticApplicationComponentRoleEvidenceKind.TemplateControllerFlow,
          row.source,
        );
      }
      if (String(row.templateControllerFlowKind).startsWith('promise')) {
        addComponentRole(
          roles,
          renderedKey,
          SemanticApplicationComponentRoleKind.AsyncBoundary,
          SemanticApplicationComponentRoleEvidenceKind.TemplateControllerFlow,
          row.source,
        );
      }
    }
  }
}

function addBindingDataFlowRoleRows(
  roles: Map<string, Map<string, ComponentRoleAccumulator>>,
  index: ComponentRoleDefinitionIndex,
  rows: readonly SemanticBindingDataFlowRow[],
  nativeFormSources: ReadonlySet<string>,
): void {
  for (const row of rows) {
    const key = index.keyByElementName.get(row.definitionName);
    if (key == null) {
      continue;
    }
    if (bindingDataFlowIsDataEntry(row, nativeFormSources)) {
      addComponentRole(
        roles,
        key,
        SemanticApplicationComponentRoleKind.DataEntrySurface,
        SemanticApplicationComponentRoleEvidenceKind.BindingDataFlow,
        row.source,
      );
    }
    if (sourceIsOutsideComponentTemplate(row.source, index.templateSourcePathByKey.get(key) ?? null)) {
      addComponentRole(
        roles,
        key,
        SemanticApplicationComponentRoleKind.AttributeForwarder,
        SemanticApplicationComponentRoleEvidenceKind.CapturedAttributeForwarding,
        row.source,
      );
    }
  }
}

function addTargetOperationRoleRows(
  roles: Map<string, Map<string, ComponentRoleAccumulator>>,
  index: ComponentRoleDefinitionIndex,
  rows: readonly SemanticTargetOperationRow[],
): void {
  for (const row of rows) {
    const key = index.keyByElementName.get(row.definitionName);
    if (key == null) {
      continue;
    }
    if (row.operationKind === RuntimeBindingTargetOperationKind.EventListenerAdd) {
      addComponentRole(
        roles,
        key,
        SemanticApplicationComponentRoleKind.EventSurface,
        SemanticApplicationComponentRoleEvidenceKind.ListenerOperation,
        row.source,
      );
    }
    if (sourceIsOutsideComponentTemplate(row.source, index.templateSourcePathByKey.get(key) ?? null)) {
      addComponentRole(
        roles,
        key,
        SemanticApplicationComponentRoleKind.AttributeForwarder,
        SemanticApplicationComponentRoleEvidenceKind.CapturedAttributeForwarding,
        row.source,
      );
    }
  }
}

function nativeFormTargetAccessSources(
  rows: readonly SemanticBindingTargetAccessRow[],
): ReadonlySet<string> {
  const sources = new Set<string>();
  for (const row of rows) {
    const key = sourceAddressHandleKey(row.handles?.sourceAddressHandle ?? null);
    if (key != null && targetAccessIsNativeFormValue(row)) {
      sources.add(key);
    }
  }
  return sources;
}

function targetAccessIsNativeFormValue(row: SemanticBindingTargetAccessRow): boolean {
  if (row.targetKind !== RuntimeBindingTargetKind.Node) {
    return false;
  }
  if (
    row.strategy === RuntimeBindingTargetAccessStrategy.CheckedObserver
    || row.strategy === RuntimeBindingTargetAccessStrategy.SelectValueObserver
    || row.strategy === RuntimeBindingTargetAccessStrategy.ValueAttributeObserver
  ) {
    return true;
  }
  return row.targetProperty === 'value'
    && (
      row.targetType === 'HTMLInputElement'
      || row.targetType === 'HTMLSelectElement'
      || row.targetType === 'HTMLTextAreaElement'
    );
}

function bindingDataFlowIsDataEntry(
  row: SemanticBindingDataFlowRow,
  nativeFormSources: ReadonlySet<string>,
): boolean {
  if (
    row.direction !== RuntimeBindingDataFlowDirection.TargetToSource
    && row.direction !== RuntimeBindingDataFlowDirection.TwoWay
  ) {
    return false;
  }
  const key = sourceAddressHandleKey(row.handles?.sourceAddressHandle ?? null);
  return row.valueChannelKind !== RuntimeBindingValueChannelKind.RefTarget
    && key != null
    && nativeFormSources.has(key);
}

function componentRoleKeyForRoute(
  routeConfig: RouteConfigModel,
  index: ComponentRoleDefinitionIndex,
): string | null {
  if (routeConfig.component?.resolvedProductHandle != null) {
    const key = index.keyByProductHandle.get(routeConfig.component.resolvedProductHandle);
    if (key != null) {
      return key;
    }
  }
  return routeConfig.component?.localName == null
    ? null
    : index.keyByClassName.get(routeConfig.component.localName)
      ?? index.keyByElementName.get(routeConfig.component.localName)
      ?? null;
}

function componentRoleKeyForController(
  row: SemanticRuntimeControllerRow,
  index: ComponentRoleDefinitionIndex,
): string | null {
  if (row.definitionName != null) {
    const byElement = index.keyByElementName.get(row.definitionName);
    if (byElement != null) {
      return byElement;
    }
  }
  return row.definitionClassName == null
    ? null
    : index.keyByClassName.get(row.definitionClassName) ?? null;
}

function addComponentRole(
  roles: Map<string, Map<string, ComponentRoleAccumulator>>,
  definitionKey: string,
  roleKind: SemanticApplicationComponentRoleKind,
  evidenceKind: SemanticApplicationComponentRoleEvidenceKind,
  source: SemanticSourceReference | null,
): void {
  const rows = roles.get(definitionKey) ?? new Map<string, ComponentRoleAccumulator>();
  const key = `${roleKind}:${evidenceKind}`;
  const existing = rows.get(key);
  if (existing == null) {
    rows.set(key, {
      roleKind,
      evidenceKind,
      evidenceCount: 1,
      source,
    });
  } else {
    existing.evidenceCount += 1;
    existing.source ??= source;
  }
  roles.set(definitionKey, rows);
}

function finalizeComponentRoleRows(
  roles: ReadonlyMap<string, ReadonlyMap<string, ComponentRoleAccumulator>>,
): ComponentRoleRowsByDefinition {
  const result = new Map<string, readonly SemanticApplicationComponentRoleRow[]>();
  for (const [definitionKey, rows] of roles) {
    result.set(
      definitionKey,
      [...rows.values()]
        .map((row) => ({
          roleKind: row.roleKind,
          evidenceKind: row.evidenceKind,
          evidenceCount: row.evidenceCount,
          source: row.source,
          summary: componentRoleSummary(row.roleKind, row.evidenceKind, row.evidenceCount),
        }))
        .sort((left, right) =>
          left.roleKind.localeCompare(right.roleKind)
          || left.evidenceKind.localeCompare(right.evidenceKind)
        ),
    );
  }
  return result;
}

function componentRoleSummary(
  roleKind: SemanticApplicationComponentRoleKind,
  evidenceKind: SemanticApplicationComponentRoleEvidenceKind,
  count: number,
): string {
  return `${roleKind} from ${count} ${evidenceKind} evidence row(s).`;
}

function componentRoleRowsForDefinition(
  rowsByDefinition: ComponentRoleRowsByDefinition,
  definition: CustomElementDefinition,
): readonly SemanticApplicationComponentRoleRow[] {
  return rowsByDefinition.get(componentDefinitionRoleKey(definition)) ?? [];
}

function componentDefinitionRoleKey(definition: CustomElementDefinition): string {
  return definition.productHandle ?? `${definition.name}:${definition.target.localName ?? 'anonymous'}`;
}

function sourceIsOutsideComponentTemplate(
  source: SemanticSourceReference | null,
  templateSourcePath: string | null,
): boolean {
  return source?.path != null
    && templateSourcePath != null
    && source.path !== templateSourcePath;
}

function sourceAddressHandleKey(handle: AddressHandle | null): string | null {
  return handle;
}

function applicationStyleRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  definitions: readonly CustomElementDefinition[],
  handles: boolean,
): readonly SemanticApplicationStyleAsset[] {
  const sourceByPath = sourceAdmissionsByPath(emission.project.sourceFiles);
  const sites = readApplicationStyleAssetSites(
    emission.project,
    emission.typeSystem,
    definitions.map((definition) => ({
      sourcePath: projectSourcePathForAddress(store, emission, definition.sourceAddressHandle),
      className: definition.target.localName,
      elementName: definition.name,
    })),
  );
  return sites.map((site) =>
    applicationStyleRow(store, sourceByPath, site, handles)
  );
}

function applicationStyleRow(
  store: KernelStore,
  sourceByPath: ReadonlyMap<string, SourceFileAdmission>,
  site: ApplicationStyleAssetSite,
  handles: boolean,
): SemanticApplicationStyleAsset {
  const styleSource = site.stylePath == null ? null : sourceByPath.get(site.stylePath) ?? null;
  const evidenceSource = sourceByPath.get(site.evidenceSourcePath) ?? null;
  return {
    ownerKind: site.ownerKind,
    assetKind: site.assetKind,
    sourceKind: site.sourceKind,
    ownerSourcePath: site.ownerSourcePath,
    ownerClassName: site.ownerClassName,
    ownerElementName: site.ownerElementName,
    moduleSpecifier: site.moduleSpecifier,
    stylePath: site.stylePath,
    source: styleSource == null ? null : describeAddress(store, styleSource.addressHandle),
    evidenceSource: evidenceSource == null
      ? null
      : sourceSpanReference(store, evidenceSource, site.start, site.end, `style-${site.sourceKind}`),
    ...(handles ? {
      handles: {
        sourceAddressHandle: styleSource?.addressHandle ?? null,
        evidenceSourceAddressHandle: evidenceSource?.addressHandle ?? null,
      },
    } : {}),
  };
}

function applicationStyleRowsByDefinition(
  rows: readonly SemanticApplicationStyleAsset[],
): ReadonlyMap<string, readonly SemanticApplicationStyleAsset[]> {
  const result = new Map<string, SemanticApplicationStyleAsset[]>();
  for (const row of rows) {
    if (row.ownerKind !== 'component' || row.ownerElementName == null) {
      continue;
    }
    const key = componentStyleKeyForNames(row.ownerElementName, row.ownerClassName);
    const existing = result.get(key) ?? [];
    existing.push(row);
    result.set(key, existing);
  }
  return result;
}

function componentStyleKeyForDefinition(definition: CustomElementDefinition): string {
  return componentStyleKeyForNames(definition.name, definition.target.localName);
}

function componentStyleKeyForNames(
  elementName: string,
  className: string | null,
): string {
  return `${elementName}\0${className ?? ''}`;
}

function projectSourcePathForAddress(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  handle: AddressHandle | null,
): string | null {
  const source = describeAddress(store, handle);
  if (source?.path == null) {
    return null;
  }
  const normalizedPath = normalizeApplicationPath(source.path);
  for (const admission of emission.project.sourceFiles) {
    const candidate = normalizeApplicationPath(admission.path);
    if (normalizedPath === candidate || normalizedPath.endsWith(`/${candidate}`)) {
      return admission.path;
    }
  }
  return null;
}

function applicationComponentReference(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  definition: CustomElementDefinition,
  componentRoles: ComponentRoleRowsByDefinition,
  stylesByDefinition: ReadonlyMap<string, readonly SemanticApplicationStyleAsset[]>,
  handles: boolean,
): SemanticApplicationComponentReference {
  const template = applicationTemplateAsset(store, emission, definition, handles);
  return {
    className: definition.target.localName,
    elementName: definition.name,
    aliases: definition.aliases.map((alias) => alias.name),
    source: describeAddress(store, definition.sourceAddressHandle),
    template,
    styles: stylesByDefinition.get(componentStyleKeyForDefinition(definition)) ?? [],
    roles: componentRoleRowsForDefinition(componentRoles, definition),
    bindables: definition.bindables.map((bindable) => {
      const typeSurface = projectBindableTypeSurface(store, definition.target, bindable);
      return {
        name: bindable.name,
        attribute: bindable.attribute,
        mode: bindable.mode,
        ...typeSurface,
        source: describeAddress(store, bindable.sourceAddressHandle),
        ...(handles ? {
          handles: {
            sourceAddressHandle: bindable.sourceAddressHandle,
          },
        } : {}),
      };
    }),
    dependencies: definition.dependencies.flatMap((dependency) => {
      const dependencyDefinitions = emission.resourceIndex.lookupAllByDependencyReference(dependency)
        .filter((candidate): candidate is CustomElementDefinition => candidate instanceof CustomElementDefinition);
      const components = dependencyDefinitions.length === 0 ? [null] : dependencyDefinitions;
      return components.map((component) => ({
        dependencyKind: dependency.dependencyKind,
        keyName: dependency.keyName,
        localName: dependency.localName,
        registryKind: dependency.registryKind,
        componentName: component?.name ?? null,
        componentClassName: component?.target.localName ?? null,
        source: describeAddress(store, component?.sourceAddressHandle ?? null),
        ...(handles ? {
          handles: {
            identityHandle: dependency.identityHandle,
            definitionProductHandle: component?.productHandle ?? null,
            sourceAddressHandle: component?.sourceAddressHandle ?? null,
          },
        } : {}),
      }));
    }),
    ...(handles ? {
      handles: {
        definitionProductHandle: definition.productHandle,
        definitionIdentityHandle: definition.identityHandle,
        targetIdentityHandle: definition.target.identityHandle,
        sourceAddressHandle: definition.sourceAddressHandle,
        templateSourceAddressHandle: definition.template?.addressHandle ?? null,
      },
    } : {}),
  };
}

function applicationTemplateAsset(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  definition: CustomElementDefinition,
  handles: boolean,
): SemanticApplicationTemplateAsset | null {
  const compilation = templateCompilationsForDefinition(emission, definition)[0] ?? null;
  const sourceAddressHandle = definition.template?.addressHandle ?? null;
  if (compilation == null && sourceAddressHandle == null) {
    return null;
  }
  const compilationOpenSeams = compilation == null
    ? null
    : compilation.compilation.compiledTemplate.openSeams.length
      + compilation.runtimeAnalysis.runtimeRendering.openSeams.length
      + compilation.runtimeAnalysis.controllerBind.openSeams.length
      + compilation.runtimeAnalysis.bindingValueChannel.openSeams.length
      + compilation.runtimeAnalysis.bindingDataFlow.openSeams.length;
  return {
    sourceKind: compilation?.compilation.unit.templateSource.sourceKind ?? definition.template?.kind ?? 'unknown',
    source: describeAddress(store, compilation?.compilation.definition.template?.addressHandle ?? sourceAddressHandle),
    htmlNodes: compilation?.compilation.html.nodes.length ?? null,
    runtimeBindings: compilation?.runtimeAnalysis.runtimeRendering.bindings.length ?? null,
    runtimeTargetOperations: compilation == null
      ? null
      : compilation.runtimeAnalysis.runtimeRendering.targetOperations.length
        + compilation.runtimeAnalysis.controllerBind.targetOperations.length,
    runtimeRendererTargetOperations: compilation?.runtimeAnalysis.runtimeRendering.targetOperations.length ?? null,
    runtimeBindingTargetAccesses: compilation?.runtimeAnalysis.controllerBind.targetAccesses.length ?? null,
    runtimeBindingTargetOperations: compilation?.runtimeAnalysis.controllerBind.targetOperations.length ?? null,
    runtimeBindingSourceOperations: compilation?.runtimeAnalysis.controllerBind.sourceOperations.length ?? null,
    runtimeBindingValueChannels: compilation?.runtimeAnalysis.bindingValueChannel.valueChannels.length ?? null,
    runtimeBindingDataFlows: compilation?.runtimeAnalysis.bindingDataFlow.dataFlows.length ?? null,
    openSeams: compilationOpenSeams,
    ...(handles ? {
      handles: {
        sourceAddressHandle: compilation?.compilation.definition.template?.addressHandle ?? sourceAddressHandle,
      },
    } : {}),
  };
}

function applicationFileRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  appRoots: readonly SemanticApplicationRootRow[],
  components: readonly SemanticApplicationComponentRow[],
  styles: readonly SemanticApplicationStyleAsset[],
  routes: readonly SemanticApplicationRouteRow[],
): readonly SemanticApplicationFileRow[] {
  const files = new Map<string, {
    source: SemanticSourceReference | null;
    roles: Set<ApplicationFileRole>;
  }>();
  const addRole = (
    source: SemanticSourceReference | null,
    role: ApplicationFileRole,
  ): void => {
    if (source == null || source.path == null) {
      return;
    }
    const path = source.path;
    const file = files.get(path) ?? {
      source: source.anchor ?? source,
      roles: new Set<ApplicationFileRole>(),
    };
    file.roles.add(role);
    files.set(path, file);
  };

  for (const appRoot of appRoots) {
    addRole(appRoot.source, 'entrypoint');
    addRole(appRoot.source, 'configuration-source');
  }
  for (const component of components) {
    addRole(component.source, 'component-source');
    addRole(component.template?.source ?? null, 'component-template');
    for (const style of component.styles) {
      addRole(style.source, styleFileRole(style));
    }
  }
  for (const style of styles) {
    if (style.ownerKind === 'global') {
      addRole(style.source, styleFileRole(style));
    }
  }
  for (const route of routes) {
    addRole(route.source, 'route-source');
  }
  for (const source of emission.project.sourceFiles) {
    const role = supportSourceRoleForPath(source.path);
    if (role == null) {
      continue;
    }
    addRole(describeAddress(store, source.addressHandle), role);
  }

  return [...files.entries()]
    .map(([path, file]) => ({
      path,
      roles: [...file.roles].sort(),
      source: file.source,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function styleFileRole(style: SemanticApplicationStyleAsset): Extract<ApplicationFileRole, 'component-style' | 'global-style'> {
  return style.ownerKind === 'global' ? 'global-style' : 'component-style';
}

function applicationRouteRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
): readonly SemanticApplicationRouteRow[] {
  return emission.routes.readRouteConfigs()
    .map((routeConfig) => applicationRouteRow(store, routeConfig))
    .sort((left, right) =>
      `${left.routeKind}:${left.id ?? ''}:${left.paths.join('|')}:${left.source?.label ?? ''}`
        .localeCompare(`${right.routeKind}:${right.id ?? ''}:${right.paths.join('|')}:${right.source?.label ?? ''}`)
    );
}

function applicationRouteRow(
  store: KernelStore,
  routeConfig: RouteConfigModel,
): SemanticApplicationRouteRow {
  return {
    id: routeConfig.id,
    paths: routeConfig.paths,
    routeKind: routeConfig.routeKind,
    originKind: routeConfig.originKind,
    valueKind: routeConfig.valueKind,
    componentName: routeConfig.component?.localName ?? null,
    viewport: routeConfig.viewport,
    childRouteCount: routeConfig.childRoutes.length,
    source: describeAddress(store, routeConfig.sourceAddressHandle),
  };
}

function applicationServiceRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  sites: readonly ApplicationServiceClassSite[],
): readonly SemanticApplicationServiceRow[] {
  const sourceByPath = sourceAdmissionsByPath(emission.project.sourceFiles);
  return sites.map((site) => ({
    path: site.path,
    role: site.role,
    className: site.className,
    isExported: site.isExported,
    resolveCallCount: site.resolveCallCount,
    source: describeAddress(store, sourceByPath.get(site.path)?.addressHandle ?? null),
  }));
}

function applicationInjectionRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  sites: readonly ApplicationServiceInjectionSite[],
): readonly SemanticApplicationInjectionRow[] {
  const sourceByPath = sourceAdmissionsByPath(emission.project.sourceFiles);
  return sites.map((site) => {
    const source = sourceByPath.get(site.sourcePath) ?? null;
    const keyDeclarationSource = site.keyDeclarationSourcePath == null
      ? null
      : sourceByPath.get(site.keyDeclarationSourcePath) ?? null;
    return {
      mechanism: 'resolve-call' as const,
      consumerPath: site.sourcePath,
      consumerClassName: site.enclosingClassName,
      consumerMemberName: site.enclosingMemberName,
      consumerMemberKind: site.enclosingMemberKind,
      consumerMemberStatic: site.enclosingMemberStatic,
      executionContextKind: site.executionContextKind,
      activeContainerExpectation: site.activeContainerExpectation,
      keyExpressionText: site.keyExpressionText,
      argumentCount: site.argumentCount,
      nullishKeyArguments: site.nullishKeyArguments.map((argument) => ({
        index: argument.index,
        kind: argument.kind,
        text: argument.text,
      })),
      keyName: site.keyName,
      keyDeclarationKind: site.keyDeclarationKind,
      keyDeclarationName: site.keyDeclarationName,
      keyDeclarationSourcePath: site.keyDeclarationSourcePath,
      keyDeclarationRole: site.keyDeclarationRole,
      keyImportModuleSpecifier: site.keyImportModuleSpecifier,
      keyImportName: site.keyImportName,
      keyImportKind: site.keyImportKind,
      source: source == null
        ? null
        : sourceSpanReference(
          store,
          source,
          site.start,
          site.end,
          'di-resolve-call',
        ),
      keyDeclarationSource: keyDeclarationSource == null
        ? null
        : describeAddress(store, keyDeclarationSource.addressHandle),
    };
  }).sort((left, right) =>
    left.consumerPath.localeCompare(right.consumerPath)
    || (left.consumerClassName ?? '').localeCompare(right.consumerClassName ?? '')
    || (left.consumerMemberName ?? '').localeCompare(right.consumerMemberName ?? '')
    || (left.keyName ?? '').localeCompare(right.keyName ?? '')
  );
}

function applicationServiceInteractionRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  components: readonly SemanticApplicationComponentRow[],
  sites: readonly ApplicationServiceInteractionSite[],
): readonly SemanticApplicationServiceInteractionRow[] {
  const sourceByPath = sourceAdmissionsByPath(emission.project.sourceFiles);
  const sourceRoleByPath = applicationInteractionConsumerRoleByPath(emission, components);
  return sites.map((site) => {
    const source = sourceByPath.get(site.sourcePath) ?? null;
    return {
      operationKind: site.operationKind,
      consumerPath: site.sourcePath,
      consumerRole: applicationInteractionConsumerRole(sourceRoleByPath, site.sourcePath) ?? supportSourceRoleForPath(site.sourcePath),
      consumerClassName: site.consumerClassName,
      consumerMemberName: site.consumerMemberName,
      targetSourcePath: site.targetSourcePath,
      targetRole: site.targetRole,
      targetClassName: site.targetClassName,
      memberName: site.memberName,
      argumentCount: site.argumentCount,
      isSelfInteraction: site.isSelfInteraction,
      source: source == null
        ? null
        : sourceSpanReference(
          store,
          source,
          site.start,
          site.end,
          `service-interaction-${site.operationKind}`,
        ),
    };
  }).sort((left, right) =>
    left.consumerPath.localeCompare(right.consumerPath)
    || (left.consumerClassName ?? '').localeCompare(right.consumerClassName ?? '')
    || (left.consumerMemberName ?? '').localeCompare(right.consumerMemberName ?? '')
    || left.targetClassName.localeCompare(right.targetClassName)
    || left.memberName.localeCompare(right.memberName)
  );
}

function applicationServiceInteractionBindingRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  components: readonly SemanticApplicationComponentRow[],
  interactions: readonly SemanticApplicationServiceInteractionRow[],
): readonly SemanticApplicationServiceInteractionBindingRow[] {
  const componentClassByElementName = componentClassNameByElementName(components);
  const interactionsByComponentMember = serviceInteractionsByComponentMember(interactions);
  return readBindingDataFlowRows(emission, store, true).flatMap((dataFlow) =>
    applicationServiceInteractionBindingRowsForDataFlow(
      dataFlow,
      componentClassByElementName,
      interactionsByComponentMember,
    )
  ).sort((left, right) =>
    left.definitionName.localeCompare(right.definitionName)
    || left.bindingSourceRootName.localeCompare(right.bindingSourceRootName)
    || left.bindingSourceName.localeCompare(right.bindingSourceName)
    || left.interactionTargetRole.localeCompare(right.interactionTargetRole)
    || left.interactionOperationKind.localeCompare(right.interactionOperationKind)
    || left.interactionMemberName.localeCompare(right.interactionMemberName)
  );
}

function applicationServiceInteractionBindingRowsForDataFlow(
  dataFlow: SemanticBindingDataFlowRow,
  componentClassByElementName: ReadonlyMap<string, string>,
  interactionsByComponentMember: ReadonlyMap<string, readonly SemanticApplicationServiceInteractionRow[]>,
): readonly SemanticApplicationServiceInteractionBindingRow[] {
  const componentClassName = componentClassByElementName.get(dataFlow.definitionName) ?? null;
  const componentMemberName = bindingComponentMemberNameForDataFlow(dataFlow);
  if (componentClassName == null || dataFlow.sourceName == null || componentMemberName == null) {
    return [];
  }
  const interactions = interactionsByComponentMember.get(componentMemberKey(componentClassName, componentMemberName)) ?? [];
  return interactions.map((interaction) => ({
    definitionName: dataFlow.definitionName,
    componentClassName,
    bindingSourceKind: dataFlow.sourceKind,
    bindingSourceName: dataFlow.sourceName!,
    bindingSourceRootName: componentMemberName,
    bindingDirection: dataFlow.direction,
    bindingTargetProperty: dataFlow.targetProperty,
    interactionOperationKind: interaction.operationKind,
    interactionTargetRole: interaction.targetRole,
    interactionTargetClassName: interaction.targetClassName,
    interactionMemberName: interaction.memberName,
    interactionIsSelfInteraction: interaction.isSelfInteraction,
    bindingSource: dataFlow.source,
    interactionSource: interaction.source,
  }));
}

function bindingComponentMemberNameForDataFlow(dataFlow: SemanticBindingDataFlowRow): string | null {
  switch (dataFlow.sourceKind) {
    case RuntimeBindingDataFlowSourceKind.ScopeName:
      return dataFlow.sourceName;
    case RuntimeBindingDataFlowSourceKind.Member:
    case RuntimeBindingDataFlowSourceKind.Keyed:
    case RuntimeBindingDataFlowSourceKind.Other:
      return singleSourceRootName(dataFlow.sourceRootName);
    default:
      return null;
  }
}

function singleSourceRootName(sourceRootName: string | null): string | null {
  return sourceRootName == null || sourceRootName.includes(',')
    ? null
    : sourceRootName;
}

function componentClassNameByElementName(
  components: readonly SemanticApplicationComponentRow[],
): ReadonlyMap<string, string> {
  const classNameByElementName = new Map<string, string>();
  for (const component of components) {
    if (component.className != null) {
      classNameByElementName.set(component.elementName, component.className);
    }
  }
  return classNameByElementName;
}

function serviceInteractionsByComponentMember(
  interactions: readonly SemanticApplicationServiceInteractionRow[],
): ReadonlyMap<string, readonly SemanticApplicationServiceInteractionRow[]> {
  const interactionsByMember = new Map<string, SemanticApplicationServiceInteractionRow[]>();
  for (const interaction of interactions) {
    if (interaction.consumerRole !== 'component-source' || interaction.consumerClassName == null || interaction.consumerMemberName == null) {
      continue;
    }
    const key = componentMemberKey(interaction.consumerClassName, interaction.consumerMemberName);
    const rows = interactionsByMember.get(key) ?? [];
    rows.push(interaction);
    interactionsByMember.set(key, rows);
  }
  return interactionsByMember;
}

function componentMemberKey(className: string, memberName: string): string {
  return `${className}\0${memberName}`;
}

function applicationInteractionConsumerRole(
  roleByPath: ReadonlyMap<string, ApplicationFileRole>,
  sourcePath: string,
): ApplicationFileRole | null {
  const normalizedSource = normalizeApplicationPath(sourcePath);
  const exact = roleByPath.get(normalizedSource) ?? null;
  if (exact != null) {
    return exact;
  }
  const sourceSuffix = `/${normalizedSource}`;
  for (const [candidate, role] of roleByPath) {
    if (candidate.endsWith(sourceSuffix)) {
      return role;
    }
  }
  return null;
}

function applicationInteractionConsumerRoleByPath(
  emission: AureliaAppWorldProjectEmission,
  components: readonly SemanticApplicationComponentRow[],
): ReadonlyMap<string, ApplicationFileRole> {
  const roleByPath = new Map<string, ApplicationFileRole>();
  for (const component of components) {
    if (component.source?.path != null) {
      for (const path of applicationSourceLookupPaths(component.source.path, emission.project.rootDir)) {
        roleByPath.set(path, 'component-source');
      }
    }
  }
  return roleByPath;
}

function applicationSourceLookupPaths(
  sourcePath: string,
  projectRoot: string,
): readonly string[] {
  const normalizedSource = normalizeApplicationPath(sourcePath);
  const normalizedRoot = normalizeApplicationPath(projectRoot);
  const rootPrefix = `${normalizedRoot}/`;
  if (normalizedSource.startsWith(rootPrefix)) {
    return [normalizedSource, normalizedSource.slice(rootPrefix.length)];
  }
  return [normalizedSource];
}

function normalizeApplicationPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '');
}

function applicationStateCompositionRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
): readonly SemanticApplicationStateCompositionRow[] {
  const sourceByPath = sourceAdmissionsByPath(emission.project.sourceFiles);
  const sourcePathByFileName = typeSystemSourcePathIndex(emission.project, emission.typeSystem);
  const rows = stateSourceClassDeclarations(emission).flatMap((stateClass) =>
    stateCompositionRowsForClass({
      store,
      emission,
      sourceByPath,
      sourcePathByFileName,
      stateClass,
    })
  );
  return rows.sort((left, right) =>
    left.ownerPath.localeCompare(right.ownerPath)
    || left.ownerClassName.localeCompare(right.ownerClassName)
    || left.memberName.localeCompare(right.memberName)
  );
}

interface StateCompositionReadContext {
  readonly store: KernelStore;
  readonly emission: AureliaAppWorldProjectEmission;
  readonly sourceByPath: ReadonlyMap<string, SourceFileAdmission>;
  readonly sourcePathByFileName: ReadonlyMap<string, string>;
  readonly stateClass: StateSourceClassDeclaration;
}

interface StateSourceClassDeclaration {
  readonly source: SourceFileAdmission;
  readonly sourceFile: ts.SourceFile;
  readonly declaration: ts.ClassDeclaration;
  readonly ownerClassName: string;
}

function stateSourceClassDeclarations(
  emission: AureliaAppWorldProjectEmission,
): readonly StateSourceClassDeclaration[] {
  return emission.project.sourceFiles.flatMap((source) => {
    if (supportSourceRoleForPath(source.path) !== 'state-source') {
      return [];
    }
    const sourceFile = emission.typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null ? [] : topLevelNamedClasses(source, sourceFile);
  });
}

function topLevelNamedClasses(
  source: SourceFileAdmission,
  sourceFile: ts.SourceFile,
): readonly StateSourceClassDeclaration[] {
  return sourceFile.statements.flatMap((declaration) =>
    !ts.isClassDeclaration(declaration) || declaration.name == null
      ? []
      : [{
        source,
        sourceFile,
        declaration,
        ownerClassName: declaration.name.text,
      }]
  );
}

function stateCompositionRowsForClass(
  context: StateCompositionReadContext,
): readonly SemanticApplicationStateCompositionRow[] {
  return context.stateClass.declaration.members.flatMap((member) =>
    stateCompositionRowForMember(context, member)
  );
}

function stateCompositionRowForMember(
  context: StateCompositionReadContext,
  member: ts.ClassElement,
): readonly SemanticApplicationStateCompositionRow[] {
  if (!ts.isPropertyDeclaration(member) || !stateCompositionMemberIsPublic(member)) {
    return [];
  }
  const memberName = propertyMemberName(member.name, context.stateClass.sourceFile);
  const target = stateCompositionTarget(context, member);
  if (memberName == null || target == null) {
    return [];
  }
  return [stateCompositionRow(context, member, memberName, target)];
}

interface StateCompositionTarget {
  readonly type: ts.Type;
  readonly symbol: ts.Symbol | null;
  readonly valueDeclaration: ts.ClassDeclaration;
  readonly valueDeclarationSourcePath: string;
  readonly valueDeclarationRole: ApplicationFileRole | null;
  readonly valueSource: SourceFileAdmission | null;
}

function stateCompositionTarget(
  context: StateCompositionReadContext,
  member: ts.PropertyDeclaration,
): StateCompositionTarget | null {
  const type = context.emission.typeSystem.checker.getTypeAtLocation(member.name);
  const symbol = type.aliasSymbol ?? type.getSymbol() ?? null;
  const valueDeclaration = symbol?.declarations?.[0] ?? null;
  if (valueDeclaration == null || !ts.isClassDeclaration(valueDeclaration)) {
    return null;
  }
  const valueDeclarationSourcePath = context.sourcePathByFileName.get(
    normalizeTypeSystemSourceFileName(valueDeclaration.getSourceFile().fileName),
  ) ?? null;
  if (valueDeclarationSourcePath == null) {
    return null;
  }
  const valueDeclarationRole = supportSourceRoleForPath(valueDeclarationSourcePath);
  if (!stateCompositionValueIsLocalStateShape(member, valueDeclarationSourcePath, valueDeclarationRole)) {
    return null;
  }
  return {
    type,
    symbol,
    valueDeclaration,
    valueDeclarationSourcePath,
    valueDeclarationRole,
    valueSource: context.sourceByPath.get(valueDeclarationSourcePath) ?? null,
  };
}

function stateCompositionRow(
  context: StateCompositionReadContext,
  member: ts.PropertyDeclaration,
  memberName: string,
  target: StateCompositionTarget,
): SemanticApplicationStateCompositionRow {
  const { store, emission, stateClass } = context;
  return {
    ownerPath: stateClass.source.path,
    ownerClassName: stateClass.ownerClassName,
    memberName,
    memberKind: 'property',
    valueType: emission.typeSystem.checker.typeToString(target.type),
    valueTypeShapeKind: classifyCheckerTypeShape(target.type, target.symbol),
    valueDeclarationKind: 'class',
    valueDeclarationName: target.valueDeclaration.name?.text ?? target.symbol?.getName() ?? null,
    valueDeclarationSourcePath: target.valueDeclarationSourcePath,
    valueDeclarationRole: target.valueDeclarationRole,
    source: sourceSpanReference(
      store,
      stateClass.source,
      member.name.getStart(stateClass.sourceFile),
      member.name.end,
      'state-composition-member',
    ),
    valueDeclarationSource: target.valueSource == null
      ? null
      : describeAddress(store, target.valueSource.addressHandle),
  };
}

function stateCompositionMemberIsPublic(member: ts.PropertyDeclaration): boolean {
  const flags = ts.getCombinedModifierFlags(member);
  return (flags & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) === 0;
}

function stateCompositionValueIsLocalStateShape(
  member: ts.PropertyDeclaration,
  valueDeclarationSourcePath: string | null,
  valueDeclarationRole: ApplicationFileRole | null,
): boolean {
  if (valueDeclarationSourcePath == null) {
    return false;
  }
  if (
    valueDeclarationRole === 'state-source'
    || valueDeclarationRole === 'model-source'
    || valueDeclarationRole === 'service-source'
  ) {
    return true;
  }
  return member.initializer != null && ts.isNewExpression(unwrapPropertyInitializer(member.initializer));
}

function unwrapPropertyInitializer(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyMemberName(
  name: ts.PropertyName,
  sourceFile: ts.SourceFile,
): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return name.getText(sourceFile);
}

function sourceAdmissionsByPath(
  sources: readonly SourceFileAdmission[],
): ReadonlyMap<string, SourceFileAdmission> {
  return new Map(sources.map((source) => [source.path, source]));
}

function sourceSpanReference(
  store: KernelStore,
  source: SourceFileAdmission,
  start: number,
  end: number,
  role: string,
): SemanticSourceReference {
  const anchor = describeAddress(store, source.addressHandle);
  return {
    kind: 'source-span-address',
    label: `${anchor?.label ?? source.path}@${start}..${end}`,
    path: anchor?.path ?? source.path,
    start,
    end,
    role,
    anchor,
  };
}

function compilerWorldForAppRoot(
  compilerWorlds: readonly TemplateCompilerWorldEmission[],
  appRoot: AppRoot,
): TemplateCompilerWorldEmission | null {
  return compilerWorlds.find((compilerWorld) =>
    compilerWorld.world.appRoot?.productHandle === appRoot.productHandle
    || compilerWorld.world.appRoot?.identityHandle === appRoot.identityHandle
  ) ?? null;
}

function configurationStepsForAppRoot(
  configuration: ConfigurationKernelEmission,
  appRoot: AppRoot,
): readonly ConfigurationStep[] {
  const sequenceProductHandles = new Set<ProductHandle>();
  for (const sequence of configuration.sequences) {
    if (sequence.appRoot?.productHandle === appRoot.productHandle) {
      sequenceProductHandles.add(sequence.productHandle);
    }
  }
  return configuration.steps.filter((step) =>
    step.sequence?.productHandle != null && sequenceProductHandles.has(step.sequence.productHandle)
  );
}

function visibleCompilerWorldsForDefinition(
  emission: AureliaAppWorldProjectEmission,
  definition: CustomElementDefinition,
): readonly TemplateCompilerWorldEmission[] {
  return emission.appWorld.compilerWorlds.filter((compilerWorld) =>
    compilerWorld.resourceScope.resources.some((resource) =>
      resource.definitionProductHandle === definition.productHandle
      || resource.resourceProductHandle === definition.productHandle
    )
  );
}

function templateCompilationsForDefinition(
  emission: AureliaAppWorldProjectEmission,
  definition: CustomElementDefinition,
): typeof emission.templates.resources {
  return emission.templates.resources.filter((resource) =>
    resource.compilation.definition.productHandle === definition.productHandle
    || resource.compilation.definition.identityHandle === definition.identityHandle
  );
}

function uniqueProductHandles(handles: readonly ProductHandle[]): ReadonlySet<ProductHandle> {
  return new Set(handles);
}
