import {
  DEFAULT_SEMANTICS,
  InMemoryProvenanceIndex,
  asDocumentUri,
  buildResourceGraphFromSemantics,
  buildTemplateSyntaxRegistry,
  prepareSemantics,
  stableHash,
  stableHashSemantics,
  type DocumentUri,
  type ProvenanceIndex,
  type ResourceCatalog,
  type ResourceGraph,
  type Semantics,
  type TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import {
  asWorkspaceFingerprint,
  type RefactorEngine,
  type SemanticQuery,
  type SemanticWorkspace,
  type WorkspaceCodeAction,
  type WorkspaceCompletionItem,
  type WorkspaceDiagnostic,
  type WorkspaceLocation,
  type WorkspaceRefactorResult,
  type WorkspaceSnapshot,
  type WorkspaceToken,
} from "./types.js";

export interface SemanticWorkspaceOptions {
  readonly configHash?: string;
  readonly semantics?: Semantics;
  readonly catalog?: ResourceCatalog;
  readonly syntax?: TemplateSyntaxRegistry;
  readonly resourceGraph?: ResourceGraph;
  readonly provenance?: ProvenanceIndex;
}

interface WorkspaceDocument {
  readonly uri: DocumentUri;
  readonly version: number;
  readonly text: string;
  readonly textHash: string;
}

const EMPTY_DIAGNOSTICS: readonly WorkspaceDiagnostic[] = [];
const EMPTY_ACTIONS: readonly WorkspaceCodeAction[] = [];
const EMPTY_TOKENS: readonly WorkspaceToken[] = [];
const EMPTY_LOCATIONS: readonly WorkspaceLocation[] = [];
const EMPTY_COMPLETIONS: readonly WorkspaceCompletionItem[] = [];

export class DefaultSemanticWorkspace implements SemanticWorkspace {
  #documents = new Map<DocumentUri, WorkspaceDocument>();
  #semantics: Semantics;
  #catalog: ResourceCatalog;
  #syntax: TemplateSyntaxRegistry;
  #resourceGraph: ResourceGraph;
  #provenance: ProvenanceIndex;
  #configHash: string;
  #refactor: RefactorEngine;

  constructor(options: SemanticWorkspaceOptions = {}) {
    const prepared = prepareSemantics(options.semantics ?? DEFAULT_SEMANTICS);
    this.#semantics = prepared;
    this.#catalog = options.catalog ?? prepared.catalog;
    this.#syntax = options.syntax ?? buildTemplateSyntaxRegistry(prepared);
    this.#resourceGraph = options.resourceGraph ?? buildResourceGraphFromSemantics(prepared);
    this.#provenance = options.provenance ?? new InMemoryProvenanceIndex();
    this.#configHash = options.configHash ?? computeConfigHash(prepared, this.#catalog, this.#syntax, this.#resourceGraph);
    this.#refactor = createEmptyRefactorEngine();
  }

  open(uri: DocumentUri, text?: string, version?: number): void {
    if (text === undefined) return;
    this.#upsertDocument(uri, text, version);
  }

  update(uri: DocumentUri, text: string, version?: number): void {
    this.#upsertDocument(uri, text, version);
  }

  close(uri: DocumentUri): void {
    this.#documents.delete(asDocumentUri(uri));
  }

  snapshot(): WorkspaceSnapshot {
    return this.#buildSnapshot();
  }

  diagnostics(_uri: DocumentUri): readonly WorkspaceDiagnostic[] {
    return EMPTY_DIAGNOSTICS;
  }

  query(_uri: DocumentUri): SemanticQuery {
    return createEmptyQuery();
  }

  refactor(): RefactorEngine {
    return this.#refactor;
  }

  #upsertDocument(uri: DocumentUri, text: string, version?: number): void {
    const canonical = asDocumentUri(uri);
    const existing = this.#documents.get(canonical);
    const nextVersion = version ?? ((existing?.version ?? 0) + 1);
    this.#documents.set(canonical, {
      uri: canonical,
      version: nextVersion,
      text,
      textHash: stableHash(text),
    });
  }

  #buildSnapshot(): WorkspaceSnapshot {
    const docs = [...this.#documents.values()]
      .map((doc) => ({
        uri: doc.uri,
        version: doc.version,
        textHash: doc.textHash,
      }))
      .sort((a, b) => a.uri.localeCompare(b.uri));

    const fingerprint = asWorkspaceFingerprint(
      stableHash({
        configHash: this.#configHash,
        docs,
      }),
    );

    return {
      meta: {
        fingerprint,
        configHash: this.#configHash,
        docCount: this.#documents.size,
      },
      semantics: this.#semantics,
      catalog: this.#catalog,
      syntax: this.#syntax,
      resourceGraph: this.#resourceGraph,
      provenance: this.#provenance,
    };
  }
}

export function createSemanticWorkspace(options?: SemanticWorkspaceOptions): SemanticWorkspace {
  return new DefaultSemanticWorkspace(options);
}

function createEmptyQuery(): SemanticQuery {
  return {
    hover: () => null,
    definition: () => EMPTY_LOCATIONS,
    references: () => EMPTY_LOCATIONS,
    completions: () => EMPTY_COMPLETIONS,
    diagnostics: () => EMPTY_DIAGNOSTICS,
    semanticTokens: () => EMPTY_TOKENS,
  };
}

function createEmptyRefactorEngine(): RefactorEngine {
  const error: WorkspaceRefactorResult = {
    error: {
      kind: "pipeline-failure",
      message: "Refactor engine is not configured yet.",
      retryable: false,
    },
  };

  return {
    rename: () => error,
    codeActions: () => EMPTY_ACTIONS,
  };
}

function computeConfigHash(
  semantics: Semantics,
  catalog: ResourceCatalog,
  syntax: TemplateSyntaxRegistry,
  resourceGraph: ResourceGraph,
): string {
  return stableHash({
    semantics: stableHashSemantics(semantics),
    catalog: stableHash(catalog),
    syntax: stableHash(syntax),
    resourceGraph: stableHash(resourceGraph),
  });
}
