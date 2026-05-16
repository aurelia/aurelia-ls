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
import { KernelStore } from '../kernel/store.js';
import { AureliaAppWorldProjectEmission, AureliaAppWorldProjectPass } from '../configuration/app-world-project-pass.js';
import {
  SemanticAppAnalysisDepth,
  normalizeSemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
import {
  readSemanticApplicationTopology,
  type SemanticApplicationTopologyResult,
} from './app-topology.js';
import {
  readSemanticAuthoringCatalog,
} from './authoring-catalog.js';
import {
  readSemanticAuthoringOrientation,
} from './authoring-orientation.js';
import { semanticOutcomeForInquiry } from './answer.js';
import {
  readSemanticAppSummary,
  sourceRoleCounts,
} from './app-summary.js';
import {
  readBindingDataFlowRows,
  readBindingBehaviorApplicationRows,
  readBindingSourceOperationRows,
  readBindingTargetAccessRows,
  readBindingValueChannelRows,
  readTargetOperationRows,
} from './binding-projections.js';
import {
  readRuntimeControllerRows,
} from './controller-projections.js';
import {
  appDiagnosticRows,
} from './app-diagnostics.js';
import {
  readConfigurationIssueRows,
} from './configuration-projections.js';
import {
  readDiIssueRows,
} from './di-projections.js';
import {
  readEvaluationIssueRows,
} from './evaluation-projections.js';
import {
  readObservationIssueRows,
} from './observation-projections.js';
import {
  readAppOpenSeams,
} from './open-seam-projections.js';
import {
  readResourceDefinitionRows,
  readResourceIssueRows,
} from './resource-projections.js';
import {
  readStateIssueRows,
  readStateStoreRows,
} from './state-projections.js';
import {
  readValidationIssueRows,
} from './validation-projections.js';
import {
  readFetchClientIssueRows,
} from './fetch-client-projections.js';
import {
  readDialogIssueRows,
} from './dialog-projections.js';
import {
  compilerWorldLabel,
  describeAddress,
  type SemanticSourceReference,
} from './source-reference.js';
import {
  sourceFileAddressForAddress,
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  type OpenSemanticAppOptions,
  type SemanticAppDiagnosticsResult,
  type SemanticAppQuery,
  type SemanticAppSummary,
  type SemanticAuthoringCatalogResult,
  type SemanticAuthoringOrientationResult,
  type SemanticBindingDataFlowResult,
  type SemanticBindingBehaviorApplicationResult,
  type SemanticBindingSourceOperationResult,
  type SemanticBindingTargetAccessResult,
  type SemanticBindingTargetOperationResult,
  type SemanticBindingValueChannelResult,
  type SemanticConfigurationIssuesResult,
  type SemanticDiIssuesResult,
  type SemanticDialogIssuesResult,
  type SemanticEvaluationIssuesResult,
  type SemanticFetchClientIssuesResult,
  type SemanticOpenSeamRow,
  type SemanticOpenSeamsResult,
  type SemanticObservationIssuesResult,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceIssuesResult,
  type SemanticResourceVisibilityResult,
  type SemanticResourceVisibilityRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeControllerResult,
  type SemanticRuntimeOptions,
  type SemanticRuntimePageInput,
  type SemanticRuntimeSummary,
  type SemanticSourceFileRow,
  type SemanticSourceFilesResult,
  type SemanticStateIssuesResult,
  type SemanticStateStoresResult,
  type SemanticValidationIssuesResult,
  type SemanticTemplateCursorQuery,
  type SemanticUnresolvedModuleRow,
  type SemanticUnresolvedModulesResult,
  type SemanticTargetOperationResult,
  type SemanticTemplateCompletionResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticsQuery,
  type SemanticTemplateDiagnosticsResult,
} from './contracts.js';
import {
  answer,
  includeHandles,
  outcomeForPagedRows,
  pageRows,
  toPageRequest,
} from './answer-helpers.js';
import { SemanticAppRouteQueries } from './app-route-queries.js';
import { SemanticAppTemplateQueries } from './app-template-queries.js';

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
          hasAureliaAppEntrypointSignal: shape.shapeKind === SemanticProjectShapeKind.AureliaApp,
          shapeKind: shape.shapeKind,
          analysisKind: shape.analysisKind,
          aureliaDependencyScopes: shape.aureliaDependencyScopes,
          aureliaSourceSignals: shape.aureliaSourceSignals,
          shapeReasons: shape.shapeReasons,
        };
      }),
    };
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Booted ${value.projects.length} semantic-runtime project frame(s).`,
      value,
    );
  }

  authoringCatalog(): SemanticRuntimeAnswer<SemanticAuthoringCatalogResult> {
    const value = readSemanticAuthoringCatalog();
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Read authoring catalog with ${value.operations.length} operation(s), ${value.tasteAxes.length} taste axis row(s), and ${value.recipes.length} recipe contract(s).`,
      value,
    );
  }

  async openApp(options: OpenSemanticAppOptions = {}): Promise<SemanticApp> {
    const analysisDepth = normalizeSemanticAppAnalysisDepth(options.analysisDepth);
    const includeAuthoringTemplates = options.includeAuthoringTemplates === true;
    const sourceFilePath = normalizeSourceFilePathOption(options.sourceFilePath);
    const requestedAuthoringSourceFiles = normalizeAuthoringTemplateSourceFiles(options.authoringTemplateSourceFiles);
    const project = options.projectKey == null
      ? this.selectProjectForOpen(sourceFilePath)
      : selectProject(this.workspace.projects, options.projectKey);
    const projectSourceFilePath = sourceFilePath == null
      ? null
      : canonicalProjectSourceFilePath(project, sourceFilePath);
    const projectAuthoringSourceFiles = canonicalProjectSourceFilePaths(project, requestedAuthoringSourceFiles);
    const authoringTemplateSourceFiles = includeAuthoringTemplates
      ? authoringTemplateSourceFilesForOpen(projectSourceFilePath, projectAuthoringSourceFiles)
      : [];
    const authoringTemplateLimit = includeAuthoringTemplates ? normalizeAuthoringTemplateLimit(options.authoringTemplateLimit) : 0;
    return this.openProjectApp(
      project,
      analysisDepth,
      includeAuthoringTemplates,
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
    );
  }

  async templateCompletions(
    query: SemanticTemplateCursorQuery,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>> {
    const app = await this.openTemplateCursorApp(query);
    return app.templateQueries.templateCompletions({
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: query.cursor,
      page: query.page,
      detail: query.detail,
    });
  }

  async templateCursorInfo(
    query: SemanticTemplateCursorQuery,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>> {
    const app = await this.openTemplateCursorApp(query);
    return app.templateQueries.templateCursorInfo({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: query.cursor,
      detail: query.detail,
    });
  }

  async templateDiagnostics(
    query: SemanticTemplateDiagnosticsQuery = {},
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult>> {
    const app = await this.openTemplateDiagnosticsApp(query);
    return app.templateQueries.templateDiagnostics({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: query.sourceFile,
      page: query.page,
      detail: query.detail,
    });
  }

  private openProjectApp(
    project: ProjectBootFrame,
    analysisDepth: SemanticAppAnalysisDepth,
    includeAuthoringTemplates: boolean,
    authoringTemplateSourceFiles: readonly string[],
    authoringTemplateLimit: number | null,
  ): SemanticApp {
    const existing = this.readCachedApp(
      project.projectKey,
      analysisDepth,
      includeAuthoringTemplates,
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
    );
    if (existing != null) {
      return existing;
    }
    const emission = new AureliaAppWorldProjectPass().constructAndEmit(this.workspace.store, project, {
      analysisDepth,
      includeAuthoringTemplates,
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
    });
    const app = new SemanticApp(this, project, emission);
    this.appsByCacheKey.set(
      appCacheKey(project.projectKey, analysisDepth, includeAuthoringTemplates, authoringTemplateSourceFiles, authoringTemplateLimit),
      app,
    );
    return app;
  }

  private async openTemplateCursorApp(
    query: SemanticTemplateCursorQuery,
  ): Promise<SemanticApp> {
    const analysisDepth = normalizeSemanticAppAnalysisDepth(query.analysisDepth);
    const sourceFilePath = normalizeSourceFilePathOption(query.cursor.filePath);
    const requestedProject = query.projectKey == null
      ? null
      : selectProject(this.workspace.projects, query.projectKey);
    const cached = sourceFilePath == null
      ? null
      : this.readCachedTemplateCursorApp(requestedProject, analysisDepth, sourceFilePath);
    if (cached != null) {
      return cached;
    }
    const project = requestedProject ?? this.selectProjectForOpen(sourceFilePath);
    return this.openApp({
      projectKey: project.projectKey,
      sourceFilePath,
      analysisDepth,
      includeAuthoringTemplates: query.includeAuthoringTemplates ?? true,
      authoringTemplateSourceFiles: query.authoringTemplateSourceFiles,
      authoringTemplateLimit: query.authoringTemplateLimit,
    });
  }

  private async openTemplateDiagnosticsApp(
    query: SemanticTemplateDiagnosticsQuery,
  ): Promise<SemanticApp> {
    const analysisDepth = normalizeSemanticAppAnalysisDepth(query.analysisDepth);
    const sourceFilePath = normalizeSourceFilePathOption(query.sourceFile?.filePath);
    const requestedProject = query.projectKey == null
      ? null
      : selectProject(this.workspace.projects, query.projectKey);
    const cached = sourceFilePath == null
      ? null
      : this.readCachedTemplateCursorApp(requestedProject, analysisDepth, sourceFilePath);
    if (cached != null) {
      return cached;
    }
    const project = requestedProject ?? this.selectProjectForOpen(sourceFilePath);
    return this.openApp({
      projectKey: project.projectKey,
      sourceFilePath,
      analysisDepth,
      includeAuthoringTemplates: query.includeAuthoringTemplates ?? sourceFilePath != null,
      authoringTemplateSourceFiles: query.authoringTemplateSourceFiles,
      authoringTemplateLimit: query.authoringTemplateLimit,
    });
  }

  private readCachedTemplateCursorApp(
    project: ProjectBootFrame | null,
    requestedDepth: SemanticAppAnalysisDepth,
    sourceFilePath: string,
  ): SemanticApp | null {
    for (const app of this.appsByCacheKey.values()) {
      if (
        (project == null || app.project.projectKey === project.projectKey)
        && semanticAppAnalysisDepthSatisfies(app.emission.analysisDepth, requestedDepth)
        && appContainsTemplateSourceFile(app, sourceFilePath)
      ) {
        return app;
      }
    }
    return null;
  }

  private readCachedApp(
    projectKey: string,
    requestedDepth: SemanticAppAnalysisDepth,
    includeAuthoringTemplates: boolean,
    authoringTemplateSourceFiles: readonly string[],
    authoringTemplateLimit: number | null,
  ): SemanticApp | null {
    const exact = this.appsByCacheKey.get(
      appCacheKey(projectKey, requestedDepth, includeAuthoringTemplates, authoringTemplateSourceFiles, authoringTemplateLimit),
    );
    if (exact != null) {
      return exact;
    }
    for (const app of this.appsByCacheKey.values()) {
      if (
        app.project.projectKey === projectKey
        && semanticAppAnalysisDepthSatisfies(app.emission.analysisDepth, requestedDepth)
        && appSatisfiesAuthoringTemplateRequest(app, includeAuthoringTemplates, authoringTemplateSourceFiles, authoringTemplateLimit)
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
    if (this.workspace.projects.length === 0) {
      throw new Error('Cannot open semantic app: workspace did not boot any projects.');
    }
    throw new Error(
      `Cannot open semantic app without projectKey or sourceFilePath: no aurelia-app project was found; project shapes: ${this.projectShapeSummary()}.`,
    );
  }

  private projectShapeSummary(): string {
    const counts = new Map<string, number>();
    for (const project of this.workspace.projects) {
      const shapeKind = this.readProjectShape(project).shapeKind;
      counts.set(shapeKind, (counts.get(shapeKind) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([shapeKind, count]) => `${shapeKind}=${count}`)
      .join(', ');
  }

  private selectProjectForOpen(sourceFilePath: string | null): ProjectBootFrame {
    return sourceFilePath == null
      ? this.selectDefaultProject()
      : this.selectProjectForSourceFile(sourceFilePath);
  }

  private selectProjectForSourceFile(sourceFilePath: string): ProjectBootFrame {
    for (const address of this.workspace.store.readSourceFileAddressesByFileName(sourceFilePath)) {
      const project = this.workspace.projects.find((candidate) =>
        candidate.sourceFiles.some((source) => source.addressHandle === address.handle)
      );
      if (project != null) {
        return project;
      }
    }
    throw new Error(`Cannot open semantic app: source file '${sourceFilePath}' was not admitted into any project.`);
  }
}

/** Open app facade. It owns one project-level semantic app-world emission and compact query entrypoints. */
export class SemanticApp {
  private readonly routeQueries: SemanticAppRouteQueries;
  readonly templateQueries: SemanticAppTemplateQueries;

  constructor(
    readonly runtime: SemanticRuntime,
    readonly project: ProjectBootFrame,
    readonly emission: AureliaAppWorldProjectEmission,
  ) {
    this.routeQueries = new SemanticAppRouteQueries(emission, runtime.workspace.store);
    this.templateQueries = new SemanticAppTemplateQueries(
      emission,
      runtime.workspace.store,
      runtime.workspace.rootDir,
      project.rootDir,
    );
  }

  ask(query: SemanticAppQuery): SemanticRuntimeAnswer<unknown> {
    const routeAnswer = this.routeQueries.answer(query.kind, query.page, query.detail);
    if (routeAnswer != null) {
      return routeAnswer;
    }
    switch (query.kind) {
      case SemanticAppQueryKind.Summary:
        return this.summary();
      case SemanticAppQueryKind.AuthoringCatalog:
        return this.authoringCatalog();
      case SemanticAppQueryKind.AuthoringOrientation:
        return this.authoringOrientation();
      case SemanticAppQueryKind.SourceFiles:
        return this.sourceFiles(query.page, query.detail);
      case SemanticAppQueryKind.UnresolvedModules:
        return this.unresolvedModules(query.page);
      case SemanticAppQueryKind.OpenSeams:
        return this.openSeams(query.page, query.detail);
      case SemanticAppQueryKind.AppDiagnostics:
        return this.appDiagnostics(query);
      case SemanticAppQueryKind.EvaluationIssues:
        return this.evaluationIssues(query.page, query.detail);
      case SemanticAppQueryKind.ConfigurationIssues:
        return this.configurationIssues(query.page, query.detail);
      case SemanticAppQueryKind.DiIssues:
        return this.diIssues(query.page, query.detail);
      case SemanticAppQueryKind.ObservationIssues:
        return this.observationIssues(query.page, query.detail);
      case SemanticAppQueryKind.AppTopology:
        return this.appTopology(query.detail);
      case SemanticAppQueryKind.StateStores:
        return this.stateStores(query.page, query.detail);
      case SemanticAppQueryKind.StateIssues:
        return this.stateIssues(query.page, query.detail);
      case SemanticAppQueryKind.ValidationIssues:
        return this.validationIssues(query.page, query.detail);
      case SemanticAppQueryKind.FetchClientIssues:
        return this.fetchClientIssues(query.page, query.detail);
      case SemanticAppQueryKind.DialogIssues:
        return this.dialogIssues(query.page, query.detail);
      case SemanticAppQueryKind.ResourceDefinitions:
        return this.resourceDefinitions(query.page, query.detail);
      case SemanticAppQueryKind.ResourceIssues:
        return this.resourceIssues(query.page, query.detail);
      case SemanticAppQueryKind.ResourceVisibility:
        return this.resourceVisibility(query.page, query.detail);
      case SemanticAppQueryKind.TemplateCompilations:
        return this.templateQueries.templateCompilations(query.page, query.detail);
      case SemanticAppQueryKind.TemplateCompletions:
        return this.templateQueries.templateCompletions(query);
      case SemanticAppQueryKind.TemplateCursorInfo:
        return this.templateQueries.templateCursorInfo(query);
      case SemanticAppQueryKind.TemplateDiagnostics:
        return this.templateQueries.templateDiagnostics(query);
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
      case SemanticAppQueryKind.BindingBehaviorApplications:
        return this.bindingBehaviorApplications(query.page, query.detail);
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
    const value = readSemanticAppSummary(this.project, this.emission, this.runtime.workspace.store);
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Opened semantic app '${value.projectKey}' with ${value.appRoots} app root(s), ${value.evaluationIssues} evaluation issue(s), ${value.stateStores} state store(s), ${value.routeConfigs} route config(s), ${value.routePatterns} route pattern(s), ${value.routeEndpoints} route endpoint(s), ${value.routeRecognizerIssues} route recognizer issue(s), ${value.compilerWorlds} compiler world(s), and ${value.compiledResources} compiled resource template(s).`,
      value,
    );
  }

  authoringCatalog(): SemanticRuntimeAnswer<SemanticAuthoringCatalogResult> {
    return this.runtime.authoringCatalog();
  }

  authoringOrientation(): SemanticRuntimeAnswer<SemanticAuthoringOrientationResult> {
    const value = readSemanticAuthoringOrientation(this.project, this.emission, this.runtime.workspace.store);
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Oriented authoring for '${value.project.projectKey}' across ${value.coverage.length} coverage row(s), ${value.capabilities.length} capability row(s), and ${value.openReasons.length} open reason kind(s).`,
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
        reasonKinds: seam.reasonKinds,
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

  appDiagnostics(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticAppDiagnosticsResult> {
    const detail = query.detail ?? SemanticRuntimeDetail.Compact;
    const evaluationRows = readEvaluationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const configurationRows = readConfigurationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const diRows = readDiIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const observationRows = readObservationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const templateRows = this.templateQueries.templateDiagnosticRows({ ...query, detail });
    const resourceRows = readResourceIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const stateRows = readStateIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const validationRows = readValidationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const fetchClientRows = readFetchClientIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const dialogRows = readDialogIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const routerRows = this.routeQueries.routerIssueRows(detail);
    const routeRows = this.routeQueries.routeRecognizerIssueRows(detail);
    const rows = appDiagnosticRows(
      this.project.projectKey,
      query,
      evaluationRows,
      configurationRows,
      diRows,
      observationRows,
      templateRows,
      resourceRows,
      stateRows,
      validationRows,
      fetchClientRows,
      dialogRows,
      routerRows,
      routeRows,
    );
    const paged = pageRows(rows, query.page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} app diagnostic row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  evaluationIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticEvaluationIssuesResult> {
    const rows = readEvaluationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} evaluation issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  configurationIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticConfigurationIssuesResult> {
    const rows = readConfigurationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} configuration issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  diIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticDiIssuesResult> {
    const rows = readDiIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} DI issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  observationIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticObservationIssuesResult> {
    const rows = readObservationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} observation issue row(s).`,
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

  stateStores(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticStateStoresResult> {
    const rows = readStateStoreRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/state store configuration row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  stateIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticStateIssuesResult> {
    const rows = readStateIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/state issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  validationIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticValidationIssuesResult> {
    const rows = readValidationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/validation issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  fetchClientIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticFetchClientIssuesResult> {
    const rows = readFetchClientIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/fetch-client issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  dialogIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticDialogIssuesResult> {
    const rows = readDialogIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/dialog issue row(s).`,
      { rows: paged.rows },
      paged.page,
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

  resourceIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticResourceIssuesResult> {
    const rows = readResourceIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} resource metadata issue row(s).`,
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

  bindingBehaviorApplications(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingBehaviorApplicationResult> {
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingTargets,
      'runtime binding-behavior application rows',
      { rows: [] } satisfies SemanticBindingBehaviorApplicationResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingBehaviorApplicationRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding-behavior application row(s).`,
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

function appCacheKey(
  projectKey: string,
  analysisDepth: SemanticAppAnalysisDepth,
  includeAuthoringTemplates: boolean,
  authoringTemplateSourceFiles: readonly string[],
  authoringTemplateLimit: number | null,
): string {
  const sourceFileKey = authoringTemplateSourceFiles.length === 0
    ? 'project'
    : authoringTemplateSourceFiles.join('|');
  return `${projectKey}:${analysisDepth}:authoring=${includeAuthoringTemplates}:${sourceFileKey}:${authoringTemplateLimit ?? 'all'}`;
}

function normalizeAuthoringTemplateLimit(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function normalizeAuthoringTemplateSourceFiles(value: readonly string[] | null | undefined): readonly string[] {
  if (value == null) {
    return [];
  }
  return [...new Set(value
    .map((fileName) => fileName.trim().replace(/\\/g, '/'))
    .filter((fileName) => fileName.length > 0))]
    .sort();
}

function normalizeSourceFilePathOption(value: string | null | undefined): string | null {
  const [path] = normalizeAuthoringTemplateSourceFiles(value == null ? [] : [value]);
  return path ?? null;
}

function canonicalProjectSourceFilePaths(
  project: ProjectBootFrame,
  values: readonly string[],
): readonly string[] {
  return [...new Set(values.map((value) => canonicalProjectSourceFilePath(project, value)))]
    .sort();
}

function canonicalProjectSourceFilePath(
  project: ProjectBootFrame,
  value: string,
): string {
  return admittedProjectSourceFilePath(project, value)
    ?? projectRelativePath(project.rootDir, value)
    ?? projectRelativePath(project.rootDir, path.resolve(project.workspaceRootDir, value))
    ?? value;
}

function admittedProjectSourceFilePath(
  project: ProjectBootFrame,
  value: string,
): string | null {
  const normalized = value.replace(/\\/g, '/');
  return project.sourceFiles
    .map((source) => source.path)
    .filter((sourcePath) => sourcePathMatchesFileName(sourcePath, normalized))
    .sort((left, right) => right.length - left.length)[0]
    ?? null;
}

function projectRelativePath(
  projectRootDir: string,
  value: string,
): string | null {
  if (!path.isAbsolute(value)) {
    return null;
  }
  const relativePath = path.relative(projectRootDir, value);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }
  return relativePath.replace(/\\/g, '/');
}

function authoringTemplateSourceFilesForOpen(
  sourceFilePath: string | null,
  requestedAuthoringSourceFiles: readonly string[],
): readonly string[] {
  if (requestedAuthoringSourceFiles.length > 0) {
    return requestedAuthoringSourceFiles;
  }
  return sourceFilePath == null ? [] : [sourceFilePath];
}

function appSatisfiesAuthoringTemplateRequest(
  app: SemanticApp,
  includeAuthoringTemplates: boolean,
  authoringTemplateSourceFiles: readonly string[],
  authoringTemplateLimit: number | null,
): boolean {
  if (!includeAuthoringTemplates) {
    return true;
  }
  if (!authoringTemplateSourceFileRequestSatisfied(
    app.emission.templates.authoringTemplateSourceFiles,
    authoringTemplateSourceFiles,
    app.emission.templates.authoringTemplateLimit,
  )) {
    return false;
  }
  return authoringTemplateLimitSatisfied(app.emission.templates.authoringTemplateLimit, authoringTemplateLimit);
}

function authoringTemplateSourceFileRequestSatisfied(
  existingSourceFiles: readonly string[],
  requestedSourceFiles: readonly string[],
  existingTemplateLimit: number | null,
): boolean {
  if (requestedSourceFiles.length === 0) {
    return existingSourceFiles.length === 0;
  }
  if (existingSourceFiles.length === 0) {
    return existingTemplateLimit == null;
  }
  const existing = new Set(existingSourceFiles);
  return requestedSourceFiles.every((fileName) => existing.has(fileName));
}

function authoringTemplateLimitSatisfied(
  existingTemplateLimit: number | null,
  requestedTemplateLimit: number | null,
): boolean {
  if (existingTemplateLimit == null) {
    return true;
  }
  if (requestedTemplateLimit == null) {
    return false;
  }
  return existingTemplateLimit >= requestedTemplateLimit;
}

function appContainsTemplateSourceFile(
  app: SemanticApp,
  filePath: string,
): boolean {
  return [
    ...app.emission.templates.resources,
    ...app.emission.templates.authoringResources,
  ].some((resource) => {
    const source = sourceFileAddressForAddress(
      app.runtime.workspace.store,
      resource.compilation.unit.templateSource.sourceAddressHandle,
    );
    return source != null && sourcePathMatchesFileName(source.path, filePath);
  });
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
