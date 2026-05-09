import path from 'node:path';
import type ts from 'typescript';
import type { BootProjectInput, ProjectBootFrame, WorkspaceBootFrame } from '../boot/frames.js';
import { bootWorkspace } from '../boot/boot-workspace.js';
import {
  readSemanticProjectShape,
  SemanticProjectShapeKind,
  type SemanticProjectShape,
} from '../boot/project-shape.js';
import { SourceFileRole } from '../kernel/address.js';
import { answerAdmittedSources, AdmittedSourcesQuery } from '../inquiry/source-files.js';
import { InquiryOutcomeKind } from '../inquiry/answer.js';
import { InquiryPageRequest } from '../inquiry/page.js';
import { KernelStore } from '../kernel/store.js';
import { AureliaAppWorldProjectEmission, AureliaAppWorldProjectPass } from '../configuration/app-world-project-pass.js';
import {
  SemanticAppAnalysisDepth,
  normalizeSemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
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
  readAppOpenSeams,
} from './open-seam-projections.js';
import {
  readResourceDefinitionRows,
} from './resource-projections.js';
import {
  readRouterOptionsRows,
  readComponentAgentRows,
  readRouteConfigRows,
  readRouteContextRows,
  readRouteEndpointRows,
  readRouteNodeRows,
  readRoutePatternRows,
  readRecognizedRouteRows,
  readRouteRecognizerStateRows,
  readRouteTreeRows,
  readRouterViewportRows,
  readTypedNavigationInstructionRows,
  readViewportAgentRows,
  readViewportInstructionRows,
  readViewportInstructionTreeRows,
} from './route-projections.js';
import {
  compilerWorldLabel,
  describeAddress,
  type SemanticSourceReference,
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
  type SemanticComponentAgentsResult,
  type SemanticOpenSeamRow,
  type SemanticOpenSeamsResult,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceVisibilityResult,
  type SemanticResourceVisibilityRow,
  type SemanticRecognizedRoutesResult,
  type SemanticRouterOptionsResult,
  type SemanticRouteConfigsResult,
  type SemanticRouteContextsResult,
  type SemanticRouteEndpointsResult,
  type SemanticRouteNodesResult,
  type SemanticRoutePatternsResult,
  type SemanticRouteRecognizerStatesResult,
  type SemanticRouteTreesResult,
  type SemanticRouterViewportsResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeControllerResult,
  type SemanticRuntimeOptions,
  type SemanticRuntimePageInput,
  type SemanticRuntimePageResult,
  type SemanticRuntimeSummary,
  type SemanticSourceRoleCount,
  type SemanticSourceFileRow,
  type SemanticSourceFilesResult,
  type SemanticTypedNavigationInstructionsResult,
  type SemanticUnresolvedModuleRow,
  type SemanticUnresolvedModulesResult,
  type SemanticViewportAgentsResult,
  type SemanticViewportInstructionsResult,
  type SemanticViewportInstructionTreesResult,
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
  private readonly appsByCacheKey = new Map<string, SemanticApp>();
  private readonly projectShapesByProjectKey = new Map<string, SemanticProjectShape>();

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
      projectDiscovery: options.projectDiscovery,
    });
    return new SemanticRuntime(workspace);
  }

  summary(): SemanticRuntimeAnswer<SemanticRuntimeSummary> {
    const value: SemanticRuntimeSummary = {
      workspaceRoot: this.workspace.rootDir,
      workspaceKey: this.workspace.workspaceKey,
      projects: this.workspace.projects.map((project) => {
        const shape = this.readProjectShape(project);
        return {
          projectKey: project.projectKey,
          rootDir: project.rootDir,
          sourceFiles: project.sourceFiles.length,
          sourceRoles: sourceRoleCounts(project),
          hasLikelyEntrypointSource: hasLikelyEntrypointSource(project),
          shapeKind: shape.shapeKind,
          aureliaDependencyScopes: shape.aureliaDependencyScopes,
          aureliaSourceSignals: shape.aureliaSourceSignals,
        };
      }),
    };
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Booted ${value.projects.length} semantic-runtime project frame(s).`,
      value,
    );
  }

  async openApp(options: OpenSemanticAppOptions = {}): Promise<SemanticApp> {
    const analysisDepth = normalizeSemanticAppAnalysisDepth(options.analysisDepth);
    if (options.projectKey == null) {
      return this.openDefaultApp(analysisDepth);
    }
    return this.openProjectApp(selectProject(this.workspace.projects, options.projectKey), analysisDepth);
  }

  private openDefaultApp(analysisDepth: SemanticAppAnalysisDepth): SemanticApp {
    return this.openProjectApp(this.selectDefaultProject(), analysisDepth);
  }

  private openProjectApp(
    project: ProjectBootFrame,
    analysisDepth: SemanticAppAnalysisDepth,
  ): SemanticApp {
    const existing = this.readCachedApp(project.projectKey, analysisDepth);
    if (existing != null) {
      return existing;
    }
    const emission = new AureliaAppWorldProjectPass().constructAndEmit(this.workspace.store, project, { analysisDepth });
    const app = new SemanticApp(this, project, emission);
    this.appsByCacheKey.set(appCacheKey(project.projectKey, analysisDepth), app);
    return app;
  }

  private readCachedApp(
    projectKey: string,
    requestedDepth: SemanticAppAnalysisDepth,
  ): SemanticApp | null {
    const exact = this.appsByCacheKey.get(appCacheKey(projectKey, requestedDepth));
    if (exact != null) {
      return exact;
    }
    for (const app of this.appsByCacheKey.values()) {
      if (
        app.project.projectKey === projectKey
        && semanticAppAnalysisDepthSatisfies(app.emission.analysisDepth, requestedDepth)
      ) {
        return app;
      }
    }
    return null;
  }

  private readProjectShape(project: ProjectBootFrame): SemanticProjectShape {
    const existing = this.projectShapesByProjectKey.get(project.projectKey);
    if (existing != null) {
      return existing;
    }
    const shape = readSemanticProjectShape(project);
    this.projectShapesByProjectKey.set(project.projectKey, shape);
    return shape;
  }

  private selectDefaultProject(): ProjectBootFrame {
    const aureliaAppProject = this.workspace.projects.find((project) =>
      this.readProjectShape(project).shapeKind === SemanticProjectShapeKind.AureliaApp
    );
    if (aureliaAppProject != null) {
      return aureliaAppProject;
    }
    const entrypointProject = this.workspace.projects.find(hasLikelyEntrypointSource);
    if (entrypointProject != null) {
      return entrypointProject;
    }
    const appSourceProject = this.workspace.projects.find((project) =>
      project.sourceFiles.some((source) => source.role === SourceFileRole.AppSource)
    );
    if (appSourceProject != null) {
      return appSourceProject;
    }
    const project = this.workspace.projects[0];
    if (project == null) {
      throw new Error('Cannot open semantic app: workspace did not boot any projects.');
    }
    return project;
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
      case SemanticAppQueryKind.UnresolvedModules:
        return this.unresolvedModules(query.page);
      case SemanticAppQueryKind.OpenSeams:
        return this.openSeams(query.page, query.detail);
      case SemanticAppQueryKind.AppTopology:
        return this.appTopology(query.detail);
      case SemanticAppQueryKind.RouterOptions:
        return this.routerOptions(query.page, query.detail);
      case SemanticAppQueryKind.Routes:
        return this.routes(query.page, query.detail);
      case SemanticAppQueryKind.RouteContexts:
        return this.routeContexts(query.page, query.detail);
      case SemanticAppQueryKind.RoutePatterns:
        return this.routePatterns(query.page, query.detail);
      case SemanticAppQueryKind.RouteEndpoints:
        return this.routeEndpoints(query.page, query.detail);
      case SemanticAppQueryKind.RouteRecognizerStates:
        return this.routeRecognizerStates(query.page, query.detail);
      case SemanticAppQueryKind.RecognizedRoutes:
        return this.recognizedRoutes(query.page, query.detail);
      case SemanticAppQueryKind.TypedNavigationInstructions:
        return this.typedNavigationInstructions(query.page, query.detail);
      case SemanticAppQueryKind.ViewportInstructions:
        return this.viewportInstructions(query.page, query.detail);
      case SemanticAppQueryKind.ViewportInstructionTrees:
        return this.viewportInstructionTrees(query.page, query.detail);
      case SemanticAppQueryKind.RouteTrees:
        return this.routeTrees(query.page, query.detail);
      case SemanticAppQueryKind.RouteNodes:
        return this.routeNodes(query.page, query.detail);
      case SemanticAppQueryKind.RouterViewports:
        return this.routerViewports(query.page, query.detail);
      case SemanticAppQueryKind.ViewportAgents:
        return this.viewportAgents(query.page, query.detail);
      case SemanticAppQueryKind.ComponentAgents:
        return this.componentAgents(query.page, query.detail);
      case SemanticAppQueryKind.ResourceDefinitions:
        return this.resourceDefinitions(query.page, query.detail);
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
      `Opened semantic app '${value.projectKey}' with ${value.appRoots} app root(s), ${value.routeConfigs} route config(s), ${value.routePatterns} route pattern(s), ${value.routeEndpoints} route endpoint(s), ${value.compilerWorlds} compiler world(s), and ${value.compiledResources} compiled resource template(s).`,
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
      role: source.role,
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

  unresolvedModules(
    page?: SemanticRuntimePageInput,
  ): SemanticRuntimeAnswer<SemanticUnresolvedModulesResult> {
    const rows = this.emission.evaluation.readUnresolvedModules()
      .map((edge): SemanticUnresolvedModuleRow => ({
        fromModuleKey: edge.fromModuleKey,
        moduleSpecifier: edge.moduleSpecifier,
        source: sourceReferenceForNode(edge.node),
      }))
      .sort((left, right) =>
        `${left.fromModuleKey}:${left.moduleSpecifier}`.localeCompare(`${right.fromModuleKey}:${right.moduleSpecifier}`)
      );
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} unresolved module edge(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  openSeams(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticOpenSeamsResult> {
    const handles = includeHandles(detail);
    const rows = readAppOpenSeams(this.emission, this.runtime.workspace.store)
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
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
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
      `Recovered ${value.appRoots.length} app root(s), ${value.components.length} component(s), ${value.routes.length} route config(s), and ${value.files.length} roleful app file(s).`,
      value,
    );
  }

  resourceDefinitions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticResourceDefinitionsResult> {
    const rows = readResourceDefinitionRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} recognized resource definition row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routerOptions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouterOptionsResult> {
    const rows = readRouterOptionsRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} router options row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteConfigsResult> {
    const rows = readRouteConfigRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} source-backed router route config row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeContexts(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteContextsResult> {
    const rows = readRouteContextRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime RouteContext row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routePatterns(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRoutePatternsResult> {
    const rows = readRoutePatternRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer configurable route pattern row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeEndpoints(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteEndpointsResult> {
    const rows = readRouteEndpointRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer endpoint row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeRecognizerStates(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteRecognizerStatesResult> {
    const rows = readRouteRecognizerStateRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer State row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  recognizedRoutes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRecognizedRoutesResult> {
    const rows = readRecognizedRouteRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer RecognizedRoute row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  typedNavigationInstructions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTypedNavigationInstructionsResult> {
    const rows = readTypedNavigationInstructionRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} TypedNavigationInstruction row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  viewportInstructions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportInstructionsResult> {
    const rows = readViewportInstructionRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ViewportInstruction row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  viewportInstructionTrees(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportInstructionTreesResult> {
    const rows = readViewportInstructionTreeRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ViewportInstructionTree row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeTrees(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteTreesResult> {
    const rows = readRouteTreeRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} RouteTree row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeNodes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteNodesResult> {
    const rows = readRouteNodeRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} RouteNode row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routerViewports(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouterViewportsResult> {
    const rows = readRouterViewportRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} router viewport row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  viewportAgents(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportAgentsResult> {
    const rows = readViewportAgentRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ViewportAgent row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  componentAgents(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticComponentAgentsResult> {
    const rows = readComponentAgentRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ComponentAgent handoff row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  resourceVisibility(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticResourceVisibilityResult> {
    const handles = includeHandles(detail);
    const rows = this.emission.templates.compilerWorlds
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
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
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
        analysisDepth: resource.runtimeAnalysis.analysisDepth,
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
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
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
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime controller hydration row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingTargetAccesses(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingTargetAccessResult> {
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingTargets,
      'runtime binding target-access rows',
      { rows: [] } satisfies SemanticBindingTargetAccessResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingTargetAccessRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding target-access row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  targetOperations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTargetOperationResult> {
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingTargets,
      'combined runtime target-operation rows',
      { rows: [] } satisfies SemanticTargetOperationResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readTargetOperationRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
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
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingTargets,
      'runtime binding source-operation rows',
      { rows: [] } satisfies SemanticBindingSourceOperationResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingSourceOperationRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding source-operation row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingValueChannels(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingValueChannelResult> {
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime binding value-channel rows',
      { rows: [] } satisfies SemanticBindingValueChannelResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingValueChannelRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding value-channel row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingDataFlows(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingDataFlowResult> {
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime binding data-flow rows',
      { rows: [] } satisfies SemanticBindingDataFlowResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingDataFlowRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding data-flow row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  private requireAnalysisDepth<TValue>(
    requiredDepth: SemanticAppAnalysisDepth,
    label: string,
    value: TValue,
  ): SemanticRuntimeAnswer<TValue> | null {
    if (semanticAppAnalysisDepthSatisfies(this.emission.analysisDepth, requiredDepth)) {
      return null;
    }
    return answer(
      SemanticRuntimeAnswerOutcome.Unsupported,
      `${label} require analysisDepth='${requiredDepth}', but this app was opened with analysisDepth='${this.emission.analysisDepth}'.`,
      value,
    );
  }
}

function appCacheKey(projectKey: string, analysisDepth: SemanticAppAnalysisDepth): string {
  return `${projectKey}:${analysisDepth}`;
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
  readonly runtimeBindingDataFlowSourceTypeGaps: number;
  readonly runtimeBindingDataFlowSourceAssignmentGaps: number;
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
  const appOpenSeams = readAppOpenSeams(emission, store);
  return {
    analysisDepth: emission.analysisDepth,
    ...projectSummaryCounts(project),
    ...evaluationSummaryCounts(emission),
    resourceDefinitions: emission.resources.readDefinitions().length,
    routerOptions: emission.routerOptions.readRouterOptions().length,
    routeConfigs: emission.routes.readRouteConfigs().length,
    routeConfigContexts: emission.routeContexts.readRouteConfigContexts().length,
    routeContexts: emission.routeRuntimeTopology.readRouteContexts().length,
    routeRecognizers: emission.routeContexts.readRouteRecognizers().length,
    routePatterns: emission.routeRecognizer.readConfigurableRoutes().length,
    routeEndpoints: emission.routeRecognizer.readEndpoints().length,
    routeRecognizerStates: emission.routeRecognizer.readStates().length,
    recognizedRoutes: emission.routeRecognition.readRecognizedRoutes().length,
    typedNavigationInstructions: emission.routeInstructions.readTypedNavigationInstructions().length,
    viewportInstructions: emission.routeInstructions.readViewportInstructions().length,
    viewportInstructionTrees: emission.routeInstructions.readViewportInstructionTrees().length,
    routeTrees: emission.routeTree.readRouteTrees().length,
    routeNodes: emission.routeTree.readRouteNodes().length,
    routerViewports: emission.routeRuntimeTopology.readViewports().length,
    viewportAgents: emission.routeRuntimeTopology.readViewportAgents().length,
    componentAgents: emission.routeComponentAgents.readComponentAgents().length,
    ...configurationSummaryCounts(emission),
    appTasks: appTaskSummaryCount(emission),
    ...diSummaryCounts(emission, templates),
    ...compilerWorldSummaryCounts(emission.templates.compilerWorlds),
    ...templateSummaryCounts(templates),
    ...kernelSummaryCounts(store, appOpenSeams.length),
  };
}

function projectSummaryCounts(project: ProjectBootFrame): AppSummaryProjectCounts {
  return {
    projectKey: project.projectKey,
    rootDir: project.rootDir,
    sourceFiles: project.sourceFiles.length,
  };
}

function sourceRoleCounts(project: ProjectBootFrame): readonly SemanticSourceRoleCount[] {
  const counts = new Map<string, number>();
  for (const source of project.sourceFiles) {
    counts.set(source.role, (counts.get(source.role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([role, count]) => ({ role, count }));
}

function evaluationSummaryCounts(emission: AureliaAppWorldProjectEmission): AppSummaryEvaluationCounts {
  return {
    evaluatedSources: emission.evaluation.readEvaluatedSources().length,
    unresolvedModuleEdges: emission.evaluation.readUnresolvedModules().length,
  };
}

function appTaskSummaryCount(emission: AureliaAppWorldProjectEmission): number {
  return emission.configuration.readConfiguration().appTasks.length + emission.appWorld.diWorld.appTasks.length;
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
    ) + emission.routeComponentAgents.readControllers().length,
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
    runtimeBindingDataFlowSourceTypeGaps: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.bindingDataFlow.dataFlows.filter((dataFlow) => dataFlow.sourceTypeOpenReason != null).length
    ),
    runtimeBindingDataFlowSourceAssignmentGaps: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.bindingDataFlow.dataFlows.filter((dataFlow) => dataFlow.sourceAssignmentReason != null).length
    ),
    bindingScopes: sumTemplates(templates, (resource) => resource.runtimeAnalysis.scopes.readScopes().length),
  };
}

function kernelSummaryCounts(store: KernelStore, kernelOpenSeams: number): AppSummaryKernelCounts {
  return {
    kernelProducts: store.readProducts().length,
    kernelClaims: store.readClaims().length,
    kernelOpenSeams,
  };
}

function sourceReferenceForNode(node: ts.Node): SemanticSourceReference {
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  return {
    kind: 'typescript-node',
    label: `${sourceFile.fileName}@${start}..${end}`,
    path: sourceFile.fileName,
    start,
    end,
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
  projectKey: string,
): ProjectBootFrame {
  const project = projects.find((candidate) => candidate.projectKey === projectKey);
  if (project == null) {
    throw new Error(`Cannot open semantic app: project '${projectKey}' was not booted.`);
  }
  return project;
}

function hasLikelyEntrypointSource(project: ProjectBootFrame): boolean {
  return project.sourceFiles.some((source) => {
    if (source.role !== SourceFileRole.AppSource) {
      return false;
    }
    const baseName = path.basename(source.path).toLowerCase();
    return baseName === 'main.ts' ||
      baseName === 'main.js' ||
      baseName === 'bootstrap.ts' ||
      baseName === 'bootstrap.js' ||
      baseName === 'startup.ts' ||
      baseName === 'startup.js';
  });
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
): {
  readonly rows: readonly TRow[];
  readonly page: SemanticRuntimePageResult;
} {
  const size = Math.max(0, page?.size ?? 50);
  const cursor = page?.cursor ?? null;
  const start = cursor == null ? 0 : cursorStart(cursor, rows.length);
  const safeStart = start < 0 ? rows.length : start;
  const selected = rows.slice(safeStart, safeStart + size);
  const nextCursor = selected.length > 0 && safeStart + selected.length < rows.length
    ? `offset:${safeStart + selected.length - 1}`
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

function outcomeForPagedRows(paged: { readonly page: SemanticRuntimePageResult }): SemanticRuntimeAnswerOutcome {
  return paged.page.nextCursor == null
    ? SemanticRuntimeAnswerOutcome.Hit
    : SemanticRuntimeAnswerOutcome.Partial;
}

function cursorStart(
  cursor: string,
  rowCount: number,
): number {
  if (cursor.startsWith('offset:')) {
    const offset = Number.parseInt(cursor.slice('offset:'.length), 10);
    return Number.isFinite(offset) ? offset + 1 : rowCount;
  }
  return rowCount;
}
