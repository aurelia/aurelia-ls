import type ts from "typescript";
import type {
  DocumentUri,
  NormalizedPath,
  ResourceScopeId,
  TypeScriptServices,
  VmReflection,
} from "@aurelia-ls/compiler";
import type { ResolutionConfig, ResolutionResult, Logger as ResolutionLogger } from "@aurelia-ls/resolution";
import type { DefaultSemanticWorkspace } from "@aurelia-ls/semantic-workspace";
import type { FixtureDescriptor, FixtureId } from "../fixtures/types.js";

export type TemplateOpenMode = "none" | "external" | "all";

export type PackageRootsOption =
  | "auto"
  | false
  | ReadonlyMap<string, string>
  | Readonly<Record<string, string>>;

export interface WorkspaceHarnessOptions {
  readonly fixtureId?: FixtureId;
  readonly fixture?: FixtureDescriptor;
  readonly rootOverride?: string;
  readonly tsconfigPath?: string;
  readonly packageRoots?: PackageRootsOption;
  readonly resolution?: Partial<ResolutionConfig>;
  readonly openTemplates?: TemplateOpenMode;
  readonly logger?: ResolutionLogger;
  readonly workspace?: {
    readonly vm?: VmReflection;
    readonly isJs?: boolean;
    readonly fingerprint?: string;
    readonly typescript?: TypeScriptServices;
  };
}

export interface WorkspaceTemplateEntry {
  readonly uri: DocumentUri;
  readonly path: NormalizedPath;
  readonly componentPath: NormalizedPath;
  readonly scopeId: ResourceScopeId;
  readonly resourceName: string;
  readonly inline: boolean;
  readonly content?: string;
}

export interface WorkspaceHarness {
  readonly fixture: FixtureDescriptor;
  readonly root: string;
  readonly tsconfigPath: string;
  readonly program: ts.Program;
  readonly resolution: ResolutionResult;
  readonly workspace: DefaultSemanticWorkspace;
  readonly templates: readonly WorkspaceTemplateEntry[];
  readonly templateByUri: ReadonlyMap<DocumentUri, WorkspaceTemplateEntry>;
  readonly externalTemplates: readonly WorkspaceTemplateEntry[];
  readonly inlineTemplates: readonly WorkspaceTemplateEntry[];
  readonly openTemplates: () => void;
  readonly openTemplate: (input: DocumentUri | string) => DocumentUri;
  readonly updateTemplate: (uri: DocumentUri, text: string, version?: number) => void;
  readonly closeTemplate: (uri: DocumentUri) => void;
  readonly readText: (input: DocumentUri | string) => string | null;
  readonly resolvePath: (relativePath: string) => string;
  readonly toDocumentUri: (input: DocumentUri | string) => DocumentUri;
  readonly setResourceScope: (scope: ResourceScopeId | null) => boolean;
}
