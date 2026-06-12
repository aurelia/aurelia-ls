import ts from 'typescript';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle } from '../kernel/handles.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import {
  TemplateSourceOffsetMap,
} from './custom-element-definition.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';

export class TemplateSourceAddressSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly sourceMap: TemplateSourceOffsetMap | null,
  ) {}
}

export class SourceSpanAddressSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
  ) {}
}

class InlineTemplateMarkupSource {
  constructor(
    readonly contentStart: number,
    readonly contentEnd: number,
    readonly sourceMap: TemplateSourceOffsetMap | null,
  ) {}
}

export interface SourceSpanRange {
  readonly start: number;
  readonly end: number;
}

export function templateCarrierExpression(node: ts.Node): ts.Expression | null {
  if (ts.isPropertyAssignment(node)) {
    return node.initializer;
  }
  if (ts.isShorthandPropertyAssignment(node)) {
    return node.name;
  }
  return ts.isExpression(node) ? node : null;
}

export function externalTemplateSourceAddress(
  store: KernelStore,
  sourceFileAddressHandle: AddressHandle,
  markupLength: number,
  local: string,
  sourceMap: TemplateSourceOffsetMap | null = null,
): TemplateSourceAddressSet {
  const addressHandle = store.handles.address(`${local}:source`);
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const records: KernelStoreRecord[] = [
    new SourceSpanAddress(
      addressHandle,
      sourceFileAddressHandle,
      0,
      markupLength,
      SourceSpanRole.Value,
    ),
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Declaration],
      'Custom element external template markup source.',
      addressHandle,
    ),
    new ProvenanceRecord(
      provenanceHandle,
      [evidenceHandle],
    ),
  ];
  return new TemplateSourceAddressSet(records, addressHandle, sourceMap);
}

export function templateMarkupSourceAddress(
  store: KernelStore,
  context: ResourceRecognitionContext,
  node: ts.Node,
  markup: string,
  local: string,
): TemplateSourceAddressSet | null {
  const expression = inlineTemplateStringExpression(node);
  if (expression == null) {
    return null;
  }
  const source = inlineTemplateMarkupSource(context, expression, markup);
  if (source == null) {
    return null;
  }
  return inlineTemplateSourceAddressSet(store, context, local, source);
}

export function sourceSpanAddressForNode(
  store: KernelStore,
  context: ResourceRecognitionContext,
  node: ts.Node | null,
  local: string,
  role: SourceSpanRole,
): SourceSpanAddressSet | null {
  if (node == null) {
    return null;
  }
  const sourceFile = node.getSourceFile();
  const sourceFileAddressHandle = sourceFileAddressHandleForNode(context, node);
  if (sourceFileAddressHandle == null) {
    return null;
  }
  const span = sourceSpanRangeForNode(sourceFile, node);
  if (span == null) {
    return null;
  }
  const addressHandle = store.handles.address(`${local}:source`);
  return new SourceSpanAddressSet(
    [
      new SourceSpanAddress(
        addressHandle,
        sourceFileAddressHandle,
        span.start,
        span.end,
        role,
      ),
    ],
    addressHandle,
  );
}

export function sourceFileAddressHandleForNode(
  context: ResourceRecognitionContext,
  node: ts.Node,
): AddressHandle | null {
  return context.readAdmittedNodeContext(node)?.sourceFileAddressHandle ?? null;
}

export function sourceSpanRangeForNode(
  sourceFile: ts.SourceFile,
  node: ts.Node | null,
): SourceSpanRange | null {
  if (node == null) {
    return null;
  }
  const sourceNode = sourceAddressNode(node);
  let start = sourceNode.getStart(sourceFile);
  let end = sourceNode.end;
  if (ts.isStringLiteralLike(sourceNode) || ts.isNoSubstitutionTemplateLiteral(sourceNode)) {
    start += 1;
    end -= 1;
  }
  if (end < start) {
    return null;
  }
  return { start, end };
}

function inlineTemplateStringExpression(
  node: ts.Node,
): ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | null {
  const carrier = templateCarrierExpression(node);
  if (carrier == null) {
    return null;
  }
  const expression = unwrapExpression(carrier);
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)
    ? expression
    : null;
}

function inlineTemplateMarkupSource(
  context: ResourceRecognitionContext,
  expression: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral,
  markup: string,
): InlineTemplateMarkupSource | null {
  const contentStart = expression.getStart(context.sourceFile) + 1;
  const contentEnd = expression.end - 1;
  const rawContent = context.sourceFile.text.slice(contentStart, contentEnd);
  const sourceMap = inlineTemplateSourceMap(rawContent, markup, contentStart);
  return sourceMap === undefined
    ? null
    : new InlineTemplateMarkupSource(contentStart, contentEnd, sourceMap);
}

function inlineTemplateSourceMap(
  rawContent: string,
  markup: string,
  contentStart: number,
): TemplateSourceOffsetMap | null | undefined {
  return rawContent.length === markup.length
    ? null
    : decodedStringSourceMap(rawContent, markup, contentStart) ?? undefined;
}

function inlineTemplateSourceAddressSet(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  source: InlineTemplateMarkupSource,
): TemplateSourceAddressSet {
  const addressHandle = store.handles.address(`${local}:source`);
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const records: KernelStoreRecord[] = [
    new SourceSpanAddress(
      addressHandle,
      context.sourceFileAddressHandle,
      source.contentStart,
      source.contentEnd,
      SourceSpanRole.Value,
    ),
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Declaration],
      'Custom element inline template markup source.',
      addressHandle,
    ),
    new ProvenanceRecord(
      provenanceHandle,
      [evidenceHandle],
    ),
  ];
  return new TemplateSourceAddressSet(records, addressHandle, source.sourceMap);
}

function decodedStringSourceMap(
  rawContent: string,
  decoded: string,
  contentStart: number,
): TemplateSourceOffsetMap | null {
  const offsets: number[] = [];
  let decodedText = '';
  let rawIndex = 0;

  while (rawIndex < rawContent.length) {
    const sourceOffset = contentStart + rawIndex;
    const char = rawContent[rawIndex] ?? '';
    if (char !== '\\') {
      offsets.push(sourceOffset);
      decodedText += char;
      rawIndex++;
      continue;
    }

    const escape = readStringEscape(rawContent, rawIndex);
    if (escape == null) {
      return null;
    }
    for (let i = 0; i < escape.decoded.length; i++) {
      offsets.push(sourceOffset);
    }
    decodedText += escape.decoded;
    rawIndex += escape.rawLength;
  }

  offsets.push(contentStart + rawContent.length);
  if (decodedText !== decoded || offsets.length !== decoded.length + 1) {
    return null;
  }
  return new TemplateSourceOffsetMap(decoded.length, offsets);
}

function readStringEscape(
  rawContent: string,
  slashIndex: number,
): { readonly decoded: string; readonly rawLength: number } | null {
  const next = rawContent[slashIndex + 1] ?? '';
  switch (next) {
    case 'b':
      return { decoded: '\b', rawLength: 2 };
    case 'f':
      return { decoded: '\f', rawLength: 2 };
    case 'n':
      return { decoded: '\n', rawLength: 2 };
    case 'r':
      return { decoded: '\r', rawLength: 2 };
    case 't':
      return { decoded: '\t', rawLength: 2 };
    case 'v':
      return { decoded: '\v', rawLength: 2 };
    case '0':
      return { decoded: '\0', rawLength: 2 };
    case '\\':
    case '"':
    case "'":
    case '`':
    case '$':
      return { decoded: next, rawLength: 2 };
    case '\r': {
      const rawLength = rawContent[slashIndex + 2] === '\n' ? 3 : 2;
      return { decoded: '', rawLength };
    }
    case '\n':
      return { decoded: '', rawLength: 2 };
    case 'x': {
      const text = rawContent.slice(slashIndex + 2, slashIndex + 4);
      return /^[0-9a-fA-F]{2}$/.test(text)
        ? { decoded: String.fromCharCode(parseInt(text, 16)), rawLength: 4 }
        : null;
    }
    case 'u':
      return readUnicodeEscape(rawContent, slashIndex);
    default:
      return null;
  }
}

function readUnicodeEscape(
  rawContent: string,
  slashIndex: number,
): { readonly decoded: string; readonly rawLength: number } | null {
  if (rawContent[slashIndex + 2] === '{') {
    const close = rawContent.indexOf('}', slashIndex + 3);
    if (close < 0) {
      return null;
    }
    const text = rawContent.slice(slashIndex + 3, close);
    if (!/^[0-9a-fA-F]+$/.test(text)) {
      return null;
    }
    const value = parseInt(text, 16);
    if (value > 0x10FFFF) {
      return null;
    }
    return { decoded: String.fromCodePoint(value), rawLength: close - slashIndex + 1 };
  }

  const text = rawContent.slice(slashIndex + 2, slashIndex + 6);
  return /^[0-9a-fA-F]{4}$/.test(text)
    ? { decoded: String.fromCharCode(parseInt(text, 16)), rawLength: 6 }
    : null;
}

function sourceAddressNode(node: ts.Node): ts.Node {
  if (
    (ts.isPropertyAssignment(node)
      || ts.isShorthandPropertyAssignment(node)
      || ts.isMethodDeclaration(node)
      || ts.isPropertyDeclaration(node)
      || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node))
    && node.name != null
  ) {
    return node.name;
  }
  return node;
}
