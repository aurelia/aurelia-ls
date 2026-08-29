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

export type AotNominatedEntryCallable =
  | { readonly kind: "local"; readonly name: string }
  | { readonly kind: "export"; readonly name: string };

export type AotNominatedEntryArgument =
  | { readonly kind: "primitive"; readonly value: string | number | boolean | null }
  | { readonly kind: "undefined" }
  | { readonly kind: "host-environment"; readonly path: string }
  | { readonly kind: "array"; readonly elements: readonly AotNominatedEntryArgument[] };

/** Explicit synchronous app factory activation forwarded unchanged to the semantic build provider. */
export interface AotNominatedEntry {
  readonly sourceFilePath: string;
  readonly callable: AotNominatedEntryCallable;
  readonly arguments?: readonly AotNominatedEntryArgument[];
}

export type AotRuntimeConfigurationMode =
  | "preserve"
  | "replace-explicit"
  | "require-replaceable";

export interface AotBuildRequest {
  readonly root: string;
  readonly mode: string;
  readonly environmentName: string;
  readonly sourcemap: boolean | "inline" | "hidden";
  readonly nominatedEntry?: AotNominatedEntry | null;
  readonly runtimeConfiguration?: AotRuntimeConfigurationMode;
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

export interface AotSourceTransformRequest {
  readonly sourcePath: string;
  readonly code: string;
}

export interface AotTransformedResource {
  readonly resourceKey: string;
  readonly compilerVariantKey: string;
  readonly definitionName: string;
  readonly carrierKind: string;
  readonly carrierStart: number;
  readonly carrierEnd: number;
  readonly payloadDigest: string;
  readonly payloadSpecifier: string;
}

export interface AotTransformedConfiguration {
  readonly valueStart: number;
  readonly valueEnd: number;
  readonly moduleSpecifier: string;
  readonly expectedDigest: string;
  readonly exportName: string;
  readonly localName: string;
}

export interface AotSourceTransformArtifact {
  /** Must echo the canonical source path from the corresponding request. */
  readonly sourcePath: string;
  /** Complete transformed authored module. */
  readonly code: string;
  /** Map from the transformed module back to the authored module. */
  readonly map: AotSourceMapInput;
  /** Stable identity for the authored input and complete transform result. */
  readonly digest: string;
  /** Shared runtime support module imported by the transformed source. */
  readonly runtimeModuleSpecifier: string | null;
  /** Resource-addressed payloads imported by the transformed source. */
  readonly resources: readonly AotTransformedResource[];
  /** Exact build-specific configurations imported by the transformed source. */
  readonly configurations: readonly AotTransformedConfiguration[];
}

export interface AotVirtualModuleRequest {
  readonly specifier: string;
}

export interface AotVirtualModuleArtifact {
  /** Must echo the exact claimed specifier from the corresponding request. */
  readonly specifier: string;
  readonly code: string;
  readonly map: AotSourceMapInput;
  readonly digest: string;
}

export interface AotBuildSession {
  /** Transitional standalone-HTML realization. */
  artifactFor(request: AotTemplateRequest): Promise<AotTemplateArtifact>;
  /** Optional bundler-neutral authored-source transform port. */
  transformSource?(
    request: AotSourceTransformRequest,
  ): Promise<AotSourceTransformArtifact | null>;
  /** Required whenever a source transform returns virtual module specifiers. */
  virtualModuleFor?(
    request: AotVirtualModuleRequest,
  ): Promise<AotVirtualModuleArtifact | null>;
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
  /** Explicit dormant app factory activation passed to the build provider. */
  readonly nominatedEntry?: AotNominatedEntry | null;
  /** Omit to preserve authored runtime configuration without requiring a replacement. */
  readonly runtimeConfiguration?: AotRuntimeConfigurationMode;
  readonly conventions?: AotConventionOptions;
  /** Omit to avoid emitting or retaining build-graph evidence. */
  readonly receipt?: AotReceiptOptions;
}

export interface AotReceiptArtifact {
  readonly sourcePath: string;
  readonly virtualId: string;
  readonly digest: string;
  readonly resourceKey?: string;
  readonly compilerVariantKey?: string;
  readonly definitionName?: string;
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
