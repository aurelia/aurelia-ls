import { SourceSpanAddress, SourceSpanRole } from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  sourceSpanAddressForAddress,
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
} from '../kernel/source-address.js';
import type { KernelStore, KernelStoreRecord } from '../kernel/store.js';
import {
  AttributePatternLiteralReference,
  AttributePatternPartReference,
  type AttributeParserParseResult,
} from './attribute-syntax.js';

/** Exact authored name-part sources produced by one AttrSyntax parse. */
export class AttributeSyntaxPartSources {
  constructor(
    readonly targetSourceAddressHandle: AddressHandle | null,
    readonly commandSourceAddressHandle: AddressHandle | null,
    readonly patternParts: readonly AttributePatternPartReference[],
    readonly patternLiterals: readonly AttributePatternLiteralReference[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publish target, command, and literal-token addresses relative to an authored AttrSyntax name. */
export function attributeSyntaxPartSources(
  store: KernelStore,
  local: string,
  nameSource: AddressHandle | SourceSpanAddress | null,
  parse: AttributeParserParseResult,
): AttributeSyntaxPartSources {
  const nameSourceAddressHandle = nameSource instanceof SourceSpanAddress
    ? nameSource.handle
    : nameSource;
  if (parse.execution.syntaxKind === 'plain') {
    return new AttributeSyntaxPartSources(nameSourceAddressHandle, null, [], [], []);
  }
  const nameSourceAddress = nameSource instanceof SourceSpanAddress
    ? nameSource
    : sourceSpanAddressForAddress(store, nameSourceAddressHandle);
  if (nameSourceAddress == null) {
    return new AttributeSyntaxPartSources(null, null, [], [], []);
  }
  const records: KernelStoreRecord[] = [];
  const transformedRefTarget = parse.execution.command === 'ref' && parse.execution.target === 'component'
    ? parse.interpretation?.partOccurrences.find((occurrence) => occurrence.value === 'view-model') ?? null
    : null;
  const targetStart = transformedRefTarget?.start ?? parse.execution.rawName.indexOf(parse.execution.target);
  const targetLength = transformedRefTarget == null
    ? parse.execution.target.length
    : transformedRefTarget.end - transformedRefTarget.start;
  const targetSource = targetStart < 0
    ? null
    : sourceSpanAddressForSite(store, `${local}:target`, {
      sourceFileAddressHandle: nameSourceAddress.fileHandle,
      start: nameSourceAddress.start + targetStart,
      end: nameSourceAddress.start + targetStart + targetLength,
    }, SourceSpanRole.Name);
  if (targetSource != null) {
    records.push(...targetSource.records);
  }
  const targetAbsoluteStart = targetStart < 0 ? null : nameSourceAddress.start + targetStart;
  const targetAbsoluteEnd = targetAbsoluteStart == null ? null : targetAbsoluteStart + targetLength;
  const commandStart = parse.execution.command == null
    ? -1
    : parse.execution.rawName.lastIndexOf(parse.execution.command);
  const commandSource = commandStart < 0 || parse.execution.command == null
    ? null
    : sourceSpanAddressForSite(store, `${local}:command`, {
      sourceFileAddressHandle: nameSourceAddress.fileHandle,
      start: nameSourceAddress.start + commandStart,
      end: nameSourceAddress.start + commandStart + parse.execution.command.length,
    }, SourceSpanRole.Name);
  if (commandSource != null) {
    records.push(...commandSource.records);
  }
  const commandAbsoluteStart = commandStart < 0 ? null : nameSourceAddress.start + commandStart;
  const commandAbsoluteEnd = commandAbsoluteStart == null || parse.execution.command == null
    ? null
    : commandAbsoluteStart + parse.execution.command.length;
  const sourceForOccurrence = (
    suffix: string,
    start: number,
    end: number,
  ): SourceSpanAddressPublication | null => {
    const absoluteStart = nameSourceAddress.start + start;
    const absoluteEnd = nameSourceAddress.start + end;
    if (targetAbsoluteStart === absoluteStart && targetAbsoluteEnd === absoluteEnd) {
      return targetSource;
    }
    if (commandAbsoluteStart === absoluteStart && commandAbsoluteEnd === absoluteEnd) {
      return commandSource;
    }
    const source = sourceSpanAddressForSite(store, `${local}:${suffix}`, {
      sourceFileAddressHandle: nameSourceAddress.fileHandle,
      start: absoluteStart,
      end: absoluteEnd,
    }, SourceSpanRole.Name);
    if (source != null) {
      records.push(...source.records);
    }
    return source;
  };
  const patternParts = (parse.interpretation?.partOccurrences ?? []).flatMap((occurrence) => {
    const source = sourceForOccurrence(`pattern-part:${occurrence.partIndex}`, occurrence.start, occurrence.end);
    return source == null
      ? []
      : [new AttributePatternPartReference(occurrence.partIndex, occurrence.value, source.handle)];
  });
  const symbolSet = new Set(parse.matchedPattern?.compiledPattern.symbols ?? []);
  const patternLiterals = (parse.interpretation?.literalOccurrences ?? []).flatMap((occurrence, index) => {
    if ([...occurrence.value].every((character) => symbolSet.has(character))) {
      return [];
    }
    const source = sourceForOccurrence(`pattern-literal:${index}`, occurrence.start, occurrence.end);
    if (source == null) {
      return [];
    }
    return [new AttributePatternLiteralReference(occurrence.tokenIndex, occurrence.value, source.handle)];
  });
  return new AttributeSyntaxPartSources(
    targetSource?.handle ?? null,
    commandSource?.handle ?? null,
    patternParts,
    patternLiterals,
    records,
  );
}
