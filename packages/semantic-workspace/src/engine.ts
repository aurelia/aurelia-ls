import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  PRELUDE_TS,
  canonicalDocumentUri,
  createAttributeParserFromRegistry,
  createDefaultCodeResolver,
  createTrace,
  createConsoleExporter,
  debug,
  diagnosticsCatalog,
  normalizePathForId,
  normalizeSpan,
  offsetAtPosition,
  overlayHitToDocumentSpan,
  resolveGeneratedReferenceLocationWithPolicy,
  runDiagnosticsPipeline,
  spanContainsOffset,
  stableHash,
  toSourceFileId,
  toSourceSpan,
  unwrapSourced,
  deriveResourceConfidence,
  type DiagnosticDataRecord,
  type DiagnosticSpec,
  type DiagnosticSurface,
  type DiagnosticsPipelineResult,
  type DocumentUri,
  type OverlayBuildArtifact,
  type OverlayDocumentSnapshot,
  type AttributeParser,
  type RawDiagnostic,
  type TemplateLanguageDiagnostic,
  type SourceSpan,
  type TemplateCompilation,
  type TemplateMappingArtifact,
  type TemplateQueryFacade,
  type TemplateSyntaxRegistry,
  type VmReflection,
  type ResourceScopeId,
  type Sourced,
  type SymbolId,
  type StyleProfile,
  type SemanticModel,
  type SemanticModelQuery,
} from "@aurelia-ls/compiler";
import {
  createNodeFileSystem,
  resolveThirdPartyResources,
  hasThirdPartyResources,
  type InlineTemplateInfo,
  type Logger,
  type ProjectSemanticsDiscoveryConfig,
  type ProjectSemanticsDiscoveryResult,
  type TemplateInfo,
  type ThirdPartyOptions,
} from "@aurelia-ls/compiler";
import type { ModuleResolver, TypeScriptServices } from "@aurelia-ls/compiler";
import {
  createTypeScriptEnvironment,
  type TypeScriptEnvironment,
} from "./typescript/environment.js";
import { AureliaProjectIndex } from "./typescript/project-index.js";
import { SemanticWorkspaceKernel, createSemanticWorkspaceKernel } from "./workspace.js";
import {
  type RefactorEngine,
  type SemanticQuery,
  type SemanticWorkspace,
  type WorkspaceDiagnostic,
  type WorkspaceDiagnostics,
  type WorkspaceHover,
  type WorkspaceLocation,
  type WorkspaceRefactorResult,
  type WorkspaceSnapshot,
  type WorkspaceToken,
  type WorkspaceErrorKind,
  type WorkspaceCodeAction,
  type WorkspaceCodeActionRequest,
  type WorkspaceRenameRequest,
  type WorkspacePrepareRenameRequest,
  type WorkspacePrepareRenameResult,
  type TextReferenceSite,
  type WorkspaceCompletionItem,
  type WorkspaceTextEdit,
} from "./types.js";
import { inlineTemplatePath } from "./templates.js";
import { collectSemanticTokens } from "./semantic-tokens.js";
import {
  buildResourceDefinitionIndex,
  collectTemplateDefinitionSlices,
  collectTemplateReferences,
  collectTemplateResourceReferences,
  collectTypeScriptResourceReferences,
  findEntry,
  type ResourceDefinitionIndex,
  type ResourceDefinitionEntry,
  type TemplateDefinitionSlices,
} from "./definition.js";
import type { RefactorOverrides } from "./style-profile.js";
import { mergeTieredLocations, mergeTieredLocationsWithIds } from "./query-policy.js";
import {
  DEFAULT_REFACTOR_POLICY,
  planCodeActionExecution,
  planRenameExecution,
  type CodeActionExecutionPlan,
  type DecisionResolutionInput,
  type RefactorBoundaryReason,
  type RefactorDecisionPointId,
  type RefactorDecisionSet,
  type RefactorDecisionPoint,
  type RenameExecutionPlan,
  type RenameExecutionContext,
  type RefactorPolicy,
} from "./refactor-policy.js";
import {
  TemplateEditEngine,
  resolveModuleSpecifier,
  type AttributeSyntaxContext,
  type TemplateIndex,
} from "./template-edit-engine.js";
import { decideRenameMappedProvenance } from "./provenance-gate-policy.js";
import {
  findValueConverterAtOffset,
  findBindingBehaviorAtOffset,
  findInstructionHitsAtOffset,
} from "./query-helpers.js";
import { buildDomIndex } from "./template-dom.js";
import { computeCompletions, type CompletionEngineContext } from "./completions-engine.js";

type ProjectSemanticsDiscoveryConfigBase = Omit<ProjectSemanticsDiscoveryConfig, "diagnostics">;

type RenamePreflightPlan = {
  readonly plan: RenameExecutionPlan;
  readonly conclusive: boolean;
};

type RenameExecutionContextProbe = {
  readonly context: RenameExecutionContext;
  readonly conclusive: boolean;
};

export interface SemanticWorkspaceEngineOptions {
  readonly logger: Logger;
  readonly workspaceRoot?: string | null;
  readonly tsconfigPath?: string | null;
  readonly configFileName?: string;
  readonly discovery?: ProjectSemanticsDiscoveryConfigBase;
  /** Pre-computed discovery result — skips the initial discovery pipeline. */
  readonly seededDiscovery?: ProjectSemanticsDiscoveryResult;
  readonly typescript?: TypeScriptServices | false;
  readonly vm?: VmReflection;
  readonly lookupText?: (uri: DocumentUri) => string | null;
  readonly isJs?: boolean;
  readonly overlayBaseName?: string;
  readonly resourceScope?: ResourceScopeId | null;
  readonly styleProfile?: StyleProfile | null;
  readonly refactorOverrides?: RefactorOverrides | null;
  readonly refactorPolicy?: RefactorPolicy | null;
  readonly refactorDecisions?: RefactorDecisionSet | null;
}

export class SemanticWorkspaceEngine implements SemanticWorkspace {
  readonly #logger: Logger;
  readonly #env: TypeScriptEnvironment;
  readonly #kernel: SemanticWorkspaceKernel;
  readonly #projectIndex: AureliaProjectIndex;
  #query: SemanticModelQuery;
  readonly #refactorProxy: RefactorEngine;
  readonly #lookupText?: (uri: DocumentUri) => string | null;
  readonly #typescript?: TypeScriptServices;
  readonly #vm: VmReflection;
  readonly #isJs: boolean;
  readonly #overlayBaseName?: string;
  #workspaceRoot: string;
  #definitionIndex: ResourceDefinitionIndex;
  #resourceReferenceIndex: ResourceReferenceIndex | null = null;
  #resourceScope: ResourceScopeId | null;
  #projectVersion = 0;
  #templateIndex: TemplateIndex;
  #attrParser: AttributeParser | null = null;
  #attrParserSyntax: TemplateSyntaxRegistry | null = null;
  #diagnosticsCache: DiagnosticsCache | null = null;
  readonly #styleProfile: StyleProfile | null;
  readonly #refactorOverrides: RefactorOverrides | null;
  readonly #refactorPolicy: RefactorPolicy;
  readonly #refactorDecisions: RefactorDecisionSet | null;
  readonly #trace: ReturnType<typeof createTrace> | null;
  #disposed = false;
  readonly #changeHandlers = new Set<(event: import("./types.js").SemanticChangeEvent) => void>();

  get referentialIndex() { return this.#kernel.referentialIndex; }

  onDidChangeSemantics(handler: (event: import("./types.js").SemanticChangeEvent) => void): import("./types.js").Disposable {
    this.#changeHandlers.add(handler);
    return { dispose: () => { this.#changeHandlers.delete(handler); } };
  }

  #fireSemanticChange(domains: import("./types.js").SemanticChangeDomain[]): void {
    if (this.#changeHandlers.size === 0) return;
    const event: import("./types.js").SemanticChangeEvent = {
      fingerprint: this.#query.model.fingerprint,
      domains,
    };
    for (const handler of this.#changeHandlers) {
      try { handler(event); } catch { /* consumer errors must not crash the workspace */ }
    }
  }

  constructor(options: SemanticWorkspaceEngineOptions) {
    this.#logger = options.logger;
    this.#trace = process.env.AURELIA_PERF
      ? createTrace({
          name: "workspace",
          exporter: createConsoleExporter({
            minDuration: 100_000n, // 0.1ms — skip trivial spans
            logEvents: false,
            log: (msg) => console.error(msg),
          }),
        })
      : null;

    this.#env = createTypeScriptEnvironment({
      logger: options.logger,
      workspaceRoot: options.workspaceRoot ?? null,
      tsconfigPath: options.tsconfigPath ?? null,
      configFileName: options.configFileName,
    });

    const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
    this.#workspaceRoot = workspaceRoot;
    const discovery: ProjectSemanticsDiscoveryConfigBase = {
      ...(options.discovery ?? {}),
      packagePath: options.discovery?.packagePath ?? workspaceRoot,
      fileSystem: options.discovery?.fileSystem ?? createNodeFileSystem({ root: workspaceRoot }),
      ...(this.#trace ? { trace: this.#trace } : {}),
    };

    this.#projectIndex = new AureliaProjectIndex({
      ts: this.#env.project,
      logger: options.logger,
      discovery,
      seededDiscovery: options.seededDiscovery,
    });
    this.#projectVersion = this.#env.project.getProjectVersion();

    this.#resourceScope = options.resourceScope ?? null;
    this.#vm = options.vm ?? this.#env.vmReflection;
    this.#typescript = options.typescript === false
      ? undefined
      : options.typescript ?? this.#env.typescript;
    this.#isJs = options.isJs ?? false;
    this.#overlayBaseName = options.overlayBaseName;
    this.#styleProfile = options.styleProfile ?? null;
    this.#refactorOverrides = options.refactorOverrides ?? null;
    this.#refactorPolicy = options.refactorPolicy ?? DEFAULT_REFACTOR_POLICY;
    this.#refactorDecisions = options.refactorDecisions ?? null;

    this.#lookupText = options.lookupText;
    this.#query = this.#projectIndex.currentModel().query();
    this.#templateIndex = buildTemplateIndex(this.#query);
    this.#definitionIndex = buildResourceDefinitionIndex(this.#query);

    this.#kernel = createSemanticWorkspaceKernel({
      program: this.#programOptions(this.#vm, this.#isJs, this.#overlayBaseName),
      ...(this.#typescript ? { language: { typescript: this.#typescript } } : {}),
      fingerprint: this.#query.model.fingerprint,
      lookupText: (uri) => this.#lookupText?.(uri) ?? null,
    });

    this.#ensurePrelude(workspaceRoot);
    this.#refactorProxy = new WorkspaceRefactorProxy(this, this.#kernel.refactor());
  }

  /**
   * Asynchronously discover and merge third-party npm resources.
   *
   * Scans project dependencies for Aurelia packages, analyzes them,
   * and merges their resources into the project index. Triggers a
   * workspace refresh if new resources are found.
   */
  async initThirdParty(options?: ThirdPartyOptions): Promise<void> {
    try {
      const thirdPartyResult = await resolveThirdPartyResources(
        options ?? { scan: true },
        {
          packagePath: this.#workspaceRoot,
          logger: this.#logger,
        },
      );

      const hasResources = hasThirdPartyResources(thirdPartyResult.resources);
      const hasGaps = thirdPartyResult.gaps.length > 0;
      if (!hasResources && !hasGaps) {
        this.#logger.info("[workspace] Third-party scan: no Aurelia packages found");
        return;
      }

      const applied = this.#projectIndex.applyThirdPartyOverlay(thirdPartyResult);
      if (applied) {
        this.#logger.info("[workspace] Third-party overlay applied, refreshing workspace");
        this.#rebuildFromModel(this.#projectIndex.currentModel());
        this.#fireSemanticChange(["resources", "scopes"]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#logger.warn(`[workspace] Third-party analysis failed: ${message}`);
    }
  }

  get projectIndex(): AureliaProjectIndex {
    return this.#projectIndex;
  }

  get templates(): readonly TemplateInfo[] {
    return this.#templateIndex.templates;
  }

  get inlineTemplates(): readonly InlineTemplateInfo[] {
    return this.#templateIndex.inlineTemplates;
  }

  refresh(options?: { force?: boolean }): boolean {
    const version = this.#env.project.getProjectVersion();
    if (!options?.force && version === this.#projectVersion) {
      return false;
    }

    this.#projectIndex.refresh();
    this.#projectVersion = version;
    this.#rebuildFromModel(this.#projectIndex.currentModel());
    this.#fireSemanticChange(["resources", "types", "scopes", "diagnostics"]);
    return true;
  }

  configureProject(options: { workspaceRoot?: string | null; tsconfigPath?: string | null; configFileName?: string }): void {
    const root = options.workspaceRoot ?? null;
    if (root) {
      this.#workspaceRoot = path.resolve(root);
    }
    this.#env.tsService.configure({
      workspaceRoot: root,
      tsconfigPath: options.tsconfigPath ?? null,
      configFileName: options.configFileName,
    });
    if (this.#env.project.configure) {
      this.#env.project.configure({
        logger: this.#logger,
        paths: this.#env.paths,
        workspaceRoot: root,
        tsconfigPath: options.tsconfigPath ?? null,
        configFileName: options.configFileName,
      });
    }
    this.#ensurePrelude(root ?? process.cwd());
    this.refresh({ force: true });
  }

  invalidateProject(reason?: string): void {
    this.#env.project.invalidate?.(reason);
  }

  setResourceScope(scope: ResourceScopeId | null): boolean {
    this.#resourceScope = scope;
    this.#resourceReferenceIndex = null;
    // Refresh model from project index in case it was mutated externally
    // (e.g., applyThirdPartyOverlay called directly on projectIndex).
    this.#query = this.#projectIndex.currentModel().query();
    return this.#kernel.reconfigure({
      program: this.#programOptions(this.#vm, this.#isJs, this.#overlayBaseName),
      fingerprint: this.#query.model.fingerprint,
      lookupText: (uri) => this.#lookupText?.(uri) ?? null,
    });
  }

  open(uri: DocumentUri, text?: string, version?: number): void {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    this.#kernel.open(canonical.uri, text, version);
  }

  update(uri: DocumentUri, text: string, version?: number): void {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    this.#kernel.update(canonical.uri, text, version);
  }

  close(uri: DocumentUri): void {
    this.#ensureIndexFresh();
    const canonical = canonicalDocumentUri(uri);
    this.#kernel.close(canonical.uri);
    this.#deactivateTemplate();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    for (const snapshot of this.#kernel.sources.all()) {
      try {
        this.#kernel.close(snapshot.uri);
      } catch {
        // best-effort teardown
      }
    }
    this.#resourceReferenceIndex = null;
    this.#diagnosticsCache = null;
    this.#deactivateTemplate();
    this.#env.dispose();
  }

  snapshot(): WorkspaceSnapshot {
    this.#ensureIndexFresh();
    const base = this.#kernel.snapshot();
    return {
      ...base,
      semanticSnapshot: this.#query.semanticSnapshot,
      apiSurface: this.#query.apiSurfaceSnapshot,
    };
  }

  diagnostics(uri: DocumentUri): WorkspaceDiagnostics {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    return this.#diagnosticsForUri(canonical.uri);
  }

  // Debug/testing hook to assert normalization contract health.
  debugDiagnosticsPipeline(uri: DocumentUri): DiagnosticsPipelineResult {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    return this.#diagnosticsPipeline(canonical.uri);
  }

  query(uri: DocumentUri): SemanticQuery {
    const canonical = canonicalDocumentUri(uri);
    const base = this.#kernel.query(canonical.uri);
    return {
      hover: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        const metaResult = this.#metaHover(canonical.uri, pos);
        if (metaResult) return metaResult;
        const baseResult = base.hover(pos);
        if (!baseResult) return null;
        return this.#augmentHover(canonical.uri, pos, baseResult);
      },
      definition: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        const meta = this.#metaDefinition(canonical.uri, pos) ?? [];
        const defs = this.#definitionSlicesAt(canonical.uri, pos);
        const baseDefs = base.definition(pos);
        // Canonical definition ordering is policy-owned:
        // meta -> local -> resource -> base.
        return mergeTieredLocations(canonical.uri, [
          { tier: "meta", items: meta },
          { tier: "local", items: defs.local },
          { tier: "resource", items: defs.resource },
          { tier: "base", items: baseDefs },
        ]);
      },
      references: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        if (!this.#isTemplateUri(canonical.uri)) {
          const baseRefs = this.#referencesFromTypeScript(canonical.uri, pos);
          return mergeTieredLocationsWithIds(canonical.uri, [{ tier: "base", items: baseRefs }]);
        }
        const local = this.#localReferencesAt(canonical.uri, pos);
        const resourceRefs = this.#resourceReferencesAt(canonical.uri, pos);
        let baseRefs: readonly WorkspaceLocation[] = [];
        if (local.length === 0 && resourceRefs.length === 0) {
          this.#syncTemplateOverlaysForReferences(canonical.uri);
          baseRefs = base.references(pos);
        }
        // References preserve identity multiplicity and apply canonical tiering:
        // local -> resource -> base, with symbol-aware dedupe.
        return mergeTieredLocationsWithIds(canonical.uri, [
          { tier: "local", items: local },
          { tier: "resource", items: resourceRefs },
          { tier: "base", items: baseRefs },
        ]);
      },
      completions: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        return this.#computeCompletions(canonical.uri, pos, base);
      },
      diagnostics: () => this.diagnostics(canonical.uri),
      semanticTokens: () => {
        this.#ensureTemplateContext(canonical.uri);
        return this.#semanticTokens(canonical.uri);
      },
      inspect: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        return base.inspect(pos);
      },
    };
  }

  refactor(): RefactorEngine {
    return this.#refactorProxy;
  }

  policy(): RefactorPolicy {
    return this.#refactorPolicy;
  }

  collectCodeActions(request: WorkspaceCodeActionRequest): readonly WorkspaceCodeAction[] {
    const canonical = canonicalDocumentUri(request.uri);
    this.#ensureTemplateContext(canonical.uri);
    const diagnostics = this.#diagnosticsForSurface(canonical.uri, "lsp");
    return this.#templateEditEngine().codeActions({ ...request, uri: canonical.uri }, diagnostics);
  }

  prepareRefactor(uri: DocumentUri): void {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    this.#syncTemplateOverlaysForReferences(canonical.uri);
  }

  prepareRename(request: WorkspacePrepareRenameRequest): WorkspacePrepareRenameResult {
    const canonical = canonicalDocumentUri(request.uri);
    this.#ensureTemplateContext(canonical.uri);
    const result = this.#templateEditEngine().prepareRenameAt({ ...request, uri: canonical.uri });
    if (!result) {
      return {
        error: {
          kind: "refactor-policy-denied",
          message: "Rename is not available at this position.",
          retryable: false,
        },
      };
    }
    return { result };
  }

  tryResourceRename(request: WorkspaceRenameRequest): WorkspaceRefactorResult | null {
    const canonical = canonicalDocumentUri(request.uri);
    this.#ensureTemplateContext(canonical.uri);
    const edits = this.#templateEditEngine().renameAt({ ...request, uri: canonical.uri });
    if (!edits?.length) return null;
    return { edit: { edits } };
  }

  /**
   * Rename a VM property/method across TS and template domains.
   *
   * Handles both template-initiated renames (cursor on expression identifier
   * in binding/interpolation) and TS-initiated renames (cursor on property
   * declaration or usage in TS file).
   */
  tryExpressionMemberRename(request: WorkspaceRenameRequest): WorkspaceRefactorResult | null {
    const canonical = canonicalDocumentUri(request.uri);
    const text = this.lookupText(canonical.uri);
    if (!text) return null;
    const offset = offsetAtPosition(text, request.position);
    if (offset == null) return null;

    let propertyName: string | null = null;
    let vmPath: string | null = null;

    if (this.#isTemplateUri(canonical.uri)) {
      // Template-initiated: resolve the expression entity
      this.#ensureTemplateContext(canonical.uri);
      const compilation = this.#kernel.getCompilation(canonical.uri);
      if (!compilation) return null;
      const exprAt = compilation.query.exprAt(offset);
      if (!exprAt) return null;
      propertyName = exprAt.memberPath ?? null;
      if (!propertyName) return null;
      vmPath = this.#templateIndex.templateToComponent.get(canonical.uri) ?? null;
    } else {
      // TS-initiated: identify the symbol at cursor
      const filePath = this.#env.paths.canonical(canonical.path);
      propertyName = this.#symbolNameAt(filePath, offset, text);
      vmPath = canonical.path;
    }

    if (!propertyName || !vmPath) return null;

    const edits: WorkspaceTextEdit[] = [];

    // TS-side edits: use TS findRenameLocations
    const tsEdits = this.#renameTsSymbol(vmPath, offset, request.newName, canonical);
    edits.push(...tsEdits);

    // Template-side edits: find binding expressions referencing this property
    const templateEdits = this.#renameTemplateBindings(canonical.uri, vmPath, propertyName, request.newName);
    edits.push(...templateEdits);

    if (!edits.length) return null;
    return { edit: { edits } };
  }

  #renameTsSymbol(
    vmPath: string,
    offset: number,
    newName: string,
    canonical: { uri: DocumentUri; path: string },
  ): WorkspaceTextEdit[] {
    const service = this.#env.tsService.getService();
    const filePath = this.#env.paths.canonical(vmPath);
    let renameOffset = offset;

    // For template-initiated renames, find the property declaration in the TS file
    if (this.#isTemplateUri(canonical.uri)) {
      const program = service.getProgram();
      const sourceFile = program?.getSourceFile(filePath) ?? program?.getSourceFile(path.resolve(filePath));
      if (!sourceFile || !program) return [];
      const sourceText = sourceFile.getFullText();
      // Find property name in the source text (simple scan)
      const compilation = this.#kernel.getCompilation(canonical.uri);
      if (!compilation) return [];
      const exprAt = compilation.query.exprAt(offset);
      const memberName = exprAt?.memberPath ?? null;
      if (!memberName) return [];
      const propOffset = findPropertyInTsFile(sourceFile, memberName);
      if (propOffset == null) return [];
      renameOffset = propOffset;
    }

    const locations = service.findRenameLocations(filePath, renameOffset, false, false) ?? [];
    const edits: WorkspaceTextEdit[] = [];
    for (const loc of locations) {
      // Skip overlay files (generated TypeScript)
      if (loc.fileName.includes('.overlay.') || loc.fileName.includes('__prelude__')) continue;
      const locCanonical = canonicalDocumentUri(loc.fileName);
      edits.push({
        uri: locCanonical.uri,
        span: normalizeSpan(
          toSourceSpan(
            { start: loc.textSpan.start, end: loc.textSpan.start + loc.textSpan.length },
            locCanonical.file,
          ),
        ),
        newText: newName,
      });
    }
    return edits;
  }

  #renameTemplateBindings(
    activeUri: DocumentUri,
    vmPath: string,
    propertyName: string,
    newName: string,
  ): WorkspaceTextEdit[] {
    const refs = this.#templateReferencesForVmMember(activeUri, vmPath, propertyName);
    return refs.map(ref => ({
      uri: ref.uri,
      span: ref.span,
      newText: newName,
    }));
  }

  planRename(request: WorkspaceRenameRequest) {
    return planRenameExecution(
      this.#refactorPolicy,
      this.#renameExecutionContext(request),
      this.#decisionResolution(request.refactorDecisions),
    );
  }

  planRenamePreflight(request: WorkspaceRenameRequest): RenamePreflightPlan {
    const probe = this.#renameExecutionContextProbe(request, { ensureTemplateContext: false });
    return {
      plan: planRenameExecution(
        this.#refactorPolicy,
        probe.context,
        this.#decisionResolution(request.refactorDecisions),
      ),
      conclusive: probe.conclusive,
    };
  }

  planCodeActions(request: WorkspaceCodeActionRequest) {
    return planCodeActionExecution(
      this.#refactorPolicy,
      this.#decisionResolution(request.refactorDecisions),
    );
  }

  #renameExecutionContext(request: WorkspaceRenameRequest): RenameExecutionContext {
    return this.#renameExecutionContextProbe(request, { ensureTemplateContext: true }).context;
  }

  #renameExecutionContextProbe(
    request: WorkspaceRenameRequest,
    options: { ensureTemplateContext: boolean },
  ): RenameExecutionContextProbe {
    const ensureTemplateContext = options.ensureTemplateContext;
    const canonical = canonicalDocumentUri(request.uri);
    const inWorkspace = isPathWithin(this.#workspaceRoot, canonical.path);
    const text = this.lookupText(canonical.uri);
    const unknownContext = (): RenameExecutionContext => ({
      target: "unknown",
      resourceOrigin: "unknown",
      hasSemanticProvenance: false,
      hasMappedProvenance: inWorkspace,
      workspaceDocument: inWorkspace,
    });
    if (!text) {
      return {
        context: unknownContext(),
        conclusive: false,
      };
    }

    const offset = offsetAtPosition(text, request.position);
    if (offset == null) {
      return {
        context: unknownContext(),
        conclusive: false,
      };
    }

    const projectVersionCurrent = this.#env.project.getProjectVersion() === this.#projectVersion;

    if (this.#isTemplateUri(canonical.uri)) {
      if (ensureTemplateContext) {
        this.#ensureTemplateContext(canonical.uri);
      } else if (!projectVersionCurrent) {
        return {
          context: unknownContext(),
          conclusive: false,
        };
      }
      if (!this.#kernel.getCompilation(canonical.uri)) {
        return {
          context: unknownContext(),
          conclusive: false,
        };
      }
      const probe = this.#templateEditEngine().probeRenameAt({ ...request, uri: canonical.uri });
      const mappingPresent = this.#kernel.getMapping(canonical.uri) !== null;
      const positionMapped = this.#kernel.provenance.lookupSource(canonical.uri, offset) !== null;
      const mappedProvenance = decideRenameMappedProvenance({
        mappingPresent,
        positionMapped,
      });
      return {
        context: {
          target: probe.targetClass,
          resourceOrigin: probe.resourceOrigin ?? "unknown",
          hasSemanticProvenance: probe.hasSemanticProvenance,
          hasMappedProvenance: mappedProvenance.hasMappedProvenance,
          workspaceDocument: inWorkspace,
        },
        conclusive: true,
      };
    }

    const symbol = this.#symbolNameAt(this.#env.paths.canonical(canonical.path), offset, text);
    return {
      context: {
        target: symbol ? "expression-member" : "unknown",
        resourceOrigin: "unknown",
        hasSemanticProvenance: false,
        // Non-template docs are direct source edits, so mapping precondition is satisfied.
        hasMappedProvenance: true,
        workspaceDocument: inWorkspace,
      },
      conclusive: ensureTemplateContext || projectVersionCurrent,
    };
  }

  #decisionResolution(provided?: RefactorDecisionSet | null): DecisionResolutionInput {
    // Resolution precedence: request-level overrides > workspace defaults > inferred profile values.
    return {
      provided: mergeRefactorDecisions(this.#refactorDecisions, provided),
      inferred: this.#inferredDecisionValues(),
    };
  }

  #inferredDecisionValues(): RefactorDecisionSet {
    const inferred: Partial<Record<RefactorDecisionPointId, string>> = {};
    const renameStyle = this.#refactorOverrides?.renameStyle ?? this.#styleProfile?.refactors?.renameStyle;
    if (renameStyle !== undefined) {
      inferred["rename-style"] = renameStyle;
    }
    const importStyle = this.#styleProfile?.imports?.organize;
    if (importStyle !== undefined) {
      inferred["import-style"] = importStyle;
    }
    const aliasStrategy = this.#styleProfile?.imports?.aliasStyle;
    if (aliasStrategy !== undefined) {
      inferred["alias-strategy"] = aliasStrategy;
    }
    return inferred;
  }

  lookupText(uri: DocumentUri): string | null {
    const canonical = canonicalDocumentUri(uri);
    const snap = this.#kernel.sources.get(canonical.uri);
    if (snap) return snap.text;
    if (this.#lookupText) {
      const text = this.#lookupText(canonical.uri);
      if (text != null) return text;
    }
    try {
      return fs.readFileSync(canonical.path, "utf8");
    } catch {
      return null;
    }
  }

  ensureFromFile(uri: DocumentUri): { uri: DocumentUri; text: string } | null {
    const canonical = canonicalDocumentUri(uri);
    const existing = this.#kernel.sources.get(canonical.uri);
    if (existing) return { uri: canonical.uri, text: existing.text };
    const text = this.lookupText(canonical.uri);
    if (text == null) return null;
    this.#ensureTemplateContext(canonical.uri);
    this.#kernel.open(canonical.uri, text);
    return { uri: canonical.uri, text };
  }

  getOverlay(uri: DocumentUri): OverlayBuildArtifact {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    return this.#kernel.getOverlay(canonical.uri);
  }

  getMapping(uri: DocumentUri): TemplateMappingArtifact | null {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    return this.#kernel.getMapping(canonical.uri);
  }

  getCompilation(uri: DocumentUri): TemplateCompilation | null {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    return this.#kernel.getCompilation(canonical.uri);
  }

  getQueryFacade(uri: DocumentUri): TemplateQueryFacade | null {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    return this.#kernel.getQueryFacade(canonical.uri);
  }

  getCacheStats(target?: DocumentUri) {
    return this.#kernel.getCacheStats(target);
  }

  /**
   * Rebuild all derived state from a new SemanticModel.
   *
   * Centralizes the model → query → derived indexes → kernel reconfigure flow.
   * Called on refresh, third-party overlay, and any other model replacement.
   */
  #rebuildFromModel(model: SemanticModel): void {
    const query = model.query();
    this.#query = query;
    this.#templateIndex = buildTemplateIndex(query);
    this.#definitionIndex = buildResourceDefinitionIndex(query);
    this.#resourceReferenceIndex = null;
    // kernel.reconfigure() → updateOptions() handles per-template invalidation
    // through dependency fingerprint comparison.
    this.#kernel.reconfigure({
      program: this.#programOptions(this.#vm, this.#isJs, this.#overlayBaseName),
      fingerprint: query.model.fingerprint,
      lookupText: (uri) => this.#lookupText?.(uri) ?? null,
    });
  }

  #ensurePrelude(root: string): void {
    const preludePath = path.join(root, ".aurelia", "__prelude.d.ts");
    this.#env.tsService.ensurePrelude(preludePath, PRELUDE_TS);
  }

  #ensureIndexFresh(): void {
    const version = this.#env.project.getProjectVersion();
    if (version === this.#projectVersion) return;
    this.refresh({ force: true });
  }

  #ensureTemplateContext(uri: DocumentUri): void {
    this.#ensureIndexFresh();
    this.#activateTemplate(uri);
  }

  #computeCompletions(
    uri: DocumentUri,
    pos: { line: number; character: number },
    base: SemanticQuery,
  ): readonly WorkspaceCompletionItem[] {
    const text = this.lookupText(uri);
    if (!text) return base.completions(pos);
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return base.completions(pos);

    const compilation = this.#kernel.getCompilation(uri);
    const snapshot = this.#kernel.snapshot();
    const baseCompletions = base.completions(pos);

    const ctx: CompletionEngineContext = {
      text,
      uri,
      offset,
      compilation,
      definitions: this.#definitionIndex,
      query: this.#query,
      syntax: this.#query.syntax,
      catalog: snapshot.catalog,
      semantics: snapshot.semantics,
      baseCompletions,
    };

    return computeCompletions(ctx);
  }

  #attributeSyntaxContext(): AttributeSyntaxContext {
    const syntax = this.#query.syntax;
    if (!this.#attrParser || this.#attrParserSyntax !== syntax) {
      this.#attrParser = createAttributeParserFromRegistry(syntax);
      this.#attrParserSyntax = syntax;
    }
    return { syntax, parser: this.#attrParser };
  }

  #templateEditEngine(): TemplateEditEngine {
    return new TemplateEditEngine({
      workspaceRoot: this.#workspaceRoot,
      templateIndex: this.#templateIndex,
      definitionIndex: this.#definitionIndex,
      facts: this.#query.facts,
      compilerOptions: this.#env.tsService.compilerOptions(),
      lookupText: this.lookupText.bind(this),
      getCompilation: (uri) => this.#kernel.getCompilation(uri),
      ensureTemplate: (uri) => {
        this.#kernel.ensureFromFile(uri);
      },
      getResourceReferencesBySymbolId: (activeUri, symbolId) => {
        const index = this.#ensureResourceReferenceIndex(activeUri);
        return index.bySymbol.get(symbolId) ?? [];
      },
      getAttributeSyntax: this.#attributeSyntaxContext.bind(this),
      styleProfile: this.#styleProfile,
      refactorOverrides: this.#refactorOverrides,
      semanticRenameRouteOrder: this.#refactorPolicy.rename.semantic.routeOrder,
    });
  }

  #programOptions(vm: VmReflection, isJs: boolean, overlayBaseName?: string) {
    const query = this.#query;
    const defaultScope = query.model.defaultScope ?? query.graph?.root ?? null;
    const moduleResolver: ModuleResolver = (specifier, containingFile) => {
      const canonical = canonicalDocumentUri(containingFile);
      const componentPath = this.#templateIndex.templateToComponent.get(canonical.uri) ?? canonical.path;
      return resolveModuleSpecifier(specifier, componentPath, this.#env.tsService.compilerOptions());
    };
    const templateContext = (uri: DocumentUri) => {
      const canonical = canonicalDocumentUri(uri).uri;
      const scope = this.#resourceScope ?? this.#templateIndex.templateToScope.get(canonical) ?? defaultScope;
      return { scopeId: scope ?? null };
    };
    return {
      vm,
      isJs,
      query,
      moduleResolver,
      templateContext,
      depGraph: query.model.deps,
      ...(overlayBaseName !== undefined ? { overlayBaseName } : {}),
      ...(this.#trace ? { trace: this.#trace } : {}),
    };
  }

  #activateTemplate(uri: DocumentUri): void {
    const canonical = canonicalDocumentUri(uri);
    const setter = getActiveTemplateSetter(this.#vm);
    const componentPath = this.#templateIndex.templateToComponent.get(canonical.uri) ?? canonical.path;
    if (setter) setter(componentPath);
    this.#applyTemplateScope(canonical.uri);
  }

  #deactivateTemplate(): void {
    const setter = getActiveTemplateSetter(this.#vm);
    if (!setter) return;
    setter(null);
  }

  #applyTemplateScope(uri: DocumentUri): void {
    if (this.#resourceScope !== null) {
      return;
    }
    void uri;
  }

  #metaHover(uri: DocumentUri, pos: { line: number; character: number }): WorkspaceHover | null {
    const text = this.lookupText(uri);
    if (!text) return null;
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return null;
    const compilation = this.#kernel.getCompilation(uri);
    const template = compilation?.linked?.templates?.[0];
    if (!template?.templateMeta) return null;

    const metaHover = getMetaElementHover(template.templateMeta, offset);
    if (!metaHover) return null;
    return {
      contents: metaHover.contents,
      location: { uri, span: metaHover.span },
    };
  }

  #augmentHover(uri: DocumentUri, pos: { line: number; character: number }, baseResult: WorkspaceHover): WorkspaceHover {
    const text = this.lookupText(uri);
    if (!text) return baseResult;
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return baseResult;
    const compilation = this.#kernel.getCompilation(uri);
    if (!compilation) return baseResult;

    const resource = this.#identifyHoveredResource(compilation, offset);
    if (!resource) return baseResult;

    const entry = findEntry(resource.map, resource.name, resource.file, [this.#workspaceRoot]);
    if (!entry) return baseResult;

    // Extract provenance origin from Sourced<T> on the resource name
    const provenanceLine = formatProvenanceOrigin(entry.def.name);

    // Derive per-resource confidence from catalog gap state
    const gapKey = `${entry.def.kind}:${resource.name}`;
    const gaps = this.#query.catalog.gapsByResource?.[gapKey] ?? [];
    const derived = deriveResourceConfidence(gaps, entry.def.name.origin);
    // Only surface confidence when it indicates reduced trust
    const confidence = derived.level === "exact" || derived.level === "high" ? undefined : derived.level;
    const confidenceReason = confidence ? derived.reason : undefined;

    // Append overlay link for resource entities (always last in card).
    // augmentHoverContent inserts provenance/confidence BEFORE this link.
    let contents = baseResult.contents;
    const overlay = this.#kernel.program.getOverlay(uri);
    if (overlay?.text) {
      contents = contents + "\n\n[$(file-code) Show overlay]";
    }

    // Augment content with provenance, then confidence indicator
    if (provenanceLine) {
      contents = augmentHoverContent(contents, provenanceLine);
    }
    const confidenceLine = formatConfidenceLine(confidence, confidenceReason);
    if (confidenceLine) {
      contents = augmentHoverContent(contents, confidenceLine);
    }

    return {
      ...baseResult,
      contents,
      ...(confidence ? { confidence, confidenceReason } : {}),
    };
  }

  #identifyHoveredResource(compilation: TemplateCompilation, offset: number): HoveredResourceIdentity | null {
    // Custom elements
    const node = compilation.query.nodeAt(offset);
    if (node) {
      const template = compilation.linked.templates[node.templateIndex];
      if (template) {
        const row = template.rows.find((r) => r.target === node.id);
        if (row?.node.kind === "element" && row.node.custom?.def) {
          return {
            name: row.node.custom.def.name,
            file: row.node.custom.def.file ?? null,
            map: this.#definitionIndex.elements,
          };
        }
      }
    }

    // Instruction-based resources (attributes, controllers)
    const domIndex = buildDomIndex(compilation.ir.templates ?? []);
    const instructionHits = findInstructionHitsAtOffset(
      compilation.linked.templates,
      compilation.ir.templates ?? [],
      domIndex,
      offset,
    );
    for (const hit of instructionHits) {
      if (hit.instruction.kind === "hydrateAttribute") {
        const res = hit.instruction.res?.def;
        if (res) {
          return {
            name: res.name,
            file: res.file ?? null,
            map: this.#definitionIndex.attributes,
          };
        }
      }
      if (hit.instruction.kind === "hydrateTemplateController") {
        return {
          name: hit.instruction.res,
          file: null,
          map: this.#definitionIndex.controllers,
        };
      }
    }

    // Value converters
    const converterHit = findValueConverterAtOffset(compilation.exprTable, offset);
    if (converterHit) {
      return {
        name: converterHit.name,
        file: null,
        map: this.#definitionIndex.valueConverters,
      };
    }

    // Binding behaviors
    const behaviorHit = findBindingBehaviorAtOffset(compilation.exprTable, offset);
    if (behaviorHit) {
      return {
        name: behaviorHit.name,
        file: null,
        map: this.#definitionIndex.bindingBehaviors,
      };
    }

    return null;
  }

  #metaDefinition(uri: DocumentUri, pos: { line: number; character: number }): WorkspaceLocation[] | null {
    const text = this.lookupText(uri);
    if (!text) return null;
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return null;
    const compilation = this.#kernel.getCompilation(uri);
    const template = compilation?.linked?.templates?.[0];
    if (!template?.templateMeta) return null;

    const meta = findImportAtOffset(template.templateMeta, offset);
    if (!meta) return null;
    const specifier = meta.from.value;
    const canonical = canonicalDocumentUri(uri);
    const containingFile = this.#templateIndex.templateToComponent.get(canonical.uri) ?? canonical.path;
    const resolvedPath = resolveModuleSpecifier(specifier, containingFile, this.#env.tsService.compilerOptions());
    if (!resolvedPath) return null;

    const span = findFirstExportSpan(resolvedPath);
    const target = canonicalDocumentUri(resolvedPath);
    const loc: WorkspaceLocation = {
      uri: target.uri,
      span: span ?? { start: 0, end: 0, file: target.file },
    };
    return [loc];
  }

  #definitionSlicesAt(uri: DocumentUri, pos: { line: number; character: number }): TemplateDefinitionSlices {
    const text = this.lookupText(uri);
    if (!text) return EMPTY_DEFINITION_SLICES;
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return EMPTY_DEFINITION_SLICES;
    const compilation = this.#kernel.getCompilation(uri);
    if (!compilation) return EMPTY_DEFINITION_SLICES;
    const syntax = this.#attributeSyntaxContext();
    return collectTemplateDefinitionSlices({
      compilation,
      text,
      offset,
      resources: this.#definitionIndex,
      syntax,
      preferRoots: [this.#workspaceRoot],
      documentUri: uri,
      resolveClassLocation: (className) => this.#resolveClassLocation(className),
    });
  }

  /**
   * Resolve a class name to its declaration location via the TS program.
   *
   * Used as a fallback when a resource has no file location (builtins,
   * framework classes). Searches the TS program's source files for a class
   * export matching the name and returns the declaration span.
   */
  #resolveClassLocation(className: string): WorkspaceLocation | null {
    try {
      const program = this.#env.project.getProgram();
      if (!program) return null;
      const checker = program.getTypeChecker();

      for (const sf of program.getSourceFiles()) {
        // Skip project source files — only search external declarations
        // (framework, plugins). Handles both node_modules paths and symlinked
        // monorepo paths (e.g., aurelia-60/packages/runtime-html).
        if (!sf.isDeclarationFile) continue;
        const symbol = checker.getSymbolAtLocation(sf);
        if (!symbol) continue;
        const exports = checker.getExportsOfModule(symbol);
        for (const exp of exports) {
          if (exp.getName() !== className) continue;
          // Accept Class or any value export (d.ts files may not have Class flag)
          if (!(exp.getFlags() & (ts.SymbolFlags.Class | ts.SymbolFlags.Value))) continue;
          const decl = exp.getDeclarations()?.[0];
          if (!decl) continue;
          const declFile = decl.getSourceFile();
          return {
            uri: canonicalDocumentUri(declFile.fileName).uri,
            span: { start: decl.getStart(), end: decl.getEnd(), file: toSourceFileId(declFile.fileName) },
          };
        }
      }
    } catch {
      // best-effort — return null if TS resolution fails
    }
    return null;
  }

  #localReferencesAt(uri: DocumentUri, pos: { line: number; character: number }): WorkspaceLocation[] {
    const ctx = this.#referenceContext(uri, pos);
    if (!ctx) return [];
    return collectTemplateReferences({
      compilation: ctx.compilation,
      text: ctx.text,
      offset: ctx.offset,
      documentUri: uri,
    });
  }

  #referencesFromTypeScript(uri: DocumentUri, pos: { line: number; character: number }): WorkspaceLocation[] {
    const text = this.lookupText(uri);
    if (!text) return [];
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return [];

    this.#syncTemplateOverlaysForReferences(uri);

    const canonical = canonicalDocumentUri(uri);
    const filePath = this.#env.paths.canonical(canonical.path);
    const refs = this.#env.tsService.getService().getReferencesAtPosition(filePath, offset) ?? [];
    const results: WorkspaceLocation[] = [];
    const provenance = this.#kernel.provenance;
    for (const ref of refs) {
      const refCanonical = canonicalDocumentUri(ref.fileName);
      const span = normalizeSpan(
        toSourceSpan(
          { start: ref.textSpan.start, end: ref.textSpan.start + ref.textSpan.length },
          refCanonical.file,
        ),
      );
      const hit = provenance.projectGeneratedSpan(refCanonical.uri, span);
      const mapped = overlayHitToDocumentSpan(hit);
      const decision = resolveGeneratedReferenceLocationWithPolicy({
        generatedUri: refCanonical.uri,
        generatedSpan: span,
        mappedLocation: mapped,
        mappedEvidence: hit?.edge.evidence?.level ?? null,
        provenance,
      });
      if (!decision.location) continue;
      const location = decision.location;
      results.push({
        uri: location.uri,
        span: location.span,
        ...(location.exprId ? { exprId: location.exprId } : {}),
        ...(location.nodeId ? { nodeId: location.nodeId } : {}),
      });
    }

    const symbolName = this.#symbolNameAt(filePath, offset, text);
    const templateRefs = symbolName
      ? this.#templateReferencesForVmMember(canonical.uri, canonical.path, symbolName)
      : [];
    if (templateRefs.length) {
      results.push(...templateRefs);
    }

    debug.workspace("references.ts", {
      uri: canonical.uri,
      symbol: symbolName ?? null,
      tsRefs: refs.length,
      templateRefs: templateRefs.length,
      total: results.length,
    });

    return results;
  }

  #symbolNameAt(filePath: string, offset: number, text: string): string | null {
    const service = this.#env.tsService.getService();
    const program = service.getProgram();
    const sourceFile = program?.getSourceFile(filePath) ?? program?.getSourceFile(path.resolve(filePath));
    if (!sourceFile || !program) return null;
    const checker = program.getTypeChecker();
    const token = this.#findTokenAtOffset(sourceFile, offset);
    if (!token) return extractIdentifierAt(text, offset);
    const symbol = checker?.getSymbolAtLocation(token);
    const name = symbol?.getName();
    if (name && name !== "default") return name;
    if (ts.isIdentifier(token)) return token.text;
    return extractIdentifierAt(text, offset);
  }

  #findTokenAtOffset(sourceFile: ts.SourceFile, offset: number): ts.Node | null {
    let best: ts.Node | null = null;

    const visit = (node: ts.Node) => {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      if (offset < start || offset >= end) return;

      if (!best) {
        best = node;
      } else {
        const bestStart = best.getStart(sourceFile);
        const bestEnd = best.getEnd();
        if (end - start < bestEnd - bestStart) {
          best = node;
        }
      }

      node.forEachChild(visit);
    };

    visit(sourceFile);
    return best;
  }

  #templateReferencesForVmMember(activeUri: DocumentUri, vmPath: string, memberName: string): WorkspaceLocation[] {
    const normalizedVm = normalizePathForId(path.resolve(vmPath));
    const results: WorkspaceLocation[] = [];
    const sources = this.#kernel.sources;
    let activated = false;

    for (const [templateUri, componentPath] of this.#templateIndex.templateToComponent.entries()) {
      const normalizedComponent = normalizePathForId(path.resolve(componentPath));
      if (normalizedComponent !== normalizedVm) continue;
      const text = this.lookupText(templateUri);
      if (!text) continue;
      if (!sources.get(templateUri)) {
        this.#kernel.open(templateUri, text);
      }
      this.#activateTemplate(templateUri);
      activated = true;
      const compilation = this.#kernel.getCompilation(templateUri);
      const mapping = compilation?.mapping;
      if (!mapping) continue;

      for (const entry of mapping.entries) {
        for (const segment of entry.segments ?? []) {
          if (segment.path !== memberName) continue;
          results.push({
            uri: templateUri,
            span: segment.htmlSpan,
            ...(entry.exprId ? { exprId: entry.exprId } : {}),
          });
        }
      }
    }

    if (activated) {
      this.#activateTemplate(activeUri);
    }

    return results;
  }

  #referenceContext(
    uri: DocumentUri,
    pos: { line: number; character: number },
  ): { text: string; offset: number; compilation: TemplateCompilation } | null {
    const text = this.lookupText(uri);
    if (!text) return null;
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return null;
    const compilation = this.#kernel.getCompilation(uri);
    if (!compilation) return null;
    return { text, offset, compilation };
  }

  #resourceReferencesAt(uri: DocumentUri, pos: { line: number; character: number }): WorkspaceLocation[] {
    const ctx = this.#referenceContext(uri, pos);
    if (!ctx) return [];
    return this.#resourceReferencesAtOffset(uri, ctx.offset);
  }

  #isTemplateUri(uri: DocumentUri): boolean {
    return this.#templateIndex.templateToComponent.has(canonicalDocumentUri(uri).uri);
  }

  #resourceReferencesAtOffset(uri: DocumentUri, offset: number): TextReferenceSite[] {
    const index = this.#ensureResourceReferenceIndex(uri);
    const occurrences = index.byUri.get(uri);
    if (!occurrences || occurrences.length === 0) return [];
    const symbolIds = new Set<SymbolId>();
    for (const occ of occurrences) {
      if (spanContainsOffset(occ.span, offset)) {
        symbolIds.add(occ.symbolId);
      }
    }
    if (symbolIds.size === 0) return [];
    const results: TextReferenceSite[] = [];
    for (const symbolId of symbolIds) {
      const refs = index.bySymbol.get(symbolId);
      if (refs && refs.length > 0) results.push(...refs);
    }
    return results;
  }

  #ensureResourceReferenceIndex(activeUri: DocumentUri): ResourceReferenceIndex {
    this.#ensureIndexFresh();
    const currentFingerprint = this.#kernel.snapshot().meta.fingerprint;
    if (this.#resourceReferenceIndex?.fingerprint === currentFingerprint) {
      return this.#resourceReferenceIndex;
    }

    const sources = this.#kernel.sources;
    const syntax = this.#attributeSyntaxContext();
    const preferRoots = [this.#workspaceRoot];
    const bySymbol = new Map<SymbolId, TextReferenceSite[]>();
    const byUri = new Map<DocumentUri, ResourceReferenceOccurrence[]>();

    const loadTemplate = (uri: DocumentUri, text: string | null) => {
      if (!text) return null;
      if (!sources.get(uri)) {
        this.#kernel.open(uri, text);
      }
      return text;
    };

    const active = canonicalDocumentUri(activeUri).uri;

    for (const entry of this.#templateIndex.templates) {
      const canonical = canonicalDocumentUri(entry.templatePath);
      const text = loadTemplate(canonical.uri, this.lookupText(canonical.uri));
      if (!text) continue;
      this.#activateTemplate(canonical.uri);
      const compilation = this.#kernel.getCompilation(canonical.uri);
      if (!compilation) continue;
      const refs = collectTemplateResourceReferences({
        compilation,
        resources: this.#definitionIndex,
        syntax,
        preferRoots,
        documentUri: canonical.uri,
      });
      if (refs.length === 0) continue;
      const occurrences: ResourceReferenceOccurrence[] = [];
      for (const ref of refs) {
        const symbolId = ref.symbolId;
        if (!symbolId) continue;
        occurrences.push({ span: ref.span, symbolId });
        const list = bySymbol.get(symbolId);
        if (list) {
          list.push(ref);
        } else {
          bySymbol.set(symbolId, [ref]);
        }
      }
      if (occurrences.length > 0) {
        byUri.set(canonical.uri, occurrences);
      }
    }

    for (const entry of this.#templateIndex.inlineTemplates) {
      const inlinePath = inlineTemplatePath(entry.componentPath);
      const canonical = canonicalDocumentUri(inlinePath);
      const text = loadTemplate(canonical.uri, entry.content);
      if (!text) continue;
      this.#activateTemplate(canonical.uri);
      const compilation = this.#kernel.getCompilation(canonical.uri);
      if (!compilation) continue;
      const refs = collectTemplateResourceReferences({
        compilation,
        resources: this.#definitionIndex,
        syntax,
        preferRoots,
        documentUri: canonical.uri,
      });
      if (refs.length === 0) continue;
      const occurrences: ResourceReferenceOccurrence[] = [];
      for (const ref of refs) {
        const symbolId = ref.symbolId;
        if (!symbolId) continue;
        occurrences.push({ span: ref.span, symbolId });
        const list = bySymbol.get(symbolId);
        if (list) {
          list.push(ref);
        } else {
          bySymbol.set(symbolId, [ref]);
        }
      }
      if (occurrences.length > 0) {
        byUri.set(canonical.uri, occurrences);
      }
    }

    // ── TS-side references (declaration sites, class names, bindable properties) ──
    const tsRefs = collectTypeScriptResourceReferences({
      resources: this.#definitionIndex,
    });
    for (const ref of tsRefs) {
      if (ref.kind !== "text") continue;
      const sid = ref.symbolId;
      if (!sid) continue;
      const list = bySymbol.get(sid);
      if (list) {
        list.push(ref);
      } else {
        bySymbol.set(sid, [ref]);
      }
    }

    this.#activateTemplate(active);
    const fingerprint = this.#kernel.snapshot().meta.fingerprint;
    this.#resourceReferenceIndex = {
      fingerprint,
      bySymbol,
      byUri,
    };
    return this.#resourceReferenceIndex;
  }

  #syncTemplateOverlaysForReferences(activeUri: DocumentUri): void {
    const ts = this.#typescript;
    if (!ts?.syncOverlay) return;
    const sources = this.#kernel.sources;
    const templates = new Set<DocumentUri>();

    for (const entry of this.#templateIndex.templates) {
      const canonical = canonicalDocumentUri(entry.templatePath);
      if (!sources.get(canonical.uri)) {
        const text = this.lookupText(canonical.uri);
        if (text == null) continue;
        this.#kernel.open(canonical.uri, text);
      }
      templates.add(canonical.uri);
    }

    for (const entry of this.#templateIndex.inlineTemplates) {
      const canonical = canonicalDocumentUri(inlineTemplatePath(entry.componentPath));
      if (!sources.get(canonical.uri)) {
        this.#kernel.open(canonical.uri, entry.content);
      }
      templates.add(canonical.uri);
    }

    this.#setActiveTemplateForOverlay(activeUri);
    for (const templateUri of templates) {
      this.#setActiveTemplateForOverlay(templateUri);
      const overlay = this.#kernel.program.getOverlay(templateUri);
      ts.syncOverlay(buildOverlaySnapshot(templateUri, overlay));
    }
    this.#setActiveTemplateForOverlay(activeUri);
  }

  #setActiveTemplateForOverlay(uri: DocumentUri): void {
    const setter = getActiveTemplateSetter(this.#vm);
    if (!setter) return;
    const canonical = canonicalDocumentUri(uri);
    const componentPath = this.#templateIndex.templateToComponent.get(canonical.uri) ?? canonical.path;
    setter(componentPath);
  }

  #diagnosticsForUri(uri: DocumentUri): WorkspaceDiagnostics {
    const canonical = canonicalDocumentUri(uri).uri;
    const pipeline = this.#diagnosticsPipeline(canonical);
    return filterRoutedDiagnosticsByUri(pipeline.aggregated, canonical);
  }

  #diagnosticsForSurface(uri: DocumentUri, surface: DiagnosticSurface): readonly WorkspaceDiagnostic[] {
    const routed = this.#diagnosticsForUri(uri);
    return routed.bySurface.get(surface) ?? [];
  }

  #diagnosticsPipeline(activeUri: DocumentUri): DiagnosticsPipelineResult {
    const fingerprint = this.#diagnosticsFingerprint();
    const cached = this.#diagnosticsCache;
    if (cached && cached.fingerprint === fingerprint) {
      return cached.pipeline;
    }

    const raw = this.#collectRawDiagnostics(activeUri);
    const { catalog } = this.#query;
    const gapCount = catalog.gaps?.length ?? 0;
    const policyContext = {
      gapCount,
      ...(catalog.confidence ? { catalogConfidence: catalog.confidence } : {}),
    };

    const pipeline = runDiagnosticsPipeline(raw, {
      catalog: DIAGNOSTICS_CATALOG,
      resolver: DIAGNOSTICS_RESOLVER,
      externalSpecsBySource: DIAGNOSTICS_EXTERNAL_SPECS,
      policyContext,
      aggregationContext: { dedupe: true, sort: true },
    });

    if (pipeline.normalization.issues.length > 0) {
      debug.workspace("diagnostics.normalize.issues", {
        issueCount: pipeline.normalization.issues.length,
        issues: pipeline.normalization.issues,
      });
    }

    this.#diagnosticsCache = { fingerprint, pipeline };
    return pipeline;
  }

  #diagnosticsFingerprint(): string {
    const docs = Array.from(this.#kernel.sources.all())
      .filter((doc) => this.#isTemplateUri(doc.uri))
      .map((doc) => ({
        uri: doc.uri,
        version: doc.version,
        textHash: stableHash(doc.text),
      }))
      .sort((a, b) => String(a.uri).localeCompare(String(b.uri)));
    return stableHash({
      project: this.#query.model.fingerprint,
      docs,
    });
  }

  #collectRawDiagnostics(activeUri: DocumentUri): RawDiagnostic[] {
    const raw: RawDiagnostic[] = [];
    const sources = this.#kernel.sources;
    const active = canonicalDocumentUri(activeUri).uri;

    for (const snapshot of sources.all()) {
      const uri = snapshot.uri;
      if (!this.#isTemplateUri(uri)) continue;
      this.#activateTemplate(uri);
      try {
        const diagnostics = this.#kernel.languageService.getDiagnostics(uri).all;
        for (const diag of diagnostics) {
          raw.push(toRawDiagnostic(diag));
        }
      } catch (error) {
        debug.workspace("diagnostics.collect.error", {
          uri,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.#activateTemplate(active);
    raw.push(...this.#query.discoveryDiagnostics);
    return raw;
  }

  #semanticTokens(uri: DocumentUri): readonly WorkspaceToken[] {
    const compilation = this.#kernel.getCompilation(uri);
    if (!compilation) return [];
    const text = this.lookupText(uri);
    if (!text) return [];
    const syntax = this.#attributeSyntaxContext();
    return collectSemanticTokens(text, compilation, syntax.syntax, syntax.parser, {
      resourceConfidence: ({ kind, name }) => {
        const gaps = this.#query.catalog.gapsByResource?.[`${kind}:${name}`] ?? [];
        return deriveResourceConfidence(gaps).level;
      },
    });
  }
}

export function createSemanticWorkspace(options: SemanticWorkspaceEngineOptions): SemanticWorkspaceEngine {
  return new SemanticWorkspaceEngine(options);
}

class WorkspaceRefactorProxy implements RefactorEngine {
  constructor(
    private readonly engine: SemanticWorkspaceEngine,
    private readonly inner: RefactorEngine,
  ) {}

  prepareRename(request: WorkspacePrepareRenameRequest): WorkspacePrepareRenameResult {
    return this.engine.prepareRename(request);
  }

  rename(request: { uri: DocumentUri; position: { line: number; character: number }; newName: string }): WorkspaceRefactorResult {
    const preflight = this.engine.planRenamePreflight(request);
    if (preflight.conclusive && !preflight.plan.allowOperation) {
      return this.#policyDeniedRename(preflight.plan);
    }
    const plan = this.engine.planRename(request);
    if (!plan.allowOperation) {
      return this.#policyDeniedRename(plan);
    }
    if (!plan.trySemanticRename) {
      return this.#policyDeniedRename({
        ...plan,
        allowOperation: false,
        reason: "semantic-step-disabled",
      });
    }

    const resourceRename = this.engine.tryResourceRename(request);
    if (resourceRename) return resourceRename;

    // Try expression-member rename (VM property/method across TS + template)
    const exprRename = this.engine.tryExpressionMemberRename(request);
    if (exprRename) return exprRename;

    return this.#policyDeniedRename({
      ...plan,
      allowOperation: false,
      reason: "target-not-allowed",
    });
  }

  #policyDeniedRename(plan: RenameExecutionPlan): WorkspaceRefactorResult {
    return {
      error: {
        kind: refactorPolicyErrorKind(plan.reason, plan.unresolvedDecisionPoints),
        message: buildRefactorPolicyErrorMessage("rename", plan.reason, plan.unresolvedDecisionPoints),
        retryable: false,
        data: {
          operation: "rename",
          reason: plan.reason ?? "unknown",
          unresolvedDecisionPointIds: plan.unresolvedDecisionPoints.map((point) => point.id),
        },
      },
    };
  }

  codeActions(request: { uri: DocumentUri; position?: { line: number; character: number }; range?: SourceSpan; kinds?: readonly string[] }): readonly WorkspaceCodeAction[] {
    this.engine.refresh();
    const plan = this.engine.planCodeActions(request);
    const custom = this.engine.collectCodeActions(request);
    const base = this.inner.codeActions(request);
    const merged = mergeCodeActions(
      {
        workspace: custom,
        typescript: base,
      },
      request.kinds,
      plan,
    );
    return filterCodeActionsForRequiredDecisions(merged, plan.unresolvedDecisionPoints);
  }
}

interface MetaHoverResult {
  contents: string;
  span: SourceSpan;
}

type HoveredResourceIdentity = {
  name: string;
  file: string | null;
  map: ReadonlyMap<string, ResourceDefinitionEntry[]>;
};

type TemplateMeta = NonNullable<TemplateCompilation["linked"]["templates"][0]["templateMeta"]>;
const EMPTY_DEFINITION_SLICES: TemplateDefinitionSlices = { local: [], resource: [] };

function getActiveTemplateSetter(vm: VmReflection): ((path: string | null) => void) | null {
  const maybe = vm as VmReflection & { setActiveTemplate?: (path: string | null) => void };
  return typeof maybe.setActiveTemplate === "function" ? maybe.setActiveTemplate.bind(maybe) : null;
}

export function buildTemplateIndex(source: Pick<ProjectSemanticsDiscoveryResult, "templates" | "inlineTemplates">): TemplateIndex {
  const templateToComponent = new Map<DocumentUri, string>();
  const templateToScope = new Map<DocumentUri, ResourceScopeId>();
  for (const entry of source.templates) {
    const uri = canonicalDocumentUri(entry.templatePath).uri;
    templateToComponent.set(uri, entry.componentPath);
    templateToScope.set(uri, entry.scopeId);
  }
  for (const entry of source.inlineTemplates) {
    const inlinePath = inlineTemplatePath(entry.componentPath);
    const uri = canonicalDocumentUri(inlinePath).uri;
    templateToComponent.set(uri, entry.componentPath);
    templateToScope.set(uri, entry.scopeId);
  }
  return {
    templates: source.templates,
    inlineTemplates: source.inlineTemplates,
    templateToComponent,
    templateToScope,
  };
}

function getMetaElementHover(meta: TemplateMeta, offset: number): MetaHoverResult | null {

  const importHover = getImportHover(meta, offset);
  if (importHover) return importHover;

  const bindableHover = getBindableHover(meta, offset);
  if (bindableHover) return bindableHover;

  return getOtherMetaHover(meta, offset);
}

function getImportHover(meta: TemplateMeta, offset: number): MetaHoverResult | null {
  for (const imp of meta.imports) {
    if (imp.tagLoc && isWithinSpan(offset, imp.tagLoc)) {
      const kind = imp.kind === "require" ? "require" : "import";
      return {
        contents: metaCard(`(<${kind}>) ${imp.from.value}`, "Import Aurelia resources from a module"),
        span: imp.tagLoc,
      };
    }
    if (isWithinSpan(offset, imp.from.loc)) {
      const meta: string[] = [];
      if (imp.defaultAlias) meta.push(`**Default alias:** \`${imp.defaultAlias.value}\``);
      if (imp.namedAliases && imp.namedAliases.length > 0) {
        const names = imp.namedAliases.map(a => `\`${a.exportName.value}\` → \`${a.alias.value}\``);
        meta.push(`**Named aliases:** ${names.join(", ")}`);
      }
      return {
        contents: metaCard(`(module) ${imp.from.value}`, ...meta),
        span: imp.from.loc,
      };
    }
    if (imp.defaultAlias && isWithinSpan(offset, imp.defaultAlias.loc)) {
      return {
        contents: metaCard(
          `(alias) ${imp.defaultAlias.value}`,
          `Renames the default export from \`${imp.from.value}\``,
        ),
        span: imp.defaultAlias.loc,
      };
    }
    if (imp.namedAliases) {
      for (const alias of imp.namedAliases) {
        if (isWithinSpan(offset, alias.exportName.loc)) {
          return {
            contents: metaCard(
              `(export) ${alias.exportName.value}`,
              `Aliased as \`${alias.alias.value}\``,
            ),
            span: alias.exportName.loc,
          };
        }
        if (isWithinSpan(offset, alias.alias.loc)) {
          return {
            contents: metaCard(
              `(alias) ${alias.alias.value}`,
              `For export \`${alias.exportName.value}\` from \`${imp.from.value}\``,
            ),
            span: alias.alias.loc,
          };
        }
      }
    }
  }
  return null;
}

function getBindableHover(meta: TemplateMeta, offset: number): MetaHoverResult | null {
  for (const bindable of meta.bindables) {
    if (bindable.tagLoc && isWithinSpan(offset, bindable.tagLoc)) {
      return {
        contents: metaCard("(<bindable>)", "Declare a bindable property for this component"),
        span: bindable.tagLoc,
      };
    }
    if (isWithinSpan(offset, bindable.name.loc)) {
      const metaLines: string[] = [];
      if (bindable.mode) metaLines.push(`**Mode:** \`${bindable.mode.value}\``);
      if (bindable.attribute) metaLines.push(`**HTML attribute:** \`${bindable.attribute.value}\``);
      return {
        contents: metaCard(`(bindable) ${bindable.name.value}`, ...metaLines),
        span: bindable.name.loc,
      };
    }
    if (bindable.mode && isWithinSpan(offset, bindable.mode.loc)) {
      return {
        contents: metaCard(
          `(binding mode) ${bindable.mode.value}`,
          "Controls data flow direction for this bindable",
        ),
        span: bindable.mode.loc,
      };
    }
    if (bindable.attribute && isWithinSpan(offset, bindable.attribute.loc)) {
      return {
        contents: metaCard(
          `(html attribute) ${bindable.attribute.value}`,
          `The attribute name used in templates (differs from property name \`${bindable.name.value}\`)`,
        ),
        span: bindable.attribute.loc,
      };
    }
  }
  return null;
}

function getOtherMetaHover(meta: TemplateMeta, offset: number): MetaHoverResult | null {
  if (meta.shadowDom && meta.shadowDom.tagLoc && isWithinSpan(offset, meta.shadowDom.tagLoc)) {
    return {
      contents: metaCard("(<use-shadow-dom>)", "Enable Shadow DOM encapsulation for this component"),
      span: meta.shadowDom.tagLoc,
    };
  }
  if (meta.containerless && meta.containerless.tagLoc && isWithinSpan(offset, meta.containerless.tagLoc)) {
    return {
      contents: metaCard("(<containerless>)", "Render component content without the host element wrapper"),
      span: meta.containerless.tagLoc,
    };
  }
  if (meta.capture && meta.capture.tagLoc && isWithinSpan(offset, meta.capture.tagLoc)) {
    return {
      contents: metaCard("(<capture>)", "Capture all unrecognized attributes as bindings"),
      span: meta.capture.tagLoc,
    };
  }
  for (const alias of meta.aliases) {
    if (alias.tagLoc && isWithinSpan(offset, alias.tagLoc)) {
      return {
        contents: metaCard("(<alias>)", "Define an alternative name for this component"),
        span: alias.tagLoc,
      };
    }
  }
  return null;
}

/** Render a meta-element hover in the unified card format. */
function metaCard(signature: string, ...metaLines: string[]): string {
  const blocks: string[] = ["```ts\n" + signature + "\n```"];
  const filtered = metaLines.filter(Boolean);
  if (filtered.length) {
    blocks.push("---");
    blocks.push(filtered.join("\n\n"));
  }
  return blocks.join("\n\n");
}

function findImportAtOffset(meta: TemplateMeta, offset: number) {
  for (const imp of meta.imports) {
    const fromLoc = imp.from.loc;
    if (fromLoc && offset >= fromLoc.start && offset < fromLoc.end) {
      return imp;
    }
  }
  return null;
}

function findFirstExportSpan(filePath: string): SourceSpan | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX :
      filePath.endsWith(".jsx") ? ts.ScriptKind.JSX :
      filePath.endsWith(".js") ? ts.ScriptKind.JS :
      ts.ScriptKind.TS,
    );

    for (const statement of sourceFile.statements) {
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      const hasExport = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!hasExport) continue;

      let nameNode: ts.Node | undefined;
      if (ts.isClassDeclaration(statement) && statement.name) {
        nameNode = statement.name;
      } else if (ts.isFunctionDeclaration(statement) && statement.name) {
        nameNode = statement.name;
      } else if (ts.isVariableStatement(statement)) {
        const firstDecl = statement.declarationList.declarations[0];
        if (firstDecl) nameNode = firstDecl.name;
      }

      const start = nameNode ? nameNode.getStart(sourceFile) : statement.getStart(sourceFile);
      return { start, end: start };
    }
  } catch {
    return null;
  }
  return null;
}

function isWithinSpan(offset: number, span: SourceSpan | undefined): boolean {
  return span ? spanContainsOffset(span, offset) : false;
}

// ── R7: Hover augmentation helpers ──────────────────────────────────────

function formatProvenanceOrigin(name: Sourced<string>): string | null {
  switch (name.origin) {
    case "source":
      return "*Discovered via source analysis*";
    case "config":
      return "*Declared in configuration*";
    case "builtin":
      return "*Built-in Aurelia resource*";
    default:
      return null;
  }
}


function formatConfidenceLine(
  confidence: "partial" | "low" | undefined,
  reason: string | undefined,
): string | null {
  if (!confidence || !reason) return null;
  const icon = confidence === "low" ? "$(warning)" : "$(info)";
  return `${icon} **Confidence:** ${confidence} — ${reason}`;
}

function augmentHoverContent(contents: string, provenanceLine: string): string {
  // Insert provenance before the overlay command link (always last in resource cards)
  const overlayMarker = "[$(file-code) Show overlay]";
  const idx = contents.lastIndexOf(overlayMarker);
  if (idx > 0) {
    return contents.slice(0, idx) + provenanceLine + "\n\n" + contents.slice(idx);
  }
  // No overlay link — append after separator if present, else add separator
  const sepIdx = contents.lastIndexOf("\n\n---\n\n");
  if (sepIdx >= 0) {
    return contents + "\n\n" + provenanceLine;
  }
  return contents + "\n\n---\n\n" + provenanceLine;
}

function buildOverlaySnapshot(
  templateUri: DocumentUri,
  overlay: { overlayPath: string; text: string },
): OverlayDocumentSnapshot {
  const overlayCanonical = canonicalDocumentUri(overlay.overlayPath);
  const templateCanonical = canonicalDocumentUri(templateUri);
  return {
    uri: overlayCanonical.uri,
    file: overlayCanonical.file,
    text: overlay.text,
    templateUri: templateCanonical.uri,
  };
}

function extractIdentifierAt(text: string, offset: number): string | null {
  if (offset < 0 || offset >= text.length) return null;
  let start = offset;
  while (start > 0 && isIdentifierChar(text.charCodeAt(start - 1))) {
    start -= 1;
  }
  let end = offset;
  while (end < text.length && isIdentifierChar(text.charCodeAt(end))) {
    end += 1;
  }
  if (end <= start) return null;
  return text.slice(start, end);
}

function isIdentifierChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95 /* _ */ ||
    code === 36 /* $ */
  );
}

/**
 * Find the offset of a property/method declaration in a TypeScript source file.
 * Walks class members looking for the given name.
 */
function findPropertyInTsFile(sourceFile: ts.SourceFile, propertyName: string): number | null {
  let result: number | null = null;
  const visit = (node: ts.Node) => {
    if (result !== null) return;
    if (ts.isClassDeclaration(node)) {
      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member) || ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
          if (member.name && ts.isIdentifier(member.name) && member.name.text === propertyName) {
            result = member.name.getStart(sourceFile);
            return;
          }
        }
      }
    }
    node.forEachChild(visit);
  };
  sourceFile.forEachChild(visit);
  return result;
}

type ResourceReferenceOccurrence = {
  span: SourceSpan;
  symbolId: SymbolId;
};

type ResourceReferenceIndex = {
  fingerprint: string;
  bySymbol: Map<SymbolId, TextReferenceSite[]>;
  byUri: Map<DocumentUri, ResourceReferenceOccurrence[]>;
};

type DiagnosticsCache = {
  fingerprint: string;
  pipeline: DiagnosticsPipelineResult;
};

const DIAGNOSTICS_CATALOG = diagnosticsCatalog;
const DIAGNOSTICS_RESOLVER = createDefaultCodeResolver(DIAGNOSTICS_CATALOG);
const TYPESCRIPT_DIAGNOSTIC_SPEC: DiagnosticSpec<DiagnosticDataRecord> = {
  category: "toolchain",
  status: "canonical",
  impact: "degraded",
  actionability: "manual",
  span: "span",
  stages: ["typecheck"],
  surfaces: ["lsp", "vscode-inline"],
  description: "External TypeScript diagnostic.",
};
const DIAGNOSTICS_EXTERNAL_SPECS = {
  typescript: TYPESCRIPT_DIAGNOSTIC_SPEC,
} as const satisfies Readonly<Record<string, DiagnosticSpec<DiagnosticDataRecord>>>;

function mergeCodeActions(
  actions: {
    workspace: readonly WorkspaceCodeAction[];
    typescript: readonly WorkspaceCodeAction[];
  },
  kinds: readonly string[] | undefined,
  plan: CodeActionExecutionPlan,
): WorkspaceCodeAction[] {
  const results: WorkspaceCodeAction[] = [];
  const seen = new Set<string>();
  const buckets = {
    workspace: actions.workspace,
    typescript: actions.typescript,
  } as const;
  for (const source of plan.sourceOrder) {
    const bucket = buckets[source];
    for (const action of bucket) {
      if (plan.filterByRequestedKinds && !matchesActionKind(action.kind, kinds)) continue;
      if (plan.dedupeBy === "id" && seen.has(action.id)) continue;
      seen.add(action.id);
      results.push(action);
    }
  }
  return results;
}

function matchesActionKind(actionKind: string | undefined, kinds: readonly string[] | undefined): boolean {
  if (!kinds || kinds.length === 0) return true;
  if (!actionKind) return false;
  return kinds.some((kind) => actionKind === kind || actionKind.startsWith(`${kind}.`));
}

function buildRefactorPolicyErrorMessage(
  operation: "rename" | "code-actions",
  reason: RefactorBoundaryReason | undefined,
  requiredDecisionPoints: readonly RefactorDecisionPoint[],
): string {
  if (requiredDecisionPoints.length > 0) {
    const ids = requiredDecisionPoints.map((point) => point.id).join(", ");
    return `${operation} denied: required decisions are unresolved (${ids}).`;
  }
  return `${operation} denied by refactor policy (${reason ?? "unknown"}).`;
}

function refactorPolicyErrorKind(
  reason: RefactorBoundaryReason | undefined,
  requiredDecisionPoints: readonly RefactorDecisionPoint[],
): WorkspaceErrorKind {
  if (requiredDecisionPoints.length > 0 || reason === "decision-required") {
    return "refactor-decision-required";
  }
  return "refactor-policy-denied";
}

function filterCodeActionsForRequiredDecisions(
  actions: readonly WorkspaceCodeAction[],
  requiredDecisionPoints: readonly RefactorDecisionPoint[],
): readonly WorkspaceCodeAction[] {
  // Keep unrelated actions available; only suppress actions that depend on unresolved points.
  if (requiredDecisionPoints.length === 0) return actions;
  return actions.filter((action) => !codeActionDependsOnDecisionPoints(action, requiredDecisionPoints));
}

function codeActionDependsOnDecisionPoints(
  action: WorkspaceCodeAction,
  requiredDecisionPoints: readonly RefactorDecisionPoint[],
): boolean {
  for (const point of requiredDecisionPoints) {
    switch (point.id) {
      case "import-style":
      case "alias-strategy":
        // Current decision-dependent actions are import insertion/alias fixes.
        if (action.id.startsWith("aurelia/add-import:")) return true;
        break;
      case "rename-style":
      case "file-rename":
        // No current workspace code-action producers depend on these points.
        break;
      default:
        break;
    }
  }
  return false;
}

function mergeRefactorDecisions(
  base: RefactorDecisionSet | null | undefined,
  override: RefactorDecisionSet | null | undefined,
): RefactorDecisionSet | undefined {
  if (!base && !override) return undefined;
  return {
    ...(base ?? {}),
    ...(override ?? {}),
  };
}

function isPathWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative) return true;
  if (relative === ".") return true;
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function toRawDiagnostic(diag: TemplateLanguageDiagnostic): RawDiagnostic {
  const location = diag.location ?? null;
  const related = diag.related?.map((entry) => ({
    message: entry.message,
    ...(entry.location?.span ? { span: entry.location.span } : {}),
  }));
  const code = String(diag.code);
  const data = buildDiagnosticData(diag);
  return {
    code,
    message: diag.message,
    source: diag.stage,
    ...(diag.severity ? { severity: diag.severity } : {}),
    ...(location ? { uri: location.uri, span: location.span } : {}),
    ...(related && related.length > 0 ? { related } : {}),
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
    ...(diag.origin !== undefined ? { origin: diag.origin } : {}),
  };
}

function buildDiagnosticData(
  diag: TemplateLanguageDiagnostic,
): Readonly<Record<string, unknown>> | undefined {
  if (diag.stage !== "typescript") return diag.data;
  const extra: Record<string, unknown> = { tsCode: diag.code };
  if (diag.tags?.length) {
    extra.tags = diag.tags;
  }
  if (!diag.data || Object.keys(diag.data).length === 0) return extra;
  return { ...diag.data, ...extra };
}

function filterRoutedDiagnosticsByUri(
  routed: WorkspaceDiagnostics,
  uri: DocumentUri,
): WorkspaceDiagnostics {
  const canonical = canonicalDocumentUri(uri).uri;
  const bySurface = new Map<DiagnosticSurface, WorkspaceDiagnostic[]>();
  for (const [surface, entries] of routed.bySurface.entries()) {
    const filtered = filterDiagnosticsByUri(entries, canonical);
    if (filtered.length > 0) {
      bySurface.set(surface, filtered);
    }
  }
  const suppressed = filterDiagnosticsByUri(routed.suppressed, canonical);
  return { bySurface, suppressed };
}

function filterDiagnosticsByUri(
  diagnostics: readonly WorkspaceDiagnostic[],
  uri: DocumentUri,
): WorkspaceDiagnostic[] {
  const canonical = canonicalDocumentUri(uri).uri;
  return diagnostics.filter((diag) => {
    if (diag.uri) {
      return canonicalDocumentUri(diag.uri).uri === canonical;
    }
    if (diag.span?.file) {
      return canonicalDocumentUri(diag.span.file).uri === canonical;
    }
    return !diag.span;
  });
}
