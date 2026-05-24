import type ts from 'typescript';
import { InquirySourcePrecision } from '../inquiry/continuation-intent.js';
import {
  isDefaultLibrarySourceFile,
  normalizeTypeSystemPath,
} from '../type-system/source-file-path.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { SemanticIdentity } from '../kernel/identity.js';
import {
  authoredSourceAddressForAnchorHandle,
  isSemanticAddressRecord,
  readSourceAnchorRecord,
  type SourceAnchorHandle,
} from '../kernel/source-address.js';
import type { SourceSpan } from '../expression/source-span.js';
import type {
  ExternalAddress,
  GeneratedAddress,
  SemanticAddress,
  SourceFileAddress,
  SourceFileRole,
  SourceSpanAddress,
  TemplateAddress,
  TemplateNodeAddress,
} from '../kernel/address.js';
import type { KernelStore } from '../kernel/store.js';
import type { TemplateCompilerWorldEmission } from '../template/compiler-world-materializer.js';

export interface SemanticSourceReference {
  readonly kind: string;
  readonly label: string;
  readonly path?: string;
  readonly start?: number;
  readonly end?: number;
  readonly role?: string;
  readonly sourceWorkspaceKey?: string;
  readonly sourceFileRole?: SourceFileRole | `${SourceFileRole}`;
  readonly scheme?: string;
  readonly value?: string;
  readonly anchor?: SemanticSourceReference | null;
}

export function isExternalDependencySourceReference(
  source: SemanticSourceReference | null,
): boolean {
  if (source?.path == null) {
    return false;
  }
  const normalized = normalizeTypeSystemPath(source.path);
  return normalized.startsWith('node_modules/')
    || normalized.includes('/node_modules/')
    || isDefaultLibrarySourceFile(normalized);
}

/** Public row fields that may contain source references below a non-source carrier object. */
export const PUBLIC_SOURCE_REFERENCE_CARRIER_KEYS = new Set<string>([
  'source',
  'sources',
  'actionTargets',
  'sampleSources',
  'reasonSources',
  'template',
  'values',
  'evidence',
  'suggestion',
  'actionTarget',
  'expressionSource',
  'callbackSource',
  'targetSource',
  'observedMemberSource',
  'attributeSource',
  'declarationSource',
  'declarationSources',
  'sourceAssignmentTargetSource',
  'resource',
  'bindables',
  'watches',
  'issues',
  'patterns',
  'relatedInformation',
  'component',
  'fallback',
  'routeConfigContext',
  'routeContext',
  'routeNode',
  'viewport',
  'viewportAgent',
  'viewportInstruction',
  'viewportInstructionTree',
  'recognizedRoute',
  'instructionTree',
  'instruction',
  'originalInstruction',
  'routeConfig',
  'configurableRoute',
  'endpoint',
  'recognizer',
  'existingEndpoint',
  'conflictingEndpoint',
  'state',
  'redirectSourceRouteConfig',
  'lifecycleSteps',
]);

/** Collect source references from public answer row DTOs through the bounded carrier vocabulary. */
export function semanticSourceReferencesInAnswerRows(value: unknown): readonly SemanticSourceReference[] {
  if (value == null || typeof value !== 'object' || !('rows' in value) || !Array.isArray(value.rows)) {
    return [];
  }
  const sources: SemanticSourceReference[] = [];
  const seen = new Set<object>();
  for (const row of value.rows) {
    collectSemanticSourceReferences(row, sources, seen);
  }
  return sources;
}

/** Derive the strongest public source precision carried by source-bearing answer rows. */
export function semanticSourcePrecisionForAnswerRows(value: unknown): InquirySourcePrecision | undefined {
  const sources = semanticSourceReferencesInAnswerRows(value);
  return sources.length === 0 ? undefined : semanticSourcePrecisionForReferences(sources);
}

/** Derive the strongest public source precision from source references without hiding generated anchors. */
export function semanticSourcePrecisionForReferences(
  sources: readonly (SemanticSourceReference | null)[],
): InquirySourcePrecision {
  let precision = InquirySourcePrecision.NotRequired;
  for (const source of sources) {
    precision = strongerSemanticSourcePrecision(precision, semanticSourcePrecisionForReference(source));
    if (precision === InquirySourcePrecision.GeneratedAnchor) {
      return precision;
    }
  }
  return precision;
}

/** Classify one public source reference for continuation, diagnostic, and future edit evidence gates. */
export function semanticSourcePrecisionForReference(
  source: SemanticSourceReference | null,
): InquirySourcePrecision {
  if (source == null) {
    return InquirySourcePrecision.NotRequired;
  }
  if (source.kind === 'generated-address' || source.scheme === 'generated') {
    return InquirySourcePrecision.GeneratedAnchor;
  }
  if (source.kind === 'external-address' || isExternalDependencySourceReference(source)) {
    return InquirySourcePrecision.External;
  }
  if (source.start != null && source.end != null) {
    return InquirySourcePrecision.ExactAuthoredSpan;
  }
  const anchorPrecision = semanticSourcePrecisionForReference(source.anchor ?? null);
  if (anchorPrecision !== InquirySourcePrecision.NotRequired) {
    return anchorPrecision;
  }
  return source.path != null ? InquirySourcePrecision.CarrierSpan : InquirySourcePrecision.NotRequired;
}

/** Pick the higher-evidence source precision without numeric confidence scoring. */
export function strongerSemanticSourcePrecision(
  left: InquirySourcePrecision,
  right: InquirySourcePrecision,
): InquirySourcePrecision {
  return semanticSourcePrecisionRank(right) > semanticSourcePrecisionRank(left) ? right : left;
}

/** Rank source precision only inside the evidence lattice, not as a user-facing confidence score. */
export function semanticSourcePrecisionRank(precision: InquirySourcePrecision): number {
  switch (precision) {
    case InquirySourcePrecision.GeneratedAnchor:
      return 4;
    case InquirySourcePrecision.External:
      return 3;
    case InquirySourcePrecision.ExactAuthoredSpan:
      return 2;
    case InquirySourcePrecision.CarrierSpan:
      return 1;
    case InquirySourcePrecision.NotRequired:
      return 0;
  }
}

/** Runtime guard for public source-reference DTOs crossing API/transport boundaries. */
export function isSemanticSourceReference(value: unknown): value is SemanticSourceReference {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<SemanticSourceReference>;
  return typeof candidate.kind === 'string'
    && typeof candidate.label === 'string'
    && (candidate.path == null || typeof candidate.path === 'string');
}

function collectSemanticSourceReferences(
  value: unknown,
  sources: SemanticSourceReference[],
  seen: Set<object>,
): void {
  if (value == null || typeof value !== 'object' || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (isSemanticSourceReference(value)) {
    sources.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSemanticSourceReferences(item, sources, seen);
    }
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (isSemanticSourceReference(nested) || PUBLIC_SOURCE_REFERENCE_CARRIER_KEYS.has(key)) {
      collectSemanticSourceReferences(nested, sources, seen);
    }
  }
}

export function compilerWorldLabel(
  store: KernelStore,
  compilerWorld: TemplateCompilerWorldEmission,
): string {
  const source = describeAddress(store, compilerWorld.world.sourceAddressHandle);
  return source == null
    ? compilerWorld.world.worldKind
    : `${compilerWorld.world.worldKind} ${source.label}`;
}

export function describeAddress(
  store: KernelStore,
  handle: AddressHandle | null,
): SemanticSourceReference | null {
  if (handle == null) {
    return null;
  }
  const address = store.readAddress(handle);
  if (address == null) {
    return {
      kind: 'unexpanded-address',
      label: '(unexpanded address)',
    };
  }
  return describeStoredAddress(store, address);
}

export function sourceReferenceForParserSpan(
  filePath: string,
  span: SourceSpan,
  role: string = 'range',
): SemanticSourceReference {
  return {
    kind: 'source-span-address',
    label: `${filePath}@${span.start}..${span.end}`,
    path: filePath,
    start: span.start,
    end: span.end,
    role,
  };
}

export function sourceReferenceForTsNode(node: ts.Node): SemanticSourceReference {
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  return {
    kind: 'typescript-node',
    label: `${sourceFile.fileName}@${start}..${end}`,
    path: sourceFile.fileName,
    start,
    end,
  };
}

function describeStoredAddress(
  store: KernelStore,
  address: SemanticAddress,
): SemanticSourceReference {
  // Keep the public carrier kind visible; authored-source collapse belongs to kernel/source-address.ts.
  switch (address.kind) {
    case 'source-file-address':
      return describeSourceFileAddress(address);
    case 'source-span-address':
      return describeSourceSpanAddress(store, address);
    case 'template-address':
      return describeTemplateAddress(store, address);
    case 'template-node-address':
      return describeTemplateNodeAddress(store, address);
    case 'generated-address':
      return describeGeneratedAddress(store, address);
    case 'external-address':
      return describeExternalAddress(address);
  }
}

function describeSourceFileAddress(address: SourceFileAddress): SemanticSourceReference {
  return {
    kind: address.kind,
    label: address.path,
    path: address.path,
    sourceWorkspaceKey: address.workspaceKey,
    sourceFileRole: address.role,
  };
}

function describeSourceSpanAddress(
  store: KernelStore,
  address: SourceSpanAddress,
): SemanticSourceReference {
  const file = describeAddress(store, address.fileHandle);
  return {
    kind: address.kind,
    label: `${file?.label ?? '(unknown source)'}@${address.start}..${address.end}`,
    path: file?.path,
    start: address.start,
    end: address.end,
    role: address.role,
    sourceWorkspaceKey: file?.sourceWorkspaceKey,
    sourceFileRole: file?.sourceFileRole,
    anchor: file,
  };
}

function describeTemplateAddress(
  store: KernelStore,
  address: TemplateAddress,
): SemanticSourceReference {
  return {
    kind: address.kind,
    label: `template:${address.templateKey}`,
    anchor: describeAddress(store, address.authoredSourceHandle),
  };
}

function describeTemplateNodeAddress(
  store: KernelStore,
  address: TemplateNodeAddress,
): SemanticSourceReference {
  const source = describeAddress(store, address.authoredSourceHandle);
  return {
    kind: address.kind,
    label: source?.label ?? `template-node:${address.path.join('.')}`,
    anchor: source,
  };
}

function describeGeneratedAddress(
  store: KernelStore,
  address: GeneratedAddress,
): SemanticSourceReference {
  const anchor = describeGeneratedAddressAnchor(store, address);
  return {
    kind: address.kind,
    label: anchor == null ? `generated:${address.localKey}` : `${anchor.label} -> ${address.localKey}`,
    anchor,
  };
}

function describeGeneratedAddressAnchor(
  store: KernelStore,
  address: GeneratedAddress,
): SemanticSourceReference | null {
  return describeSourceAnchorHandle(store, address.anchorHandle);
}

function describeSourceAnchorHandle(
  store: KernelStore,
  handle: SourceAnchorHandle | null,
): SemanticSourceReference | null {
  if (handle == null) {
    return null;
  }
  const anchorRecord = readSourceAnchorRecord(store, handle);
  if (anchorRecord == null) {
    return null;
  }
  if (isSemanticAddressRecord(anchorRecord)) {
    return describeStoredAddress(store, anchorRecord);
  }
  const authoredSource = authoredSourceAddressForAnchorHandle(store, handle);
  if (authoredSource?.sourceSpan != null) {
    return describeStoredAddress(store, authoredSource.sourceSpan);
  }
  if (authoredSource?.sourceFile != null) {
    return describeStoredAddress(store, authoredSource.sourceFile);
  }
  return describeIdentityReference(anchorRecord);
}

function describeIdentityReference(identity: SemanticIdentity): SemanticSourceReference {
  return {
    kind: identity.kind,
    label: identityReferenceLabel(identity),
  };
}

function identityReferenceLabel(identity: SemanticIdentity): string {
  switch (identity.kind) {
    case 'typescript-declaration-identity':
      return identity.localName ?? identity.exportedName ?? identity.moduleKey ?? identity.kind;
    case 'aurelia-resource-identity':
      return identity.name == null ? identity.resourceKind : `${identity.resourceKind}:${identity.name}`;
    case 'aurelia-attribute-pattern-identity':
      return identity.pattern ?? identity.symbols ?? identity.kind;
    case 'di-key-identity':
      return identity.keyKind;
    case 'container-identity':
      return identity.localName ?? identity.containerKind;
    case 'template-identity':
      return identity.phase;
    case 'template-node-identity':
      return identity.nodeKey;
    case 'binding-identity':
      return identity.bindingKindKey;
    case 'instruction-identity':
      return identity.instructionKindKey;
    case 'di-product-identity':
      return identity.productKindKey;
    case 'resource-product-identity':
    case 'evaluation-identity':
    case 'observation-identity':
    case 'configuration-identity':
    case 'router-identity':
    case 'route-recognizer-identity':
    case 'i18n-identity':
    case 'state-identity':
    case 'validation-identity':
    case 'fetch-client-identity':
    case 'dialog-identity':
    case 'compiler-identity':
      return identity.localName ?? identity.productKindKey;
    case 'type-system-identity':
      return identity.display ?? identity.productKindKey;
    case 'registration-identity':
      return identity.kind;
  }
}

function describeExternalAddress(address: ExternalAddress): SemanticSourceReference {
  return {
    kind: address.kind,
    label: address.label ?? `${address.scheme}:${address.value}`,
    scheme: address.scheme,
    value: address.value,
  };
}
