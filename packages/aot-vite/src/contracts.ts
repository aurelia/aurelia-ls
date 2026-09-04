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

export type AotConventionTransformSourcePattern = string | RegExp;

/** Exact source reach of the active conventions transform for this build invocation. */
export interface AotConventionTransformAdmission {
  readonly providerModuleSpecifier: "@aurelia-ls/aot-vite";
  readonly patternResolutionBase: string;
  readonly include: readonly AotConventionTransformSourcePattern[];
  readonly exclude: readonly AotConventionTransformSourcePattern[];
}

export interface AotBuildRequest {
  readonly root: string;
  readonly mode: string;
  readonly environmentName: string;
  readonly sourcemap: boolean | "inline" | "hidden";
  readonly nominatedEntry?: AotNominatedEntry | null;
  readonly runtimeConfiguration?: AotRuntimeConfigurationMode;
  readonly conventionTransformAdmission?: AotConventionTransformAdmission | null;
  /** Exact framework ESM inventory available to an optional link preparation port. */
  readonly frameworkLinks?: AotFrameworkLinksOptions;
}

export type AotFrameworkLinkMapPosture = "performance-no-map" | "mapped";
export type AotFrameworkLinkPolicy = "require-applied" | "allow-c0-fallback";
export type AotFrameworkLinkModuleRole = "target" | "guard";

/** One exact resolved framework ESM module supplied by the build host. */
export interface AotFrameworkLinkModuleInput {
  readonly role: AotFrameworkLinkModuleRole;
  readonly packageName: string;
  readonly packageRelativePath: string;
  readonly resolvedId: string;
  readonly expectedSha256: string;
}

/** Exact additive package graph accompanying its ordinary ESM entry target. */
export interface AotFrameworkLinkPackageInput {
  readonly packageName: string;
  readonly packageRoot: string;
  readonly expectedManifestSha256: string;
  readonly expectedStandardEntrySha256: string;
}

/** Optional exact-fingerprinted framework-link input for one build environment. */
export interface AotFrameworkLinksOptions {
  readonly protocol: 1;
  readonly graphFingerprint: string;
  readonly mapPosture: AotFrameworkLinkMapPosture;
  readonly policy: AotFrameworkLinkPolicy;
  readonly modules: readonly AotFrameworkLinkModuleInput[];
  readonly packages?: readonly AotFrameworkLinkPackageInput[];
}

/** Atomically captured framework module passed to the AOT link preparation port. */
export interface AotObservedFrameworkLinkModule extends AotFrameworkLinkModuleInput {
  readonly observedSha256: string;
  readonly code: string;
}

export interface AotPrepareFrameworkLinksRequest {
  readonly protocol: 1;
  readonly graphFingerprint: string;
  readonly mapPosture: AotFrameworkLinkMapPosture;
  readonly policy: AotFrameworkLinkPolicy;
  readonly modules: readonly AotObservedFrameworkLinkModule[];
  readonly packages?: readonly AotFrameworkLinkPackageInput[];
}

export type AotFrameworkLinksC0FallbackReasonKind =
  | "input-hash-mismatch"
  | "map-unavailable"
  | "recipe-unavailable"
  | "target-unreached"
  | "unsupported-input";

export interface AotFrameworkLinksC0FallbackReason {
  readonly kind: AotFrameworkLinksC0FallbackReasonKind;
  readonly summary: string;
  readonly packageName?: string;
  readonly packageRelativePath?: string;
}

/** Complete linked realization for one target module; guard modules never return artifacts. */
export interface AotLinkedFrameworkModuleArtifact {
  readonly packageName: string;
  readonly packageRelativePath: string;
  readonly resolvedId: string;
  readonly inputSha256: string;
  readonly linkedSha256: string;
  readonly code: string;
  readonly map: AotSourceMapInput;
}

export interface AotFrameworkLinkPackageModuleArtifact {
  readonly resolvedId: string;
  readonly sha256: string;
  readonly code: string;
  readonly map: AotSourceMapInput;
}

/** Validated, complete package snapshot. Loading never returns to the mutable disk graph. */
export interface AotLinkedFrameworkPackageArtifact {
  readonly packageName: string;
  readonly packageRoot: string;
  readonly manifestSha256: string;
  readonly entryResolvedId: string;
  readonly modules: readonly AotFrameworkLinkPackageModuleArtifact[];
}

export interface AotPreparedFrameworkLinksApplied {
  readonly disposition: "applied";
  readonly recipeFingerprint: string;
  readonly modules: readonly AotLinkedFrameworkModuleArtifact[];
  readonly packages?: readonly AotLinkedFrameworkPackageArtifact[];
}

export interface AotPreparedFrameworkLinksC0Fallback {
  readonly disposition: "c0-fallback";
  readonly reason: AotFrameworkLinksC0FallbackReason;
}

export type AotPreparedFrameworkLinksResult =
  | AotPreparedFrameworkLinksApplied
  | AotPreparedFrameworkLinksC0Fallback;

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
  /** Resource realized directly by this complete view-definition module. */
  readonly resource?: AotTemplateResourceIdentity | null;
  /** Compiler payload imported by a template-value bridge; absent/null for complete view-definition modules. */
  readonly payload?: AotTemplatePayloadReference | null;
}

export interface AotTemplateResourceIdentity {
  readonly carrierSourcePath: string;
  readonly resourceKey: string;
  readonly compilerVariantKey: string;
  readonly definitionName: string;
}

export interface AotTemplatePayloadReference {
  readonly carrierSourcePath: string;
  readonly resourceKey: string;
  readonly compilerVariantKey: string;
  readonly definitionName: string;
  readonly payloadSpecifier: string;
  readonly payloadDigest: string;
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

export interface AotTransformedBrowserFacade {
  readonly referenceStart: number;
  readonly referenceEnd: number;
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
  /** Exact browser-facade references replaced by a generated AOT facade from a configuration module. */
  readonly browserFacades: readonly AotTransformedBrowserFacade[];
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
  /** Optional atomic exact-version framework ESM link preparation. */
  prepareFrameworkLinks?(
    request: AotPrepareFrameworkLinksRequest,
  ): Promise<AotPreparedFrameworkLinksResult>;
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
  readonly frameworkLinks?: AotFrameworkLinksOptions;
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

export type AotReceiptFrameworkLinkModuleDisposition =
  | "applied"
  | "guard-verified"
  | "c0-fallback";

export interface AotReceiptFrameworkLinkModule {
  readonly role: AotFrameworkLinkModuleRole;
  readonly packageName: string;
  readonly packageRelativePath: string;
  readonly expectedSha256: string;
  readonly observedSha256: string;
  readonly linkedSha256: string | null;
  readonly disposition: AotReceiptFrameworkLinkModuleDisposition;
  readonly loaded: boolean;
  readonly map: "mapped" | "none";
}

export interface AotFrameworkLinksReceipt {
  readonly version: 1;
  readonly protocol: 1;
  readonly graphFingerprint: string;
  readonly mapPosture: AotFrameworkLinkMapPosture;
  readonly policy: AotFrameworkLinkPolicy;
  readonly disposition: "applied" | "c0-fallback";
  readonly recipeFingerprint: string | null;
  readonly reason: AotFrameworkLinksC0FallbackReason | null;
  readonly modules: readonly AotReceiptFrameworkLinkModule[];
  readonly packages?: readonly AotReceiptFrameworkLinkPackage[];
}

export interface AotReceiptFrameworkLinkPackage {
  readonly packageName: string;
  readonly manifestSha256: string;
  readonly moduleCount: number;
  readonly loadedModuleCount: number;
}

export interface AotBuildReceipt {
  readonly version: 1;
  readonly environmentName: string;
  readonly artifacts: readonly AotReceiptArtifact[];
  readonly graph: readonly AotReceiptGraphModule[];
  readonly chunks: readonly AotReceiptChunk[];
  /** Present only when exact-fingerprinted framework linking was requested. */
  readonly frameworkLinks?: AotFrameworkLinksReceipt;
}
