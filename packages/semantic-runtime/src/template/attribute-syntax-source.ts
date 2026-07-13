import { SourceSpanAddress, SourceSpanRole } from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  sourceSpanAddressForAddress,
  sourceSpanAddressForSite,
} from '../kernel/source-address.js';
import type { KernelStore, KernelStoreRecord } from '../kernel/store.js';
import {
  AttributePatternLiteralReference,
  type AttributeParserParseResult,
} from './attribute-syntax.js';

/** Exact authored name-part sources produced by one AttrSyntax parse. */
export class AttributeSyntaxPartSources {
  constructor(
    readonly targetSourceAddressHandle: AddressHandle | null,
    readonly commandSourceAddressHandle: AddressHandle | null,
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
    return new AttributeSyntaxPartSources(nameSourceAddressHandle, null, [], []);
  }
  const nameSourceAddress = nameSource instanceof SourceSpanAddress
    ? nameSource
    : sourceSpanAddressForAddress(store, nameSourceAddressHandle);
  if (nameSourceAddress == null) {
    return new AttributeSyntaxPartSources(null, null, [], []);
  }
  const records: KernelStoreRecord[] = [];
  const targetStart = parse.execution.rawName.indexOf(parse.execution.target);
  const targetSource = targetStart < 0
    ? null
    : sourceSpanAddressForSite(store, `${local}:target`, {
      sourceFileAddressHandle: nameSourceAddress.fileHandle,
      start: nameSourceAddress.start + targetStart,
      end: nameSourceAddress.start + targetStart + parse.execution.target.length,
    }, SourceSpanRole.Name);
  if (targetSource != null) {
    records.push(...targetSource.records);
  }
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
  const symbolSet = new Set(parse.matchedPattern?.compiledPattern.symbols ?? []);
  const patternLiterals = (parse.interpretation?.literalOccurrences ?? []).flatMap((occurrence, index) => {
    if ([...occurrence.value].every((character) => symbolSet.has(character))) {
      return [];
    }
    const source = sourceSpanAddressForSite(store, `${local}:pattern-literal:${index}`, {
      sourceFileAddressHandle: nameSourceAddress.fileHandle,
      start: nameSourceAddress.start + occurrence.start,
      end: nameSourceAddress.start + occurrence.end,
    }, SourceSpanRole.Name);
    if (source == null) {
      return [];
    }
    records.push(...source.records);
    return [new AttributePatternLiteralReference(occurrence.tokenIndex, occurrence.value, source.handle)];
  });
  return new AttributeSyntaxPartSources(
    targetSource?.handle ?? null,
    commandSource?.handle ?? null,
    patternLiterals,
    records,
  );
}
