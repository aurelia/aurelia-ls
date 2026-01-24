import type {
  DocumentUri,
  NormalizedPath,
  ResourceScopeId,
  StyleProfile,
  TypeScriptServices,
  VmReflection,
} from "@aurelia-ls/compiler";
import type { ResolutionConfig, ResolutionResult, Logger as ResolutionLogger } from "@aurelia-ls/compiler";
import type { SemanticWorkspaceEngine } from "../../src/engine.js";
import type { RefactorOverrides } from "../../src/style-profile.js";
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
    readonly typescript?: TypeScriptServices | false;
    readonly styleProfile?: StyleProfile;
    readonly refactorOverrides?: RefactorOverrides;
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
  readonly resolution: ResolutionResult;
  readonly workspace: SemanticWorkspaceEngine;
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
