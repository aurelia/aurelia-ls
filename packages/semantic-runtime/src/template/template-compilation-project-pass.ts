import { performance } from 'node:perf_hooks';

import type { AureliaAppWorldEmission } from '../configuration/app-world-composer.js';
import {
  DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  type SemanticAppAnalysisDepth,
} from '../configuration/app-analysis.js';
import type { RouteConfigContextMaterializationProjectResult } from '../router/route-context-materialization.js';
import type { RouteableComponentReference } from '../router/model.js';
import type { AddressHandle } from '../kernel/handles.js';
import { addressBelongsToSourceFiles, sourceFileAddressHandlesForFileNames } from '../kernel/source-address.js';
import {
  CustomElementDefinition,
  CustomElementTemplateKind,
} from '../resources/custom-element-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { KernelStore } from '../kernel/store.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  AttributeClassificationMaterializer,
  type AttributeClassificationEmission,
  type AttributeClassificationRequest,
} from './attribute-classification-materializer.js';
import {
  AttributeSyntaxMaterializer,
  type AttributeSyntaxParseEmission,
  type AttributeSyntaxParseRequest,
} from './attribute-syntax-materializer.js';
import {
  TemplateCompilerWorldConstructionRequest,
  TemplateCompilerWorldEmission,
  TemplateCompilerWorldMaterializer,
} from './compiler-world-materializer.js';
import {
  TemplateCompilerCompileRequest,
  TemplateCompilerWorldKind,
  type TemplateCompilerCompileHost,
  type TemplateCompilerService,
} from './compiler-world.js';
import {
  TemplateResourceVisibilityKind,
  type TemplateVisibleResource,
} from './compiler-world-reference.js';
import {
  TemplateCompilationUnitConstructionRequest,
  TemplateCompilationUnitMaterializer,
  type TemplateCompilationUnitEmission,
} from './compilation-unit-materializer.js';
import {
  TemplateCompilationUnitKind,
  TemplateSourceKind,
  TemplateSourceOwnerReference,
} from './compilation-unit.js';
import {
  HtmlParseMaterializer,
  type HtmlParseEmission,
  type HtmlParseRequest,
} from './html-parse-materializer.js';
import {
  TemplateValueSiteMaterializer,
  type TemplateValueSiteEmission,
  type TemplateValueSiteRequest,
} from './value-site-materializer.js';
import {
  BindingCommandLoweringMaterializer,
  type BindingCommandLoweringEmission,
  type BindingCommandLoweringRequest,
} from './binding-command-lowering-materializer.js';
import {
  CompiledTemplateMaterializer,
  type CompiledTemplateEmission,
  type CompiledTemplateMaterializationRequest,
} from './compiled-template-materializer.js';
import {
  TemplateRuntimeAnalysisMaterializer,
  TemplateRuntimeAnalysisRequest,
  type TemplateRuntimeAnalysisEmission,
} from './template-runtime-analysis.js';
import {
  TemplateRuntimeAnalysisProjectContext,
  TemplateRuntimeAnalysisResource,
} from './template-runtime-analysis-context.js';
import {
  directDependencyDefinitions,
  mergeVisibleResourceScopes,
  visibleResourceForDefinition,
} from './resource-scope-builder.js';
import { TemplateAuthoringCompilerWorldMaterializer } from './template-authoring-world.js';

/** Front-door template products produced for one compiler-visible custom element definition. */
export class TemplateResourceCompilationEmission {
  constructor(
    /** Store-local key shared by this resource's compiler and runtime phases. */
    readonly localKey: string,
    /** Compiler world that supplied resources, syntax handlers, and runtime-shaped compiler services. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
    /** Custom element definition whose authored template was admitted. */
    readonly definition: CustomElementDefinition,
    /** Compilation-unit emission for the authored template source. */
    readonly unit: TemplateCompilationUnitEmission,
    /** Authored HTML parse emission for the template source. */
    readonly html: HtmlParseEmission,
    /** Runtime-shaped attribute syntax parse over the HTML attributes. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Resource/bindable/binding-command classification over parsed attribute syntax. */
    readonly attributeClassification: AttributeClassificationEmission,
    /** Value sites plus expression parser publications for parser-owned values. */
    readonly valueSites: TemplateValueSiteEmission,
    /** Binding-command build inputs, command-owned parser publications, and instruction products. */
    readonly bindingCommandLowering: BindingCommandLoweringEmission,
    /** Compiled template handoff: render targets, instruction rows, and visible compiler gaps. */
    readonly compiledTemplate: CompiledTemplateEmission,
  ) {}
}

/** Runtime/checker products produced after the project has admitted compiled template front doors. */
export class TemplateResourceRuntimeAnalysisEmission {
  constructor(
    /** Compiler-front-door products for the analyzed resource. */
    readonly compilation: TemplateResourceCompilationEmission,
    /** Runtime/checker analysis downstream of compiled-template row assembly. */
    readonly runtimeAnalysis: TemplateRuntimeAnalysisEmission,
  ) {}
}

export type TemplateCompilationProjectPhaseName =
  | 'component-compiler-world'
  | 'compilation-unit'
  | 'html-parse'
  | 'attribute-syntax'
  | 'attribute-classification'
  | 'value-sites'
  | 'binding-command-lowering'
  | 'compiled-template'
  | 'runtime-analysis';

export interface TemplateCompilationProjectPhaseTiming {
  readonly name: TemplateCompilationProjectPhaseName;
  readonly milliseconds: number;
}

export interface TemplateCompilationProjectProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly TemplateCompilationProjectPhaseTiming[];
}

export interface TemplateCompilationProjectOptions {
  readonly runtimeAnalysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly includeAuthoringTemplates?: boolean;
  readonly authoringTemplateSourceFiles?: readonly string[];
  readonly authoringTemplateLimit?: number | null;
  readonly projectKey?: string;
}

/** Template compilation-front-door result for one app-world composition. */
export class TemplateCompilationProjectEmission {
  get compilerWorlds(): readonly TemplateCompilerWorldEmission[] {
    return uniqueCompilerWorlds([
      ...this.appWorld.compilerWorlds,
      ...this.resources.map((resource) => resource.compilation.compilerWorld),
      ...this.authoringResources.map((resource) => resource.compilation.compilerWorld),
    ]);
  }

  constructor(
    /** App-world composition that supplied compiler worlds. */
    readonly appWorld: AureliaAppWorldEmission,
    /** App/runtime visible template compilation plus runtime/checker analysis emissions. */
    readonly resources: readonly TemplateResourceRuntimeAnalysisEmission[],
    /** Opt-in standalone resource-library template emissions for authoring/LSP inquiries. */
    readonly authoringResources: readonly TemplateResourceRuntimeAnalysisEmission[],
    /** Source files selected for standalone authoring compilation; empty means project-wide selection. */
    readonly authoringTemplateSourceFiles: readonly string[],
    /** Maximum standalone authoring templates requested for this emission; null means unbounded. */
    readonly authoringTemplateLimit: number | null,
    /** Nested timing profile for template front-door and runtime-analysis pressure. */
    readonly profile: TemplateCompilationProjectProfile,
  ) {}
}

/**
 * Runs the current template front door over compiler-visible custom elements.
 *
 * This pass establishes the route from converged resource definitions through compiler-world selection into
 * compilation units, authored HTML, runtime-shaped attribute syntax, attribute classification, compiler-owned
 * value-site selection, binding-command lowering, compiled-template row assembly, runtime Rendering dispatch, and
 * TypeChecker-backed binding-scope projection. Remaining compiler gaps stay visible as open seams at the materializer
 * that exposed them.
 */
export class TemplateCompilationProjectPass {
  private readonly compilerWorldMaterializer: TemplateCompilerWorldMaterializer;
  private readonly unitMaterializer: TemplateCompilationUnitMaterializer;
  private readonly htmlParser: HtmlParseMaterializer;
  private readonly attributeSyntax: AttributeSyntaxMaterializer;
  private readonly attributeClassification: AttributeClassificationMaterializer;
  private readonly valueSites: TemplateValueSiteMaterializer;
  private readonly bindingCommandLowering: BindingCommandLoweringMaterializer;
  private readonly compiledTemplate: CompiledTemplateMaterializer;
  private readonly runtimeAnalysis: TemplateRuntimeAnalysisMaterializer;

  constructor(
    /** Hot analysis store shared by child materializers. */
    readonly store: KernelStore,
  ) {
    this.compilerWorldMaterializer = new TemplateCompilerWorldMaterializer(store);
    this.unitMaterializer = new TemplateCompilationUnitMaterializer(store);
    this.htmlParser = new HtmlParseMaterializer(store);
    this.attributeSyntax = new AttributeSyntaxMaterializer(store);
    this.attributeClassification = new AttributeClassificationMaterializer(store);
    this.valueSites = new TemplateValueSiteMaterializer(store);
    this.bindingCommandLowering = new BindingCommandLoweringMaterializer(store);
    this.compiledTemplate = new CompiledTemplateMaterializer(store);
    this.runtimeAnalysis = new TemplateRuntimeAnalysisMaterializer(store);
  }

  compile(
    appWorld: AureliaAppWorldEmission,
    typeSystem: TypeSystemProject | null = null,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
    routeContexts: RouteConfigContextMaterializationProjectResult | null = null,
    options: TemplateCompilationProjectOptions = {},
  ): TemplateCompilationProjectEmission {
    const started = performance.now();
    const phases: TemplateCompilationProjectPhaseTiming[] = [];
    const runtimeAnalysisDepth = options.runtimeAnalysisDepth ?? DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH;
    const authoringTemplateLimit = normalizedAuthoringTemplateLimit(options.authoringTemplateLimit);
    const authoringTemplateSourceFiles = normalizedAuthoringTemplateSourceFiles(options.authoringTemplateSourceFiles);
    const appCompilations = this.compileAppWorldResources(
      appWorld,
      typeSystem,
      resourceDefinitions,
      routeContexts,
      phases,
    );
    const authoringCompilations = options.includeAuthoringTemplates === true
      ? this.compileAuthoringResources(
        options.projectKey ?? 'project',
        resourceDefinitions,
        typeSystem,
        appCompilations,
        authoringTemplateSourceFiles,
        authoringTemplateLimit,
        phases,
      )
      : [];
    const projectContext = templateRuntimeAnalysisProjectContext([
      ...appCompilations,
      ...authoringCompilations,
    ]);
    const resources = this.analyzeCompiledResources(appCompilations, projectContext, typeSystem, runtimeAnalysisDepth, phases);
    const authoringResources = this.analyzeCompiledResources(authoringCompilations, projectContext, typeSystem, runtimeAnalysisDepth, phases);

    const profile: TemplateCompilationProjectProfile = {
      totalMilliseconds: performance.now() - started,
      phases,
    };

    return new TemplateCompilationProjectEmission(
      appWorld,
      resources,
      authoringResources,
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
      profile,
    );
  }

  private compileAppWorldResources(
    appWorld: AureliaAppWorldEmission,
    typeSystem: TypeSystemProject | null,
    resourceDefinitions: ResourceDefinitionIndex | null,
    routeContexts: RouteConfigContextMaterializationProjectResult | null,
    phases: TemplateCompilationProjectPhaseTiming[],
  ): readonly TemplateResourceCompilationEmission[] {
    const appCompilations: TemplateResourceCompilationEmission[] = [];

    appWorld.compilerWorlds.forEach((compilerWorld, worldIndex) => {
      const tasks = [
        ...initialCompilationTasks(compilerWorld),
        ...routeableCompilationTasks(compilerWorld, routeContexts, resourceDefinitions),
      ];
      const seen = new Set<string>();

      for (let resourceIndex = 0; resourceIndex < tasks.length; resourceIndex += 1) {
        const task = tasks[resourceIndex]!;
        const definition = task.visibleResource.definition;
        if (!(definition instanceof CustomElementDefinition)) {
          continue;
        }
        const compilationKey = templateResourceCompilationKey(definition);
        if (seen.has(compilationKey)) {
          continue;
        }
        seen.add(compilationKey);

        const localKey = templateResourceCompilationLocalKey(worldIndex, resourceIndex, definition);
        const compilationWorld = measureTemplateCompilationPhase(
          phases,
          'component-compiler-world',
          () => this.compilerWorldForDefinition(
            task.compilerWorld,
            definition,
            localKey,
            resourceDefinitions,
          ),
        );
        const result = compilationWorld.templateCompiler.compile(
          new TemplateCompilerCompileRequest(localKey, definition),
          new ProjectTemplateCompilerHost(this, compilationWorld, typeSystem, phases),
        );
        if (result.output != null) {
          appCompilations.push(result.output);
        }

        for (const dependency of directDependencyDefinitions(definition, resourceDefinitions)) {
          const visibleResource = visibleResourceForDefinition(
            dependency,
            TemplateResourceVisibilityKind.Local,
            dependency.sourceAddressHandle ?? definition.sourceAddressHandle,
          );
          if (visibleResource == null) {
            continue;
          }
          tasks.push(new TemplateCompilationTask(compilationWorld, visibleResource));
        }
      }
    });
    return appCompilations;
  }

  private compileAuthoringResources(
    projectKey: string,
    resourceDefinitions: ResourceDefinitionIndex | null,
    typeSystem: TypeSystemProject | null,
    appCompilations: readonly TemplateResourceCompilationEmission[],
    authoringTemplateSourceFiles: readonly string[],
    authoringTemplateLimit: number | null,
    phases: TemplateCompilationProjectPhaseTiming[],
  ): readonly TemplateResourceCompilationEmission[] {
    if (resourceDefinitions == null || authoringTemplateLimit === 0) {
      return [];
    }
    const definitions = resourceDefinitions.entries.map((entry) => entry.definition);
    const selectedDefinitions = selectAuthoringTemplateDefinitions(
      this.store,
      definitions,
      appCompilations,
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
    );
    if (selectedDefinitions.length === 0) {
      return [];
    }
    const compilerWorld = measureTemplateCompilationPhase(
      phases,
      'component-compiler-world',
      () => new TemplateAuthoringCompilerWorldMaterializer(this.store).construct({
        projectKey,
        resourceDefinitions: definitions,
      }),
    );
    if (compilerWorld == null) {
      return [];
    }
    const compilations: TemplateResourceCompilationEmission[] = [];
    let resourceIndex = 0;
    for (const definition of selectedDefinitions) {
      const localKey = templateResourceAuthoringCompilationLocalKey(resourceIndex, definition);
      const result = compilerWorld.templateCompiler.compile(
        new TemplateCompilerCompileRequest(localKey, definition),
        new ProjectTemplateCompilerHost(this, compilerWorld, typeSystem, phases),
      );
      if (result.output != null) {
        compilations.push(result.output);
      }
      resourceIndex++;
    }
    return compilations;
  }

  private analyzeCompiledResources(
    compilations: readonly TemplateResourceCompilationEmission[],
    projectContext: TemplateRuntimeAnalysisProjectContext,
    typeSystem: TypeSystemProject | null,
    runtimeAnalysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`,
    phases: TemplateCompilationProjectPhaseTiming[],
  ): readonly TemplateResourceRuntimeAnalysisEmission[] {
    return compilations.map((compilation) =>
      new TemplateResourceRuntimeAnalysisEmission(
        compilation,
        measureTemplateCompilationPhase(
          phases,
          'runtime-analysis',
          () => this.analyzeResource(compilation, projectContext, typeSystem, runtimeAnalysisDepth),
        ),
      )
    );
  }

  private compilerWorldForDefinition(
    parentCompilerWorld: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    localKey: string,
    resourceDefinitions: ResourceDefinitionIndex | null,
  ): TemplateCompilerWorldEmission {
    const localDependencies = directDependencyDefinitions(definition, resourceDefinitions)
      .map((dependency) =>
        visibleResourceForDefinition(
          dependency,
          TemplateResourceVisibilityKind.Local,
          dependency.sourceAddressHandle ?? definition.sourceAddressHandle,
        )
      )
      .filter((resource): resource is TemplateVisibleResource => resource != null);

    if (localDependencies.length === 0) {
      return parentCompilerWorld;
    }

    const resources = mergeVisibleResourceScopes(
      localDependencies,
      parentCompilerWorld.resourceScope.resources,
    );
    if (sameResourceScope(resources, parentCompilerWorld.resourceScope.resources)) {
      return parentCompilerWorld;
    }

    return this.compilerWorldMaterializer.construct(new TemplateCompilerWorldConstructionRequest(
      `${localKey}:component-world`,
      TemplateCompilerWorldKind.Component,
      parentCompilerWorld.container,
      null,
      resources,
      parentCompilerWorld.attributePatterns,
      parentCompilerWorld.bindingCommands,
      parentCompilerWorld.runtimeRenderers,
      TemplateResourceVisibilityKind.Configured,
      definition.sourceAddressHandle,
    ));
  }

  compileResource(
    compilerWorld: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    localKey: string,
    typeSystem: TypeSystemProject | null,
    phases: TemplateCompilationProjectPhaseTiming[] | null = null,
  ): TemplateResourceCompilationEmission | null {
    const sourceKind = templateSourceKind(definition);
    if (sourceKind == null) {
      return null;
    }

    const unit = this.constructCompilationUnit(localKey, compilerWorld, definition, sourceKind, phases);
    const html = this.parseHtml(localKey, unit, phases);
    const attributeSyntax = this.parseAttributeSyntax(localKey, compilerWorld, unit, html, phases);
    const attributeClassification = this.classifyAttributes(localKey, compilerWorld, unit, html, attributeSyntax, phases);
    const valueSites = this.materializeValueSites(localKey, compilerWorld, unit, html, attributeSyntax, attributeClassification, phases);
    const bindingCommandLowering = this.lowerBindingCommands(
      localKey,
      compilerWorld,
      unit,
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      phases,
    );
    const compiledTemplate = this.materializeCompiledTemplate(
      localKey,
      compilerWorld,
      unit,
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      bindingCommandLowering,
      phases,
    );
    return new TemplateResourceCompilationEmission(
      localKey,
      compilerWorld,
      definition,
      unit,
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      bindingCommandLowering,
      compiledTemplate,
    );
  }

  private constructCompilationUnit(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    sourceKind: TemplateSourceKind,
    phases: TemplateCompilationProjectPhaseTiming[] | null,
  ): TemplateCompilationUnitEmission {
    const sourceAddressHandle = definition.template?.addressHandle ?? definition.sourceAddressHandle;
    return measureTemplateCompilationPhase(phases, 'compilation-unit', () =>
      this.unitMaterializer.construct(new TemplateCompilationUnitConstructionRequest(
        localKey,
        TemplateCompilationUnitKind.CustomElement,
        compilerWorld,
        this.templateSourceOwner(definition),
        sourceKind,
        definition.template?.markup ?? null,
        sourceAddressHandle,
        definition.template?.sourceMap ?? null,
      ))
    );
  }

  private templateSourceOwner(definition: CustomElementDefinition): TemplateSourceOwnerReference {
    return new TemplateSourceOwnerReference(
      definition.productHandle,
      definition.identityHandle,
      ResourceDefinitionKind.CustomElement,
      definition.name,
      definition.sourceAddressHandle,
    );
  }

  private parseHtml(
    localKey: string,
    unit: TemplateCompilationUnitEmission,
    phases: TemplateCompilationProjectPhaseTiming[] | null,
  ): HtmlParseEmission {
    return measureTemplateCompilationPhase(phases, 'html-parse', () =>
      this.htmlParser.parse({
        localKey,
        templateSource: unit.templateSource,
        compilationUnit: unit.compilationUnit,
        parseContext: unit.parseContext,
      } satisfies HtmlParseRequest)
    );
  }

  private parseAttributeSyntax(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    phases: TemplateCompilationProjectPhaseTiming[] | null,
  ): AttributeSyntaxParseEmission {
    return measureTemplateCompilationPhase(phases, 'attribute-syntax', () =>
      this.attributeSyntax.parse({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        compilerWorld,
      } satisfies AttributeSyntaxParseRequest)
    );
  }

  private classifyAttributes(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    attributeSyntax: AttributeSyntaxParseEmission,
    phases: TemplateCompilationProjectPhaseTiming[] | null,
  ): AttributeClassificationEmission {
    return measureTemplateCompilationPhase(phases, 'attribute-classification', () =>
      this.attributeClassification.classify({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        attributeSyntax,
        compilerWorld,
      } satisfies AttributeClassificationRequest)
    );
  }

  private materializeValueSites(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    attributeSyntax: AttributeSyntaxParseEmission,
    attributeClassification: AttributeClassificationEmission,
    phases: TemplateCompilationProjectPhaseTiming[] | null,
  ): TemplateValueSiteEmission {
    return measureTemplateCompilationPhase(phases, 'value-sites', () =>
      this.valueSites.materialize({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        attributeSyntax,
        attributeClassification,
        compilerWorld,
      } satisfies TemplateValueSiteRequest)
    );
  }

  private lowerBindingCommands(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    attributeSyntax: AttributeSyntaxParseEmission,
    attributeClassification: AttributeClassificationEmission,
    valueSites: TemplateValueSiteEmission,
    phases: TemplateCompilationProjectPhaseTiming[] | null,
  ): BindingCommandLoweringEmission {
    return measureTemplateCompilationPhase(phases, 'binding-command-lowering', () =>
      this.bindingCommandLowering.lower({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        attributeSyntax,
        attributeClassification,
        valueSites,
        compilerWorld,
      } satisfies BindingCommandLoweringRequest)
    );
  }

  private materializeCompiledTemplate(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    attributeSyntax: AttributeSyntaxParseEmission,
    attributeClassification: AttributeClassificationEmission,
    valueSites: TemplateValueSiteEmission,
    bindingCommandLowering: BindingCommandLoweringEmission,
    phases: TemplateCompilationProjectPhaseTiming[] | null,
  ): CompiledTemplateEmission {
    return measureTemplateCompilationPhase(phases, 'compiled-template', () =>
      this.compiledTemplate.materialize({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        attributeSyntax,
        attributeClassification,
        valueSites,
        bindingCommandLowering,
        compilerWorld,
      } satisfies CompiledTemplateMaterializationRequest)
    );
  }

  analyzeResource(
    compilation: TemplateResourceCompilationEmission,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    typeSystem: TypeSystemProject | null,
    analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` = DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  ): TemplateRuntimeAnalysisEmission {
    return this.runtimeAnalysis.materialize(new TemplateRuntimeAnalysisRequest(
      compilation.localKey,
      compilation.definition,
      compilation.compiledTemplate,
      compilation.attributeSyntax,
      compilation.compilerWorld,
      projectContext,
      typeSystem,
      analysisDepth,
    ));
  }
}

class ProjectTemplateCompilerHost implements TemplateCompilerCompileHost<TemplateResourceCompilationEmission | null> {
  constructor(
    private readonly pass: TemplateCompilationProjectPass,
    private readonly compilerWorld: TemplateCompilerWorldEmission,
    private readonly typeSystem: TypeSystemProject | null,
    private readonly phases: TemplateCompilationProjectPhaseTiming[] | null,
  ) {}

  compile(
    request: TemplateCompilerCompileRequest,
    _compiler: TemplateCompilerService,
  ): TemplateResourceCompilationEmission | null {
    return this.pass.compileResource(
      this.compilerWorld,
      request.definition,
      request.localKey,
      this.typeSystem,
      this.phases,
    );
  }
}

class TemplateCompilationTask {
  constructor(
    readonly compilerWorld: TemplateCompilerWorldEmission,
    readonly visibleResource: TemplateVisibleResource,
  ) {}
}

function initialCompilationTasks(
  compilerWorld: TemplateCompilerWorldEmission,
): TemplateCompilationTask[] {
  return compilerWorld.resourceScope.resources.map((visibleResource) =>
    new TemplateCompilationTask(compilerWorld, visibleResource)
  );
}

function routeableCompilationTasks(
  compilerWorld: TemplateCompilerWorldEmission,
  routeContexts: RouteConfigContextMaterializationProjectResult | null,
  resourceDefinitions: ResourceDefinitionIndex | null,
): TemplateCompilationTask[] {
  if (routeContexts == null || resourceDefinitions == null) {
    return [];
  }
  const tasks: TemplateCompilationTask[] = [];
  const seen = new Set<string>();
  for (const routeConfig of routeContexts.readRouteConfigs()) {
    for (const routeable of [routeConfig.component, routeConfig.fallback]) {
      const visibleResource = visibleRouteableResource(routeable, resourceDefinitions);
      const productHandle = visibleResource?.resourceProductHandle ?? null;
      if (visibleResource == null || productHandle == null || seen.has(productHandle)) {
        continue;
      }
      seen.add(productHandle);
      tasks.push(new TemplateCompilationTask(compilerWorld, visibleResource));
    }
  }
  return tasks;
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

function sameResourceScope(
  left: readonly TemplateVisibleResource[],
  right: readonly TemplateVisibleResource[],
): boolean {
  return left.length === right.length
    && left.every((resource, index) =>
      resource.resourceProductHandle === right[index]?.resourceProductHandle
      && resource.definitionProductHandle === right[index]?.definitionProductHandle
      && resource.resourceKind === right[index]?.resourceKind
      && resource.name === right[index]?.name
    );
}

function uniqueCompilerWorlds(
  compilerWorlds: readonly TemplateCompilerWorldEmission[],
): readonly TemplateCompilerWorldEmission[] {
  const seen = new Set<string>();
  const result: TemplateCompilerWorldEmission[] = [];
  for (const compilerWorld of compilerWorlds) {
    if (seen.has(compilerWorld.world.productHandle)) {
      continue;
    }
    seen.add(compilerWorld.world.productHandle);
    result.push(compilerWorld);
  }
  return result;
}

function templateSourceKind(definition: CustomElementDefinition): TemplateSourceKind | null {
  const template = definition.template;
  if (template == null) {
    return null;
  }

  switch (template.kind) {
    case CustomElementTemplateKind.Markup:
      return TemplateSourceKind.Markup;
    case CustomElementTemplateKind.DomNode:
      return TemplateSourceKind.DomNode;
    case CustomElementTemplateKind.Open:
      return TemplateSourceKind.Open;
    case CustomElementTemplateKind.None:
      return null;
  }
}

function templateResourceCompilationKey(
  definition: CustomElementDefinition,
): string {
  return definition.productHandle ?? `${definition.key}:${definition.name}`;
}

function selectAuthoringTemplateDefinitions(
  store: KernelStore,
  definitions: readonly FullResourceDefinition[],
  appCompilations: readonly TemplateResourceCompilationEmission[],
  authoringTemplateSourceFiles: readonly string[],
  authoringTemplateLimit: number | null,
): readonly CustomElementDefinition[] {
  const sourceFileHandles = authoringTemplateSourceFiles.length === 0
    ? null
    : sourceFileAddressHandlesForFileNames(store, authoringTemplateSourceFiles);
  const seen = new Set(appCompilations.map((compilation) => templateResourceCompilationKey(compilation.definition)));
  const selected: CustomElementDefinition[] = [];
  for (const definition of definitions) {
    if (authoringTemplateLimit != null && selected.length >= authoringTemplateLimit) {
      break;
    }
    if (!(definition instanceof CustomElementDefinition)) {
      continue;
    }
    if (sourceFileHandles != null && !definitionBelongsToAuthoringSourceFile(store, definition, sourceFileHandles)) {
      continue;
    }
    const compilationKey = templateResourceCompilationKey(definition);
    if (seen.has(compilationKey)) {
      continue;
    }
    seen.add(compilationKey);
    selected.push(definition);
  }
  return selected;
}

function definitionBelongsToAuthoringSourceFile(
  store: KernelStore,
  definition: CustomElementDefinition,
  sourceFileHandles: ReadonlySet<AddressHandle>,
): boolean {
  const sourceAddresses = [
    definition.template?.addressHandle ?? null,
    definition.sourceAddressHandle,
    definition.target.addressHandle,
  ];
  return sourceAddresses.some((handle) =>
    handle != null && addressBelongsToSourceFiles(store, handle, sourceFileHandles)
  );
}

function templateRuntimeAnalysisProjectContext(
  compilations: readonly TemplateResourceCompilationEmission[],
): TemplateRuntimeAnalysisProjectContext {
  return new TemplateRuntimeAnalysisProjectContext(compilations.flatMap((compilation) =>
    compilation.definition.productHandle == null
      ? []
      : [new TemplateRuntimeAnalysisResource(
        compilation.definition.productHandle,
        compilation.compiledTemplate.compiledTemplate.productHandle,
      )]
  ));
}

function templateResourceCompilationLocalKey(
  worldIndex: number,
  resourceIndex: number,
  definition: CustomElementDefinition,
): string {
  return [
    'component-template',
    String(worldIndex),
    String(resourceIndex),
    definition.productHandle ?? definition.key,
  ].join(':');
}

function templateResourceAuthoringCompilationLocalKey(
  resourceIndex: number,
  definition: CustomElementDefinition,
): string {
  return [
    'authoring-template',
    String(resourceIndex),
    definition.productHandle ?? definition.key,
  ].join(':');
}

function normalizedAuthoringTemplateLimit(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function normalizedAuthoringTemplateSourceFiles(
  value: readonly string[] | null | undefined,
): readonly string[] {
  if (value == null) {
    return [];
  }
  return [...new Set(value
    .map((fileName) => fileName.trim().replace(/\\/g, '/'))
    .filter((fileName) => fileName.length > 0))]
    .sort();
}

function measureTemplateCompilationPhase<TValue>(
  phases: TemplateCompilationProjectPhaseTiming[] | null,
  name: TemplateCompilationProjectPhaseName,
  read: () => TValue,
): TValue {
  const started = performance.now();
  const value = read();
  phases?.push({
    name,
    milliseconds: performance.now() - started,
  });
  return value;
}
