import { SourceSpanAddress } from '../kernel/address.js';
import type { SourceSpanSite } from '../kernel/source-address.js';
import type { KernelStoreReadView } from '../kernel/store.js';
import type { TemplateSourceOffsetMap } from '../resources/custom-element-definition.js';
import type { TemplateSource } from './compilation-unit.js';

export interface AuthoredTemplateSourceRange {
  readonly start: number;
  readonly end: number;
}

/** Map one decoded-template boundary range into absolute authored-source offsets. */
export function mapDecodedTemplateSourceRange(
  map: TemplateSourceOffsetMap,
  start: number,
  end: number,
): AuthoredTemplateSourceRange | null {
  if (
    !Number.isSafeInteger(map.decodedLength)
    || map.decodedLength < 0
    || map.decodedToSourceOffsets.length !== map.decodedLength + 1
    || !validDecodedRange(start, end, map.decodedLength)
  ) {
    return null;
  }
  const mappedStart = map.decodedToSourceOffsets[start];
  const mappedEnd = map.decodedToSourceOffsets[end];
  return typeof mappedStart === 'number'
    && Number.isSafeInteger(mappedStart)
    && typeof mappedEnd === 'number'
    && Number.isSafeInteger(mappedEnd)
    && mappedStart >= 0
    && mappedEnd >= mappedStart
    ? { start: mappedStart, end: mappedEnd }
    : null;
}

/**
 * Resolve one proven contiguous decoded-template range to an authored source site.
 * Browser parser envelopes must pass correspondence before calling this helper.
 */
export function sourceSpanSiteForDecodedTemplateRange(
  store: KernelStoreReadView,
  source: Pick<TemplateSource, 'markup' | 'sourceAddressHandle' | 'sourceMap'>,
  start: number,
  end: number,
): SourceSpanSite | null {
  if (source.sourceAddressHandle == null) {
    return null;
  }
  const sourceAddress = store.read(source.sourceAddressHandle);
  if (!(sourceAddress instanceof SourceSpanAddress)) {
    return null;
  }
  if (source.markup == null) {
    return source.sourceMap == null && start === 0 && end === 0
      ? {
          sourceFileAddressHandle: sourceAddress.fileHandle,
          start: sourceAddress.start,
          end: sourceAddress.start,
        }
      : null;
  }
  if (!validDecodedRange(start, end, source.markup.length)) {
    return null;
  }
  if (source.sourceMap == null) {
    return {
      sourceFileAddressHandle: sourceAddress.fileHandle,
      start: sourceAddress.start + start,
      end: sourceAddress.start + end,
    };
  }
  if (source.sourceMap.decodedLength !== source.markup.length) {
    return null;
  }
  const mapped = mapDecodedTemplateSourceRange(source.sourceMap, start, end);
  return mapped == null
    ? null
    : {
        sourceFileAddressHandle: sourceAddress.fileHandle,
        start: mapped.start,
        end: mapped.end,
      };
}

function validDecodedRange(start: number, end: number, length: number): boolean {
  return Number.isSafeInteger(start)
    && Number.isSafeInteger(end)
    && start >= 0
    && end >= start
    && end <= length;
}
