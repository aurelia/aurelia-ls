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
  type TemplateLanguageDiagnostics,
  type TemplateProgram,
  type TemplateProgramOptions,
} from "@aurelia-ls/compiler";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { TemplateDocumentStore } from "./template-documents.js";

type WorkspaceProgramOptions = Omit<TemplateProgramOptions, "sourceStore" | "provenance">;

export interface TemplateWorkspaceOptions {
  readonly program: WorkspaceProgramOptions;
  readonly language?: TemplateLanguageServiceOptions;
  readonly sourceStore?: SourceStore;
  readonly provenance?: ProvenanceIndex;
  readonly fingerprint?: string;
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
  #workspaceFingerprint: string;

  constructor(options: TemplateWorkspaceOptions) {
    this.sources = options.sourceStore ?? new InMemorySourceStore();
    this.provenance = options.provenance ?? new InMemoryProvenanceIndex();
    this.#programOptions = options.program;
    this.#languageOptions = options.language ?? {};

    this.#program = this.#createProgram(this.provenance);
    this.#optionsFingerprint = this.#program.optionsFingerprint;
    this.#workspaceFingerprint = options.fingerprint ?? this.#optionsFingerprint;
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

  get fingerprint(): string {
    return this.#workspaceFingerprint;
  }

  open(doc: TextDocument): DocumentSnapshot {
    return this.upsertDocument(doc);
  }

  change(doc: TextDocument): DocumentSnapshot {
    return this.upsertDocument(doc);
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

  getDiagnostics(uri: DocumentUri | string): TemplateLanguageDiagnostics {
    const canonical = canonicalDocumentUri(uri);
    return this.#language.getDiagnostics(canonical.uri);
  }

  close(uri: DocumentUri | string): void {
    this.#documents.close(uri);
  }

  /**
   * Recreate the program when options drift, reusing the same SourceStore so
   * live document snapshots survive the transition. Returns true when the
   * program was replaced.
   */
  reconfigure(options: WorkspaceProgramOptions | TemplateWorkspaceOptions): boolean {
    const next = this.#normalizeOptions(options);
    const preview = this.#createProgram(new InMemoryProvenanceIndex(), next.program);
    const programFingerprint = preview.optionsFingerprint;
    const workspaceFingerprint = next.fingerprint ?? programFingerprint;
    if (programFingerprint === this.#optionsFingerprint && workspaceFingerprint === this.#workspaceFingerprint) {
      return false;
    }

    this.#programOptions = next.program;
    this.#languageOptions = next.language;
    this.provenance = preview.provenance;
    this.#program = preview;
    this.#optionsFingerprint = programFingerprint;
    this.#workspaceFingerprint = workspaceFingerprint;
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

  #normalizeOptions(
    options: WorkspaceProgramOptions | TemplateWorkspaceOptions,
  ): { program: WorkspaceProgramOptions; language: TemplateLanguageServiceOptions; fingerprint?: string } {
    if ("program" in options) {
      const normalized: { program: WorkspaceProgramOptions; language: TemplateLanguageServiceOptions; fingerprint?: string } = {
        program: options.program,
        language: options.language ?? this.#languageOptions,
      };
      if (options.fingerprint !== undefined) normalized.fingerprint = options.fingerprint;
      return normalized;
    }
    return { program: options, language: this.#languageOptions };
  }
}
