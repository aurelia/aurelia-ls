import { SourceSpanAddress, SourceSpanRole } from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  decodedSubspanSite,
  sourceSpanAddressForAddress,
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
} from '../kernel/source-address.js';
import type { KernelStoreReadView, KernelStoreRecord } from '../kernel/store.js';
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
  store: KernelStoreReadView,
  local: string,
  nameSource: AddressHandle | SourceSpanAddress | null,
  authoredRawName: string,
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
  const nameLength = nameSourceAddress.decodedOffsets == null
    ? nameSourceAddress.end - nameSourceAddress.start : nameSourceAddress.decodedOffsets.length - 1;
  if (nameLength !== authoredRawName.length) {
    return new AttributeSyntaxPartSources(null, null, [], [], []);
  }
  const records: KernelStoreRecord[] = [];
  const publish = (suffix: string, start: number, end: number): SourceSpanAddressPublication | null => {
    const site = decodedSubspanSite(nameSourceAddress, start, end);
    if (site == null) return null;
    const source = sourceSpanAddressForSite(store, `${local}:${suffix}`, site, SourceSpanRole.Name);
    records.push(...source.records);
    return source;
  };
  const transformedRefTarget = parse.execution.command === 'ref' && parse.execution.target === 'component'
    ? parse.interpretation?.partOccurrences.find((occurrence) => occurrence.value === 'view-model') ?? null
    : null;
  const targetStart = transformedRefTarget?.start ?? parse.execution.rawName.indexOf(parse.execution.target);
  const targetLength = transformedRefTarget == null
    ? parse.execution.target.length
    : transformedRefTarget.end - transformedRefTarget.start;
  const targetSource = publish('target', targetStart, targetStart + targetLength);
  const commandStart = parse.execution.command == null
    ? -1
    : parse.execution.rawName.lastIndexOf(parse.execution.command);
  const commandSource = commandStart < 0 || parse.execution.command == null
    ? null
    : publish('command', commandStart, commandStart + parse.execution.command.length);
  const sourceForOccurrence = (
    suffix: string,
    start: number,
    end: number,
  ): SourceSpanAddressPublication | null => {
    if (start === targetStart && end === targetStart + targetLength) {
      return targetSource;
    }
    if (start === commandStart && end === commandStart + (parse.execution.command?.length ?? 0)) {
      return commandSource;
    }
    return publish(suffix, start, end);
  };
  const patternParts = (parse.interpretation?.partOccurrences ?? []).flatMap((occurrence) => {
    const source = sourceForOccurrence(`pattern-part:${occurrence.partIndex}`, occurrence.start, occurrence.end);
    return source == null
      ? []
      : [new AttributePatternPartReference(
          occurrence.partIndex,
          authoredRawName.slice(occurrence.start, occurrence.end),
          source.handle,
        )];
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
    return [new AttributePatternLiteralReference(
      occurrence.tokenIndex,
      authoredRawName.slice(occurrence.start, occurrence.end),
      source.handle,
    )];
  });
  return new AttributeSyntaxPartSources(
    targetSource?.handle ?? null,
    commandSource?.handle ?? null,
    patternParts,
    patternLiterals,
    records,
  );
}
