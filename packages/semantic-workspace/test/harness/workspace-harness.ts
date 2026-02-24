import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  asDocumentUri,
  canonicalDocumentUri,
  type DocumentUri,
  type ResourceScopeId,
} from "@aurelia-ls/compiler";
import { createNodeFileSystem, type ProjectSemanticsDiscoveryConfig, type ProjectSemanticsDiscoveryResult, type Logger as CompilerLogger } from "@aurelia-ls/compiler";
import { buildPackageRootMap, detectMonorepo } from "@aurelia-ls/compiler";
import { createSemanticWorkspace, type SemanticWorkspaceEngine } from "../../out/engine.js";
import { inlineTemplatePath } from "../../out/templates.js";
import { getFixture, resolveFixtureRoot } from "../fixtures/index.js";
import type { WorkspaceHarness, WorkspaceHarnessOptions, WorkspaceTemplateEntry } from "./types.js";
import { getCachedDiscovery, setCachedDiscovery, claimCacheLock } from "./discovery-cache.js";

const SILENT_LOGGER: CompilerLogger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

type ProjectSemanticsDiscoveryConfigBase = Omit<ProjectSemanticsDiscoveryConfig, "diagnostics">;

const cachedPackageRoots = new Map<string, ReadonlyMap<string, string>>();
const cachedPackageRootsByPath = new Map<string, string>();
const temporaryFixtureRoots = new Set<string>();
let temporaryFixtureCleanupRegistered = false;

export async function createWorkspaceHarness(options: WorkspaceHarnessOptions): Promise<WorkspaceHarness> {
  const fixture = options.fixture ?? (options.fixtureId ? getFixture(options.fixtureId) : null);
  if (!fixture) {
    throw new Error("Workspace harness requires a fixture or fixtureId.");
  }

  const sourceRoot = options.rootOverride ?? resolveFixtureRoot(fixture);
  if (!sourceRoot) {
    throw new Error(`Fixture root not found for ${fixture.id}. Provide rootOverride or check out the fixture.`);
  }
  const root = options.isolateFixture ? isolateFixtureRoot(sourceRoot) : sourceRoot;
  const tsconfigPath = options.tsconfigPath ?? path.join(root, "tsconfig.json");
  const packageRoots = options.discovery?.packageRoots
    ?? await resolvePackageRoots(sourceRoot, options.packageRoots);

  const logger = options.logger ?? SILENT_LOGGER;
  const inlineTextByUri = new Map<DocumentUri, string>();
  const discoveryConfig: ProjectSemanticsDiscoveryConfigBase = {
    packagePath: root,
    packageRoots,
    fileSystem: options.discovery?.fileSystem ?? createNodeFileSystem({ root }),
    stripSourcedNodes: options.discovery?.stripSourcedNodes ?? true,
    ...options.discovery,
  };

  // Check filesystem cache for pre-computed discovery (parallel worker reuse).
  // Skip cache for isolated fixtures (mutable) and custom discovery overrides.
  const useCache = !options.isolateFixture && !options.discovery?.fileSystem && !options.discovery?.baseSemantics;
  let cachedDiscovery = useCache ? getCachedDiscovery(fixture.id, sourceRoot) : null;
  // If no cache, try to claim the build lock. If we lose the race,
  // getCachedDiscovery will block until the winner writes the cache.
  const weOwnBuild = useCache && !cachedDiscovery && claimCacheLock(fixture.id, sourceRoot);
  if (useCache && !cachedDiscovery && !weOwnBuild) {
    // Another worker is building — wait for it.
    cachedDiscovery = getCachedDiscovery(fixture.id, sourceRoot);
  }

  const workspace = createSemanticWorkspace({
    logger,
    workspaceRoot: root,
    tsconfigPath,
    discovery: discoveryConfig,
    seededDiscovery: cachedDiscovery ?? undefined,
    lookupText: (uri) => lookupText(uri, inlineTextByUri),
    ...(options.workspace?.vm ? { vm: options.workspace.vm } : {}),
    ...(options.workspace?.typescript !== undefined ? { typescript: options.workspace.typescript } : {}),
    ...(options.workspace?.isJs !== undefined ? { isJs: options.workspace.isJs } : {}),
    ...(options.workspace?.styleProfile !== undefined ? { styleProfile: options.workspace.styleProfile } : {}),
    ...(options.workspace?.refactorOverrides !== undefined ? { refactorOverrides: options.workspace.refactorOverrides } : {}),
    ...(options.workspace?.refactorPolicy !== undefined ? { refactorPolicy: options.workspace.refactorPolicy } : {}),
    ...(options.workspace?.refactorDecisions !== undefined ? { refactorDecisions: options.workspace.refactorDecisions } : {}),
  });

  const discovery = workspace.projectIndex.currentModel().discovery;

  // Write cache on miss so parallel workers can reuse this result.
  if (weOwnBuild) {
    setCachedDiscovery(fixture.id, sourceRoot, discovery);
  }
  const {
    templates,
    templateByUri,
    externalTemplates,
    inlineTemplates,
  } = buildTemplateEntries(discovery, inlineTextByUri);

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
    return workspace.setResourceScope(scope);
  };

  return {
    fixture,
    root,
    tsconfigPath,
    discovery,
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

function isolateFixtureRoot(sourceRoot: string): string {
  const canonical = path.resolve(sourceRoot);
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-ws-fixture-"));
  const isolatedRoot = path.join(tempParent, path.basename(canonical));
  fs.cpSync(canonical, isolatedRoot, { recursive: true, force: true });
  trackTemporaryFixtureRoot(tempParent);
  return isolatedRoot;
}

function trackTemporaryFixtureRoot(root: string): void {
  temporaryFixtureRoots.add(root);
  if (temporaryFixtureCleanupRegistered) return;
  temporaryFixtureCleanupRegistered = true;
  process.once("exit", cleanupTemporaryFixtureRoots);
}

function cleanupTemporaryFixtureRoots(): void {
  for (const root of temporaryFixtureRoots) {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup only.
    }
  }
  temporaryFixtureRoots.clear();
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
  result: ProjectSemanticsDiscoveryResult,
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
  workspace: SemanticWorkspaceEngine,
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
