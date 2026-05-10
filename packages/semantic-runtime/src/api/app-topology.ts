import type { AppRoot } from '../configuration/app-root.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import type { ConfigurationStep } from '../configuration/configuration-sequence.js';
import type { AddressHandle, IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { ApplicationFileRole } from '../application/index.js';
import { BindableBindingMode } from '../resources/bindable-definition.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { TemplateCompilerWorldEmission } from '../template/compiler-world-materializer.js';
import type { RouteConfigModel } from '../router/model.js';
import { compilerWorldLabel, describeAddress, type SemanticSourceReference } from './source-reference.js';

export interface SemanticApplicationBindableRow {
  readonly name: string;
  readonly attribute: string;
  readonly mode: BindableBindingMode | `${BindableBindingMode}`;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticApplicationDependencyRow {
  readonly keyName: string | null;
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

export interface SemanticApplicationComponentReference {
  readonly className: string | null;
  readonly elementName: string;
  readonly aliases: readonly string[];
  readonly source: SemanticSourceReference | null;
  readonly template: SemanticApplicationTemplateAsset | null;
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

export interface SemanticApplicationFileRow {
  readonly path: string;
  readonly roles: readonly ApplicationFileRole[];
  readonly source: SemanticSourceReference | null;
}

export interface SemanticApplicationRouteRow {
  readonly id: string | null;
  readonly paths: readonly string[];
  readonly routeKind: string;
  readonly componentName: string | null;
  readonly childRouteCount: number;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticApplicationTopologyResult {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly files: readonly SemanticApplicationFileRow[];
  readonly appRoots: readonly SemanticApplicationRootRow[];
  readonly components: readonly SemanticApplicationComponentRow[];
  readonly routes: readonly SemanticApplicationRouteRow[];
}

export function readSemanticApplicationTopology(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  handles: boolean,
): SemanticApplicationTopologyResult {
  const configuration = emission.configuration.readConfiguration();
  const appRoots = configuration.appRoots.map((appRoot) =>
    applicationRootRow(store, emission, configuration, appRoot, handles)
  );
  const components = applicationComponentRows(store, emission, handles);
  const routes = applicationRouteRows(store, emission);
  const files = applicationFileRows(store, emission, appRoots, components, routes);
  return {
    projectKey: emission.project.projectKey,
    rootDir: emission.project.rootDir,
    files,
    appRoots,
    components,
    routes,
  };
}

function applicationRootRow(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  configuration: ConfigurationKernelEmission,
  appRoot: AppRoot,
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
      : applicationComponentReference(store, emission, definition, handles),
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
  handles: boolean,
): readonly SemanticApplicationComponentRow[] {
  const appRootCounts = appRootCountByDefinitionProduct(emission);
  const rows = uniqueCustomElementDefinitions(emission).map((definition) => {
    const reference = applicationComponentReference(store, emission, definition, handles);
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

function applicationComponentReference(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  definition: CustomElementDefinition,
  handles: boolean,
): SemanticApplicationComponentReference {
  const template = applicationTemplateAsset(store, emission, definition, handles);
  return {
    className: definition.target.localName,
    elementName: definition.name,
    aliases: definition.aliases.map((alias) => alias.name),
    source: describeAddress(store, definition.sourceAddressHandle),
    template,
    bindables: definition.bindables.map((bindable) => ({
      name: bindable.name,
      attribute: bindable.attribute,
      mode: bindable.mode,
      source: describeAddress(store, bindable.sourceAddressHandle),
      ...(handles ? {
        handles: {
          sourceAddressHandle: bindable.sourceAddressHandle,
        },
      } : {}),
    })),
    dependencies: definition.dependencies.flatMap((dependency) => {
      const dependencyDefinitions = emission.resourceIndex.lookupAllByDependencyReference(dependency)
        .filter((candidate): candidate is CustomElementDefinition => candidate instanceof CustomElementDefinition);
      const components = dependencyDefinitions.length === 0 ? [null] : dependencyDefinitions;
      return components.map((component) => ({
        keyName: dependency.keyName,
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
  }
  for (const route of routes) {
    addRole(route.source, 'route-source');
  }
  for (const source of emission.project.sourceFiles) {
    const role = supportFileRoleForPath(source.path);
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
    componentName: routeConfig.component?.localName ?? null,
    childRouteCount: routeConfig.childRoutes.length,
    source: describeAddress(store, routeConfig.sourceAddressHandle),
  };
}

function supportFileRoleForPath(path: string): ApplicationFileRole | null {
  const segments = path.split(/[\\/]/).map((segment) => segment.toLowerCase());
  if (segments.includes('services')) {
    return 'service-source';
  }
  if (segments.includes('state')) {
    return 'state-source';
  }
  if (segments.includes('models')) {
    return 'model-source';
  }
  return null;
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
