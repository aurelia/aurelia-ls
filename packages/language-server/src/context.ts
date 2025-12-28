import type { Connection, TextDocuments } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import path from "node:path";
import fs from "node:fs";
import {
  PRELUDE_TS,
  canonicalDocumentUri,
  deriveTemplatePaths,
  type DocumentUri,
  type OverlayBuildArtifact,
} from "@aurelia-ls/compiler";
import type { PathUtils } from "./services/paths.js";
import type { OverlayFs } from "./services/overlay-fs.js";
import type { TsService } from "./services/ts-service.js";
import type { TsServicesAdapter } from "./services/typescript-services.js";
import type { AureliaProjectIndex } from "./services/project-index.js";
import type { TemplateWorkspace } from "./services/template-workspace.js";
import type { VmReflectionService } from "./services/vm-reflection.js";
import type { Logger } from "./services/types.js";

/**
 * Shared server context passed to all handlers.
 * Holds references to core services and provides workspace management utilities.
 */
export interface ServerContext {
  readonly connection: Connection;
  readonly documents: TextDocuments<TextDocument>;
  readonly logger: Logger;
  readonly paths: PathUtils;
  readonly overlayFs: OverlayFs;
  readonly tsService: TsService;
  readonly tsAdapter: TsServicesAdapter;
  readonly vmReflection: VmReflectionService;

  // Mutable state
  workspaceRoot: string | null;
  projectIndex: AureliaProjectIndex;
  workspace: TemplateWorkspace;

  // Workspace management
  ensurePrelude(): void;
  syncWorkspaceWithIndex(): void;
  ensureProgramDocument(uri: string): TextDocument | null;
  materializeOverlay(uri: DocumentUri | string): OverlayBuildArtifact | null;
  overlayPathOptions(): { isJs: boolean; overlayBaseName?: string };
}

export interface ServerContextInit {
  connection: Connection;
  documents: TextDocuments<TextDocument>;
  logger: Logger;
  paths: PathUtils;
  overlayFs: OverlayFs;
  tsService: TsService;
  tsAdapter: TsServicesAdapter;
  vmReflection: VmReflectionService;
}

/**
 * Creates the server context with workspace management utilities.
 * ProjectIndex and Workspace are set later during initialization.
 */
export function createServerContext(init: ServerContextInit): ServerContext {
  const {
    connection,
    documents,
    logger,
    paths,
    overlayFs,
    tsService,
    tsAdapter,
    vmReflection,
  } = init;

  // Mutable state - set during onInitialize
  let workspaceRoot: string | null = null;
  let projectIndex: AureliaProjectIndex;
  let workspace: TemplateWorkspace;

  function ensurePrelude(): void {
    const root = workspaceRoot ?? process.cwd();
    const preludePath = path.join(root, ".aurelia", "__prelude.d.ts");
    tsService.ensurePrelude(preludePath, PRELUDE_TS);
  }

  function workspaceProgramOptions() {
    const semantics = projectIndex.currentSemantics();
    const resourceGraph = projectIndex.currentResourceGraph();
    const options: {
      vm: VmReflectionService;
      isJs: boolean;
      semantics: typeof semantics;
      resourceGraph: typeof resourceGraph;
      resourceScope?: typeof resourceGraph.root | null;
    } = {
      vm: vmReflection,
      isJs: false,
      semantics,
      resourceGraph,
    };
    const resourceScope = semantics.defaultScope ?? resourceGraph.root ?? null;
    if (resourceScope !== null) options.resourceScope = resourceScope;
    return options;
  }

  function syncWorkspaceWithIndex(): void {
    projectIndex.refresh();
    const updated = workspace.reconfigure({
      program: workspaceProgramOptions(),
      language: { typescript: tsAdapter },
      fingerprint: projectIndex.currentFingerprint(),
    });
    if (updated) {
      logger.info(`[workspace] reconfigured fingerprint=${workspace.fingerprint}`);
    }
  }

  function lookupText(uri: DocumentUri): string | null {
    const canonical = canonicalDocumentUri(uri);
    const snap = workspace.program.sources.get(canonical.uri);
    if (snap) return snap.text;
    const overlay = overlayFs.snapshot(paths.canonical(canonical.path));
    if (overlay) return overlay.text;
    try {
      return fs.readFileSync(canonical.path, "utf8");
    } catch {
      return null;
    }
  }

  function ensureProgramDocument(uri: string): TextDocument | null {
    const { TextDocument } = require("vscode-languageserver-textdocument") as typeof import("vscode-languageserver-textdocument");
    const live = documents.get(uri);
    if (live) {
      vmReflection.setActiveTemplate(canonicalDocumentUri(uri).path);
      workspace.change(live);
      return live;
    }
    const snap = workspace.ensureFromFile(uri);
    if (!snap) return null;
    vmReflection.setActiveTemplate(canonicalDocumentUri(uri).path);
    return TextDocument.create(uri, "html", snap.version, snap.text);
  }

  function materializeOverlay(uri: DocumentUri | string): OverlayBuildArtifact | null {
    const canonical = canonicalDocumentUri(uri);
    vmReflection.setActiveTemplate(canonical.path);
    if (!workspace.snapshot(canonical.uri)) {
      const doc = ensureProgramDocument(uri);
      if (!doc) return null;
    }
    const artifact = workspace.buildService.getOverlay(canonical.uri);
    tsService.upsertOverlay(artifact.overlay.path, artifact.overlay.text);
    return artifact;
  }

  function overlayPathOptions(): { isJs: boolean; overlayBaseName?: string } {
    return workspace.program.options.overlayBaseName === undefined
      ? { isJs: workspace.program.options.isJs }
      : { isJs: workspace.program.options.isJs, overlayBaseName: workspace.program.options.overlayBaseName };
  }

  return {
    connection,
    documents,
    logger,
    paths,
    overlayFs,
    tsService,
    tsAdapter,
    vmReflection,

    get workspaceRoot() { return workspaceRoot; },
    set workspaceRoot(v) { workspaceRoot = v; },

    get projectIndex() { return projectIndex; },
    set projectIndex(v) { projectIndex = v; },

    get workspace() { return workspace; },
    set workspace(v) { workspace = v; },

    ensurePrelude,
    syncWorkspaceWithIndex,
    ensureProgramDocument,
    materializeOverlay,
    overlayPathOptions,

    // Expose for mapping utilities
    lookupText,
  } as ServerContext & { lookupText: typeof lookupText };
}

// Re-export for convenience
export { canonicalDocumentUri, deriveTemplatePaths } from "@aurelia-ls/compiler";
