import type { SemanticApp } from '../api/runtime.js';
import {
  registrationOperationsVisibleToContainer,
} from '../di/world-construction.js';
import {
  frameworkRegistrationKindForOperation,
  type ContainerRegistrationOperation,
} from '../di/container-registration.js';
import type { ProductHandle, IdentityHandle } from '../kernel/handles.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { RegistrationAdmissionProduct } from '../registration/registration-admission.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationCapabilitiesForKind,
} from '../registration/framework-registration-manifest.js';
import {
  BuiltInResourceExportVisibility,
  BuiltInResourcePackage,
  builtInResourceExportVisibility,
  builtInResourcePackageModuleSpecifier,
} from '../resources/built-in-resources.js';
import type { BuiltInResourceEmission } from '../resources/built-in-resource-catalog-materializer.js';
import type { TemplateVisibleResourceReference } from './compiler-world-reference.js';
import {
  TemplateCompilerFrameworkInstructionType,
  type TemplateCompilerRuntimeInstructionValue,
} from './template-instruction-runtime-value.js';
import {
  RuntimeRendererExportVisibility,
  RuntimeRendererGroup,
  RuntimeRendererPackage,
  runtimeRendererPackageModuleSpecifier,
} from './runtime-renderer.js';
import type { BuiltInRuntimeRendererEmission } from './runtime-renderer-catalog-materializer.js';
import {
  collectRuntimeRegistrationClosurePressure,
} from './runtime-registration-closure-pressure.js';
import type { TemplateInstruction } from './instruction-ir.js';
import { TemplateInstructionKind } from './instruction-ir.js';
import {
  dedupeRuntimeRegistrationRequirementReasons as dedupeReasons,
  RuntimeRegistrationRequirementGroupKind,
  RuntimeRegistrationRequirementReasonKind,
  RuntimeRegistrationRequirementSelectionKind,
  runtimeRegistrationRequirementReason as reason,
  SemanticAppRuntimeRegistrationRequirements,
  type RuntimeRegistrationRequirementCompilerInput,
  type RuntimeRegistrationRequirementGroupReference,
  type RuntimeRegistrationRequirementLeaf,
  type RuntimeRegistrationRequirementReason,
  type RuntimeRegistrationRequirementSelection,
} from './runtime-registration-requirement-model.js';

export {
  SEMANTIC_APP_RUNTIME_REGISTRATION_REQUIREMENTS_VERSION,
  RuntimeRegistrationRequirementGroupKind,
  RuntimeRegistrationRequirementReasonKind,
  RuntimeRegistrationRequirementSelectionKind,
  SemanticAppRuntimeRegistrationRequirements,
  type RuntimeRegistrationRequirementCompilerInput,
  type RuntimeRegistrationRequirementGroupReference,
  type RuntimeRegistrationRequirementLeaf,
  type RuntimeRegistrationRequirementReason,
  type RuntimeRegistrationRequirementSelection,
} from './runtime-registration-requirement-model.js';

interface RequirementUse {
  readonly compilerWorldProductHandle: ProductHandle;
  readonly catalogProductHandle: ProductHandle;
  readonly targetProductHandle: ProductHandle;
  readonly staticUseCount: number;
}

interface ProviderIdentity {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

interface RuntimeRendererUse {
  readonly compilerWorldProductHandle: ProductHandle;
  readonly targetName: string;
  readonly staticUseCount: number;
}

const runtimeHtmlDefaultResourcesGroup: RuntimeRegistrationRequirementGroupReference = {
  moduleSpecifier: '@aurelia/runtime-html',
  exportName: 'DefaultResources',
};

const runtimeHtmlDefaultRenderersGroup: RuntimeRegistrationRequirementGroupReference = {
  moduleSpecifier: '@aurelia/runtime-html',
  exportName: 'DefaultRenderers',
};

const eventModifierConservativeGroup: RuntimeRegistrationRequirementGroupReference = {
  moduleSpecifier: '@aurelia/runtime-html',
  exportName: 'EventModifierRegistration',
};

/**
 * Project the runtime-html registration subset for one complete AOT app cohort.
 *
 * This consumes current, in-process browser-final compiler products and returns only detached value data. It is not a
 * general inquiry: callers reach it through the explicit browser-template/build corridor.
 */
export function projectSemanticAppRuntimeRegistrationRequirements(
  app: SemanticApp,
  compilerInputs: readonly RuntimeRegistrationRequirementCompilerInput[],
  cohortReasons: readonly RuntimeRegistrationRequirementReason[] = [],
): SemanticAppRuntimeRegistrationRequirements {
  app.requireCurrent();
  const resourceReasons: RuntimeRegistrationRequirementReason[] = [];
  const rendererReasons: RuntimeRegistrationRequirementReason[] = [];
  const eventReasons: RuntimeRegistrationRequirementReason[] = [];
  const unavailableReasons = [
    ...cohortReasons,
    ...compilerInputs.flatMap((input) => input.unavailableReasons),
    ...compilerInputs.flatMap((input) =>
      input.family != null
      && input.instructions != null
      && input.family.isCurrent()
      && input.instructions.isCurrent()
        ? []
        : input.unavailableReasons.length > 0
          ? []
          : [reason(
              RuntimeRegistrationRequirementReasonKind.CompilerHandoffUnavailable,
              'Runtime registration projection requires current browser-final compiler products.',
              [input.resource.compilation.localKey],
            )]
    ),
  ];
  resourceReasons.push(...unavailableReasons);
  rendererReasons.push(...unavailableReasons);
  eventReasons.push(...unavailableReasons);

  const closurePressure = collectRuntimeRegistrationClosurePressure(app, compilerInputs);
  resourceReasons.push(...closurePressure.resources);
  rendererReasons.push(...closurePressure.renderers);
  eventReasons.push(...closurePressure.eventModifier);

  const resourceUses = collectRuntimeHtmlResourceUses(app, compilerInputs, resourceReasons, rendererReasons, eventReasons);
  const rendererProjection = collectRendererUses(compilerInputs, rendererReasons, resourceReasons, eventReasons);
  const providerAttribution = new ProviderAttributionIndex(app, compilerInputs);
  const resourceSelection = resourceReasons.length === 0
    ? exactResourceSelection(app, providerAttribution, resourceUses, resourceReasons)
    : null;
  const rendererSelection = rendererReasons.length === 0
    ? exactRendererSelection(app, providerAttribution, rendererProjection.uses, rendererReasons)
    : null;
  const eventSelection = eventReasons.length === 0
    ? exactEventModifierSelection(providerAttribution, compilerInputs, rendererProjection.eventModifierUseCount, eventReasons)
    : null;

  app.requireCurrent();
  return new SemanticAppRuntimeRegistrationRequirements(
    resourceSelection ?? conservativeSelection(
      RuntimeRegistrationRequirementGroupKind.RuntimeHtmlDefaultResources,
      runtimeHtmlDefaultResourcesGroup,
      resourceReasons,
    ),
    rendererSelection ?? conservativeSelection(
      RuntimeRegistrationRequirementGroupKind.RuntimeHtmlDefaultRenderers,
      runtimeHtmlDefaultRenderersGroup,
      rendererReasons,
    ),
    eventSelection ?? conservativeSelection(
      RuntimeRegistrationRequirementGroupKind.EventModifierRegistration,
      eventModifierConservativeGroup,
      eventReasons,
    ),
  );
}

function collectRuntimeHtmlResourceUses(
  app: SemanticApp,
  inputs: readonly RuntimeRegistrationRequirementCompilerInput[],
  resourceReasons: RuntimeRegistrationRequirementReason[],
  rendererReasons: RuntimeRegistrationRequirementReason[],
  eventReasons: RuntimeRegistrationRequirementReason[],
): readonly RequirementUse[] {
  const configured = app.emission.appWorld.configuredResources.catalogEmission.resources;
  const byDefinition = new Map(configured.flatMap((emission) => emission.definition?.productHandle == null
    ? []
    : [[emission.definition.productHandle, emission] as const]
  ));
  const byResource = new Map(configured.flatMap((emission) => emission.resource.productHandle == null
    ? []
    : [[emission.resource.productHandle, emission] as const]
  ));
  const uses = new Map<string, RequirementUse>();
  for (const input of inputs) {
    const family = input.family;
    if (family == null) continue;
    const compilerWorldProductHandle = input.resource.compilation.compilerWorld.world.productHandle;
    for (const instruction of family.instructions) {
      const reference = instructionResourceReference(instruction);
      if (reference == null) continue;
      const emission = builtInEmissionForReference(reference, byDefinition, byResource);
      if (emission == null) {
        if (reference.definitionProductHandle == null || reference.resourceProductHandle == null) {
          resourceReasons.push(reason(
            RuntimeRegistrationRequirementReasonKind.ResourceReferenceOpen,
            'A browser-final instruction selected a resource without a complete product and definition identity.',
            [instruction.productHandle, compilerWorldProductHandle],
          ));
        }
        continue;
      }
      if (emission.resource.packageId !== BuiltInResourcePackage.RuntimeHtml) continue;
      addRequirementUse(uses, compilerWorldProductHandle, emission, 1);
      if (emission.resource.targetName === 'AuCompose') {
        const compileReason = reason(
          RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
          'AuCompose can compile runtime-selected definitions, so static runtime registration closure is not exact.',
          [instruction.productHandle, emission.resource.targetName],
        );
        resourceReasons.push(compileReason);
        rendererReasons.push(compileReason);
        eventReasons.push(compileReason);
      }
    }

    for (const entry of input.resource.runtimeAnalysis.expressionResourcePlan.entries) {
      if (entry.resource == null) {
        resourceReasons.push(reason(
          RuntimeRegistrationRequirementReasonKind.ResourceReferenceOpen,
          'A runtime expression resource occurrence has no selected compiler resource.',
          [entry.expressionProductHandle, compilerWorldProductHandle],
        ));
        continue;
      }
      const emission = entry.builtInResource?.productHandle == null
        ? null
        : byResource.get(entry.builtInResource.productHandle) ?? null;
      if (emission == null || emission.resource.packageId !== BuiltInResourcePackage.RuntimeHtml) continue;
      addRequirementUse(uses, compilerWorldProductHandle, emission, 1);
    }

    const runtimeRendering = input.resource.runtimeAnalysis.runtimeRendering;
    if (runtimeRendering.dynamicInstructions.length > 0) {
      const dynamicReason = reason(
        RuntimeRegistrationRequirementReasonKind.RuntimeInstructionCreatedAtRuntime,
        'Runtime spread compilation created instructions outside the browser-final static family.',
        runtimeRendering.dynamicInstructions.map((instruction) => instruction.productHandle),
      );
      resourceReasons.push(dynamicReason);
      rendererReasons.push(dynamicReason);
      eventReasons.push(dynamicReason);
    }
    const instructionLaneSeams = runtimeRendering.openSeams.filter((seam) => seam.reasonKinds.some((kind) =>
      kind === OpenSeamReasonKind.RuntimeRenderingProductMissing
      || kind === OpenSeamReasonKind.RuntimeRenderingRendererUnavailable
      || kind === OpenSeamReasonKind.SpreadHydrationContextOpen
    ));
    if (instructionLaneSeams.length > 0) {
      const laneReason = reason(
        RuntimeRegistrationRequirementReasonKind.RuntimeInstructionLaneOpen,
        'Runtime rendering retained an open instruction or spread-compilation lane.',
        instructionLaneSeams.map((seam) => seam.handle),
      );
      resourceReasons.push(laneReason);
      rendererReasons.push(laneReason);
      eventReasons.push(laneReason);
    }
  }
  return [...uses.values()];
}

function collectRendererUses(
  inputs: readonly RuntimeRegistrationRequirementCompilerInput[],
  rendererReasons: RuntimeRegistrationRequirementReason[],
  resourceReasons: RuntimeRegistrationRequirementReason[],
  eventReasons: RuntimeRegistrationRequirementReason[],
): { readonly uses: readonly RuntimeRendererUse[]; readonly eventModifierUseCount: number } {
  const uses = new Map<string, RuntimeRendererUse>();
  let eventModifierUseCount = 0;
  for (const input of inputs) {
    const family = input.family;
    const instructions = input.instructions;
    if (family == null || instructions == null) continue;
    const compilerWorld = input.resource.compilation.compilerWorld;
    const instructionByValue = new Map(instructions.instructions.map((entry) => [entry.value, entry.instruction]));
    // RuntimeRendering claims belong to the authored compiler family and predate browser-final regeneration. They
    // cross-check renderer-product participation; the browser-final numeric ABI plus effective ordered catalog remains
    // the dispatch authority, so instruction-product identity is deliberately not joined across those two families.
    const claimedRendererProducts = new Set(input.resource.runtimeAnalysis.runtimeRendering.records.flatMap((record) =>
      record.kind === 'semantic-claim'
      && record.predicateKey === KernelVocabulary.Binding.InstructionUsesRuntimeRenderer.key
        ? [record.objectHandle as ProductHandle]
        : []
    ));
    const visit = (value: TemplateCompilerRuntimeInstructionValue): void => {
      const instruction = instructionByValue.get(value) ?? null;
      if (instruction == null) {
        rendererReasons.push(reason(
          RuntimeRegistrationRequirementReasonKind.RuntimeRendererClaimMismatch,
          'A browser-final runtime wire has no paired semantic instruction identity.',
          [compilerWorld.world.productHandle, String(value.type)],
        ));
        return;
      }
      if (value.type === TemplateCompilerFrameworkInstructionType.ListenerBinding && value.modifier != null) {
        eventModifierUseCount += 1;
      }
      const candidates = compilerWorld.runtimeRenderers.filter((emission) =>
        emission.renderer.targetInstructionType === value.type
      );
      if (candidates.length !== 1) {
        rendererReasons.push(reason(
          RuntimeRegistrationRequirementReasonKind.RuntimeInstructionAbiUnmodeled,
          `Runtime instruction ABI type '${value.type}' does not select one exact configured renderer catalog target.`,
          [
            instruction.productHandle,
            compilerWorld.world.productHandle,
            String(value.type),
            ...candidates.map((candidate) => candidate.renderer.productHandle ?? candidate.renderer.targetName),
          ],
        ));
      } else {
        const candidate = candidates[0]!;
        const claimed = compilerWorld.rendering.rendererForInstructionKind(instruction.instructionKind);
        if (
          claimed == null
          || claimed.productHandle !== candidate.renderer.productHandle
          || candidate.renderer.productHandle == null
          || !claimedRendererProducts.has(candidate.renderer.productHandle)
        ) {
          rendererReasons.push(reason(
            RuntimeRegistrationRequirementReasonKind.RuntimeRendererClaimMismatch,
            `Runtime instruction ABI type '${value.type}', the active Rendering service, and runtime renderer claims do not select the same catalog product.`,
            [
              instruction.productHandle,
              candidate.renderer.productHandle ?? candidate.renderer.targetName,
              claimed?.productHandle ?? '(none)',
            ],
          ));
        }
        const targetName = candidate.renderer.targetName;
        const key = `${compilerWorld.world.productHandle}:${targetName}`;
        const existing = uses.get(key);
        uses.set(key, {
          compilerWorldProductHandle: compilerWorld.world.productHandle,
          targetName,
          staticUseCount: (existing?.staticUseCount ?? 0) + 1,
        });
      }
      if (value.type === TemplateCompilerFrameworkInstructionType.SpreadTransferedBinding) {
        const spreadReason = reason(
          RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
          'Spread transfer invokes TemplateCompiler.compileSpread at runtime.',
          [instruction.productHandle],
        );
        resourceReasons.push(spreadReason);
        rendererReasons.push(spreadReason);
        eventReasons.push(spreadReason);
      }
      if (
        value.type === TemplateCompilerFrameworkInstructionType.HydrateElement
        || value.type === TemplateCompilerFrameworkInstructionType.HydrateAttribute
        || value.type === TemplateCompilerFrameworkInstructionType.HydrateTemplateController
      ) {
        value.props.forEach(visit);
      }
    };
    for (const context of instructions.contexts) {
      context.rows.flat().forEach(visit);
      context.surrogates.forEach(visit);
    }
  }
  return { uses: [...uses.values()], eventModifierUseCount };
}

function exactResourceSelection(
  app: SemanticApp,
  providerAttribution: ProviderAttributionIndex,
  uses: readonly RequirementUse[],
  reasons: RuntimeRegistrationRequirementReason[],
): RuntimeRegistrationRequirementSelection | null {
  const configured = app.emission.appWorld.configuredResources.catalogEmission;
  const resourcesByProduct = new Map(configured.resources.flatMap((emission) =>
    emission.resource.productHandle == null ? [] : [[emission.resource.productHandle, emission] as const]
  ));
  const counts = aggregateUses(uses);
  const leaves: RuntimeRegistrationRequirementLeaf[] = [];
  for (const [productHandle, use] of counts) {
    const emission = resourcesByProduct.get(productHandle) ?? null;
    if (emission == null) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.ResourceReferenceOpen,
        'A selected runtime-html resource is absent from its configured catalog.',
        [productHandle],
      ));
      continue;
    }
    if (builtInResourceExportVisibility(emission.resource) !== BuiltInResourceExportVisibility.Public) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.PackageExportUnavailable,
        `Selected resource '${emission.resource.targetName}' is not exported from its public package entrypoint.`,
        [productHandle, emission.resource.targetName],
      ));
      continue;
    }
    const provider = providerAttribution.uniqueProvider(
      use.worlds,
      use.catalogProductHandle,
      app.emission.appWorld.configuredResources.selections,
    );
    if (provider == null) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.ProviderAttributionAmbiguous,
        `Selected resource '${emission.resource.targetName}' does not have one exact visible catalog provider.`,
        [productHandle, use.catalogProductHandle, ...use.worlds],
      ));
      continue;
    }
    const catalog = configured.catalogs.find((candidate) => candidate.productHandle === use.catalogProductHandle) ?? null;
    const ordinal = catalog?.resources.findIndex((candidate) => candidate.productHandle === productHandle) ?? -1;
    if (ordinal < 0) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.ResourceReferenceOpen,
        `Selected resource '${emission.resource.targetName}' lost catalog order authority.`,
        [productHandle, use.catalogProductHandle],
      ));
      continue;
    }
    leaves.push({
      moduleSpecifier: builtInResourcePackageModuleSpecifier(emission.resource.packageId),
      exportName: emission.resource.targetName,
      productHandle: emission.resource.productHandle,
      identityHandle: emission.resource.identityHandle,
      definitionProductHandle: emission.definition?.productHandle ?? null,
      definitionIdentityHandle: emission.definition?.identityHandle ?? null,
      catalogProductHandle: emission.catalogProductHandle,
      providerAdmissionProductHandle: provider.productHandle,
      providerAdmissionIdentityHandle: provider.identityHandle,
      ordinal,
      staticUseCount: use.staticUseCount,
    });
  }
  return reasons.length === 0
    ? exactSelection(
        RuntimeRegistrationRequirementGroupKind.RuntimeHtmlDefaultResources,
        runtimeHtmlDefaultResourcesGroup,
        leaves.sort((left, right) => left.ordinal - right.ordinal),
      )
    : null;
}

function exactRendererSelection(
  app: SemanticApp,
  providerAttribution: ProviderAttributionIndex,
  uses: readonly RuntimeRendererUse[],
  reasons: RuntimeRegistrationRequirementReason[],
): RuntimeRegistrationRequirementSelection | null {
  const configured = app.emission.appWorld.configuredRenderers.catalogEmission;
  const runtimeHtmlCatalog = configured.catalogs.find((catalog) =>
    catalog.packageId === RuntimeRendererPackage.RuntimeHtml
    && catalog.group === RuntimeRendererGroup.RuntimeHtmlDefaultRenderers
  ) ?? null;
  const runtimeHtmlEmissions = configured.renderers.filter((emission) =>
    emission.renderer.packageId === RuntimeRendererPackage.RuntimeHtml
    && emission.renderer.group === RuntimeRendererGroup.RuntimeHtmlDefaultRenderers
  );
  const useCounts = new Map<string, { count: number; worlds: Set<ProductHandle> }>();
  for (const use of uses) {
    const existing = useCounts.get(use.targetName) ?? { count: 0, worlds: new Set<ProductHandle>() };
    existing.count += use.staticUseCount;
    existing.worlds.add(use.compilerWorldProductHandle);
    useCounts.set(use.targetName, existing);
  }
  const leaves: RuntimeRegistrationRequirementLeaf[] = [];
  for (const [targetName, use] of useCounts) {
    const emission = runtimeHtmlEmissions.find((candidate) => candidate.renderer.targetName === targetName) ?? null;
    if (emission == null || runtimeHtmlCatalog == null) {
      // Plugin renderers are preserved by their plugin configuration and do not become runtime-html leaves.
      const pluginRenderer = configured.renderers.find((candidate) => candidate.renderer.targetName === targetName) ?? null;
      if (pluginRenderer == null) {
        reasons.push(reason(
          RuntimeRegistrationRequirementReasonKind.RuntimeRendererUnavailable,
          `Renderer target '${targetName}' is not present in an admitted renderer catalog.`,
          [targetName, ...use.worlds],
        ));
      }
      continue;
    }
    if (emission.renderer.exportVisibility !== RuntimeRendererExportVisibility.Public) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.PackageExportUnavailable,
        `Selected renderer '${targetName}' is not exported from its public package entrypoint.`,
        [emission.renderer.productHandle ?? targetName, targetName],
      ));
      continue;
    }
    const provider = providerAttribution.uniqueProvider(
      [...use.worlds],
      runtimeHtmlCatalog.productHandle,
      app.emission.appWorld.configuredRenderers.selections,
    );
    if (provider == null) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.ProviderAttributionAmbiguous,
        `Selected renderer '${targetName}' does not have one exact visible catalog provider.`,
        [emission.renderer.productHandle ?? targetName, runtimeHtmlCatalog.productHandle, ...use.worlds],
      ));
      continue;
    }
    const ordinal = runtimeHtmlCatalog.renderers.findIndex((candidate) =>
      candidate.productHandle === emission.renderer.productHandle
    );
    if (ordinal < 0) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.RuntimeRendererUnavailable,
        `Selected renderer '${targetName}' lost catalog order authority.`,
        [emission.renderer.productHandle ?? targetName],
      ));
      continue;
    }
    leaves.push(rendererLeaf(emission, provider, runtimeHtmlCatalog.productHandle, ordinal, use.count));
  }
  return reasons.length === 0
    ? exactSelection(
        RuntimeRegistrationRequirementGroupKind.RuntimeHtmlDefaultRenderers,
        runtimeHtmlDefaultRenderersGroup,
        leaves.sort((left, right) => left.ordinal - right.ordinal),
      )
    : null;
}

function exactEventModifierSelection(
  providerAttribution: ProviderAttributionIndex,
  inputs: readonly RuntimeRegistrationRequirementCompilerInput[],
  useCount: number,
  reasons: RuntimeRegistrationRequirementReason[],
): RuntimeRegistrationRequirementSelection | null {
  if (useCount === 0) {
    return exactSelection(
      RuntimeRegistrationRequirementGroupKind.EventModifierRegistration,
      eventModifierConservativeGroup,
      [],
    );
  }
  const worlds = inputs.flatMap((input) => input.instructions == null
    ? []
    : [input.resource.compilation.compilerWorld.world.productHandle]
  );
  const providers = providerAttribution.uniqueCapabilityProviders(
    worlds,
    FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
  );
  if (providers.length !== 1) {
    reasons.push(reason(
      RuntimeRegistrationRequirementReasonKind.ProviderAttributionAmbiguous,
      'EventModifierRegistration does not have one exact visible DefaultBindingSyntax provider.',
      worlds,
    ));
    return null;
  }
  const provider = providers[0]!;
  return exactSelection(
    RuntimeRegistrationRequirementGroupKind.EventModifierRegistration,
    eventModifierConservativeGroup,
    [{
      moduleSpecifier: '@aurelia/runtime-html',
      exportName: 'EventModifierRegistration',
      productHandle: provider.productHandle,
      identityHandle: provider.identityHandle,
      definitionProductHandle: null,
      definitionIdentityHandle: null,
      catalogProductHandle: null,
      providerAdmissionProductHandle: provider.productHandle,
      providerAdmissionIdentityHandle: provider.identityHandle,
      ordinal: 0,
      staticUseCount: useCount,
    }],
  );
}

function instructionResourceReference(instruction: TemplateInstruction): TemplateVisibleResourceReference | null {
  switch (instruction.instructionKind) {
    case TemplateInstructionKind.HydrateElement:
    case TemplateInstructionKind.HydrateAttribute:
    case TemplateInstructionKind.HydrateTemplateController:
      return instruction.resource;
    default:
      return null;
  }
}

function builtInEmissionForReference(
  reference: TemplateVisibleResourceReference,
  byDefinition: ReadonlyMap<ProductHandle, BuiltInResourceEmission>,
  byResource: ReadonlyMap<ProductHandle, BuiltInResourceEmission>,
): BuiltInResourceEmission | null {
  return reference.definitionProductHandle == null
    ? reference.resourceProductHandle == null ? null : byResource.get(reference.resourceProductHandle) ?? null
    : byDefinition.get(reference.definitionProductHandle) ?? null;
}

function addRequirementUse(
  uses: Map<string, RequirementUse>,
  compilerWorldProductHandle: ProductHandle,
  emission: BuiltInResourceEmission,
  count: number,
): void {
  const productHandle = emission.resource.productHandle;
  if (productHandle == null) return;
  const key = `${compilerWorldProductHandle}:${productHandle}`;
  const previous = uses.get(key);
  uses.set(key, {
    compilerWorldProductHandle,
    catalogProductHandle: emission.catalogProductHandle,
    targetProductHandle: productHandle,
    staticUseCount: (previous?.staticUseCount ?? 0) + count,
  });
}

function aggregateUses(
  uses: readonly RequirementUse[],
): ReadonlyMap<ProductHandle, {
  readonly catalogProductHandle: ProductHandle;
  readonly staticUseCount: number;
  readonly worlds: readonly ProductHandle[];
}> {
  const aggregate = new Map<ProductHandle, {
    catalogProductHandle: ProductHandle;
    staticUseCount: number;
    worlds: ProductHandle[];
  }>();
  for (const use of uses) {
    const existing = aggregate.get(use.targetProductHandle);
    if (existing == null) {
      aggregate.set(use.targetProductHandle, {
        catalogProductHandle: use.catalogProductHandle,
        staticUseCount: use.staticUseCount,
        worlds: [use.compilerWorldProductHandle],
      });
      continue;
    }
    existing.staticUseCount += use.staticUseCount;
    if (!existing.worlds.includes(use.compilerWorldProductHandle)) existing.worlds.push(use.compilerWorldProductHandle);
  }
  return aggregate;
}

interface ConfiguredSelection {
  readonly registrationAdmissionProductHandle: ProductHandle;
  readonly catalogProductHandles: readonly ProductHandle[];
}

class ProviderAttributionIndex {
  private readonly operationsByWorld = new Map<ProductHandle, readonly ContainerRegistrationOperation[]>();
  private readonly providersByCatalogAndWorlds = new Map<string, ProviderIdentity | null>();
  private readonly admissionByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>;

  constructor(
    app: SemanticApp,
    inputs: readonly RuntimeRegistrationRequirementCompilerInput[],
  ) {
    this.admissionByProduct = new Map(app.emission.appWorld.configuration.registrationAdmissions.map((admission) => [
      admission.productHandle,
      admission,
    ]));
    for (const input of inputs) {
      const world = input.resource.compilation.compilerWorld;
      this.operationsByWorld.set(
        world.world.productHandle,
        registrationOperationsVisibleToContainer(
          world.container,
          app.emission.appWorld.diWorld,
          app.emission.appWorld.containerChainFacts,
        ),
      );
    }
  }

  uniqueProvider(
    worldProductHandles: readonly ProductHandle[],
    catalogProductHandle: ProductHandle,
    selections: readonly ConfiguredSelection[],
  ): ProviderIdentity | null {
    const worlds = [...new Set(worldProductHandles)].sort();
    const key = `${catalogProductHandle}\0${worlds.join('\0')}`;
    if (this.providersByCatalogAndWorlds.has(key)) {
      return this.providersByCatalogAndWorlds.get(key) ?? null;
    }
    const providers = new Map<ProductHandle, ProviderIdentity>();
    for (const worldProductHandle of worlds) {
      const visibleAdmissions = new Set(
        this.operations(worldProductHandle).map((operation) => operation.admission.productHandle),
      );
      const candidates = selections.filter((selection) =>
        selection.catalogProductHandles.includes(catalogProductHandle)
        && visibleAdmissions.has(selection.registrationAdmissionProductHandle)
      );
      if (candidates.length !== 1) {
        this.providersByCatalogAndWorlds.set(key, null);
        return null;
      }
      const admission = this.admissionByProduct.get(candidates[0]!.registrationAdmissionProductHandle) ?? null;
      if (admission == null) {
        this.providersByCatalogAndWorlds.set(key, null);
        return null;
      }
      providers.set(admission.productHandle, {
        productHandle: admission.productHandle,
        identityHandle: admission.identityHandle,
      });
    }
    const provider = providers.size === 1 ? [...providers.values()][0]! : null;
    this.providersByCatalogAndWorlds.set(key, provider);
    return provider;
  }

  uniqueCapabilityProviders(
    worldProductHandles: readonly ProductHandle[],
    capability: FrameworkRegistrationCapability,
  ): readonly ProviderIdentity[] {
    const providers = new Map<ProductHandle, ProviderIdentity>();
    for (const worldProductHandle of new Set(worldProductHandles)) {
      const candidates = this.operations(worldProductHandle).filter((operation) => {
        const kind = frameworkRegistrationKindForOperation(operation);
        return kind != null && frameworkRegistrationCapabilitiesForKind(kind).includes(capability);
      });
      if (candidates.length !== 1) return [];
      providers.set(candidates[0]!.admission.productHandle, {
        productHandle: candidates[0]!.admission.productHandle,
        identityHandle: candidates[0]!.admission.identityHandle,
      });
    }
    return [...providers.values()];
  }

  private operations(worldProductHandle: ProductHandle): readonly ContainerRegistrationOperation[] {
    return this.operationsByWorld.get(worldProductHandle) ?? [];
  }
}

function rendererLeaf(
  emission: BuiltInRuntimeRendererEmission,
  provider: ProviderIdentity,
  catalogProductHandle: ProductHandle,
  ordinal: number,
  staticUseCount: number,
): RuntimeRegistrationRequirementLeaf {
  const renderer = emission.renderer;
  return {
    moduleSpecifier: runtimeRendererPackageModuleSpecifier(renderer.packageId),
    exportName: renderer.targetName,
    productHandle: renderer.productHandle,
    identityHandle: renderer.identityHandle,
    definitionProductHandle: null,
    definitionIdentityHandle: null,
    catalogProductHandle,
    providerAdmissionProductHandle: provider.productHandle,
    providerAdmissionIdentityHandle: provider.identityHandle,
    ordinal,
    staticUseCount,
  };
}

function exactSelection(
  groupKind: RuntimeRegistrationRequirementGroupKind,
  conservativeGroup: RuntimeRegistrationRequirementGroupReference,
  leaves: readonly RuntimeRegistrationRequirementLeaf[],
): RuntimeRegistrationRequirementSelection {
  return {
    selectionKind: RuntimeRegistrationRequirementSelectionKind.ExactLeaves,
    groupKind,
    conservativeGroup,
    leaves,
    reasons: [],
  };
}

function conservativeSelection(
  groupKind: RuntimeRegistrationRequirementGroupKind,
  conservativeGroup: RuntimeRegistrationRequirementGroupReference,
  reasons: readonly RuntimeRegistrationRequirementReason[],
): RuntimeRegistrationRequirementSelection {
  return {
    selectionKind: RuntimeRegistrationRequirementSelectionKind.ConservativeGroup,
    groupKind,
    conservativeGroup,
    leaves: [],
    reasons: dedupeReasons(reasons),
  };
}
