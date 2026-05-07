import path from 'node:path';
import type { BootProjectInput, ProjectBootFrame, WorkspaceBootFrame } from '../boot/frames.js';
import { bootWorkspace } from '../boot/boot-workspace.js';
import { answerAdmittedSources, AdmittedSourcesQuery } from '../inquiry/source-files.js';
import { InquiryOutcomeKind } from '../inquiry/answer.js';
import { InquiryPageRequest } from '../inquiry/page.js';
import { KernelStore } from '../kernel/store.js';
import { AureliaAppWorldProjectEmission, AureliaAppWorldProjectPass } from '../configuration/app-world-project-pass.js';
import type { TemplateCompilerWorldEmission } from '../template/compiler-world-materializer.js';
import {
  readSemanticApplicationTopology,
  type SemanticApplicationTopologyResult,
} from './app-topology.js';
import {
  readBindingDataFlowRows,
  readBindingSourceOperationRows,
  readBindingTargetAccessRows,
  readBindingValueChannelRows,
  readTargetOperationRows,
} from './binding-projections.js';
import {
  readRuntimeControllerRows,
} from './controller-projections.js';
import {
  compilerWorldLabel,
  describeAddress,
} from './source-reference.js';
import {
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  type OpenSemanticAppOptions,
  type SemanticAppQuery,
  type SemanticAppSummary,
  type SemanticBindingDataFlowResult,
  type SemanticBindingSourceOperationResult,
  type SemanticBindingTargetAccessResult,
  type SemanticBindingTargetOperationResult,
  type SemanticBindingValueChannelResult,
  type SemanticOpenSeamRow,
  type SemanticOpenSeamsResult,
  type SemanticResourceVisibilityResult,
  type SemanticResourceVisibilityRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeControllerResult,
  type SemanticRuntimeOptions,
  type SemanticRuntimePageInput,
  type SemanticRuntimePageResult,
  type SemanticRuntimeSummary,
  type SemanticSourceFileRow,
  type SemanticSourceFilesResult,
  type SemanticTargetOperationResult,
  type SemanticTemplateCompilationResult,
  type SemanticTemplateCompilationRow,
} from './contracts.js';

/** Create the in-process semantic-runtime API surface. */
export async function createSemanticRuntime(
  options: SemanticRuntimeOptions,
): Promise<SemanticRuntime> {
  return SemanticRuntime.open(options);
}

/** Booted workspace facade. It owns source admission and app-world opening. */
export class SemanticRuntime {
  private readonly appsByProjectKey = new Map<string, SemanticApp>();

  private constructor(
    readonly workspace: WorkspaceBootFrame,
  ) {}

  static async open(options: SemanticRuntimeOptions): Promise<SemanticRuntime> {
    const workspaceRoot = path.resolve(options.workspaceRoot);
    const projects = options.projects?.map((project): BootProjectInput => ({
      ...project,
      rootDir: path.resolve(workspaceRoot, project.rootDir),
    }));
    const workspace = bootWorkspace({
      rootDir: workspaceRoot,
      storeKey: options.storeKey,
      projects,
    });
    return new SemanticRuntime(workspace);
  }

  summary(): SemanticRuntimeAnswer<SemanticRuntimeSummary> {
    const value: SemanticRuntimeSummary = {
      workspaceRoot: this.workspace.rootDir,
      workspaceKey: this.workspace.workspaceKey,
      projects: this.workspace.projects.map((project) => ({
        projectKey: project.projectKey,
        rootDir: project.rootDir,
        sourceFiles: project.sourceFiles.length,
      })),
    };
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Booted ${value.projects.length} semantic-runtime project frame(s).`,
      value,
    );
  }

  async openApp(options: OpenSemanticAppOptions = {}): Promise<SemanticApp> {
    const project = selectProject(this.workspace.projects, options.projectKey ?? null);
    const existing = this.appsByProjectKey.get(project.projectKey);
    if (existing != null) {
      return existing;
    }
    const emission = new AureliaAppWorldProjectPass().constructAndEmit(this.workspace.store, project);
    const app = new SemanticApp(this, project, emission);
    this.appsByProjectKey.set(project.projectKey, app);
    return app;
  }
}

/** Open app facade. It owns one project-level semantic app-world emission and compact query entrypoints. */
export class SemanticApp {
  constructor(
    readonly runtime: SemanticRuntime,
    readonly project: ProjectBootFrame,
    readonly emission: AureliaAppWorldProjectEmission,
  ) {}

  ask(query: SemanticAppQuery): SemanticRuntimeAnswer<unknown> {
    switch (query.kind) {
      case SemanticAppQueryKind.Summary:
        return this.summary();
      case SemanticAppQueryKind.SourceFiles:
        return this.sourceFiles(query.page, query.detail);
      case SemanticAppQueryKind.OpenSeams:
        return this.openSeams(query.page, query.detail);
      case SemanticAppQueryKind.AppTopology:
        return this.appTopology(query.detail);
      case SemanticAppQueryKind.ResourceVisibility:
        return this.resourceVisibility(query.page, query.detail);
      case SemanticAppQueryKind.TemplateCompilations:
        return this.templateCompilations(query.page, query.detail);
      case SemanticAppQueryKind.RuntimeControllers:
        return this.runtimeControllers(query.page, query.detail);
      case SemanticAppQueryKind.BindingTargetAccesses:
        return this.bindingTargetAccesses(query.page, query.detail);
      case SemanticAppQueryKind.TargetOperations:
        return this.targetOperations(query.page, query.detail);
      case SemanticAppQueryKind.BindingTargetOperations:
        return this.targetOperations(query.page, query.detail);
      case SemanticAppQueryKind.BindingSourceOperations:
        return this.bindingSourceOperations(query.page, query.detail);
      case SemanticAppQueryKind.BindingValueChannels:
        return this.bindingValueChannels(query.page, query.detail);
      case SemanticAppQueryKind.BindingDataFlows:
        return this.bindingDataFlows(query.page, query.detail);
      default:
        return answer(
          SemanticRuntimeAnswerOutcome.Unsupported,
          `Semantic app query '${query.kind}' is not supported by the operational API surface.`,
          { query },
        );
    }
  }

  summary(): SemanticRuntimeAnswer<SemanticAppSummary> {
    const value = appSummary(this.project, this.emission, this.runtime.workspace.store);
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Opened semantic app '${value.projectKey}' with ${value.appRoots} app root(s), ${value.compilerWorlds} compiler world(s), and ${value.compiledResources} compiled resource template(s).`,
      value,
    );
  }

  sourceFiles(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticSourceFilesResult> {
    const handles = includeHandles(detail);
    const pageRequest = toPageRequest(page);
    const result = answerAdmittedSources(
      this.runtime.workspace.store,
      new AdmittedSourcesQuery(this.project.projectKey, null, pageRequest),
    );
    const rows = result.value.sources.map((source): SemanticSourceFileRow => ({
      projectKey: source.projectKey,
      path: source.path,
      language: source.language,
      ...(handles ? { handles: { addressHandle: source.addressHandle } } : {}),
    }));
    return answer(
      semanticOutcomeForInquiry(result.outcome),
      result.summary,
      { rows },
      result.page == null ? null : {
        size: result.page.size,
        cursor: result.page.cursor,
        nextCursor: result.page.nextCursor,
        returnedRows: result.page.returned,
        totalRows: result.page.total ?? rows.length,
      },
    );
  }

  openSeams(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticOpenSeamsResult> {
    const handles = includeHandles(detail);
    const rows = this.runtime.workspace.store.readOpenSeams()
      .map((seam): SemanticOpenSeamRow => ({
        seamKindKey: seam.seamKindKey,
        summary: seam.summary,
        source: describeAddress(this.runtime.workspace.store, seam.addressHandle),
        ...(handles ? {
          handles: {
            handle: seam.handle,
            addressHandle: seam.addressHandle,
          },
        } : {}),
      }))
      .sort((left, right) =>
        `${left.seamKindKey}:${left.summary}`.localeCompare(`${right.seamKindKey}:${right.summary}`)
      );
    const paged = pageRows(rows, page, (row) => `${row.seamKindKey}:${row.source?.label ?? ''}:${row.summary}`);
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} open semantic seam(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  appTopology(
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticApplicationTopologyResult> {
    const handles = includeHandles(detail);
    const value = readSemanticApplicationTopology(this.runtime.workspace.store, this.emission, handles);
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Recovered ${value.appRoots.length} app root(s), ${value.components.length} component(s), and ${value.files.length} roleful app file(s).`,
      value,
    );
  }

  resourceVisibility(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticResourceVisibilityResult> {
    const handles = includeHandles(detail);
    const rows = this.emission.appWorld.compilerWorlds
      .flatMap((compilerWorld): readonly SemanticResourceVisibilityRow[] =>
        [
          ...compilerWorld.resourceScope.resources,
          ...compilerWorld.resourceScope.syntaxResources,
        ].map((resource) => ({
          compilerWorld: compilerWorldLabel(this.runtime.workspace.store, compilerWorld),
          resourceKind: resource.resourceKind,
          name: resource.name,
          aliases: resource.aliases,
          visibilityKind: resource.visibilityKind,
          source: describeAddress(this.runtime.workspace.store, resource.sourceAddressHandle),
          ...(handles ? {
            handles: {
              compilerWorldProductHandle: compilerWorld.world.productHandle,
              resourceProductHandle: resource.resourceProductHandle,
              definitionProductHandle: resource.definitionProductHandle,
              sourceAddressHandle: resource.sourceAddressHandle,
            },
          } : {}),
        }))
      )
      .sort((left, right) =>
        `${left.resourceKind}:${left.name}:${left.compilerWorld}`
          .localeCompare(`${right.resourceKind}:${right.name}:${right.compilerWorld}`)
      );
    const paged = pageRows(rows, page, (row) =>
      `${row.compilerWorld}:${row.resourceKind}:${row.name}`
    );
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} compiler-visible resource row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  templateCompilations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTemplateCompilationResult> {
    const handles = includeHandles(detail);
    const rows = this.emission.templates.resources
      .map((resource): SemanticTemplateCompilationRow => ({
        definitionName: resource.compilation.definition.name,
        compilerWorld: compilerWorldLabel(this.runtime.workspace.store, resource.compilation.compilerWorld),
        templateSourceKind: resource.compilation.unit.templateSource.sourceKind,
        htmlNodes: resource.compilation.html.nodes.length,
        htmlAttributes: resource.compilation.html.attributes.length,
        recoveries: resource.compilation.html.recoveries.length,
        attributeSyntaxes: resource.compilation.attributeSyntax.syntaxes.length,
        classifications: resource.compilation.attributeClassification.classifications.length,
        valueSites: resource.compilation.valueSites.sites.length + resource.compilation.bindingCommandLowering.valueSites.length,
        expressionParses: resource.compilation.valueSites.parses.length
          + resource.compilation.bindingCommandLowering.expressionParses.length,
        bindingCommandLowerings: resource.compilation.bindingCommandLowering.lowerings.length
          + resource.compilation.bindingCommandLowering.multiBindingLowerings.length,
        instructions: resource.compilation.compiledTemplate.instructions.length,
        renderTargets: resource.compilation.compiledTemplate.renderTargets.length,
        runtimeControllers: resource.runtimeAnalysis.runtimeRendering.controllers.length,
        runtimeChildContainers: resource.runtimeAnalysis.runtimeRendering.childContainers.length,
        runtimeChildContextResolverSlots: resource.runtimeAnalysis.runtimeRendering.childContextResolverSlots.length,
        runtimeBindings: resource.runtimeAnalysis.runtimeRendering.bindings.length,
        runtimeTargetOperations: resource.runtimeAnalysis.runtimeRendering.targetOperations.length
          + resource.runtimeAnalysis.controllerBind.targetOperations.length,
        runtimeRendererTargetOperations: resource.runtimeAnalysis.runtimeRendering.targetOperations.length,
        runtimeBindingTargetAccesses: resource.runtimeAnalysis.controllerBind.targetAccesses.length,
        runtimeBindingTargetOperations: resource.runtimeAnalysis.controllerBind.targetOperations.length,
        runtimeBindingSourceOperations: resource.runtimeAnalysis.controllerBind.sourceOperations.length,
        runtimeBindingValueChannels: resource.runtimeAnalysis.bindingValueChannel.valueChannels.length,
        runtimeBindingDataFlows: resource.runtimeAnalysis.bindingDataFlow.dataFlows.length,
        bindingScopes: resource.runtimeAnalysis.scopes.readScopes().length,
        openSeams: resource.compilation.compiledTemplate.openSeams.length
          + resource.runtimeAnalysis.runtimeRendering.openSeams.length
          + resource.runtimeAnalysis.controllerBind.openSeams.length
          + resource.runtimeAnalysis.bindingValueChannel.openSeams.length
          + resource.runtimeAnalysis.bindingDataFlow.openSeams.length,
        source: describeAddress(
          this.runtime.workspace.store,
          resource.compilation.definition.template?.addressHandle ?? resource.compilation.definition.sourceAddressHandle,
        ),
        ...(handles ? {
          handles: {
            definitionProductHandle: resource.compilation.definition.productHandle,
            compilerWorldProductHandle: resource.compilation.compilerWorld.world.productHandle,
            sourceAddressHandle: resource.compilation.definition.template?.addressHandle
              ?? resource.compilation.definition.sourceAddressHandle,
          },
        } : {}),
      }))
      .sort((left, right) => left.definitionName.localeCompare(right.definitionName));
    const paged = pageRows(rows, page, (row) =>
      `${row.compilerWorld}:${row.definitionName}`
    );
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} compiled template row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  runtimeControllers(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRuntimeControllerResult> {
    const rows = readRuntimeControllerRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page, (row) =>
      `${row.renderingDefinitionName}:${row.parentControllerName ?? ''}:${row.controllerName ?? ''}:${row.creationKind}:${row.hydrationHandoffKind}`
    );
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} runtime controller hydration row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingTargetAccesses(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingTargetAccessResult> {
    const rows = readBindingTargetAccessRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page, (row) =>
      `${row.definitionName}:${row.targetProperty}:${row.lookup}:${row.strategy}:${row.source?.label ?? ''}`
    );
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} runtime binding target-access row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  targetOperations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTargetOperationResult> {
    const rows = readTargetOperationRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page, (row) =>
      `${row.definitionName}:${row.ownerKind}:${row.targetAttribute}:${row.targetProperty}:${row.operationKind}:${row.source?.label ?? ''}`
    );
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} runtime target-operation row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingTargetOperations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingTargetOperationResult> {
    return this.targetOperations(page, detail);
  }

  bindingSourceOperations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingSourceOperationResult> {
    const rows = readBindingSourceOperationRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page, (row) =>
      `${row.definitionName}:${row.targetName}:${row.operationKind}:${row.source?.label ?? ''}`
    );
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} runtime binding source-operation row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingValueChannels(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingValueChannelResult> {
    const rows = readBindingValueChannelRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page, (row) =>
      `${row.definitionName}:${row.targetProperty ?? ''}:${row.channelKind}:${row.source?.label ?? ''}`
    );
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} runtime binding value-channel row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingDataFlows(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingDataFlowResult> {
    const rows = readBindingDataFlowRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page, (row) =>
      `${row.definitionName}:${row.sourceName ?? ''}:${row.direction}:${row.targetProperty ?? ''}:${row.source?.label ?? ''}`
    );
    return answer(
      paged.rows.length === rows.length ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
      `Returned ${paged.rows.length} of ${rows.length} runtime binding data-flow row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }
}

type TemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];

interface AppSummaryProjectCounts {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
}

interface AppSummaryEvaluationCounts {
  readonly evaluatedSources: number;
  readonly unresolvedModuleEdges: number;
}

interface AppSummaryConfigurationCounts {
  readonly configurationSequences: number;
  readonly configurationSteps: number;
  readonly appRoots: number;
  readonly registrationAdmissions: number;
}

interface AppSummaryDiCounts {
  readonly containers: number;
  readonly runtimeChildContainers: number;
  readonly resolverSlots: number;
  readonly runtimeChildContextResolverSlots: number;
  readonly runtimeControllers: number;
  readonly resourceSlots: number;
  readonly diOpenSeams: number;
}

interface AppSummaryCompilerWorldCounts {
  readonly compilerWorlds: number;
  readonly visibleResources: number;
  readonly visibleSyntaxResources: number;
  readonly runtimeRenderers: number;
}

interface AppSummaryTemplateCounts {
  readonly compiledResources: number;
  readonly compiledInstructions: number;
  readonly runtimeBindings: number;
  readonly runtimeTargetOperations: number;
  readonly runtimeRendererTargetOperations: number;
  readonly runtimeBindingTargetAccesses: number;
  readonly runtimeBindingTargetOperations: number;
  readonly runtimeBindingSourceOperations: number;
  readonly runtimeBindingValueChannels: number;
  readonly runtimeBindingDataFlows: number;
  readonly bindingScopes: number;
}

interface AppSummaryKernelCounts {
  readonly kernelProducts: number;
  readonly kernelClaims: number;
  readonly kernelOpenSeams: number;
}

function appSummary(
  project: ProjectBootFrame,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): SemanticAppSummary {
  const templates = emission.templates.resources;
  return {
    ...projectSummaryCounts(project),
    ...evaluationSummaryCounts(emission),
    resourceDefinitions: emission.resources.readDefinitions().length,
    ...configurationSummaryCounts(emission),
    ...diSummaryCounts(emission, templates),
    ...compilerWorldSummaryCounts(emission.appWorld.compilerWorlds),
    ...templateSummaryCounts(templates),
    ...kernelSummaryCounts(store),
  };
}

function projectSummaryCounts(project: ProjectBootFrame): AppSummaryProjectCounts {
  return {
    projectKey: project.projectKey,
    rootDir: project.rootDir,
    sourceFiles: project.sourceFiles.length,
  };
}

function evaluationSummaryCounts(emission: AureliaAppWorldProjectEmission): AppSummaryEvaluationCounts {
  return {
    evaluatedSources: emission.evaluation.readEvaluatedSources().length,
    unresolvedModuleEdges: emission.evaluation.readUnresolvedModules().length,
  };
}

function configurationSummaryCounts(emission: AureliaAppWorldProjectEmission): AppSummaryConfigurationCounts {
  const configuration = emission.configuration.readConfiguration();
  return {
    configurationSequences: configuration.sequences.length,
    configurationSteps: configuration.steps.length,
    appRoots: configuration.appRoots.length,
    registrationAdmissions: configuration.registrationAdmissions.length,
  };
}

function diSummaryCounts(
  emission: AureliaAppWorldProjectEmission,
  templates: readonly TemplateResourceEmission[],
): AppSummaryDiCounts {
  const diWorld = emission.appWorld.diWorld;
  return {
    containers: diWorld.containers.length,
    runtimeChildContainers: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.runtimeRendering.childContainers.length
    ),
    resolverSlots: diWorld.resolverSlots.length,
    runtimeChildContextResolverSlots: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.runtimeRendering.childContextResolverSlots.length
    ),
    runtimeControllers: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.runtimeRendering.controllers.length
    ),
    resourceSlots: diWorld.resourceSlots.length,
    diOpenSeams: diWorld.openSeams.length,
  };
}

function compilerWorldSummaryCounts(
  compilerWorlds: readonly TemplateCompilerWorldEmission[],
): AppSummaryCompilerWorldCounts {
  return {
    compilerWorlds: compilerWorlds.length,
    visibleResources: sumCompilerWorlds(compilerWorlds, (world) => world.resourceScope.resources.length),
    visibleSyntaxResources: sumCompilerWorlds(compilerWorlds, (world) => world.resourceScope.syntaxResources.length),
    runtimeRenderers: sumCompilerWorlds(compilerWorlds, (world) => world.runtimeRenderers.length),
  };
}

function templateSummaryCounts(templates: readonly TemplateResourceEmission[]): AppSummaryTemplateCounts {
  const runtimeRendererTargetOperations = sumTemplates(templates, (resource) =>
    resource.runtimeAnalysis.runtimeRendering.targetOperations.length
  );
  const runtimeBindingTargetOperations = sumTemplates(templates, (resource) =>
    resource.runtimeAnalysis.controllerBind.targetOperations.length
  );
  return {
    compiledResources: templates.length,
    compiledInstructions: sumTemplates(templates, (resource) =>
      resource.compilation.compiledTemplate.instructions.length
    ),
    runtimeBindings: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.runtimeRendering.bindings.length
    ),
    runtimeTargetOperations: runtimeRendererTargetOperations + runtimeBindingTargetOperations,
    runtimeRendererTargetOperations,
    runtimeBindingTargetAccesses: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.controllerBind.targetAccesses.length
    ),
    runtimeBindingTargetOperations,
    runtimeBindingSourceOperations: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.controllerBind.sourceOperations.length
    ),
    runtimeBindingValueChannels: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.bindingValueChannel.valueChannels.length
    ),
    runtimeBindingDataFlows: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.bindingDataFlow.dataFlows.length
    ),
    bindingScopes: sumTemplates(templates, (resource) => resource.runtimeAnalysis.scopes.readScopes().length),
  };
}

function kernelSummaryCounts(store: KernelStore): AppSummaryKernelCounts {
  return {
    kernelProducts: store.readProducts().length,
    kernelClaims: store.readClaims().length,
    kernelOpenSeams: store.readOpenSeams().length,
  };
}

function sumTemplates(
  templates: readonly TemplateResourceEmission[],
  selectCount: (resource: TemplateResourceEmission) => number,
): number {
  return templates.reduce((total, resource) => total + selectCount(resource), 0);
}

function sumCompilerWorlds(
  compilerWorlds: readonly TemplateCompilerWorldEmission[],
  selectCount: (world: TemplateCompilerWorldEmission) => number,
): number {
  return compilerWorlds.reduce((total, world) => total + selectCount(world), 0);
}

function selectProject(
  projects: readonly ProjectBootFrame[],
  projectKey: string | null,
): ProjectBootFrame {
  if (projectKey == null) {
    const project = projects[0];
    if (project == null) {
      throw new Error('Cannot open semantic app: workspace did not boot any projects.');
    }
    return project;
  }
  const project = projects.find((candidate) => candidate.projectKey === projectKey);
  if (project == null) {
    throw new Error(`Cannot open semantic app: project '${projectKey}' was not booted.`);
  }
  return project;
}

function toPageRequest(page: SemanticRuntimePageInput | undefined): InquiryPageRequest {
  return new InquiryPageRequest(page?.size ?? 50, page?.cursor ?? null);
}

function answer<TValue>(
  outcome: SemanticRuntimeAnswerOutcome | `${SemanticRuntimeAnswerOutcome}`,
  summary: string,
  value: TValue,
  page: SemanticRuntimePageResult | null = null,
): SemanticRuntimeAnswer<TValue> {
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: outcome as SemanticRuntimeAnswerOutcome,
    summary,
    value,
    page,
  };
}

function includeHandles(detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`): boolean {
  return detail === SemanticRuntimeDetail.Handles;
}

function semanticOutcomeForInquiry(
  outcome: InquiryOutcomeKind,
): SemanticRuntimeAnswerOutcome {
  switch (outcome) {
    case InquiryOutcomeKind.Hit:
      return SemanticRuntimeAnswerOutcome.Hit;
    case InquiryOutcomeKind.Miss:
      return SemanticRuntimeAnswerOutcome.Miss;
    case InquiryOutcomeKind.Partial:
    case InquiryOutcomeKind.Open:
    case InquiryOutcomeKind.Ambiguous:
    case InquiryOutcomeKind.Reroute:
      return SemanticRuntimeAnswerOutcome.Partial;
    case InquiryOutcomeKind.Unsupported:
      return SemanticRuntimeAnswerOutcome.Unsupported;
  }
}

function pageRows<TRow>(
  rows: readonly TRow[],
  page: SemanticRuntimePageInput | undefined,
  key: (row: TRow) => string,
): {
  readonly rows: readonly TRow[];
  readonly page: SemanticRuntimePageResult;
} {
  const size = Math.max(0, page?.size ?? 50);
  const cursor = page?.cursor ?? null;
  const start = cursor == null ? 0 : cursorStart(cursor, rows, key);
  const safeStart = start < 0 ? rows.length : start;
  const selected = rows.slice(safeStart, safeStart + size);
  const nextCursor = selected.length > 0 && safeStart + selected.length < rows.length
    ? key(selected[selected.length - 1]!)
    : null;
  return {
    rows: selected,
    page: {
      size,
      cursor,
      nextCursor,
      returnedRows: selected.length,
      totalRows: rows.length,
    },
  };
}

function cursorStart<TRow>(
  cursor: string,
  rows: readonly TRow[],
  key: (row: TRow) => string,
): number {
  if (cursor.startsWith('offset:')) {
    const offset = Number.parseInt(cursor.slice('offset:'.length), 10);
    return Number.isFinite(offset) ? offset + 1 : rows.length;
  }
  const index = rows.findIndex((row) => key(row) === cursor);
  return index < 0 ? rows.length : index + 1;
}
