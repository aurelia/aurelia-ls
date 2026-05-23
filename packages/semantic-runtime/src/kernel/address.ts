import type { AddressHandle, IdentityHandle } from './handles.js';

export const enum SourceLanguage {
  /** Use when the parser or host cannot classify the source file yet. */
  Unknown = 'unknown',
  /** TypeScript source, including .ts and TS-bearing virtual documents. */
  TypeScript = 'typescript',
  /** JavaScript source, including .js and JS-bearing virtual documents. */
  JavaScript = 'javascript',
  /** HTML or template markup source. */
  Html = 'html',
  /** CSS source that can participate in component metadata. */
  Css = 'css',
  /** JSON source used for configuration or package metadata. */
  Json = 'json',
}

export const enum SourceFileRole {
  /** Source that can participate in the application semantic world. */
  AppSource = 'app-source',
  /** HTML template source owned by an app/resource or discovered as an external template. */
  Template = 'template',
  /** CSS/style source owned by an app/resource or build pipeline. */
  Style = 'style',
  /** Package manifest or package-level metadata source. */
  PackageManifest = 'package-manifest',
  /** Test, spec, or e2e source admitted for navigation but not app-world interpretation. */
  TestSource = 'test-source',
  /** Storybook/demo/example source admitted for pattern pressure but not app-world interpretation by default. */
  ExampleSource = 'example-source',
  /** Build, lint, test-runner, bundler, or workspace tooling configuration. */
  ToolingConfig = 'tooling-config',
  /** Type declaration source used by the checker but not evaluated as runtime code. */
  Declaration = 'declaration',
  /** Non-declaration source observed through dependency/checker surfaces but not admitted as project source. */
  ExternalSource = 'external-source',
  /** Generated source that should stay visible without being treated as authored app code. */
  Generated = 'generated',
  /** Use when the host or discovery cannot classify the source role yet. */
  Unknown = 'unknown',
}

export const enum SourceSpanRole {
  /** The best default jump target for a fact or record. */
  Primary = 'primary',
  /** A declaration, resource, property, or attribute name. */
  Name = 'name',
  /** A value region such as an attribute value, initializer, or string literal body. */
  Value = 'value',
  /** A TypeScript type annotation or return type that owns a checker-projected value surface. */
  Type = 'type',
  /** An initializer expression whose value produced a semantic fact. */
  Initializer = 'initializer',
  /** A larger range used for highlighting or explanation, not precise rename. */
  Range = 'range',
  /** An authored anchor used to explain generated output. */
  SyntheticAnchor = 'synthetic-anchor',
}

/** Address for one analyzed source file. */
export class SourceFileAddress {
  /** String discriminator for serialized source-file address records. */
  readonly kind = 'source-file-address' as const;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Workspace or project key that owns the path. */
    readonly workspaceKey: string,
    /** Normalized workspace-relative or canonical path used by diagnostics and navigation. */
    readonly path: string,
    /** Source language used to pick parsers, projections, and display behavior. */
    readonly language: SourceLanguage = SourceLanguage.Unknown,
    /** Coarse source role used to decide which semantic passes may treat the file as app code. */
    readonly role: SourceFileRole = SourceFileRole.Unknown,
  ) {}
}

/** Address for a meaningful source range inside one file. */
export class SourceSpanAddress {
  /** String discriminator for serialized source-span address records. */
  readonly kind = 'source-span-address' as const;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** File address handle that owns the span. */
    readonly fileHandle: AddressHandle,
    /** Inclusive zero-based start offset in the current source text. */
    readonly start: number,
    /** Exclusive zero-based end offset in the current source text. */
    readonly end: number,
    /** Intended use of the span, such as rename target, value range, or explanation range. */
    readonly role: SourceSpanRole = SourceSpanRole.Primary,
  ) {}
}

export function sourceSpanContains(
  outer: SourceSpanAddress,
  inner: SourceSpanAddress,
): boolean {
  return outer.fileHandle === inner.fileHandle
    && outer.start <= inner.start
    && inner.end <= outer.end;
}

export function sourceSpanContainsOffset(
  span: SourceSpanAddress,
  offset: number,
): boolean {
  return span.start <= offset && offset <= span.end;
}

/** Address for a template unit before or after compiler transformation. */
export class TemplateAddress {
  /** String discriminator for serialized template address records. */
  readonly kind = 'template-address' as const;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Template-local key, usually derived from the owning component or template source. */
    readonly templateKey: string,
    /** Optional identity handle of the component/resource that owns this template. */
    readonly ownerIdentityHandle: IdentityHandle | null = null,
    /** Authored source span handle when the whole template has a concrete source anchor. */
    readonly authoredSourceHandle: AddressHandle | null = null,
  ) {}
}

/** Address for one node inside a particular parsed template tree. */
export class TemplateNodeAddress {
  /** String discriminator for serialized template-node address records. */
  readonly kind = 'template-node-address' as const;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Template address handle that owns the addressed node. */
    readonly templateHandle: AddressHandle,
    /** Child-index path from template root to this node in the addressed tree. */
    readonly path: readonly number[],
    /** Authored source span handle when this node maps back to concrete markup. */
    readonly authoredSourceHandle: AddressHandle | null = null,
  ) {}
}

/** Address for compiler-generated structure that needs navigation or explanation. */
export class GeneratedAddress {
  /** String discriminator for serialized generated-address records. */
  readonly kind = 'generated-address' as const;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Analysis-step-local key for the generated item; provenance explains how it was produced. */
    readonly localKey: string,
    /** Optional address or identity handle that explains this generated item. */
    readonly anchorHandle: AddressHandle | IdentityHandle | null = null,
  ) {}
}

/** Address for locations outside the analyzed source tree. */
export class ExternalAddress {
  /** String discriminator for serialized external-address records. */
  readonly kind = 'external-address' as const;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** External address scheme, such as `package`, `url`, or host-defined catalog names. */
    readonly scheme: string,
    /** Scheme-specific address value. */
    readonly value: string,
    /** Optional display label for AI/tooling projections and diagnostics. */
    readonly label: string | null = null,
  ) {}
}

/** Union of address records that can be stored in indexes and expanded by query projections. */
export type SemanticAddress =
  | SourceFileAddress
  | SourceSpanAddress
  | TemplateAddress
  | TemplateNodeAddress
  | GeneratedAddress
  | ExternalAddress;
