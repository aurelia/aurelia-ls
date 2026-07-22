import type { AureliaAppWorldEmission } from '../configuration/app-world-composer.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import {
  sourceFileAddressForAddress,
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { KernelStore } from '../kernel/store.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
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
        })
      );
    if (authoringCompilerWorld != null) {
      for (const definition of authoringDefinitions) {
        appendOwnerPlan(owners, new TemplateCompilationOwnerPlan(definition, [
          new TemplateCompilationCohortPlan(
            TemplateCompilationCohortKind.Authoring,
            authoringCompilerWorld.world.productHandle,
            null,
            authoringCompilerWorld,
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
      const definition = visibleResource.definition;
      return definition instanceof CustomElementDefinition
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
      const parentCompilerWorld = request.phases.measure(
        TemplateCompilationCohortPlanningPhase.ComponentCompilerWorld,
        () => this.parentCompilerWorldForOwner(
          request.projectKey,
          appRootWorld,
          admission,
          request.resourceDefinitions,
        ),
      );
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
    projectKey: string,
    appRootWorld: TemplateCompilerWorldEmission,
    admission: AppOwnerAdmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
  ): TemplateCompilerWorldEmission {
    const dependencies = directDependencyDefinitions(admission.definition, resourceDefinitions)
      .map((dependency) => visibleResourceForDefinition(
        dependency,
        TemplateResourceVisibilityKind.Local,
        dependency.sourceAddressHandle ?? admission.definition.sourceAddressHandle,
      ))
      .filter((resource): resource is TemplateVisibleResource => resource != null);
    const appRootHandle = appRootWorld.world.appRoot?.identityHandle
      ?? appRootWorld.world.appRoot?.productHandle
      ?? appRootWorld.world.identityHandle;
    const localKey = `component-world:${encodeTemplateCompilationKeyParts([
      projectKey,
      appRootHandle,
      stableOwnerHandle(admission.definition),
    ])}`;
    return this.compilerWorlds.constructDerived(new TemplateCompilerWorldDerivationRequest(
      localKey,
      TemplateCompilerWorldKind.Component,
      appRootWorld,
      [admission.visibleResource, ...dependencies],
      TemplateResourceVisibilityKind.Configured,
      admission.definition.sourceAddressHandle,
    ));
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
      if (!(visibleResource?.definition instanceof CustomElementDefinition)) {
        continue;
      }
      admissions.push(new AppOwnerAdmission(
        visibleResource.definition,
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
      && sourceFileNames.some((fileName) => sourcePathMatchesFileName(sourceFile.path, fileName));
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
