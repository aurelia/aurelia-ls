import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  PRELUDE_TS,
  asDocumentUri,
  canonicalDocumentUri,
  debug,
  extractTemplateMeta,
  normalizePathForId,
  offsetAtPosition,
  spanContainsOffset,
  spanLength,
  toSourceFileId,
  type BindableDef,
  type DocumentUri,
  type LinkedInstruction,
  type LinkedRow,
  type OverlayBuildArtifact,
  type OverlayDocumentSnapshot,
  type ResourceDef,
  type SourceLocation,
  type SourceSpan,
  type TemplateCompilation,
  type TemplateMetaIR,
  type TemplateMappingArtifact,
  type TemplateQueryFacade,
  type VmReflection,
  type ResourceScopeId,
} from "@aurelia-ls/compiler";
import {
  createNodeFileSystem,
  type InlineTemplateInfo,
  type Logger,
  type ResolutionConfig,
  type ResolutionResult,
  type TemplateInfo,
} from "@aurelia-ls/resolution";
import type { TypeScriptServices } from "@aurelia-ls/compiler";
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
  type WorkspaceHover,
  type WorkspaceLocation,
  type WorkspaceTextEdit,
  type WorkspaceRefactorResult,
  type WorkspaceSnapshot,
  type WorkspaceToken,
  type WorkspaceCodeAction,
  type WorkspaceCodeActionRequest,
  type WorkspaceRenameRequest,
} from "./types.js";
import { inlineTemplatePath } from "./templates.js";
import { collectSemanticTokens } from "./semantic-tokens.js";
import { buildResourceDefinitionIndex, collectTemplateDefinitions, collectTemplateReferences, type ResourceDefinitionIndex } from "./definition.js";

export interface SemanticWorkspaceEngineOptions {
  readonly logger: Logger;
  readonly workspaceRoot?: string | null;
  readonly tsconfigPath?: string | null;
  readonly configFileName?: string;
  readonly resolution?: ResolutionConfig;
  readonly typescript?: TypeScriptServices | false;
  readonly vm?: VmReflection;
  readonly lookupText?: (uri: DocumentUri) => string | null;
  readonly isJs?: boolean;
  readonly overlayBaseName?: string;
  readonly resourceScope?: ResourceScopeId | null;
}

interface TemplateIndex {
  readonly templates: readonly TemplateInfo[];
  readonly inlineTemplates: readonly InlineTemplateInfo[];
  readonly templateToComponent: ReadonlyMap<DocumentUri, string>;
  readonly templateToScope: ReadonlyMap<DocumentUri, ResourceScopeId>;
}

export class SemanticWorkspaceEngine implements SemanticWorkspace {
  readonly #logger: Logger;
  readonly #env: TypeScriptEnvironment;
  readonly #kernel: SemanticWorkspaceKernel;
  readonly #projectIndex: AureliaProjectIndex;
  readonly #refactorProxy: RefactorEngine;
  readonly #lookupText?: (uri: DocumentUri) => string | null;
  readonly #typescript?: TypeScriptServices;
  readonly #vm: VmReflection;
  readonly #isJs: boolean;
  readonly #overlayBaseName?: string;
  #workspaceRoot: string;
  #definitionIndex: ResourceDefinitionIndex;
  #resourceScope: ResourceScopeId | null;
  #projectVersion = 0;
  #templateIndex: TemplateIndex;

  constructor(options: SemanticWorkspaceEngineOptions) {
    this.#logger = options.logger;
    this.#env = createTypeScriptEnvironment({
      logger: options.logger,
      workspaceRoot: options.workspaceRoot ?? null,
      tsconfigPath: options.tsconfigPath ?? null,
      configFileName: options.configFileName,
    });

    const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
    this.#workspaceRoot = workspaceRoot;
    const resolution: ResolutionConfig = {
      ...(options.resolution ?? {}),
      packagePath: options.resolution?.packagePath ?? workspaceRoot,
      fileSystem: options.resolution?.fileSystem ?? createNodeFileSystem({ root: workspaceRoot }),
    };

    this.#projectIndex = new AureliaProjectIndex({
      ts: this.#env.project,
      logger: options.logger,
      resolution,
    });
    this.#projectVersion = this.#env.project.getProjectVersion();

    this.#resourceScope = options.resourceScope ?? null;
    this.#vm = options.vm ?? this.#env.vmReflection;
    this.#typescript = options.typescript === false
      ? undefined
      : options.typescript ?? this.#env.typescript;
    this.#isJs = options.isJs ?? false;
    this.#overlayBaseName = options.overlayBaseName;

    this.#lookupText = options.lookupText;
    this.#templateIndex = buildTemplateIndex(this.#projectIndex.currentResolution());
    this.#definitionIndex = buildResourceDefinitionIndex(this.#projectIndex.currentResolution());

    this.#kernel = createSemanticWorkspaceKernel({
      program: this.#programOptions(this.#vm, this.#isJs, this.#overlayBaseName),
      ...(this.#typescript ? { language: { typescript: this.#typescript } } : {}),
      fingerprint: this.#projectIndex.currentFingerprint(),
      lookupText: (uri) => this.#lookupText?.(uri) ?? null,
    });

    this.#ensurePrelude(workspaceRoot);
    this.#refactorProxy = new WorkspaceRefactorProxy(this, this.#kernel.refactor());
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
    this.#templateIndex = buildTemplateIndex(this.#projectIndex.currentResolution());
    this.#definitionIndex = buildResourceDefinitionIndex(this.#projectIndex.currentResolution());
    this.#kernel.reconfigure({
      program: this.#programOptions(this.#vm, this.#isJs, this.#overlayBaseName),
      fingerprint: this.#projectIndex.currentFingerprint(),
      lookupText: (uri) => this.#lookupText?.(uri) ?? null,
    });
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

  setResourceScope(scope: ResourceScopeId | null): boolean {
    this.#resourceScope = scope;
    return this.#kernel.reconfigure({
      program: this.#programOptions(this.#vm, this.#isJs, this.#overlayBaseName),
      fingerprint: this.#projectIndex.currentFingerprint(),
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

  snapshot(): WorkspaceSnapshot {
    this.#ensureIndexFresh();
    const base = this.#kernel.snapshot();
    const resolution = this.#projectIndex.currentResolution();
    return {
      ...base,
      semanticSnapshot: resolution.semanticSnapshot,
      apiSurface: resolution.apiSurfaceSnapshot,
    };
  }

  diagnostics(uri: DocumentUri): readonly WorkspaceDiagnostic[] {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    const base = this.#kernel.diagnostics(canonical.uri);
    const mapped = this.#mapDiagnostics(canonical.uri, base);
    const meta = this.#templateMetaDiagnostics(canonical.uri);
    const gaps = this.#catalogDiagnostics(canonical.uri);
    if (!meta.length && !gaps.length) return mapped;
    return [...mapped, ...meta, ...gaps];
  }

  query(uri: DocumentUri): SemanticQuery {
    const canonical = canonicalDocumentUri(uri);
    const base = this.#kernel.query(canonical.uri);
    return {
      hover: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        return this.#metaHover(canonical.uri, pos) ?? base.hover(pos);
      },
      definition: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        const meta = this.#metaDefinition(canonical.uri, pos) ?? [];
        const local = this.#definitionAt(canonical.uri, pos);
        const baseDefs = base.definition(pos);
        return mergeLocations(meta, local, baseDefs);
      },
      references: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        this.#syncTemplateOverlaysForReferences(canonical.uri);
        const local = this.#referencesAt(canonical.uri, pos);
        const baseRefs = base.references(pos);
        return mergeLocations(local, baseRefs);
      },
      completions: (pos) => {
        this.#ensureTemplateContext(canonical.uri);
        return base.completions(pos);
      },
      diagnostics: () => this.diagnostics(canonical.uri),
      semanticTokens: () => this.#semanticTokens(canonical.uri),
    };
  }

  refactor(): RefactorEngine {
    return this.#refactorProxy;
  }

  collectCodeActions(request: WorkspaceCodeActionRequest): readonly WorkspaceCodeAction[] {
    const canonical = canonicalDocumentUri(request.uri);
    this.#ensureTemplateContext(canonical.uri);
    const text = this.lookupText(canonical.uri);
    if (!text) return [];
    const compilation = this.#kernel.getCompilation(canonical.uri);
    if (!compilation) return [];
    const targetSpan = resolveActionSpan(request, text);
    if (!targetSpan) return [];

    const diagnostics = this.diagnostics(canonical.uri);
    const bindingCommands = this.#kernel.program.options.syntax?.bindingCommands ?? {};
    return collectWorkspaceCodeActions({
      request,
      uri: canonical.uri,
      text,
      compilation,
      diagnostics,
      bindingCommands,
      templateIndex: this.#templateIndex,
      definitionIndex: this.#definitionIndex,
      workspaceRoot: this.#workspaceRoot,
      compilerOptions: this.#env.tsService.compilerOptions(),
      lookupText: this.lookupText.bind(this),
    }, targetSpan);
  }

  prepareRefactor(uri: DocumentUri): void {
    const canonical = canonicalDocumentUri(uri);
    this.#ensureTemplateContext(canonical.uri);
    this.#syncTemplateOverlaysForReferences(canonical.uri);
  }

  tryResourceRename(request: WorkspaceRenameRequest): WorkspaceRefactorResult | null {
    const canonical = canonicalDocumentUri(request.uri);
    this.#ensureTemplateContext(canonical.uri);

    const text = this.lookupText(canonical.uri);
    if (!text) return null;
    const offset = offsetAtPosition(text, request.position);
    if (offset == null) return null;

    const compilation = this.#kernel.getCompilation(canonical.uri);
    if (!compilation) return null;

    const bindingCommands = this.#kernel.program.options.syntax?.bindingCommands ?? {};
    const preferRoots = [this.#workspaceRoot];

    const elementEdits = this.#renameElementAt(compilation, text, offset, request.newName, preferRoots);
    if (elementEdits?.length) {
      return { edit: { edits: finalizeWorkspaceEdits(elementEdits) } };
    }

    const bindableEdits = this.#renameBindableAttributeAt(compilation, text, offset, request.newName, bindingCommands, preferRoots);
    if (bindableEdits?.length) {
      return { edit: { edits: finalizeWorkspaceEdits(bindableEdits) } };
    }

    const converterEdits = this.#renameValueConverterAt(compilation, text, offset, request.newName, preferRoots);
    if (converterEdits?.length) {
      return { edit: { edits: finalizeWorkspaceEdits(converterEdits) } };
    }

    const behaviorEdits = this.#renameBindingBehaviorAt(compilation, text, offset, request.newName, preferRoots);
    if (behaviorEdits?.length) {
      return { edit: { edits: finalizeWorkspaceEdits(behaviorEdits) } };
    }

    return null;
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

  #programOptions(vm: VmReflection, isJs: boolean, overlayBaseName?: string) {
    const semantics = this.#projectIndex.currentSemantics();
    const catalog = this.#projectIndex.currentCatalog();
    const syntax = this.#projectIndex.currentSyntax();
    const resourceGraph = this.#projectIndex.currentResourceGraph();
    const defaultScope = semantics.defaultScope ?? resourceGraph.root ?? null;
    const resourceScope = this.#resourceScope ?? defaultScope;
    return {
      vm,
      isJs,
      semantics,
      catalog,
      syntax,
      resourceGraph,
      ...(overlayBaseName !== undefined ? { overlayBaseName } : {}),
      ...(resourceScope !== null ? { resourceScope } : {}),
    };
  }

  #activateTemplate(uri: DocumentUri): void {
    const setter = getActiveTemplateSetter(this.#vm);
    const componentPath = this.#templateIndex.templateToComponent.get(uri) ?? canonicalDocumentUri(uri).path;
    if (setter) setter(componentPath);
    this.#applyTemplateScope(uri);
  }

  #deactivateTemplate(): void {
    const setter = getActiveTemplateSetter(this.#vm);
    if (!setter) return;
    setter(null);
  }

  #applyTemplateScope(uri: DocumentUri): void {
    const scope = this.#templateIndex.templateToScope.get(uri);
    if (!scope || scope === this.#resourceScope) return;
    debug.workspace("scope.update", {
      uri,
      from: this.#resourceScope ?? "default",
      to: scope,
    });
    this.setResourceScope(scope);
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
    const containingFile = this.#templateIndex.templateToComponent.get(uri) ?? canonicalDocumentUri(uri).path;
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

  #definitionAt(uri: DocumentUri, pos: { line: number; character: number }): WorkspaceLocation[] {
    const text = this.lookupText(uri);
    if (!text) return [];
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return [];
    const compilation = this.#kernel.getCompilation(uri);
    if (!compilation) return [];
    return collectTemplateDefinitions({
      compilation,
      text,
      offset,
      resources: this.#definitionIndex,
      bindingCommands: this.#kernel.program.options.syntax?.bindingCommands,
      preferRoots: [this.#workspaceRoot],
      documentUri: uri,
    });
  }

  #referencesAt(uri: DocumentUri, pos: { line: number; character: number }): WorkspaceLocation[] {
    const text = this.lookupText(uri);
    if (!text) return [];
    const offset = offsetAtPosition(text, pos);
    if (offset == null) return [];
    const compilation = this.#kernel.getCompilation(uri);
    if (!compilation) return [];
    return collectTemplateReferences({
      compilation,
      text,
      offset,
      documentUri: uri,
    });
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

  #renameElementAt(
    compilation: TemplateCompilation,
    text: string,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const node = compilation.query.nodeAt(offset);
    if (!node || node.kind !== "element") return null;
    const row = findLinkedRow(compilation.linked.templates, node.templateIndex, node.id);
    if (!row || row.node.kind !== "element") return null;
    const tagSpan = elementTagSpanAtOffset(text, node.span, row.node.tag, offset);
    if (!tagSpan) return null;
    const res = row.node.custom?.def ?? null;
    if (!res) return null;

    const target: ResourceTarget = { kind: "element", name: res.name, file: res.file ?? null };
    const edits: WorkspaceTextEdit[] = [];
    this.#collectElementTagEdits(target, newName, edits);

    const entry = findResourceEntry(this.#definitionIndex.elements, target.name, target.file, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, target.name, newName, this.lookupText.bind(this)) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #renameBindableAttributeAt(
    compilation: TemplateCompilation,
    text: string,
    offset: number,
    newName: string,
    bindingCommands: BindingCommands,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hits = findInstructionsAtOffset(compilation.linked.templates, offset);
    for (const hit of hits) {
      const nameSpan = attributeNameSpan(text, hit.loc);
      if (!nameSpan || !spanContainsOffset(nameSpan, offset)) continue;
      const attrName = text.slice(nameSpan.start, nameSpan.end);
      const target = resolveBindableTarget(hit.instruction, this.#definitionIndex, preferRoots);
      if (!target) continue;

      const edits: WorkspaceTextEdit[] = [];
      this.#collectBindableAttributeEdits(target, newName, bindingCommands, edits);

      const attrValue = target.bindable.attribute.value ?? target.property;
      const attrEdit = buildBindableAttributeEdit(target.bindable, attrValue, newName, this.lookupText.bind(this));
      if (attrEdit) edits.push(attrEdit);

      if (!edits.length) return null;
      return edits;
    }
    return null;
  }

  #renameValueConverterAt(
    compilation: TemplateCompilation,
    text: string,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hit = findValueConverterAtOffset(compilation.exprTable ?? [], text, offset);
    if (!hit) return null;

    const edits: WorkspaceTextEdit[] = [];
    this.#collectConverterEdits(hit.name, newName, edits);

    const entry = findResourceEntry(this.#definitionIndex.valueConverters, hit.name, null, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, hit.name, newName, this.lookupText.bind(this)) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #renameBindingBehaviorAt(
    compilation: TemplateCompilation,
    text: string,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hit = findBindingBehaviorAtOffset(compilation.exprTable ?? [], text, offset);
    if (!hit) return null;

    const edits: WorkspaceTextEdit[] = [];
    this.#collectBehaviorEdits(hit.name, newName, edits);

    const entry = findResourceEntry(this.#definitionIndex.bindingBehaviors, hit.name, null, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, hit.name, newName, this.lookupText.bind(this)) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #collectElementTagEdits(target: ResourceTarget, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const spans = collectElementTagSpans(compilation, text, target);
      for (const span of spans) {
        out.push({ uri, span, newText: newName });
      }
    });
  }

  #collectBindableAttributeEdits(
    target: BindableTarget,
    newName: string,
    bindingCommands: BindingCommands,
    out: WorkspaceTextEdit[],
  ): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const matches = collectBindableAttributeMatches(compilation, text, target);
      for (const match of matches) {
        const replacement = renameAttributeName(match.attrName, newName, bindingCommands);
        out.push({ uri, span: match.span, newText: replacement });
      }
    });
  }

  #collectConverterEdits(name: string, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const spans = collectConverterSpans(compilation.exprTable ?? [], text, name);
      for (const span of spans) {
        out.push({ uri, span, newText: newName });
      }
    });
  }

  #collectBehaviorEdits(name: string, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const spans = collectBehaviorSpans(compilation.exprTable ?? [], text, name);
      for (const span of spans) {
        out.push({ uri, span, newText: newName });
      }
    });
  }

  #forEachTemplateCompilation(
    visit: (uri: DocumentUri, text: string, compilation: TemplateCompilation) => void,
  ): void {
    const visited = new Set<DocumentUri>();
    const iterate = (uri: DocumentUri) => {
      if (visited.has(uri)) return;
      visited.add(uri);
      const text = this.lookupText(uri);
      if (!text) return;
      const compilation = this.#kernel.getCompilation(uri);
      if (!compilation) return;
      visit(uri, text, compilation);
    };

    for (const entry of this.#templateIndex.templates) {
      const canonical = canonicalDocumentUri(entry.templatePath);
      iterate(canonical.uri);
    }

    for (const entry of this.#templateIndex.inlineTemplates) {
      const inlinePath = inlineTemplatePath(entry.componentPath);
      const canonical = canonicalDocumentUri(inlinePath);
      iterate(canonical.uri);
    }
  }

  #setActiveTemplateForOverlay(uri: DocumentUri): void {
    const setter = getActiveTemplateSetter(this.#vm);
    if (!setter) return;
    const componentPath = this.#templateIndex.templateToComponent.get(uri) ?? canonicalDocumentUri(uri).path;
    setter(componentPath);
  }

  #mapDiagnostics(uri: DocumentUri, diagnostics: readonly WorkspaceDiagnostic[]): WorkspaceDiagnostic[] {
    if (diagnostics.length === 0) return [];
    const text = this.lookupText(uri);
    const compilation = text ? this.#kernel.getCompilation(uri) : null;
    const bindingCommands = this.#kernel.program.options.syntax?.bindingCommands ?? {};
    return diagnostics.map((diag) => mapWorkspaceDiagnostic(diag, { text, compilation, bindingCommands }));
  }

  #templateMetaDiagnostics(uri: DocumentUri): WorkspaceDiagnostic[] {
    const compilation = this.#kernel.getCompilation(uri);
    const template = compilation?.linked?.templates?.[0];
    if (!template?.templateMeta) return [];
    const templatePath = this.#templateIndex.templateToComponent.get(uri) ?? canonicalDocumentUri(uri).path;
    const diagnostics: WorkspaceDiagnostic[] = [];
    const meta = template.templateMeta;

    for (const imp of meta.imports) {
      const specifier = imp.from.value;
      const resolvedPath = resolveModuleSpecifier(specifier, templatePath, this.#env.tsService.compilerOptions());
      if (resolvedPath) continue;
      diagnostics.push({
        code: "aurelia/unresolved-import",
        message: `Cannot resolve module '${specifier}'`,
        severity: "error",
        source: "aurelia",
        span: imp.from.loc,
      });
    }

    const aliasSeen = new Map<string, SourceSpan>();
    for (const alias of meta.aliases) {
      for (const name of alias.names) {
        const key = name.value.toLowerCase();
        if (aliasSeen.has(key)) {
          diagnostics.push({
            code: "aurelia/alias-conflict",
            message: `Alias '${name.value}' is already declared.`,
            severity: "warning",
            source: "aurelia",
            span: name.loc,
          });
        } else {
          aliasSeen.set(key, name.loc);
        }
      }
    }

    const bindableSeen = new Map<string, SourceSpan>();
    for (const bindable of meta.bindables) {
      const key = bindable.name.value.toLowerCase();
      if (bindableSeen.has(key)) {
        diagnostics.push({
          code: "aurelia/bindable-decl-conflict",
          message: `Bindable '${bindable.name.value}' is already declared.`,
          severity: "warning",
          source: "aurelia",
          span: bindable.name.loc,
        });
      } else {
        bindableSeen.set(key, bindable.name.loc);
      }
    }

    return diagnostics;
  }

  #catalogDiagnostics(uri: DocumentUri): WorkspaceDiagnostic[] {
    const catalog = this.#projectIndex.currentCatalog();
    const gaps = catalog.gaps ?? [];
    if (gaps.length === 0 && !catalog.confidence) return [];

    const templatePath = canonicalDocumentUri(uri).path;
    const componentPath = this.#templateIndex.templateToComponent.get(uri) ?? null;
    const normalizedTemplate = normalizePathForId(templatePath);
    const normalizedComponent = componentPath ? normalizePathForId(componentPath) : null;

    const results: WorkspaceDiagnostic[] = [];
    for (const gap of gaps) {
      if (gap.resource) {
        const normalizedResource = normalizePathForId(gap.resource);
        if (normalizedResource !== normalizedTemplate && normalizedResource !== normalizedComponent) {
          continue;
        }
      } else {
        continue;
      }

      results.push({
        code: gapCodeForKind(gap.kind),
        message: gap.message,
        severity: "info",
        source: "aurelia",
        data: { gapKind: gap.kind },
      });
    }

    const confidence = catalog.confidence;
    if (confidence && confidence !== "complete" && confidence !== "high" && results.length > 0) {
      results.push({
        code: "aurelia/confidence/low",
        message: `Catalog confidence '${confidence}'.`,
        severity: "info",
        source: "aurelia",
        data: { confidence },
      });
    }

    return results;
  }

  #semanticTokens(uri: DocumentUri): readonly WorkspaceToken[] {
    const compilation = this.#kernel.getCompilation(uri);
    if (!compilation) return [];
    const text = this.lookupText(uri);
    if (!text) return [];
    return collectSemanticTokens(text, compilation);
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

  rename(request: { uri: DocumentUri; position: { line: number; character: number }; newName: string }): WorkspaceRefactorResult {
    this.engine.refresh();
    this.engine.prepareRefactor(request.uri);
    const resourceRename = this.engine.tryResourceRename(request);
    if (resourceRename) return resourceRename;
    return this.inner.rename(request);
  }

  codeActions(request: { uri: DocumentUri; position?: { line: number; character: number }; range?: SourceSpan; kinds?: readonly string[] }): readonly WorkspaceCodeAction[] {
    this.engine.refresh();
    const custom = this.engine.collectCodeActions(request);
    const base = this.inner.codeActions(request);
    return mergeCodeActions(custom, base, request.kinds);
  }
}

interface MetaHoverResult {
  contents: string;
  span: SourceSpan;
}

type TemplateMeta = NonNullable<TemplateCompilation["linked"]["templates"][0]["templateMeta"]>;

function getActiveTemplateSetter(vm: VmReflection): ((path: string | null) => void) | null {
  const maybe = vm as VmReflection & { setActiveTemplate?: (path: string | null) => void };
  return typeof maybe.setActiveTemplate === "function" ? maybe.setActiveTemplate.bind(maybe) : null;
}

function buildTemplateIndex(resolution: ResolutionResult): TemplateIndex {
  const templateToComponent = new Map<DocumentUri, string>();
  const templateToScope = new Map<DocumentUri, ResourceScopeId>();
  for (const entry of resolution.templates) {
    const uri = asDocumentUri(entry.templatePath);
    templateToComponent.set(uri, entry.componentPath);
    templateToScope.set(uri, entry.scopeId);
  }
  for (const entry of resolution.inlineTemplates) {
    const inlinePath = inlineTemplatePath(entry.componentPath);
    const uri = asDocumentUri(inlinePath);
    templateToComponent.set(uri, entry.componentPath);
    templateToScope.set(uri, entry.scopeId);
  }
  return {
    templates: resolution.templates,
    inlineTemplates: resolution.inlineTemplates,
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
        contents: `**<${kind}>** - Import Aurelia resources from a module`,
        span: imp.tagLoc,
      };
    }
    if (isWithinSpan(offset, imp.from.loc)) {
      const hasAlias = imp.defaultAlias || (imp.namedAliases && imp.namedAliases.length > 0);
      const aliasInfo = hasAlias ? "\n\n*Has aliases configured*" : "";
      return {
        contents: `**Module:** \`${imp.from.value}\`${aliasInfo}`,
        span: imp.from.loc,
      };
    }
    if (imp.defaultAlias && isWithinSpan(offset, imp.defaultAlias.loc)) {
      return {
        contents: `**Alias:** \`${imp.defaultAlias.value}\`\n\nRenames the default export from \`${imp.from.value}\``,
        span: imp.defaultAlias.loc,
      };
    }
    if (imp.namedAliases) {
      for (const alias of imp.namedAliases) {
        if (isWithinSpan(offset, alias.exportName.loc)) {
          return {
            contents: `**Export:** \`${alias.exportName.value}\`\n\nAliased as \`${alias.alias.value}\``,
            span: alias.exportName.loc,
          };
        }
        if (isWithinSpan(offset, alias.alias.loc)) {
          return {
            contents: `**Alias:** \`${alias.alias.value}\`\n\nFor export \`${alias.exportName.value}\` from \`${imp.from.value}\``,
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
        contents: `**<bindable>** - Declare a bindable property for this component`,
        span: bindable.tagLoc,
      };
    }
    if (isWithinSpan(offset, bindable.name.loc)) {
      const modeInfo = bindable.mode ? `, mode: ${bindable.mode.value}` : "";
      const attrInfo = bindable.attribute ? `, attribute: ${bindable.attribute.value}` : "";
      return {
        contents: `**Bindable:** \`${bindable.name.value}\`${modeInfo}${attrInfo}`,
        span: bindable.name.loc,
      };
    }
    if (bindable.mode && isWithinSpan(offset, bindable.mode.loc)) {
      return {
        contents: `**Binding Mode:** \`${bindable.mode.value}\`\n\nControls data flow direction for this bindable`,
        span: bindable.mode.loc,
      };
    }
    if (bindable.attribute && isWithinSpan(offset, bindable.attribute.loc)) {
      return {
        contents: `**HTML Attribute:** \`${bindable.attribute.value}\`\n\nThe attribute name used in templates (differs from property name \`${bindable.name.value}\`)`,
        span: bindable.attribute.loc,
      };
    }
  }
  return null;
}

function getOtherMetaHover(meta: TemplateMeta, offset: number): MetaHoverResult | null {
  if (meta.shadowDom && meta.shadowDom.tagLoc && isWithinSpan(offset, meta.shadowDom.tagLoc)) {
    return {
      contents: `**<use-shadow-dom>** - Enable Shadow DOM encapsulation for this component`,
      span: meta.shadowDom.tagLoc,
    };
  }
  if (meta.containerless && meta.containerless.tagLoc && isWithinSpan(offset, meta.containerless.tagLoc)) {
    return {
      contents: `**<containerless>** - Render component content without the host element wrapper`,
      span: meta.containerless.tagLoc,
    };
  }
  if (meta.capture && meta.capture.tagLoc && isWithinSpan(offset, meta.capture.tagLoc)) {
    return {
      contents: `**<capture>** - Capture all unrecognized attributes as bindings`,
      span: meta.capture.tagLoc,
    };
  }
  for (const alias of meta.aliases) {
    if (alias.tagLoc && isWithinSpan(offset, alias.tagLoc)) {
      return {
        contents: `**<alias>** - Define an alternative name for this component`,
        span: alias.tagLoc,
      };
    }
  }
  return null;
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

function resolveModuleSpecifier(specifier: string, containingFile: string, compilerOptions: ts.CompilerOptions): string | null {
  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    ts.sys,
  );
  if (result.resolvedModule?.resolvedFileName) {
    return result.resolvedModule.resolvedFileName;
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const fromDir = path.dirname(containingFile);
    const htmlPath = path.resolve(fromDir, `${specifier}.html`);
    if (fs.existsSync(htmlPath)) {
      return htmlPath;
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

function mergeLocations(...lists: readonly (readonly WorkspaceLocation[])[]): WorkspaceLocation[] {
  const results: WorkspaceLocation[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const loc of list) {
      const key = `${loc.uri}:${loc.span.start}:${loc.span.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(loc);
    }
  }
  results.sort((a, b) => {
    const uriDelta = String(a.uri).localeCompare(String(b.uri));
    if (uriDelta !== 0) return uriDelta;
    const startDelta = a.span.start - b.span.start;
    if (startDelta !== 0) return startDelta;
    return a.span.end - b.span.end;
  });
  return results;
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

type ResourceDefinitionEntry = {
  def: ResourceDef;
  symbolId?: string;
};

type ResourceTarget = {
  kind: "element" | "attribute" | "value-converter" | "binding-behavior";
  name: string;
  file: string | null;
};

type BindableTarget = {
  ownerKind: "element" | "attribute";
  ownerName: string;
  ownerFile: string | null;
  ownerDef: ResourceDef;
  bindable: BindableDef;
  property: string;
};

type InstructionOwner =
  | { kind: "element"; name: string; file: string | null }
  | { kind: "attribute"; name: string; file: string | null; isTemplateController?: boolean }
  | { kind: "controller"; name: string };

type InstructionHit = {
  instruction: LinkedInstruction;
  loc: SourceSpan;
  len: number;
  hostTag?: string;
  hostKind?: "custom" | "native" | "none";
  owner?: InstructionOwner | null;
};

type BindingCommands = Readonly<Record<string, unknown>>;

type ExpressionAst = {
  $kind?: string;
  span?: SourceSpan;
  name?: string;
  ancestor?: number;
  expression?: ExpressionAst;
  object?: ExpressionAst;
  func?: ExpressionAst;
  args?: ExpressionAst[];
  left?: ExpressionAst;
  right?: ExpressionAst;
  condition?: ExpressionAst;
  yes?: ExpressionAst;
  no?: ExpressionAst;
  target?: ExpressionAst;
  value?: ExpressionAst;
  key?: ExpressionAst;
  parts?: ExpressionAst[];
  expressions?: ExpressionAst[];
  declaration?: ExpressionAst;
  iterable?: ExpressionAst;
};

type DiagnosticMapContext = {
  text: string | null;
  compilation: TemplateCompilation | null;
  bindingCommands: BindingCommands;
};

type CodeActionContext = {
  request: WorkspaceCodeActionRequest;
  uri: DocumentUri;
  text: string;
  compilation: TemplateCompilation;
  diagnostics: readonly WorkspaceDiagnostic[];
  bindingCommands: BindingCommands;
  templateIndex: TemplateIndex;
  definitionIndex: ResourceDefinitionIndex;
  workspaceRoot: string;
  compilerOptions: ts.CompilerOptions;
  lookupText: (uri: DocumentUri) => string | null;
};

type BindableCandidate = {
  ownerKind: "element" | "attribute";
  ownerName: string;
  ownerFile: string | null;
  propertyName: string;
  attributeName: string | null;
};

type ImportCandidate = {
  kind: "element" | "attribute" | "controller" | "value-converter" | "binding-behavior";
  name: string;
};

type InsertContext = {
  offset: number;
  indent: string;
};

function resolveActionSpan(request: WorkspaceCodeActionRequest, text: string): SourceSpan | null {
  if (request.range) return normalizeSpan(request.range);
  if (!request.position) return null;
  const offset = offsetAtPosition(text, request.position);
  if (offset == null) return null;
  return { start: offset, end: offset };
}

function normalizeSpan(span: SourceSpan): SourceSpan {
  const start = Math.min(span.start, span.end);
  const end = Math.max(span.start, span.end);
  return { start, end, ...(span.file ? { file: span.file } : {}) };
}

function mergeCodeActions(
  primary: readonly WorkspaceCodeAction[],
  secondary: readonly WorkspaceCodeAction[],
  kinds: readonly string[] | undefined,
): WorkspaceCodeAction[] {
  const results: WorkspaceCodeAction[] = [];
  const seen = new Set<string>();
  for (const action of [...primary, ...secondary]) {
    if (!matchesActionKind(action.kind, kinds)) continue;
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    results.push(action);
  }
  return results;
}

function matchesActionKind(actionKind: string | undefined, kinds: readonly string[] | undefined): boolean {
  if (!kinds || kinds.length === 0) return true;
  if (!actionKind) return false;
  return kinds.some((kind) => actionKind === kind || actionKind.startsWith(`${kind}.`));
}

function collectWorkspaceCodeActions(ctx: CodeActionContext, targetSpan: SourceSpan): WorkspaceCodeAction[] {
  if (ctx.request.kinds && !ctx.request.kinds.some((kind) => kind === "quickfix" || kind.startsWith("quickfix."))) {
    return [];
  }
  const results: WorkspaceCodeAction[] = [];
  const seen = new Set<string>();
  for (const diagnostic of ctx.diagnostics) {
    if (!diagnostic.span || !spanIntersects(diagnostic.span, targetSpan)) continue;
    let action: WorkspaceCodeAction | null = null;
    switch (diagnostic.code) {
      case "aurelia/unknown-bindable":
        action = buildAddBindableAction(diagnostic, ctx);
        break;
      case "aurelia/unknown-element":
      case "aurelia/unknown-attribute":
      case "aurelia/unknown-controller":
      case "aurelia/unknown-converter":
      case "aurelia/unknown-behavior":
      case "aurelia/expr-symbol-not-found":
        action = buildAddImportAction(diagnostic, ctx, targetSpan);
        break;
      default:
        break;
    }
    if (!action || seen.has(action.id)) continue;
    seen.add(action.id);
    results.push(action);
  }
  return results;
}

function spanIntersects(a: SourceSpan, b: SourceSpan): boolean {
  const aStart = Math.min(a.start, a.end);
  const aEnd = Math.max(a.start, a.end);
  const bStart = Math.min(b.start, b.end);
  const bEnd = Math.max(b.start, b.end);
  if (aStart === aEnd) return bStart <= aStart && aStart <= bEnd;
  if (bStart === bEnd) return aStart <= bStart && bStart <= aEnd;
  return aStart < bEnd && bStart < aEnd;
}

function resolveBindableCandidate(
  hit: InstructionHit,
  text: string,
  bindingCommands: BindingCommands,
  definitionIndex?: ResourceDefinitionIndex | null,
  preferRoots: readonly string[] = [],
): BindableCandidate | null {
  const attrName = attributeNameFromHit(text, hit);
  const base = attributeBaseName(attrName, bindingCommands);
  if (!base) return null;
  const propertyName = dashToCamel(base);
  const attributeName = base !== propertyName ? base : null;

  if (hit.owner && (hit.owner.kind === "element" || hit.owner.kind === "attribute")) {
    return {
      ownerKind: hit.owner.kind,
      ownerName: hit.owner.name,
      ownerFile: hit.owner.file,
      propertyName,
      attributeName,
    };
  }

  if (hit.hostKind === "custom" && hit.hostTag) {
    const entry = definitionIndex
      ? findResourceEntry(definitionIndex.elements, hit.hostTag.toLowerCase(), null, preferRoots)
      : null;
    return {
      ownerKind: "element",
      ownerName: hit.hostTag,
      ownerFile: entry?.def.file ?? null,
      propertyName,
      attributeName,
    };
  }

  return null;
}

function attributeNameFromHit(text: string, hit: InstructionHit): string | null {
  const span = attributeNameSpan(text, hit.loc);
  if (!span) return null;
  return text.slice(span.start, span.end);
}

function attributeBaseName(attrName: string | null, bindingCommands: BindingCommands): string | null {
  if (!attrName) return null;
  if (attrName.startsWith(":") || attrName.startsWith("@")) {
    return attrName.slice(1) || null;
  }
  const parts = attrName.split(".");
  if (parts.length < 2) return attrName;
  const command = parts[parts.length - 1];
  if (!command) return attrName;
  return bindingCommands[command] ? parts.slice(0, -1).join(".") : attrName;
}

function resolveImportCandidate(
  diagnostic: WorkspaceDiagnostic,
  ctx: CodeActionContext,
  targetSpan: SourceSpan,
): ImportCandidate | null {
  const data = diagnostic.data as Record<string, unknown> | undefined;
  const dataKind = typeof data?.resourceKind === "string" ? data.resourceKind : null;
  const dataName = typeof data?.name === "string" ? data.name : null;
  if (dataKind && dataName) {
    return { kind: dataKind as ImportCandidate["kind"], name: dataName };
  }

  const offset = Number.isFinite(targetSpan.start) ? targetSpan.start : diagnostic.span?.start ?? null;
  if (offset == null) return null;

  switch (diagnostic.code) {
    case "aurelia/unknown-element": {
      const name = findElementNameAtOffset(ctx.compilation, offset);
      return name ? { kind: "element", name } : null;
    }
    case "aurelia/unknown-attribute": {
      const hit = findInstructionHit(ctx.compilation, offset);
      const attrName = hit ? attributeNameFromHit(ctx.text, hit) : null;
      const base = attributeBaseName(attrName, ctx.bindingCommands);
      return base ? { kind: "attribute", name: base } : null;
    }
    case "aurelia/unknown-controller": {
      const name = findControllerNameAtOffset(ctx.compilation, ctx.text, offset, ctx.bindingCommands);
      return name ? { kind: "controller", name } : null;
    }
    case "aurelia/unknown-converter": {
      const hit = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
      return hit ? { kind: "value-converter", name: hit.name } : null;
    }
    case "aurelia/unknown-behavior": {
      const hit = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
      return hit ? { kind: "binding-behavior", name: hit.name } : null;
    }
    case "aurelia/expr-symbol-not-found": {
      const symbolKind = typeof data?.symbolKind === "string" ? data.symbolKind : null;
      if (symbolKind === "binding-behavior") {
        const hit = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
        return hit ? { kind: "binding-behavior", name: hit.name } : null;
      }
      if (symbolKind === "value-converter") {
        const hit = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
        return hit ? { kind: "value-converter", name: hit.name } : null;
      }
      const converter = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
      if (converter) return { kind: "value-converter", name: converter.name };
      const behavior = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
      return behavior ? { kind: "binding-behavior", name: behavior.name } : null;
    }
    default:
      return null;
  }
}

function buildAddImportAction(
  diagnostic: WorkspaceDiagnostic,
  ctx: CodeActionContext,
  targetSpan: SourceSpan,
): WorkspaceCodeAction | null {
  const candidate = resolveImportCandidate(diagnostic, ctx, targetSpan);
  if (!candidate) return null;

  const map = resourceMapForKind(ctx.definitionIndex, candidate.kind);
  const entry = findResourceEntry(map, candidate.name.toLowerCase(), null, [ctx.workspaceRoot]);
  if (!entry?.def.file) return null;

  const containingFile = ctx.templateIndex.templateToComponent.get(ctx.uri) ?? canonicalDocumentUri(ctx.uri).path;
  const targetFile = resolveFilePath(entry.def.file, ctx.workspaceRoot);
  const specifier = moduleSpecifierFromFile(targetFile, containingFile);
  if (!specifier) return null;

  const templatePath = canonicalDocumentUri(ctx.uri).path;
  const meta = extractTemplateMeta(ctx.text, templatePath);
  if (hasImportForFile(meta, targetFile, containingFile, ctx.compilerOptions)) return null;

  const insertion = computeImportInsertion(ctx.text, meta);
  const line = `${insertion.indent}<import from="${specifier}"></import>`;
  const edit = buildInsertionEdit(ctx.uri, ctx.text, insertion.offset, line);
  const name = candidate.name;
  const id = `aurelia/add-import:${candidate.kind}:${name}`;
  return {
    id,
    title: `Add <import> for '${name}'`,
    kind: "quickfix",
    edit: { edits: finalizeWorkspaceEdits([edit]) },
  };
}

function buildAddBindableAction(
  diagnostic: WorkspaceDiagnostic,
  ctx: CodeActionContext,
): WorkspaceCodeAction | null {
  const offset = diagnostic.span?.start ?? null;
  if (offset == null) return null;
  const hit = findInstructionHit(ctx.compilation, offset);
  if (!hit) return null;

  const candidate = resolveBindableCandidate(hit, ctx.text, ctx.bindingCommands, ctx.definitionIndex, [ctx.workspaceRoot]);
  if (!candidate || candidate.ownerKind !== "element" || !candidate.ownerFile) return null;

  const target = resolveExternalTemplateForComponent(candidate.ownerFile, ctx.templateIndex);
  if (!target) return null;
  const templateText = ctx.lookupText(target.uri);
  if (!templateText) return null;

  const meta = extractTemplateMeta(templateText, target.path);
  const insertion = computeBindableInsertion(templateText, meta);
  const attributePart = candidate.attributeName ? ` attribute="${candidate.attributeName}"` : "";
  const line = `${insertion.indent}<bindable name="${candidate.propertyName}"${attributePart}></bindable>`;
  const edit = buildInsertionEdit(target.uri, templateText, insertion.offset, line);

  const id = `aurelia/add-bindable:${candidate.ownerName}:${candidate.propertyName}`;
  return {
    id,
    title: `Add <bindable> '${candidate.propertyName}' to ${candidate.ownerName}`,
    kind: "quickfix",
    edit: { edits: finalizeWorkspaceEdits([edit]) },
  };
}

function buildInsertionEdit(uri: DocumentUri, text: string, offset: number, line: string): WorkspaceTextEdit {
  const canonical = canonicalDocumentUri(uri);
  const newText = buildLineInsertion(text, offset, line);
  const span: SourceSpan = { start: offset, end: offset, file: canonical.file };
  return { uri: canonical.uri, span, newText };
}

function buildLineInsertion(text: string, offset: number, line: string): string {
  const newline = detectNewline(text);
  const before = offset > 0 ? text[offset - 1] : "";
  const after = offset < text.length ? text[offset] : "";
  const needsLeading = offset > 0 && before !== "\n" && before !== "\r";
  const needsTrailing = offset < text.length && after !== "\n" && after !== "\r";
  return `${needsLeading ? newline : ""}${line}${needsTrailing ? newline : ""}`;
}

function computeImportInsertion(text: string, meta: TemplateMetaIR): InsertContext {
  const lastImport = pickLastByEnd(meta.imports);
  if (lastImport) {
    return { offset: lastImport.elementLoc.end, indent: lineIndentAt(text, lastImport.elementLoc.start) };
  }
  const firstBindable = pickFirstByStart(meta.bindables);
  if (firstBindable) {
    return { offset: firstBindable.elementLoc.start, indent: lineIndentAt(text, firstBindable.elementLoc.start) };
  }
  return findTemplateRootInsert(text) ?? { offset: 0, indent: "" };
}

function computeBindableInsertion(text: string, meta: TemplateMetaIR): InsertContext {
  const lastBindable = pickLastByEnd(meta.bindables);
  if (lastBindable) {
    return { offset: lastBindable.elementLoc.end, indent: lineIndentAt(text, lastBindable.elementLoc.start) };
  }
  const lastImport = pickLastByEnd(meta.imports);
  if (lastImport) {
    return { offset: lastImport.elementLoc.end, indent: lineIndentAt(text, lastImport.elementLoc.start) };
  }
  return findTemplateRootInsert(text) ?? { offset: 0, indent: "" };
}

function pickLastByEnd<T extends { elementLoc: SourceSpan }>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (!best || item.elementLoc.end > best.elementLoc.end) {
      best = item;
    }
  }
  return best;
}

function pickFirstByStart<T extends { elementLoc: SourceSpan }>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (!best || item.elementLoc.start < best.elementLoc.start) {
      best = item;
    }
  }
  return best;
}

function findTemplateRootInsert(text: string): InsertContext | null {
  const match = text.match(/^[\s\r\n]*<template\b[^>]*>/i);
  if (!match) return null;
  const offset = match[0].length;
  const tagStart = match[0].search(/<template\b/i);
  const openIndent = lineIndentAt(text, Math.max(0, tagStart));
  const after = text.slice(offset);
  const childIndentMatch = after.match(/\r?\n([ \t]*)\S/);
  const childIndent = childIndentMatch?.[1] ?? `${openIndent}${detectIndentUnit(text)}`;
  return { offset, indent: childIndent };
}

function lineIndentAt(text: string, offset: number): string {
  const lineStart = Math.max(0, text.lastIndexOf("\n", offset - 1) + 1);
  const line = text.slice(lineStart, offset);
  return line.match(/^[ \t]*/)?.[0] ?? "";
}

function detectIndentUnit(text: string): string {
  const lines = text.split(/\r?\n/);
  let minSpaces = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    const tabMatch = line.match(/^\t+\S/);
    if (tabMatch) return "\t";
    const spaceMatch = line.match(/^( +)\S/);
    const spaces = spaceMatch?.[1];
    if (spaces) {
      minSpaces = Math.min(minSpaces, spaces.length);
    }
  }
  if (minSpaces !== Number.POSITIVE_INFINITY) {
    return " ".repeat(minSpaces);
  }
  return "  ";
}

function detectNewline(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function moduleSpecifierFromFile(targetFile: string, containingFile: string): string | null {
  if (!targetFile || !containingFile) return null;
  const fromDir = path.dirname(containingFile);
  let relative = path.relative(fromDir, targetFile);
  if (!relative) return null;
  relative = normalizePathSlashes(relative);
  relative = stripKnownExtension(relative);
  if (!relative.startsWith(".")) {
    relative = `./${relative}`;
  }
  return relative;
}

function stripKnownExtension(filePath: string): string {
  const lower = filePath.toLowerCase();
  const extensions = [
    ".d.mts",
    ".d.cts",
    ".d.ts",
    ".inline.html",
    ".html",
    ".mts",
    ".cts",
    ".mjs",
    ".cjs",
    ".tsx",
    ".jsx",
    ".ts",
    ".js",
  ];
  for (const ext of extensions) {
    if (lower.endsWith(ext)) {
      return filePath.slice(0, -ext.length);
    }
  }
  return filePath;
}

function normalizePathSlashes(filePath: string): string {
  return filePath.split("\\").join("/");
}

function resolveFilePath(filePath: string, workspaceRoot: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
}

function resolveExternalTemplateForComponent(
  componentFile: string,
  templateIndex: TemplateIndex,
): { uri: DocumentUri; path: string } | null {
  const normalized = normalizePathForId(componentFile);
  for (const entry of templateIndex.templates) {
    if (normalizePathForId(entry.componentPath) === normalized) {
      return { uri: asDocumentUri(entry.templatePath), path: entry.templatePath };
    }
  }
  return null;
}

function resourceMapForKind(
  index: ResourceDefinitionIndex,
  kind: ImportCandidate["kind"],
): ReadonlyMap<string, ResourceDefinitionEntry[]> {
  switch (kind) {
    case "element":
      return index.elements;
    case "attribute":
      return index.attributes;
    case "controller":
      return index.controllers;
    case "value-converter":
      return index.valueConverters;
    case "binding-behavior":
      return index.bindingBehaviors;
  }
}

function hasImportForFile(
  meta: TemplateMetaIR,
  targetFile: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions,
): boolean {
  const targetNormalized = normalizePathForId(targetFile);
  for (const imp of meta.imports) {
    const resolved = resolveModuleSpecifier(imp.from.value, containingFile, compilerOptions);
    if (!resolved) continue;
    if (normalizePathForId(resolved) === targetNormalized) return true;
  }
  return false;
}

function findInstructionHit(compilation: TemplateCompilation, offset: number): InstructionHit | null {
  const hits = findInstructionsAtOffset(compilation.linked.templates, offset);
  return hits[0] ?? null;
}

function findElementNameAtOffset(
  compilation: TemplateCompilation,
  offset: number,
): string | null {
  const node = compilation.query.nodeAt(offset);
  if (!node || node.kind !== "element") return null;
  const row = findLinkedRow(compilation.linked.templates, node.templateIndex, node.id);
  if (!row || row.node.kind !== "element") return null;
  return row.node.tag;
}

function findControllerNameAtOffset(
  compilation: TemplateCompilation,
  text: string,
  offset: number,
  bindingCommands: BindingCommands,
): string | null {
  const controller = compilation.query.controllerAt(offset);
  if (controller?.kind) return controller.kind;
  const hit = findInstructionHit(compilation, offset);
  const attrName = hit ? attributeNameFromHit(text, hit) : null;
  const base = attributeBaseName(attrName, bindingCommands);
  return base ?? null;
}

function mapWorkspaceDiagnostic(diag: WorkspaceDiagnostic, ctx: DiagnosticMapContext): WorkspaceDiagnostic {
  if (diag.source === "typescript") {
    return {
      ...diag,
      code: String(diag.code),
      source: "typescript",
    };
  }

  const code = String(diag.code);
  const span = diag.span;
  const offset = span?.start ?? null;
  const text = ctx.text;
  const compilation = ctx.compilation;
  const base = {
    message: diag.message,
    severity: diag.severity,
    span: diag.span,
    source: "aurelia" as const,
  };

  switch (code) {
    case "AU1102": {
      const name = offset != null && text && compilation
        ? findElementNameAtOffset(compilation, offset)
        : null;
      return {
        ...base,
        code: "aurelia/unknown-element",
        data: mergeDiagnosticData(diag.data, {
          aurCode: "AUR0752",
          ...(name ? { resourceKind: "element", name } : {}),
        }),
      };
    }
    case "AU1101": {
      const name = offset != null && text && compilation
        ? findControllerNameAtOffset(compilation, text, offset, ctx.bindingCommands)
        : null;
      return {
        ...base,
        code: "aurelia/unknown-controller",
        data: mergeDiagnosticData(diag.data, {
          aurCode: "AUR0754",
          ...(name ? { resourceKind: "controller", name } : {}),
        }),
      };
    }
    case "AU1104": {
      let bindableData: Record<string, unknown> | null = null;
      let attrName: string | null = null;
      if (offset != null && text && compilation) {
        const hit = findInstructionHit(compilation, offset);
        const target = hit
          ? (hit.instruction as { target?: { kind?: string } }).target
          : null;
        if (hit && target && typeof target === "object" && "kind" in target && target.kind === "unknown") {
          const candidate = resolveBindableCandidate(hit, text, ctx.bindingCommands);
          if (candidate) {
            bindableData = {
              bindable: {
                name: candidate.propertyName,
                attribute: candidate.attributeName ?? undefined,
                ownerKind: candidate.ownerKind,
                ownerName: candidate.ownerName,
                ...(candidate.ownerFile ? { ownerFile: candidate.ownerFile } : {}),
              },
            };
          } else {
            const raw = attributeNameFromHit(text, hit);
            attrName = attributeBaseName(raw, ctx.bindingCommands);
          }
        }
      }
      if (bindableData) {
        return {
          ...base,
          code: "aurelia/unknown-bindable",
          data: mergeDiagnosticData(diag.data, {
            aurCode: "AUR0707",
            ...bindableData,
          }),
        };
      }
      if (attrName) {
        return {
          ...base,
          code: "aurelia/unknown-attribute",
          data: mergeDiagnosticData(diag.data, {
            aurCode: "AUR0753",
            resourceKind: "attribute",
            name: attrName,
          }),
        };
      }
      return {
        ...base,
        code: "aurelia/unknown-bindable",
        data: mergeDiagnosticData(diag.data, { aurCode: "AUR0707" }),
      };
    }
    case "AU0101": {
      const name = offset != null && text && compilation
        ? findBindingBehaviorAtOffset(compilation.exprTable ?? [], text, offset)?.name
        : null;
      return {
        ...base,
        code: "aurelia/expr-symbol-not-found",
        data: mergeDiagnosticData(diag.data, {
          aurCode: "AUR0101",
          symbolKind: "binding-behavior",
          ...(name ? { name } : {}),
        }),
      };
    }
    case "AU0103": {
      const name = offset != null && text && compilation
        ? findValueConverterAtOffset(compilation.exprTable ?? [], text, offset)?.name
        : null;
      return {
        ...base,
        code: "aurelia/expr-symbol-not-found",
        data: mergeDiagnosticData(diag.data, {
          aurCode: "AUR0103",
          symbolKind: "value-converter",
          ...(name ? { name } : {}),
        }),
      };
    }
    case "AU0102":
    case "AU0106":
    case "AU9996": {
      const aurCode = code === "AU0102"
        ? "AUR0102"
        : code === "AU0106"
          ? "AUR0106"
          : "AUR9996";
      return {
        ...base,
        code: "aurelia/invalid-binding-pattern",
        data: mergeDiagnosticData(diag.data, { aurCode }),
      };
    }
    case "AU0704":
      return {
        ...base,
        code: "aurelia/invalid-command-usage",
        data: mergeDiagnosticData(diag.data, { aurCode: "AUR0704" }),
      };
    case "AU0705": {
      let command: string | null = null;
      if (offset != null && text && compilation) {
        const hit = findInstructionHit(compilation, offset);
        const raw = hit ? attributeNameFromHit(text, hit) : null;
        if (raw) {
          const parts = raw.split(".");
          if (parts.length > 1) command = parts[parts.length - 1] ?? null;
        }
      }
      return {
        ...base,
        code: "aurelia/unknown-command",
        data: mergeDiagnosticData(diag.data, {
          aurCode: "AUR0713",
          ...(command ? { command } : {}),
        }),
      };
    }
    case "AU0810":
    case "AU0813":
    case "AU0815":
    case "AU0816":
      return {
        ...base,
        code: "aurelia/invalid-command-usage",
        data: mergeDiagnosticData(diag.data, { aurCode: `AUR${code.slice(2)}` }),
      };
    case "AU1106":
      return {
        ...base,
        code: "aurelia/invalid-command-usage",
      };
    case "AU1201":
    case "AU1202":
      return {
        ...base,
        code: "aurelia/invalid-binding-pattern",
      };
    case "AU1203":
      return {
        ...base,
        code: "aurelia/expr-parse-error",
        data: mergeDiagnosticData(diag.data, { recovery: true }),
      };
    case "AU1301":
    case "AU1302":
    case "AU1303":
      return {
        ...base,
        code: "aurelia/expr-type-mismatch",
      };
    default:
      return {
        ...base,
        code: `aurelia/${code}`,
        data: diag.data,
      };
  }
}

function mergeDiagnosticData(
  base: WorkspaceDiagnostic["data"],
  next: Record<string, unknown> | null,
): WorkspaceDiagnostic["data"] {
  if (!base && !next) return undefined;
  if (!next || Object.keys(next).length === 0) return base;
  return { ...(base ?? {}), ...next };
}

function gapCodeForKind(kind: string): string {
  switch (kind) {
    case "conditional-registration":
    case "loop-variable":
      return "aurelia/gap/unknown-registration";
    default:
      return "aurelia/gap/partial-eval";
  }
}

function finalizeWorkspaceEdits(edits: WorkspaceTextEdit[]): WorkspaceTextEdit[] {
  const seen = new Set<string>();
  const results: WorkspaceTextEdit[] = [];
  for (const edit of edits) {
    const key = `${edit.uri}:${edit.span.start}:${edit.span.end}:${edit.newText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(edit);
  }
  results.sort((a, b) => {
    const uriDelta = String(a.uri).localeCompare(String(b.uri));
    if (uriDelta !== 0) return uriDelta;
    return b.span.start - a.span.start;
  });
  return results;
}

function findResourceEntry(
  map: ReadonlyMap<string, ResourceDefinitionEntry[]>,
  name: string,
  file: string | null,
  preferRoots: readonly string[],
): ResourceDefinitionEntry | null {
  const entries = map.get(name);
  if (!entries?.length) return null;

  if (file) {
    const normalized = normalizePathForId(file);
    const exact = entries.find((entry) => entry.def.file && normalizePathForId(entry.def.file) === normalized);
    if (exact) return exact;
  }

  if (preferRoots.length) {
    const roots = preferRoots.map((root) => normalizePathForId(root));
    const matches = entries.filter((entry) => {
      if (!entry.def.file) return false;
      const defPath = normalizePathForId(entry.def.file);
      return roots.some((root) => defPath.startsWith(root));
    });
    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1) return matches[0]!;
  }

  return entries[0] ?? null;
}

function buildResourceNameEdit(
  def: ResourceDef,
  oldName: string,
  newName: string,
  lookupText: (uri: DocumentUri) => string | null,
): WorkspaceTextEdit | null {
  const loc = readLocation(def.name);
  if (!loc) return null;
  return buildLocationEdit(loc, newName, lookupText, oldName);
}

function buildBindableAttributeEdit(
  bindable: BindableDef,
  oldName: string,
  newName: string,
  lookupText: (uri: DocumentUri) => string | null,
): WorkspaceTextEdit | null {
  const loc = readLocation(bindable.attribute);
  if (!loc) return null;
  return buildLocationEdit(loc, newName, lookupText, oldName);
}

function buildLocationEdit(
  loc: SourceLocation,
  newName: string,
  lookupText: (uri: DocumentUri) => string | null,
  expected?: string,
): WorkspaceTextEdit | null {
  const canonical = canonicalDocumentUri(loc.file);
  const span: SourceSpan = { start: loc.pos, end: loc.end, file: toSourceFileId(loc.file) };
  const text = lookupText(canonical.uri);
  const original = text ? text.slice(span.start, span.end) : "";
  if (expected !== undefined) {
    const literal = parseStringLiteral(original);
    if (!literal || literal.value !== expected) return null;
    return { uri: canonical.uri, span, newText: `${literal.quote}${newName}${literal.quote}` };
  }
  const newText = replaceStringLiteral(original, newName);
  return { uri: canonical.uri, span, newText };
}

function parseStringLiteral(original: string): { value: string; quote: string } | null {
  if (original.length < 2) return null;
  const first = original[0];
  const last = original[original.length - 1];
  if ((first === "\"" || first === "'" || first === "`") && last === first) {
    return { value: original.slice(1, -1), quote: first };
  }
  return null;
}

function replaceStringLiteral(original: string, value: string): string {
  if (original.length >= 2) {
    const first = original[0];
    const last = original[original.length - 1];
    if ((first === "\"" || first === "'" || first === "`") && last === first) {
      return `${first}${value}${first}`;
    }
  }
  return value;
}

function findLinkedRow(
  templates: readonly { rows: readonly LinkedRow[] }[],
  templateIndex: number,
  nodeId: string,
): LinkedRow | null {
  const template = templates[templateIndex];
  if (!template) return null;
  return template.rows.find((row) => row.target === nodeId) ?? null;
}

function elementTagSpanAtOffset(
  text: string,
  span: SourceSpan | undefined,
  tag: string,
  offset: number,
): SourceSpan | null {
  if (!span) return null;
  const openStart = span.start + 1;
  const openEnd = openStart + tag.length;
  if (offset >= openStart && offset < openEnd) {
    return { start: openStart, end: openEnd, ...(span.file ? { file: span.file } : {}) };
  }
  const closePattern = `</${tag}>`;
  const closeTagStart = text.lastIndexOf(closePattern, span.end);
  if (closeTagStart !== -1 && closeTagStart > span.start) {
    const closeNameStart = closeTagStart + 2;
    const closeNameEnd = closeNameStart + tag.length;
    if (offset >= closeNameStart && offset < closeNameEnd) {
      return { start: closeNameStart, end: closeNameEnd, ...(span.file ? { file: span.file } : {}) };
    }
  }
  return null;
}

function elementTagNameSpans(text: string, span: SourceSpan, tag: string): SourceSpan[] {
  const spans: SourceSpan[] = [];
  const openStart = span.start + 1;
  spans.push({ start: openStart, end: openStart + tag.length, ...(span.file ? { file: span.file } : {}) });

  const closePattern = `</${tag}>`;
  const closeTagStart = text.lastIndexOf(closePattern, span.end);
  if (closeTagStart !== -1 && closeTagStart > span.start) {
    const closeNameStart = closeTagStart + 2;
    const closeNameEnd = closeNameStart + tag.length;
    spans.push({ start: closeNameStart, end: closeNameEnd, ...(span.file ? { file: span.file } : {}) });
  }

  return spans;
}

function attributeNameSpan(text: string, loc: SourceSpan): SourceSpan | null {
  const raw = text.slice(loc.start, loc.end);
  const eq = raw.indexOf("=");
  const namePart = (eq === -1 ? raw : raw.slice(0, eq)).trim();
  if (!namePart) return null;
  const nameOffset = raw.indexOf(namePart);
  if (nameOffset < 0) return null;
  const start = loc.start + nameOffset;
  const end = start + namePart.length;
  return { start, end, ...(loc.file ? { file: loc.file } : {}) };
}

function findInstructionsAtOffset(
  templates: readonly { rows: readonly LinkedRow[] }[],
  offset: number,
): InstructionHit[] {
  const hits: InstructionHit[] = [];
  const addHit = (
    instruction: LinkedInstruction,
    host: { hostTag?: string; hostKind?: "custom" | "native" | "none" },
    owner?: InstructionOwner | null,
  ) => {
    const loc = instruction.loc ?? null;
    if (!loc) return;
    if (!spanContainsOffset(loc, offset)) return;
    hits.push({
      instruction,
      loc,
      len: spanLength(loc),
      hostTag: host.hostTag,
      hostKind: host.hostKind,
      ...(owner ? { owner } : {}),
    });
  };

  for (const template of templates) {
    for (const row of template.rows ?? []) {
      const host: { hostTag?: string; hostKind?: "custom" | "native" | "none" } =
        row.node.kind === "element"
          ? {
            hostTag: row.node.tag,
            hostKind: row.node.custom ? "custom" : row.node.native ? "native" : "none",
          }
          : {};
      const elementOwner: InstructionOwner | null = row.node.kind === "element" && row.node.custom?.def
        ? { kind: "element", name: row.node.custom.def.name, file: row.node.custom.def.file ?? null }
        : null;
      for (const instruction of row.instructions ?? []) {
        addHit(instruction, host, elementOwner);
        if (
          instruction.kind === "hydrateElement"
          || instruction.kind === "hydrateAttribute"
          || instruction.kind === "hydrateTemplateController"
        ) {
          const owner: InstructionOwner | null =
            instruction.kind === "hydrateElement"
              ? instruction.res?.def
                ? { kind: "element", name: instruction.res.def.name, file: instruction.res.def.file ?? null }
                : elementOwner
              : instruction.kind === "hydrateAttribute"
                ? instruction.res?.def
                  ? {
                    kind: "attribute",
                    name: instruction.res.def.name,
                    file: instruction.res.def.file ?? null,
                    isTemplateController: instruction.res.def.isTemplateController,
                  }
                  : null
                : instruction.kind === "hydrateTemplateController"
                  ? { kind: "controller", name: instruction.res }
                  : null;
          for (const prop of instruction.props ?? []) {
            addHit(prop, host, owner);
          }
        }
      }
    }
  }

  hits.sort((a, b) => a.len - b.len);
  return hits;
}

function resolveBindableTarget(
  instruction: LinkedInstruction,
  resources: ResourceDefinitionIndex,
  preferRoots: readonly string[],
): BindableTarget | null {
  if (instruction.kind !== "propertyBinding" && instruction.kind !== "attributeBinding" && instruction.kind !== "setProperty") {
    return null;
  }
  const target = instruction.target as { kind?: string } | null | undefined;
  if (!target || typeof target !== "object" || !("kind" in target)) return null;

  switch (target.kind) {
    case "element.bindable": {
      const t = target as { element: { def: { name: string; file?: string } } };
      const entry = findResourceEntry(resources.elements, t.element.def.name, t.element.def.file ?? null, preferRoots);
      if (!entry) return null;
      const bindable = findBindableDef(entry.def, instruction.to);
      if (!bindable) return null;
      return {
        ownerKind: "element",
        ownerName: t.element.def.name,
        ownerFile: t.element.def.file ?? null,
        ownerDef: entry.def,
        bindable,
        property: instruction.to,
      };
    }
    case "attribute.bindable": {
      const t = target as { attribute: { def: { name: string; file?: string; isTemplateController?: boolean } } };
      const map = t.attribute.def.isTemplateController ? resources.controllers : resources.attributes;
      const entry = findResourceEntry(map, t.attribute.def.name, t.attribute.def.file ?? null, preferRoots);
      if (!entry) return null;
      const bindable = findBindableDef(entry.def, instruction.to);
      if (!bindable) return null;
      return {
        ownerKind: "attribute",
        ownerName: t.attribute.def.name,
        ownerFile: t.attribute.def.file ?? null,
        ownerDef: entry.def,
        bindable,
        property: instruction.to,
      };
    }
    default:
      return null;
  }
}

function collectBindableAttributeMatches(
  compilation: TemplateCompilation,
  text: string,
  target: BindableTarget,
): Array<{ span: SourceSpan; attrName: string }> {
  const results: Array<{ span: SourceSpan; attrName: string }> = [];
  for (const template of compilation.linked.templates ?? []) {
    for (const row of template.rows ?? []) {
      for (const instruction of row.instructions ?? []) {
        collectBindableInstructionMatches(instruction, target, text, results);
        if (
          instruction.kind === "hydrateElement"
          || instruction.kind === "hydrateAttribute"
          || instruction.kind === "hydrateTemplateController"
        ) {
          for (const prop of instruction.props ?? []) {
            collectBindableInstructionMatches(prop, target, text, results);
          }
        }
      }
    }
  }
  return results;
}

function collectBindableInstructionMatches(
  instruction: LinkedInstruction,
  target: BindableTarget,
  text: string,
  results: Array<{ span: SourceSpan; attrName: string }>,
): void {
  if (instruction.kind !== "propertyBinding" && instruction.kind !== "attributeBinding" && instruction.kind !== "setProperty") {
    return;
  }
  const loc = instruction.loc ?? null;
  if (!loc) return;

  const targetInfo = instruction.target as { kind?: string } | null | undefined;
  if (!targetInfo || typeof targetInfo !== "object" || !("kind" in targetInfo)) return;

  if (target.ownerKind === "element" && targetInfo.kind === "element.bindable") {
    const t = targetInfo as { element: { def: { name: string; file?: string } } };
    if (!resourceRefMatches(t.element.def, target.ownerName, target.ownerFile)) return;
  } else if (target.ownerKind === "attribute" && targetInfo.kind === "attribute.bindable") {
    const t = targetInfo as { attribute: { def: { name: string; file?: string } } };
    if (!resourceRefMatches(t.attribute.def, target.ownerName, target.ownerFile)) return;
  } else {
    return;
  }

  if (instruction.to !== target.property) return;
  const nameSpan = attributeNameSpan(text, loc);
  if (!nameSpan) return;
  const attrName = text.slice(nameSpan.start, nameSpan.end);
  results.push({ span: nameSpan, attrName });
}

function renameAttributeName(attrName: string, newBase: string, bindingCommands: BindingCommands): string {
  if (!attrName) return newBase;
  if (attrName.startsWith(":") || attrName.startsWith("@")) {
    return `${attrName[0]}${newBase}`;
  }
  const parts = attrName.split(".");
  if (parts.length > 1) {
    const command = parts[parts.length - 1];
    if (command && bindingCommands[command]) {
      return `${newBase}.${command}`;
    }
  }
  return newBase;
}

function collectElementTagSpans(
  compilation: TemplateCompilation,
  text: string,
  target: ResourceTarget,
): SourceSpan[] {
  const results: SourceSpan[] = [];
  const irTemplates = (compilation.ir as { templates?: Array<{ dom: { id: string; kind: string; tag?: string; loc?: SourceSpan | null; children?: unknown[] } }> } | null)?.templates ?? [];
  const linkedTemplates = compilation.linked.templates ?? [];

  for (let i = 0; i < irTemplates.length; i += 1) {
    const irTemplate = irTemplates[i];
    const linked = linkedTemplates[i];
    if (!irTemplate || !linked) continue;
    const rowsByTarget = new Map<string, LinkedRow>();
    for (const row of linked.rows ?? []) {
      rowsByTarget.set(row.target, row);
    }

    const stack: Array<{ id: string; kind: string; tag?: string; loc?: SourceSpan | null; children?: unknown[] }> = [irTemplate.dom];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (node.kind === "element") {
        const row = rowsByTarget.get(node.id);
        if (row?.node.kind === "element" && row.node.custom?.def && node.loc) {
          if (resourceRefMatches(row.node.custom.def, target.name, target.file)) {
            results.push(...elementTagNameSpans(text, node.loc, row.node.tag));
          }
        }
      }
      if (node.kind === "element" || node.kind === "template") {
        const children = node.children as Array<{ id: string; kind: string; tag?: string; loc?: SourceSpan | null; children?: unknown[] }> | undefined;
        if (children?.length) {
          for (let c = children.length - 1; c >= 0; c -= 1) {
            stack.push(children[c]!);
          }
        }
      }
    }
  }

  return results;
}

function collectConverterSpans(
  exprTable: readonly { id: string; ast: unknown }[],
  text: string,
  name: string,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  for (const entry of exprTable) {
    collectConverterNodes(entry.ast as ExpressionAst, text, name, spans);
  }
  return spans;
}

function collectConverterNodes(
  node: ExpressionAst | null | undefined,
  text: string,
  name: string,
  spans: SourceSpan[],
): void {
  if (!node || !node.$kind) return;
  if (node.$kind === "ValueConverter" && node.name === name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "|", name);
    if (start !== -1) {
      spans.push({ start, end: start + name.length, ...(node.span.file ? { file: node.span.file } : {}) });
    }
  }
  walkAstChildren(node, text, name, spans, collectConverterNodes);
}

function collectBehaviorSpans(
  exprTable: readonly { id: string; ast: unknown }[],
  text: string,
  name: string,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  for (const entry of exprTable) {
    collectBehaviorNodes(entry.ast as ExpressionAst, text, name, spans);
  }
  return spans;
}

function collectBehaviorNodes(
  node: ExpressionAst | null | undefined,
  text: string,
  name: string,
  spans: SourceSpan[],
): void {
  if (!node || !node.$kind) return;
  if (node.$kind === "BindingBehavior" && node.name === name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "&", name);
    if (start !== -1) {
      spans.push({ start, end: start + name.length, ...(node.span.file ? { file: node.span.file } : {}) });
    }
  }
  walkAstChildren(node, text, name, spans, collectBehaviorNodes);
}

function walkAstChildren(
  node: ExpressionAst,
  text: string,
  name: string,
  spans: SourceSpan[],
  visitor: (node: ExpressionAst | null | undefined, text: string, name: string, spans: SourceSpan[]) => void,
): void {
  const queue: (ExpressionAst | null | undefined)[] = [];
  queue.push(node.expression, node.object, node.func, node.left, node.right, node.condition, node.yes, node.no, node.target, node.value, node.key, node.declaration, node.iterable);
  if (node.args) queue.push(...node.args);
  if (node.parts) queue.push(...node.parts);
  if (node.expressions) queue.push(...node.expressions);
  for (const child of queue) {
    if (!child) continue;
    visitor(child, text, name, spans);
  }
}

function findValueConverterAtOffset(
  exprTable: readonly { id: string; ast: unknown }[],
  text: string,
  offset: number,
): { name: string; exprId: string } | null {
  for (const entry of exprTable) {
    const hit = findConverterInAst(entry.ast as ExpressionAst, text, offset);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

function findBindingBehaviorAtOffset(
  exprTable: readonly { id: string; ast: unknown }[],
  text: string,
  offset: number,
): { name: string; exprId: string } | null {
  for (const entry of exprTable) {
    const hit = findBehaviorInAst(entry.ast as ExpressionAst, text, offset);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

function findConverterInAst(node: ExpressionAst | null | undefined, text: string, offset: number): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === "ValueConverter" && node.name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "|", node.name);
    if (start !== -1 && offset >= start && offset < start + node.name.length) {
      return node.name;
    }
  }
  return walkAstChildrenForHit(node, text, offset, findConverterInAst);
}

function findBehaviorInAst(node: ExpressionAst | null | undefined, text: string, offset: number): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === "BindingBehavior" && node.name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "&", node.name);
    if (start !== -1 && offset >= start && offset < start + node.name.length) {
      return node.name;
    }
  }
  return walkAstChildrenForHit(node, text, offset, findBehaviorInAst);
}

function walkAstChildrenForHit(
  node: ExpressionAst,
  text: string,
  offset: number,
  finder: (node: ExpressionAst, text: string, offset: number) => string | null,
): string | null {
  const queue: (ExpressionAst | null | undefined)[] = [];
  queue.push(node.expression, node.object, node.func, node.left, node.right, node.condition, node.yes, node.no, node.target, node.value, node.key, node.declaration, node.iterable);
  if (node.args) queue.push(...node.args);
  if (node.parts) queue.push(...node.parts);
  if (node.expressions) queue.push(...node.expressions);
  for (const child of queue) {
    if (!child) continue;
    const hit = finder(child, text, offset);
    if (hit) return hit;
  }
  return null;
}

function findPipeOrAmpName(text: string, span: SourceSpan, separator: "|" | "&", name: string): number {
  const searchText = text.slice(span.start, span.end);
  const sepIndex = searchText.lastIndexOf(separator);
  if (sepIndex === -1) return -1;
  const afterSep = searchText.slice(sepIndex + 1);
  const whitespaceLen = afterSep.match(/^\s*/)?.[0].length ?? 0;
  const nameStart = span.start + sepIndex + 1 + whitespaceLen;
  const candidate = text.slice(nameStart, nameStart + name.length);
  return candidate === name ? nameStart : -1;
}

function resourceRefMatches(
  def: { name: string; file?: string | null },
  name: string,
  file: string | null,
): boolean {
  if (def.name !== name) return false;
  if (file && def.file) {
    return normalizePathForId(def.file) === normalizePathForId(file);
  }
  return true;
}

function findBindableDef(def: ResourceDef, name: string): BindableDef | null {
  if (!("bindables" in def) || !def.bindables) return null;
  const record = def.bindables as Readonly<Record<string, BindableDef>>;
  if (record[name]) return record[name]!;
  const camel = dashToCamel(name);
  return record[camel] ?? null;
}

function dashToCamel(value: string): string {
  if (!value.includes("-")) return value;
  return value.replace(/-([a-zA-Z0-9])/g, (_match, captured) => captured.toUpperCase());
}

function readLocation(value: unknown): SourceLocation | null {
  if (!value || typeof value !== "object") return null;
  if ("location" in value) {
    const loc = (value as { location?: SourceLocation }).location;
    return loc ?? null;
  }
  return null;
}
