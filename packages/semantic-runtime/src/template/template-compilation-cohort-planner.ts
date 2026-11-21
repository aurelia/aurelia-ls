import type { AureliaAppWorldEmission } from '../configuration/app-world-composer.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import {
  sourceFileAddressForAddress,
} from '../kernel/source-address.js';
import { sameTypeSystemSourcePath } from '../type-system/source-file-path.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { KernelStore } from '../kernel/store.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { BindingCommandDefinition } from '../resources/binding-command-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { RouteConfigContextMaterializationProjectResult } from '../router/route-context-materialization.js';
import type {
  RouteConfigContextModel,
  RouteConfigModel,
  RouteableComponentReference,
} from '../router/model.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  templateCompilerCompileState,
  TemplateCompilerCompileState,
  TemplateCompilerWorldKind,
} from './compiler-world.js';
import {
  TemplateResourceVisibilityKind,
  type TemplateVisibleResource,
} from './compiler-world-reference.js';
import {
  TemplateCompilerWorldDerivationRequest,
  TemplateCompilerWorldMaterializer,
  type TemplateCompilerWorldEmission,
} from './compiler-world-materializer.js';
import {
  directDependencyDefinitions,
  directDependencyRegistrations,
  visibleResourceForDefinition,
} from './resource-scope-builder.js';
import {
  encodeTemplateCompilationKeyParts,
  TemplateCompilationAdmissionOrigin,
  TemplateCompilationAdmissionOriginKind,
  TemplateCompilationCohortKind,
  TemplateCompilationCohortPlan,
  TemplateCompilationCohortProjectPlan,
  TemplateCompilationOwnerPlan,
} from './template-compilation-cohort.js';
import { TemplateAuthoringCompilerWorldMaterializer } from './template-authoring-world.js';
import { RegisteredSyntaxResourceMaterializer } from './registered-syntax-resource-materializer.js';
import type { FrameworkSupportCatalogs } from '../framework/framework-support-authority.js';

export const enum TemplateCompilationCohortPlanningPhase {
  /** Build an owner-specific compiler world from one admitted app-root world. */
  ComponentCompilerWorld = 'component-compiler-world',
  /** Build the standalone compiler world used by authoring-only template families. */
  AuthoringCompilerWorld = 'authoring-compiler-world',
}

export interface TemplateCompilationCohortPlanningPhaseRecorder {
  measure<TValue>(phase: TemplateCompilationCohortPlanningPhase, read: () => TValue): TValue;
}

export class TemplateCompilationCohortPlanningRequest {
  constructor(
    readonly projectKey: string,
    readonly appWorld: AureliaAppWorldEmission,
    readonly typeSystem: TypeSystemProject | null,
    readonly resourceDefinitions: ResourceDefinitionIndex | null,
    readonly routeContexts: RouteConfigContextMaterializationProjectResult | null,
    readonly includeAuthoringTemplates: boolean,
    readonly authoringTemplateSourceFiles: readonly string[],
    readonly authoringTemplateLimit: number | null,
    readonly phases: TemplateCompilationCohortPlanningPhaseRecorder,
  ) {}
}

class AppOwnerAdmission {
  constructor(
    readonly definition: CustomElementDefinition,
    readonly visibleResource: TemplateVisibleResource,
    readonly origins: readonly TemplateCompilationAdmissionOrigin[],
  ) {}
}

/** Derives one complete owner-to-cohort plan before any template family is compiled. */
export class TemplateCompilationCohortPlanner {
  private readonly compilerWorlds: TemplateCompilerWorldMaterializer;
  private readonly authoringWorlds: TemplateAuthoringCompilerWorldMaterializer;

  constructor(
    private readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
    support: FrameworkSupportCatalogs,
  ) {
    this.compilerWorlds = new TemplateCompilerWorldMaterializer(publication);
    this.authoringWorlds = new TemplateAuthoringCompilerWorldMaterializer(store, publication, support);
  }

  plan(request: TemplateCompilationCohortPlanningRequest): TemplateCompilationCohortProjectPlan {
    const owners = new Map<IdentityHandle | ProductHandle, TemplateCompilationOwnerPlan>();
    for (const appRootWorld of request.appWorld.compilerWorlds) {
      for (const owner of this.planAppRootOwners(request, appRootWorld)) {
        appendOwnerPlan(owners, owner);
      }
    }

    const appOwnerHandles = new Set(owners.keys());
    const authoringDefinitions = request.includeAuthoringTemplates
      ? selectAuthoringTemplateDefinitions(
        this.publication,
        request.resourceDefinitions?.entries.map((entry) => entry.definition) ?? [],
        appOwnerHandles,
        request.authoringTemplateSourceFiles,
        request.authoringTemplateLimit,
      )
      : [];
    const authoringCompilerWorld = authoringDefinitions.length === 0
      ? null
      : request.phases.measure(TemplateCompilationCohortPlanningPhase.AuthoringCompilerWorld, () =>
        this.authoringWorlds.construct({
          projectKey: request.projectKey,
          resourceDefinitions: request.resourceDefinitions?.entries.map((entry) => entry.definition) ?? [],
          typeSystem: request.typeSystem,
          callableBindings: request.appWorld.resourceCallableBindings,
        })
      );
    if (authoringCompilerWorld != null) {
      for (const definition of authoringDefinitions) {
        const componentWorld = this.parentCompilerWorldForOwner(request, authoringCompilerWorld, definition, null);
        appendOwnerPlan(owners, new TemplateCompilationOwnerPlan(definition, [
          new TemplateCompilationCohortPlan(
            TemplateCompilationCohortKind.Authoring,
            authoringCompilerWorld.world.productHandle,
            null,
            componentWorld,
            [new TemplateCompilationAdmissionOrigin(
              TemplateCompilationAdmissionOriginKind.AuthoringPolicy,
              definition.template?.addressHandle ?? definition.sourceAddressHandle,
              definition.productHandle,
            )],
          ),
        ]));
      }
    }

    return new TemplateCompilationCohortProjectPlan(
      request.projectKey,
      request.appWorld.compilerWorlds,
      [...owners.values()],
      authoringCompilerWorld,
    );
  }

  private planAppRootOwners(
    request: TemplateCompilationCohortPlanningRequest,
    appRootWorld: TemplateCompilerWorldEmission,
  ): readonly TemplateCompilationOwnerPlan[] {
    const appRootDefinitionProductHandle = appRootDefinitionProductHandleForCompilerWorld(
      request.appWorld,
      appRootWorld,
      request.resourceDefinitions,
    );
    const queue = appRootWorld.resourceScope.resources.flatMap((visibleResource) => {
      const definition = customElementDefinitionForVisibleResource(request.resourceDefinitions, visibleResource);
      return definition != null
        ? [new AppOwnerAdmission(
          definition,
          visibleResource,
          [new TemplateCompilationAdmissionOrigin(
            TemplateCompilationAdmissionOriginKind.AppVisibility,
            visibleResource.sourceAddressHandle,
            visibleResource.resourceProductHandle,
          )],
        )]
        : [];
    });
    queue.push(...routeableAdmissionsForAppRoot(
      appRootWorld,
      request.routeContexts,
      request.resourceDefinitions,
    ));

    const admissionsByOwner = new Map<IdentityHandle | ProductHandle, AppOwnerAdmission>();
    for (let index = 0; index < queue.length; index += 1) {
      const admission = queue[index]!;
      const ownerHandle = stableOwnerHandle(admission.definition);
      const existing = admissionsByOwner.get(ownerHandle);
      if (existing != null) {
        admissionsByOwner.set(ownerHandle, new AppOwnerAdmission(
          existing.definition,
          existing.visibleResource,
          mergeAdmissionOrigins(existing.origins, admission.origins),
        ));
        continue;
      }
      admissionsByOwner.set(ownerHandle, admission);
      for (const dependency of directDependencyDefinitions(admission.definition, request.resourceDefinitions)) {
        if (!(dependency instanceof CustomElementDefinition)) {
          continue;
        }
        const visibleResource = visibleResourceForDefinition(
          dependency,
          TemplateResourceVisibilityKind.Local,
          dependency.sourceAddressHandle ?? admission.definition.sourceAddressHandle,
        );
        if (visibleResource == null) {
          continue;
        }
        queue.push(new AppOwnerAdmission(
          dependency,
          visibleResource,
          [new TemplateCompilationAdmissionOrigin(
            TemplateCompilationAdmissionOriginKind.ResourceDependency,
            admission.definition.sourceAddressHandle,
            admission.definition.productHandle,
          )],
        ));
      }
    }

    return [...admissionsByOwner.values()].map((admission) => {
      const parentCompilerWorld = this.parentCompilerWorldForOwner(request, appRootWorld, admission.definition, admission.visibleResource);
      return new TemplateCompilationOwnerPlan(admission.definition, [
        new TemplateCompilationCohortPlan(
          TemplateCompilationCohortKind.App,
          appRootWorld.world.productHandle,
          appRootDefinitionProductHandle,
          parentCompilerWorld,
          admission.origins,
        ),
      ]);
    });
  }

  private parentCompilerWorldForOwner(
    request: TemplateCompilationCohortPlanningRequest,
    parent: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    retainedOwner: TemplateVisibleResource | null,
  ): TemplateCompilerWorldEmission {
    const declared = directDependencyRegistrations(definition, request.resourceDefinitions);
    const dependencies = declared
      .map(({ definition: dependency, registrationName }) => visibleResourceForDefinition(
        dependency,
        TemplateResourceVisibilityKind.Local,
        dependency.sourceAddressHandle ?? definition.sourceAddressHandle,
        registrationName,
      ))
      .filter((resource): resource is TemplateVisibleResource => resource != null);
    if (dependencies.length === 0 && retainedOwner == null) return parent;
    const parentHandle = parent.world.appRoot?.identityHandle
      ?? parent.world.appRoot?.productHandle
      ?? parent.world.identityHandle;
    const localKey = `component-world:${encodeTemplateCompilationKeyParts([
      request.projectKey,
      parentHandle,
      stableOwnerHandle(definition),
    ])}`;
    const commands = declared.flatMap(({ definition: dependency }, index) => {
      if (!(dependency instanceof BindingCommandDefinition)) return [];
      const inherited = parent.bindingCommands.find(command => command.definition?.productHandle === dependency.productHandle);
      if (inherited != null) return [inherited];
      const command = new RegisteredSyntaxResourceMaterializer(this.publication).componentBindingCommand(
        `${localKey}:binding-command:${index}`, dependency, definition.sourceAddressHandle,
      );
      return command == null ? [] : [command];
    });
    return request.phases.measure(TemplateCompilationCohortPlanningPhase.ComponentCompilerWorld, () =>
      this.compilerWorlds.constructDerived(new TemplateCompilerWorldDerivationRequest(
        localKey,
        TemplateCompilerWorldKind.Component,
        parent,
        // Only the owner's declared dependencies compete for lookup keys in its child container.
        dependencies,
        TemplateResourceVisibilityKind.Configured,
        definition.sourceAddressHandle,
        retainedOwner == null ? null : [retainedOwner],
        null,
        null,
        commands,
      )));
  }
}

function routeableAdmissionsForAppRoot(
  compilerWorld: TemplateCompilerWorldEmission,
  routeContexts: RouteConfigContextMaterializationProjectResult | null,
  resourceDefinitions: ResourceDefinitionIndex | null,
): readonly AppOwnerAdmission[] {
  const appRootProductHandle = compilerWorld.world.appRoot?.productHandle ?? null;
  if (appRootProductHandle == null || routeContexts == null || resourceDefinitions == null) {
    return [];
  }
  const routeConfigsByIdentity = new Map(routeContexts.readRouteConfigs().map((config) => [config.identityHandle, config]));
  const routeConfigsByProduct = new Map(routeContexts.readRouteConfigs().map((config) => [config.productHandle, config]));
  const admissions: AppOwnerAdmission[] = [];
  for (const context of routeContexts.readRouteConfigContexts()) {
    if (context.appRoot?.productHandle !== appRootProductHandle) {
      continue;
    }
    const routeConfig = routeConfigForContext(context, routeConfigsByIdentity, routeConfigsByProduct);
    if (routeConfig == null) {
      continue;
    }
    for (const [routeable, kind] of [
      [routeConfig.component, TemplateCompilationAdmissionOriginKind.RouteComponent],
      [routeConfig.fallback, TemplateCompilationAdmissionOriginKind.RouteFallback],
    ] as const) {
      const visibleResource = visibleRouteableResource(routeable, resourceDefinitions);
      const definition = customElementDefinitionForVisibleResource(resourceDefinitions, visibleResource);
      if (visibleResource == null || definition == null) {
        continue;
      }
      admissions.push(new AppOwnerAdmission(
        definition,
        visibleResource,
        [new TemplateCompilationAdmissionOrigin(
          kind,
          routeable?.sourceAddressHandle ?? routeConfig.sourceAddressHandle,
          routeConfig.productHandle,
        )],
      ));
    }
  }
  return admissions;
}

function customElementDefinitionForVisibleResource(
  resourceDefinitions: ResourceDefinitionIndex | null,
  resource: TemplateVisibleResource | null,
): CustomElementDefinition | null {
  const definition = resourceDefinitions?.lookupByProduct(resource?.definitionProductHandle ?? null) ?? null;
  return definition instanceof CustomElementDefinition ? definition : null;
}

function routeConfigForContext(
  context: RouteConfigContextModel,
  byIdentity: ReadonlyMap<IdentityHandle, RouteConfigModel>,
  byProduct: ReadonlyMap<ProductHandle, RouteConfigModel>,
): RouteConfigModel | null {
  return context.config.identityHandle == null
    ? context.config.productHandle == null ? null : byProduct.get(context.config.productHandle) ?? null
    : byIdentity.get(context.config.identityHandle) ?? null;
}

function visibleRouteableResource(
  routeable: RouteableComponentReference | null,
  resourceDefinitions: ResourceDefinitionIndex,
): TemplateVisibleResource | null {
  const definition = resourceDefinitions.lookupByProduct(routeable?.resolvedProductHandle ?? null);
  if (!(definition instanceof CustomElementDefinition)) {
    return null;
  }
  return visibleResourceForDefinition(
    definition,
    TemplateResourceVisibilityKind.Routeable,
    routeable?.sourceAddressHandle ?? definition.sourceAddressHandle,
  );
}

function appRootDefinitionProductHandleForCompilerWorld(
  appWorld: AureliaAppWorldEmission,
  compilerWorld: TemplateCompilerWorldEmission,
  resourceDefinitions: ResourceDefinitionIndex | null,
): ProductHandle | null {
  const appRootProductHandle = compilerWorld.world.appRoot?.productHandle ?? null;
  if (appRootProductHandle == null || resourceDefinitions == null) {
    return null;
  }
  const appRoot = appWorld.configuration.appRoots.find((candidate) =>
    candidate.productHandle === appRootProductHandle
  ) ?? null;
  return resourceDefinitions.lookupByTargetReference(appRoot?.component ?? null)?.productHandle ?? null;
}

function selectAuthoringTemplateDefinitions(
  publication: KernelPublicationContext,
  definitions: readonly FullResourceDefinition[],
  appOwnerHandles: ReadonlySet<IdentityHandle | ProductHandle>,
  authoringTemplateSourceFiles: readonly string[],
  authoringTemplateLimit: number | null,
): readonly CustomElementDefinition[] {
  const selected: CustomElementDefinition[] = [];
  for (const definition of definitions) {
    if (
      !(definition instanceof CustomElementDefinition)
      || templateCompilerCompileState(definition) !== TemplateCompilerCompileState.Compiled
      || appOwnerHandles.has(stableOwnerHandle(definition))
      || (
        authoringTemplateSourceFiles.length > 0
        && !definitionBelongsToAuthoringSourceFile(publication, definition, authoringTemplateSourceFiles)
      )
    ) {
      continue;
    }
    if (authoringTemplateLimit != null && selected.length >= authoringTemplateLimit) {
      break;
    }
    selected.push(definition);
  }
  return selected;
}

function definitionBelongsToAuthoringSourceFile(
  publication: KernelPublicationContext,
  definition: CustomElementDefinition,
  sourceFileNames: readonly string[],
): boolean {
  return [
    definition.template?.addressHandle ?? null,
    definition.sourceAddressHandle,
    definition.target.addressHandle,
  ].some((handle) => {
    const sourceFile = sourceFileAddressForAddress(publication, handle);
    return sourceFile != null
      && sourceFileNames.some((fileName) => sameTypeSystemSourcePath(sourceFile.path, fileName));
  });
}

function appendOwnerPlan(
  owners: Map<IdentityHandle | ProductHandle, TemplateCompilationOwnerPlan>,
  next: TemplateCompilationOwnerPlan,
): void {
  const existing = owners.get(next.ownerHandle);
  if (existing != null && existing.definition !== next.definition) {
    throw new Error(`Template compilation owner ${next.ownerHandle} resolves to conflicting definitions.`);
  }
  owners.set(
    next.ownerHandle,
    existing == null
      ? next
      : new TemplateCompilationOwnerPlan(existing.definition, [...existing.cohorts, ...next.cohorts]),
  );
}

function mergeAdmissionOrigins(
  left: readonly TemplateCompilationAdmissionOrigin[],
  right: readonly TemplateCompilationAdmissionOrigin[],
): readonly TemplateCompilationAdmissionOrigin[] {
  const seen = new Set<string>();
  return [...left, ...right].filter((origin) => {
    const key = encodeTemplateCompilationKeyParts([
      origin.kind,
      origin.sourceAddressHandle ?? '',
      origin.viaProductHandle ?? '',
    ]);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function stableOwnerHandle(definition: CustomElementDefinition): IdentityHandle | ProductHandle {
  const handle = definition.identityHandle ?? definition.productHandle;
  if (handle == null) {
    throw new Error(`Template owner ${definition.name} has no stable identity or product handle.`);
  }
  return handle;
}
