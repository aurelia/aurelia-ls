import path from 'node:path';
import type { BootProjectInput, ProjectBootFrame, WorkspaceBootFrame } from '../boot/frames.js';
import { bootWorkspace } from '../boot/boot-workspace.js';
import { answerAdmittedSources, AdmittedSourcesQuery } from '../inquiry/source-files.js';
import { InquiryOutcomeKind } from '../inquiry/answer.js';
import { InquiryPageRequest } from '../inquiry/page.js';
import { KernelStore } from '../kernel/store.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { AureliaAppWorldProjectEmission, AureliaAppWorldProjectPass } from '../configuration/app-world-project-pass.js';
import type { TemplateCompilerWorldEmission } from '../template/compiler-world-materializer.js';
import type { TemplateResourceVisibilityKind } from '../template/compiler-world.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';

export const SEMANTIC_RUNTIME_API_VERSION = '0.1' as const;

export const enum SemanticRuntimeAnswerOutcome {
  Hit = 'hit',
  Miss = 'miss',
  Partial = 'partial',
  Unsupported = 'unsupported',
}

export const enum SemanticAppQueryKind {
  Summary = 'summary',
  SourceFiles = 'source-files',
  OpenSeams = 'open-seams',
  ResourceVisibility = 'resource-visibility',
  TemplateCompilations = 'template-compilations',
}

export const enum SemanticRuntimeDetail {
  /** Default API projection: readable rows with compact navigation labels. */
  Compact = 'compact',
  /** Include opaque kernel handles for exact in-process follow-up navigation. */
  Handles = 'handles',
}

export interface SemanticRuntimeProjectInput {
  readonly rootDir: string;
  readonly projectKey?: string;
  readonly sourceFiles?: BootProjectInput['sourceFiles'];
}

export interface SemanticRuntimeOptions {
  /** Workspace root used for source-address normalization and default project discovery. */
  readonly workspaceRoot: string;
  /** Store-local key. Omit to derive one from the workspace root. */
  readonly storeKey?: string;
  /** Projects to boot. Omit to analyze the workspace root as one project. */
  readonly projects?: readonly SemanticRuntimeProjectInput[];
}

export interface OpenSemanticAppOptions {
  /** Project key selected from the booted workspace. Omit to use the first project. */
  readonly projectKey?: string | null;
}

export interface SemanticRuntimePageInput {
  readonly size?: number;
  readonly cursor?: string | null;
}

export interface SemanticAppQuery {
  readonly kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly page?: SemanticRuntimePageInput;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`;
}

export interface SemanticRuntimeAnswer<TValue> {
  readonly schemaVersion: typeof SEMANTIC_RUNTIME_API_VERSION;
  readonly outcome: SemanticRuntimeAnswerOutcome;
  readonly summary: string;
  readonly value: TValue;
  readonly page?: SemanticRuntimePageResult | null;
}

export interface SemanticRuntimePageResult {
  readonly size: number;
  readonly cursor: string | null;
  readonly nextCursor: string | null;
  readonly returnedRows: number;
  readonly totalRows: number;
}

export interface SemanticSourceReference {
  readonly kind: string;
  readonly label: string;
  readonly path?: string;
  readonly start?: number;
  readonly end?: number;
  readonly role?: string;
  readonly scheme?: string;
  readonly value?: string;
  readonly anchor?: SemanticSourceReference | null;
}

export interface SemanticRuntimeSummary {
  readonly workspaceRoot: string;
  readonly workspaceKey: string;
  readonly projects: readonly SemanticProjectSummary[];
}

export interface SemanticProjectSummary {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
}

export interface SemanticAppSummary {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
  readonly evaluatedSources: number;
  readonly unresolvedModuleEdges: number;
  readonly resourceDefinitions: number;
  readonly configurationSequences: number;
  readonly configurationSteps: number;
  readonly appRoots: number;
  readonly registrationAdmissions: number;
  readonly containers: number;
  readonly resolverSlots: number;
  readonly resourceSlots: number;
  readonly diOpenSeams: number;
  readonly compilerWorlds: number;
  readonly visibleResources: number;
  readonly visibleSyntaxResources: number;
  readonly runtimeRenderers: number;
  readonly compiledResources: number;
  readonly compiledInstructions: number;
  readonly runtimeBindings: number;
  readonly bindingScopes: number;
  readonly kernelProducts: number;
  readonly kernelClaims: number;
  readonly kernelOpenSeams: number;
}

export interface SemanticSourceFileRow {
  readonly projectKey: string;
  readonly path: string;
  readonly language: string;
  readonly handles?: {
    readonly addressHandle: AddressHandle;
  };
}

export interface SemanticSourceFilesResult {
  readonly rows: readonly SemanticSourceFileRow[];
}

export interface SemanticOpenSeamRow {
  readonly seamKindKey: OpenSeam['seamKindKey'];
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly handle: OpenSeam['handle'];
    readonly addressHandle: AddressHandle | null;
  };
}

export interface SemanticOpenSeamsResult {
  readonly rows: readonly SemanticOpenSeamRow[];
}

export interface SemanticResourceVisibilityRow {
  readonly compilerWorld: string;
  readonly resourceKind: ResourceDefinitionKind;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly visibilityKind: TemplateResourceVisibilityKind;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly compilerWorldProductHandle: ProductHandle;
    readonly resourceProductHandle: ProductHandle | null;
    readonly definitionProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticResourceVisibilityResult {
  readonly rows: readonly SemanticResourceVisibilityRow[];
}

export interface SemanticTemplateCompilationRow {
  readonly definitionName: string;
  readonly compilerWorld: string;
  readonly templateSourceKind: string;
  readonly htmlNodes: number;
  readonly htmlAttributes: number;
  readonly recoveries: number;
  readonly attributeSyntaxes: number;
  readonly classifications: number;
  readonly valueSites: number;
  readonly expressionParses: number;
  readonly bindingCommandLowerings: number;
  readonly instructions: number;
  readonly renderTargets: number;
  readonly runtimeControllers: number;
  readonly runtimeBindings: number;
  readonly bindingScopes: number;
  readonly openSeams: number;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly definitionProductHandle: ProductHandle | null;
    readonly compilerWorldProductHandle: ProductHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCompilationResult {
  readonly rows: readonly SemanticTemplateCompilationRow[];
}

/** Create the in-process semantic-runtime API surface. */
export async function createSemanticRuntime(
  options: SemanticRuntimeOptions,
): Promise<SemanticRuntime> {
  return SemanticRuntime.open(options);
}

/** Booted workspace facade. It owns source admission and app-world opening. */
export class SemanticRuntime {
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
    const emission = new AureliaAppWorldProjectPass().constructAndEmit(this.workspace.store, project);
    return new SemanticApp(this, project, emission);
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
      case SemanticAppQueryKind.ResourceVisibility:
        return this.resourceVisibility(query.page, query.detail);
      case SemanticAppQueryKind.TemplateCompilations:
        return this.templateCompilations(query.page, query.detail);
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
        definitionName: resource.definition.name,
        compilerWorld: compilerWorldLabel(this.runtime.workspace.store, resource.compilerWorld),
        templateSourceKind: resource.unit.templateSource.sourceKind,
        htmlNodes: resource.html.nodes.length,
        htmlAttributes: resource.html.attributes.length,
        recoveries: resource.html.recoveries.length,
        attributeSyntaxes: resource.attributeSyntax.syntaxes.length,
        classifications: resource.attributeClassification.classifications.length,
        valueSites: resource.valueSites.sites.length + resource.bindingCommandLowering.valueSites.length,
        expressionParses: resource.valueSites.parses.length + resource.bindingCommandLowering.expressionParses.length,
        bindingCommandLowerings: resource.bindingCommandLowering.lowerings.length
          + resource.bindingCommandLowering.multiBindingLowerings.length,
        instructions: resource.compiledTemplate.instructions.length,
        renderTargets: resource.compiledTemplate.renderTargets.length,
        runtimeControllers: resource.runtimeRendering.controllers.length,
        runtimeBindings: resource.runtimeRendering.bindings.length,
        bindingScopes: resource.scopes.readScopes().length,
        openSeams: resource.compiledTemplate.openSeams.length + resource.runtimeRendering.openSeams.length,
        source: describeAddress(
          this.runtime.workspace.store,
          resource.definition.template?.addressHandle ?? resource.definition.sourceAddressHandle,
        ),
        ...(handles ? {
          handles: {
            definitionProductHandle: resource.definition.productHandle,
            compilerWorldProductHandle: resource.compilerWorld.world.productHandle,
            sourceAddressHandle: resource.definition.template?.addressHandle ?? resource.definition.sourceAddressHandle,
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
}

function appSummary(
  project: ProjectBootFrame,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): SemanticAppSummary {
  const templates = emission.templates.resources;
  return {
    projectKey: project.projectKey,
    rootDir: project.rootDir,
    sourceFiles: project.sourceFiles.length,
    evaluatedSources: emission.evaluation.readEvaluatedSources().length,
    unresolvedModuleEdges: emission.evaluation.readUnresolvedModules().length,
    resourceDefinitions: emission.resources.readDefinitions().length,
    configurationSequences: emission.configuration.readConfiguration().sequences.length,
    configurationSteps: emission.configuration.readConfiguration().steps.length,
    appRoots: emission.configuration.readConfiguration().appRoots.length,
    registrationAdmissions: emission.configuration.readConfiguration().registrationAdmissions.length,
    containers: emission.appWorld.diWorld.containers.length,
    resolverSlots: emission.appWorld.diWorld.resolverSlots.length,
    resourceSlots: emission.appWorld.diWorld.resourceSlots.length,
    diOpenSeams: emission.appWorld.diWorld.openSeams.length,
    compilerWorlds: emission.appWorld.compilerWorlds.length,
    visibleResources: emission.appWorld.compilerWorlds
      .reduce((total, world) => total + world.resourceScope.resources.length, 0),
    visibleSyntaxResources: emission.appWorld.compilerWorlds
      .reduce((total, world) => total + world.resourceScope.syntaxResources.length, 0),
    runtimeRenderers: emission.appWorld.compilerWorlds
      .reduce((total, world) => total + world.runtimeRenderers.length, 0),
    compiledResources: templates.length,
    compiledInstructions: templates.reduce((total, resource) => total + resource.compiledTemplate.instructions.length, 0),
    runtimeBindings: templates.reduce((total, resource) => total + resource.runtimeRendering.bindings.length, 0),
    bindingScopes: templates.reduce((total, resource) => total + resource.scopes.readScopes().length, 0),
    kernelProducts: store.readProducts().length,
    kernelClaims: store.readClaims().length,
    kernelOpenSeams: store.readOpenSeams().length,
  };
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

function compilerWorldLabel(
  store: KernelStore,
  compilerWorld: TemplateCompilerWorldEmission,
): string {
  const source = describeAddress(store, compilerWorld.world.sourceAddressHandle);
  return source == null
    ? compilerWorld.world.worldKind
    : `${compilerWorld.world.worldKind} ${source.label}`;
}

function describeAddress(
  store: KernelStore,
  handle: AddressHandle | null,
): SemanticSourceReference | null {
  if (handle == null) {
    return null;
  }
  const address = store.readAddress(handle);
  if (address == null) {
    return {
      kind: 'unexpanded-address',
      label: '(unexpanded address)',
    };
  }
  switch (address.kind) {
    case 'source-file-address':
      return {
        kind: address.kind,
        label: address.path,
        path: address.path,
      };
    case 'source-span-address': {
      const file = describeAddress(store, address.fileHandle);
      return {
        kind: address.kind,
        label: `${file?.label ?? '(unknown source)'}@${address.start}..${address.end}`,
        path: file?.path,
        start: address.start,
        end: address.end,
        role: address.role,
        anchor: file,
      };
    }
    case 'template-address':
      return {
        kind: address.kind,
        label: `template:${address.templateKey}`,
        anchor: describeAddress(store, address.authoredSourceHandle),
      };
    case 'template-node-address': {
      const source = describeAddress(store, address.authoredSourceHandle);
      return {
        kind: address.kind,
        label: source?.label ?? `template-node:${address.path.join('.')}`,
        anchor: source,
      };
    }
    case 'generated-address': {
      const anchor = address.anchorHandle == null || store.readAddress(address.anchorHandle as AddressHandle) == null
        ? null
        : describeAddress(store, address.anchorHandle as AddressHandle);
      return {
        kind: address.kind,
        label: anchor == null ? `generated:${address.localKey}` : `${anchor.label} -> ${address.localKey}`,
        anchor,
      };
    }
    case 'external-address':
      return {
        kind: address.kind,
        label: address.label ?? `${address.scheme}:${address.value}`,
        scheme: address.scheme,
        value: address.value,
      };
  }
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

function cursorStart<TRow>(
  cursor: string,
  rows: readonly TRow[],
  key: (row: TRow) => string,
): number {
  if (cursor.startsWith('offset:')) {
    const offset = Number.parseInt(cursor.slice('offset:'.length), 10);
    return Number.isFinite(offset) ? offset + 1 : rows.length;
  }
  return rows.findIndex((row) => key(row) === cursor) + 1;
}
