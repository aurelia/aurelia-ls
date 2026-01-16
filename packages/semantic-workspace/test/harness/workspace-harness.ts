import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  asDocumentUri,
  canonicalDocumentUri,
  normalizePathForId,
  type DocumentUri,
  type NormalizedPath,
  type ResourceScopeId,
  type VmReflection,
} from "@aurelia-ls/compiler";
import { createNodeFileSystem, resolve, type ResolutionConfig, type ResolutionResult, type Logger as ResolutionLogger } from "@aurelia-ls/resolution";
import { buildPackageRootMap, detectMonorepo } from "@aurelia-ls/resolution/npm";
import { createSemanticWorkspace, type DefaultSemanticWorkspace } from "@aurelia-ls/semantic-workspace";
import { getFixture, resolveFixtureRoot } from "../fixtures/index.js";
import type { WorkspaceHarness, WorkspaceHarnessOptions, WorkspaceTemplateEntry } from "./types.js";

const SILENT_LOGGER: ResolutionLogger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const DEFAULT_VM: VmReflection = {
  getRootVmTypeExpr: () => "any",
  getSyntheticPrefix: () => "__AU_TEST_",
  getDisplayName: () => "TestVm",
};

const cachedPackageRoots = new Map<string, ReadonlyMap<string, string>>();
const cachedPackageRootsByPath = new Map<string, string>();

export async function createWorkspaceHarness(options: WorkspaceHarnessOptions): Promise<WorkspaceHarness> {
  const fixture = options.fixture ?? (options.fixtureId ? getFixture(options.fixtureId) : null);
  if (!fixture) {
    throw new Error("Workspace harness requires a fixture or fixtureId.");
  }

  const root = options.rootOverride ?? resolveFixtureRoot(fixture);
  const tsconfigPath = options.tsconfigPath ?? path.join(root, "tsconfig.json");
  const program = createProgramFromTsconfig(tsconfigPath);
  const packageRoots = options.resolution?.packageRoots
    ?? await resolvePackageRoots(root, options.packageRoots);

  const resolutionConfig: ResolutionConfig = {
    baseSemantics: DEFAULT_SEMANTICS,
    packagePath: root,
    packageRoots,
    fileSystem: options.resolution?.fileSystem ?? createNodeFileSystem({ root }),
    stripSourcedNodes: options.resolution?.stripSourcedNodes ?? true,
    ...options.resolution,
  };

  const resolution = resolve(program, resolutionConfig, options.logger ?? SILENT_LOGGER);
  const inlineTextByUri = new Map<DocumentUri, string>();
  const {
    templates,
    templateByUri,
    externalTemplates,
    inlineTemplates,
  } = buildTemplateEntries(resolution, inlineTextByUri);

  const vm = options.workspace?.vm ?? DEFAULT_VM;
  const isJs = options.workspace?.isJs ?? false;
  const typescript = options.workspace?.typescript;
  const programOptions = {
    vm,
    isJs,
    semantics: resolution.semantics,
    catalog: resolution.catalog,
    syntax: resolution.syntax,
    resourceGraph: resolution.resourceGraph,
    resourceScope: resolution.resourceGraph.root,
  };

  const workspace = createSemanticWorkspace({
    program: programOptions,
    ...(typescript ? { language: { typescript } } : {}),
    ...(options.workspace?.fingerprint ? { fingerprint: options.workspace.fingerprint } : {}),
    lookupText: (uri) => lookupText(uri, inlineTextByUri),
  });

  const openMode = options.openTemplates ?? "external";
  if (openMode !== "none") {
    const targets = openMode === "all" ? templates : externalTemplates;
    openTemplatesInWorkspace(workspace, targets, inlineTextByUri);
  }

  const resolvePath = (relativePath: string) => {
    return path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath);
  };

  const toDocumentUri = (input: DocumentUri | string) => {
    const resolved = typeof input === "string" ? resolvePath(input) : input;
    return canonicalDocumentUri(resolved).uri;
  };

  const readText = (input: DocumentUri | string) => {
    return readTemplateText(toDocumentUri(input), inlineTextByUri);
  };

  const openTemplate = (input: DocumentUri | string) => {
    const uri = toDocumentUri(input);
    const text = readTemplateText(uri, inlineTextByUri);
    if (text == null) {
      throw new Error(`Template text not found for ${String(uri)}`);
    }
    workspace.open(uri, text);
    return uri;
  };

  const updateTemplate = (uri: DocumentUri, text: string, version?: number) => {
    if (inlineTextByUri.has(uri)) {
      inlineTextByUri.set(uri, text);
    }
    workspace.update(uri, text, version);
  };

  const closeTemplate = (uri: DocumentUri) => {
    workspace.close(uri);
  };

  const setResourceScope = (scope: ResourceScopeId | null) => {
    return workspace.reconfigure({
      program: { ...programOptions, resourceScope: scope },
    });
  };

  return {
    fixture,
    root,
    tsconfigPath,
    program,
    resolution,
    workspace,
    templates,
    templateByUri,
    externalTemplates,
    inlineTemplates,
    openTemplates: () => openTemplatesInWorkspace(workspace, templates, inlineTextByUri),
    openTemplate,
    updateTemplate,
    closeTemplate,
    readText,
    resolvePath,
    toDocumentUri,
    setResourceScope,
  };
}

function createProgramFromTsconfig(tsconfigPath: string): ts.Program {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n");
    throw new Error(`Failed to read tsconfig at ${tsconfigPath}: ${message}`);
  }

  const basePath = path.dirname(tsconfigPath);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, basePath);
  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"));
    throw new Error(`Failed to parse tsconfig at ${tsconfigPath}: ${messages.join("\n")}`);
  }

  return ts.createProgram(parsed.fileNames, parsed.options);
}

async function resolvePackageRoots(
  packagePath: string,
  option: WorkspaceHarnessOptions["packageRoots"],
): Promise<ReadonlyMap<string, string> | undefined> {
  if (option === false) return undefined;
  if (option && option !== "auto") {
    return option instanceof Map ? option : new Map(Object.entries(option));
  }

  const cachedRoot = cachedPackageRootsByPath.get(packagePath);
  if (cachedRoot) {
    const cached = cachedPackageRoots.get(cachedRoot);
    if (cached) return cached;
  }
  const ctx = await detectMonorepo(packagePath);
  if (!ctx) return undefined;
  const cached = cachedPackageRoots.get(ctx.root);
  if (cached) {
    cachedPackageRootsByPath.set(packagePath, ctx.root);
    return cached;
  }
  const map = buildPackageRootMap(ctx);
  cachedPackageRoots.set(ctx.root, map);
  cachedPackageRootsByPath.set(packagePath, ctx.root);
  return map;
}

function buildTemplateEntries(
  result: ResolutionResult,
  inlineTextByUri: Map<DocumentUri, string>,
): {
  templates: WorkspaceTemplateEntry[];
  templateByUri: Map<DocumentUri, WorkspaceTemplateEntry>;
  externalTemplates: WorkspaceTemplateEntry[];
  inlineTemplates: WorkspaceTemplateEntry[];
} {
  const templates: WorkspaceTemplateEntry[] = [];
  const templateByUri = new Map<DocumentUri, WorkspaceTemplateEntry>();
  const externalTemplates: WorkspaceTemplateEntry[] = [];
  const inlineTemplates: WorkspaceTemplateEntry[] = [];

  for (const entry of result.templates) {
    const uri = asDocumentUri(entry.templatePath);
    const template: WorkspaceTemplateEntry = {
      uri,
      path: entry.templatePath,
      componentPath: entry.componentPath,
      scopeId: entry.scopeId,
      resourceName: entry.resourceName,
      inline: false,
    };
    templates.push(template);
    externalTemplates.push(template);
    templateByUri.set(uri, template);
  }

  for (const entry of result.inlineTemplates) {
    const inlinePath = inlineTemplatePath(entry.componentPath);
    const uri = asDocumentUri(inlinePath);
    const template: WorkspaceTemplateEntry = {
      uri,
      path: inlinePath,
      componentPath: entry.componentPath,
      scopeId: entry.scopeId,
      resourceName: entry.resourceName,
      inline: true,
      content: entry.content,
    };
    inlineTextByUri.set(uri, entry.content);
    templates.push(template);
    inlineTemplates.push(template);
    templateByUri.set(uri, template);
  }

  templates.sort((a, b) => a.uri.localeCompare(b.uri));
  externalTemplates.sort((a, b) => a.uri.localeCompare(b.uri));
  inlineTemplates.sort((a, b) => a.uri.localeCompare(b.uri));

  return { templates, templateByUri, externalTemplates, inlineTemplates };
}

function inlineTemplatePath(componentPath: NormalizedPath): NormalizedPath {
  const replaced = componentPath.replace(/\.(ts|js|tsx|jsx)$/i, ".inline.html");
  const fallback = componentPath.endsWith(".inline.html")
    ? componentPath
    : `${componentPath}.inline.html`;
  return normalizePathForId(replaced === componentPath ? fallback : replaced);
}

function lookupText(uri: DocumentUri, inlineTextByUri: Map<DocumentUri, string>): string | null {
  const inline = inlineTextByUri.get(uri);
  if (inline !== undefined) return inline;
  const canonical = canonicalDocumentUri(uri);
  if (!fs.existsSync(canonical.path)) return null;
  return fs.readFileSync(canonical.path, "utf8");
}

function readTemplateText(uri: DocumentUri, inlineTextByUri: Map<DocumentUri, string>): string | null {
  const inline = inlineTextByUri.get(uri);
  if (inline !== undefined) return inline;
  const canonical = canonicalDocumentUri(uri);
  if (!fs.existsSync(canonical.path)) return null;
  return fs.readFileSync(canonical.path, "utf8");
}

function openTemplatesInWorkspace(
  workspace: DefaultSemanticWorkspace,
  templates: readonly WorkspaceTemplateEntry[],
  inlineTextByUri: Map<DocumentUri, string>,
): void {
  for (const entry of templates) {
    const text = entry.inline
      ? inlineTextByUri.get(entry.uri)
      : readTemplateText(entry.uri, inlineTextByUri);
    if (text == null) {
      throw new Error(`Template text not found for ${String(entry.uri)}`);
    }
    workspace.open(entry.uri, text);
  }
}
