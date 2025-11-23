import {
  DefaultTemplateBuildService,
  DefaultTemplateLanguageService,
  DefaultTemplateProgram,
  InMemoryProvenanceIndex,
  InMemorySourceStore,
  canonicalDocumentUri,
  type DocumentSnapshot,
  type DocumentUri,
  type ProvenanceIndex,
  type SourceStore,
  type TemplateBuildService,
  type TemplateLanguageService,
  type TemplateLanguageServiceOptions,
  type TemplateProgram,
  type TemplateProgramOptions,
} from "@aurelia-ls/domain";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { TemplateDocumentStore } from "./template-documents.js";

type WorkspaceProgramOptions = Omit<TemplateProgramOptions, "sourceStore" | "provenance">;

export interface TemplateWorkspaceOptions {
  readonly program: WorkspaceProgramOptions;
  readonly language?: TemplateLanguageServiceOptions;
  readonly sourceStore?: SourceStore;
  readonly provenance?: ProvenanceIndex;
}

/**
 * Server-local facade around TemplateProgram and its language/build services.
 * Keeps SourceStore in sync with LSP TextDocuments and recreates the program
 * when option fingerprints drift, while preserving document snapshots.
 */
export class TemplateWorkspace {
  readonly sources: SourceStore;
  provenance: ProvenanceIndex;

  #program: TemplateProgram;
  #build: TemplateBuildService;
  #language: TemplateLanguageService;
  #documents: TemplateDocumentStore;
  #programOptions: WorkspaceProgramOptions;
  #languageOptions: TemplateLanguageServiceOptions;
  #optionsFingerprint: string;

  constructor(options: TemplateWorkspaceOptions) {
    this.sources = options.sourceStore ?? new InMemorySourceStore();
    this.provenance = options.provenance ?? new InMemoryProvenanceIndex();
    this.#programOptions = options.program;
    this.#languageOptions = options.language ?? {};

    this.#program = this.#createProgram(this.provenance);
    this.#optionsFingerprint = this.#program.optionsFingerprint;
    this.#build = new DefaultTemplateBuildService(this.#program);
    this.#language = new DefaultTemplateLanguageService(this.#program, {
      ...this.#languageOptions,
      buildService: this.#languageOptions.buildService ?? this.#build,
    });
    this.#documents = new TemplateDocumentStore(this.#program);
  }

  get program(): TemplateProgram {
    return this.#program;
  }

  get buildService(): TemplateBuildService {
    return this.#build;
  }

  get languageService(): TemplateLanguageService {
    return this.#language;
  }

  get documents(): TemplateDocumentStore {
    return this.#documents;
  }

  get optionsFingerprint(): string {
    return this.#optionsFingerprint;
  }

  upsertDocument(doc: TextDocument): DocumentSnapshot {
    return this.#documents.upsertDocument(doc);
  }

  upsertText(uri: DocumentUri | string, text: string, version?: number): DocumentSnapshot {
    return this.#documents.upsertText(uri, text, version);
  }

  ensureFromFile(uri: DocumentUri | string): DocumentSnapshot | null {
    return this.#documents.ensureFromFile(uri);
  }

  close(uri: DocumentUri | string): void {
    this.#documents.close(uri);
  }

  /**
   * Recreate the program when options drift, reusing the same SourceStore so
   * live document snapshots survive the transition. Returns true when the
   * program was replaced.
   */
  reconfigure(program: WorkspaceProgramOptions): boolean {
    const preview = this.#createProgram(new InMemoryProvenanceIndex(), program);
    if (preview.optionsFingerprint === this.#optionsFingerprint) {
      return false;
    }

    this.#programOptions = program;
    this.provenance = preview.provenance;
    this.#program = preview;
    this.#optionsFingerprint = preview.optionsFingerprint;
    this.#build = new DefaultTemplateBuildService(this.#program);
    this.#language = new DefaultTemplateLanguageService(this.#program, {
      ...this.#languageOptions,
      buildService: this.#languageOptions.buildService ?? this.#build,
    });
    this.#documents = new TemplateDocumentStore(this.#program);
    return true;
  }

  snapshot(uri: DocumentUri | string): DocumentSnapshot | null {
    const canonical = canonicalDocumentUri(uri);
    return this.sources.get(canonical.uri);
  }

  #createProgram(
    provenance: ProvenanceIndex,
    program: WorkspaceProgramOptions = this.#programOptions,
  ): TemplateProgram {
    return new DefaultTemplateProgram({
      ...program,
      sourceStore: this.sources,
      provenance,
    });
  }
}
