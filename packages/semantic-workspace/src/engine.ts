import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  PRELUDE_TS,
  asDocumentUri,
  canonicalDocumentUri,
  debug,
  offsetAtPosition,
  spanContainsOffset,
  type DocumentUri,
  type OverlayBuildArtifact,
  type SourceSpan,
  type TemplateCompilation,
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
  type WorkspaceRefactorResult,
  type WorkspaceSnapshot,
  type WorkspaceToken,
  type WorkspaceCodeAction,
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
    const meta = this.#templateImportDiagnostics(canonical.uri);
    return meta.length ? [...base, ...meta] : base;
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

  #templateImportDiagnostics(uri: DocumentUri): WorkspaceDiagnostic[] {
    const compilation = this.#kernel.getCompilation(uri);
    const template = compilation?.linked?.templates?.[0];
    if (!template?.templateMeta) return [];
    const templatePath = this.#templateIndex.templateToComponent.get(uri) ?? canonicalDocumentUri(uri).path;
    const diagnostics: WorkspaceDiagnostic[] = [];
    for (const imp of template.templateMeta.imports) {
      const specifier = imp.from.value;
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
        continue;
      }
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
    return diagnostics;
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
    return this.inner.rename(request);
  }

  codeActions(request: { uri: DocumentUri; position?: { line: number; character: number }; range?: SourceSpan; kinds?: readonly string[] }): readonly WorkspaceCodeAction[] {
    this.engine.refresh();
    return this.inner.codeActions(request);
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
