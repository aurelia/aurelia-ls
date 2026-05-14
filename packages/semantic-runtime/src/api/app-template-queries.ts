import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  readSemanticTemplateCursorInfo,
  readSemanticTemplateCompletions,
  readSemanticTemplateDiagnostics,
  readTemplateDiagnosticRows,
} from './template-completion.js';
import {
  compilerWorldLabel,
  describeAddress,
} from './source-reference.js';
import {
  answer,
  includeHandles,
  outcomeForPagedRows,
  pageRows,
  toPageRequest,
} from './answer-helpers.js';
import {
  SemanticRuntimeDetail,
  type SemanticAppQuery,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticTemplateCompilationResult,
  type SemanticTemplateCompilationRow,
  type SemanticTemplateCompletionResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticRow,
  type SemanticTemplateDiagnosticsResult,
} from './contracts.js';

type TemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];
type TemplateCompilationLane = SemanticTemplateCompilationRow['compilationLane'];

export class SemanticAppTemplateQueries {
  constructor(
    private readonly emission: AureliaAppWorldProjectEmission,
    private readonly store: KernelStore,
    private readonly workspaceRootDir: string,
    private readonly projectRootDir: string,
  ) {}

  templateCompilations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTemplateCompilationResult> {
    const handles = includeHandles(detail);
    const rows = [
      ...templateCompilationRows(this.store, this.emission.templates.resources, 'app-runtime', handles),
      ...templateCompilationRows(this.store, this.emission.templates.authoringResources, 'authoring', handles),
    ]
      .sort((left, right) =>
        left.definitionName.localeCompare(right.definitionName)
        || left.compilationLane.localeCompare(right.compilationLane)
      );
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} compiled template row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  templateCompletions(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateCompletionResult> {
    return readSemanticTemplateCompletions(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.cursor,
      toPageRequest(query.page),
      query.detail ?? SemanticRuntimeDetail.Compact,
    );
  }

  templateCursorInfo(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult> {
    return readSemanticTemplateCursorInfo(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.cursor,
      query.detail ?? SemanticRuntimeDetail.Compact,
    );
  }

  templateDiagnostics(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult> {
    return readSemanticTemplateDiagnostics(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.sourceFile,
      toPageRequest(query.page),
      query.detail ?? SemanticRuntimeDetail.Compact,
    );
  }

  templateDiagnosticRows(
    query: SemanticAppQuery,
  ): readonly SemanticTemplateDiagnosticRow[] {
    return readTemplateDiagnosticRows(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.sourceFile,
      (query.detail ?? SemanticRuntimeDetail.Compact) === SemanticRuntimeDetail.Handles,
    );
  }
}

function templateCompilationRows(
  store: KernelStore,
  resources: readonly TemplateResourceEmission[],
  compilationLane: TemplateCompilationLane,
  handles: boolean,
): readonly SemanticTemplateCompilationRow[] {
  return resources.map((resource): SemanticTemplateCompilationRow => ({
    compilationLane,
    analysisDepth: resource.runtimeAnalysis.analysisDepth,
    definitionName: resource.compilation.definition.name,
    compilerWorld: compilerWorldLabel(store, resource.compilation.compilerWorld),
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
      store,
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
  }));
}
