import type { AddressHandle, IdentityHandle } from './handles.js';

export const enum AddressRecordKind {
  /** Identifies a source file without retaining a TypeScript SourceFile object. */
  SourceFileAddress = 'source-file-address',
  /** Identifies a half-open span inside a source file. */
  SourceSpanAddress = 'source-span-address',
  /** Identifies an authored, transformed, or compiled template as a whole. */
  TemplateAddress = 'template-address',
  /** Identifies a node inside one template tree by local address. */
  TemplateNodeAddress = 'template-node-address',
  /** Identifies compiler-generated structure that has no authored span of its own. */
  GeneratedAddress = 'generated-address',
  /** Identifies a location outside the analyzed source tree. */
  ExternalAddress = 'external-address',
}

export const enum AddressStability {
  /** Use when consumers should not keep the address after the current calculation step. */
  Unknown = 'unknown',
  /** Use for addresses that only make sense during one scanner or materializer invocation. */
  Ephemeral = 'ephemeral',
  /** Use for addresses stable within the active editor session or TypeScript program instance. */
  Session = 'session',
  /** Use for source-coordinate addresses the active store can remap or invalidate through provenance. */
  SourceStable = 'source-stable',
  /** Use for addresses tied to semantic owners rather than only source coordinates. */
  SemanticStable = 'semantic-stable',
  /** Use for locations owned outside the project, such as package exports or URLs. */
  ExternalStable = 'external-stable',
}

export const enum AddressSpace {
  /** Address a file in the analyzed workspace. */
  SourceFile = 'source-file',
  /** Address a text span inside a source file. */
  SourceSpan = 'source-span',
  /** Address a template as a complete authored or compiler-produced unit. */
  Template = 'template',
  /** Address a concrete node inside one parsed template tree. */
  TemplateNode = 'template-node',
  /** Address compiler-generated structure without direct authored text. */
  Generated = 'generated',
  /** Address a location outside the analyzed workspace. */
  External = 'external',
}

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

export const enum SourceSpanRole {
  /** The best default jump target for a fact or record. */
  Primary = 'primary',
  /** A declaration, resource, property, or attribute name. */
  Name = 'name',
  /** A value region such as an attribute value, initializer, or string literal body. */
  Value = 'value',
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
  readonly kind = AddressRecordKind.SourceFileAddress;
  /** Address-space discriminator for cheap filtering. */
  readonly space = AddressSpace.SourceFile;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Retention promise for this address inside the active analysis store. */
    readonly stability: AddressStability,
    /** Workspace or project key that owns the path. */
    readonly workspaceKey: string,
    /** Normalized workspace-relative or canonical path used by diagnostics and navigation. */
    readonly path: string,
    /** Source language used to pick parsers, projections, and display behavior. */
    readonly language: SourceLanguage = SourceLanguage.Unknown,
  ) {}
}

/** Address for a meaningful source range inside one file. */
export class SourceSpanAddress {
  /** String discriminator for serialized source-span address records. */
  readonly kind = AddressRecordKind.SourceSpanAddress;
  /** Address-space discriminator for cheap filtering. */
  readonly space = AddressSpace.SourceSpan;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Retention promise for this address inside the active analysis store. */
    readonly stability: AddressStability,
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

/** Address for a template unit before or after compiler transformation. */
export class TemplateAddress {
  /** String discriminator for serialized template address records. */
  readonly kind = AddressRecordKind.TemplateAddress;
  /** Address-space discriminator for cheap filtering. */
  readonly space = AddressSpace.Template;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Retention promise for this address inside the active analysis store. */
    readonly stability: AddressStability,
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
  readonly kind = AddressRecordKind.TemplateNodeAddress;
  /** Address-space discriminator for cheap filtering. */
  readonly space = AddressSpace.TemplateNode;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Retention promise for this address; child paths are usually session or current-source local. */
    readonly stability: AddressStability,
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
  readonly kind = AddressRecordKind.GeneratedAddress;
  /** Address-space discriminator for cheap filtering. */
  readonly space = AddressSpace.Generated;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Retention promise for this address inside the active analysis store. */
    readonly stability: AddressStability,
    /** Producer-local key for the generated item; derivation/provenance explains how it was produced. */
    readonly localKey: string,
    /** Optional address or identity handle that explains this generated item. */
    readonly anchorHandle: AddressHandle | IdentityHandle | null = null,
  ) {}
}

/** Address for locations outside the analyzed source tree. */
export class ExternalAddress {
  /** String discriminator for serialized external-address records. */
  readonly kind = AddressRecordKind.ExternalAddress;
  /** Address-space discriminator for cheap filtering. */
  readonly space = AddressSpace.External;

  constructor(
    /** Store-local handle for this address record. */
    readonly handle: AddressHandle,
    /** Retention promise for this address inside the active analysis store. */
    readonly stability: AddressStability,
    /** External address scheme, such as `package`, `url`, or host-defined catalog names. */
    readonly scheme: string,
    /** Scheme-specific address payload. */
    readonly value: string,
    /** Optional display label for AI/MCP projections and diagnostics. */
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
