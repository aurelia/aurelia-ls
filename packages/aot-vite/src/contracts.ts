import type { AureliaPluginOptions } from "@aurelia/vite-plugin";

export interface AotExistingRawSourceMap {
  file?: string | null;
  mappings: string;
  names?: string[];
  sources?: (string | null)[];
  sourcesContent?: (string | null | undefined)[];
  sourceRoot?: string;
  version?: number;
  x_google_ignoreList?: number[];
}

export type AotSourceMapInput = AotExistingRawSourceMap | string | null;

export interface AotBuildRequest {
  readonly root: string;
  readonly mode: string;
  readonly environmentName: string;
  readonly sourcemap: boolean | "inline" | "hidden";
}

export interface AotTemplateRequest {
  readonly sourcePath: string;
}

export interface AotTemplateArtifact {
  /** Must echo the canonical source path from the corresponding request. */
  readonly sourcePath: string;
  /** Complete JavaScript module consumed in place of the authored template. */
  readonly code: string;
  /** Map from the generated JavaScript module back to authored sources. */
  readonly map: AotSourceMapInput;
  /** Stable identity for the semantic input and emitted artifact. */
  readonly digest: string;
}

export interface AotBuildSession {
  artifactFor(request: AotTemplateRequest): Promise<AotTemplateArtifact>;
}

export interface AotArtifactProvider {
  openBuild(request: AotBuildRequest): Promise<AotBuildSession>;
}

export interface AotReceiptOptions {
  /** Output-relative asset name. Defaults to `aurelia-aot-receipt.json`. */
  readonly fileName?: string;
  readonly onReceipt?: (receipt: AotBuildReceipt) => void | Promise<void>;
}

type ReservedConventionOption =
  | "getHmrCode"
  | "hmr"
  | "pre"
  | "transformHtmlImportSpecifier"
  | "useDev";

export type AotConventionOptions = Omit<AureliaPluginOptions, ReservedConventionOption>;

export interface AureliaAotOptions {
  readonly provider: AotArtifactProvider;
  readonly conventions?: AotConventionOptions;
  /** Omit to avoid emitting or retaining build-graph evidence. */
  readonly receipt?: AotReceiptOptions;
}

export interface AotReceiptArtifact {
  readonly sourcePath: string;
  readonly virtualId: string;
  readonly digest: string;
}

export interface AotReceiptGraphModule {
  readonly id: string;
  readonly isEntry: boolean;
  readonly importedIds: readonly string[];
  readonly dynamicallyImportedIds: readonly string[];
  readonly importers: readonly string[];
  readonly dynamicImporters: readonly string[];
}

export interface AotReceiptRenderedModule {
  readonly id: string;
  readonly renderedLength: number;
  readonly renderedExports: readonly string[];
}

export interface AotReceiptChunk {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly modules: readonly AotReceiptRenderedModule[];
}

export interface AotBuildReceipt {
  readonly version: 1;
  readonly environmentName: string;
  readonly artifacts: readonly AotReceiptArtifact[];
  readonly graph: readonly AotReceiptGraphModule[];
  readonly chunks: readonly AotReceiptChunk[];
}
