import { DecodingMode, EntityDecoder, htmlDecodeTree } from 'entities/decode';

/** Browser character data with positions in the lexical HTML value (UTF-16 boundaries). */
export interface DecodedHtmlCharacterData {
  readonly value: string;
  readonly offsets?: readonly number[];
}

/** Return a projection only if fragment parsing changes the source spelling. */
export function decodeHtmlCharacterData(
  raw: string,
  mode: 'attribute' | 'text' | 'foreign-text' | 'rcdata' | 'raw-text',
): DecodedHtmlCharacterData | null {
  const specials = mode === 'raw-text' ? /[\r\0]/gu : /[&\r\0]/gu;
  let match = specials.exec(raw);
  if (match == null) return null;
  let plainStart = 0;
  let value = '';
  const offsets: number[] = [];
  let entityValue = '';
  let decoder: EntityDecoder | undefined;

  for (; match != null; match = specials.exec(raw)) {
    const start = match.index;
    let consumed = 1;
    let replacement: string;
    switch (match[0]) {
      case '&':
        decoder ??= new EntityDecoder(htmlDecodeTree, (code) => { entityValue += String.fromCodePoint(code); });
        decoder.startEntity(mode === 'attribute' ? DecodingMode.Attribute : DecodingMode.Legacy);
        entityValue = '';
        consumed = decoder.write(raw, start + 1);
        if (consumed < 0) consumed = decoder.end();
        if (consumed === 0) continue;
        replacement = entityValue;
        break;
      case '\r':
        consumed = raw[start + 1] === '\n' ? 2 : 1;
        replacement = '\n';
        break;
      default:
        replacement = mode === 'text' ? '' : '\uFFFD';
        break;
    }
    value += raw.slice(plainStart, start) + replacement;
    for (let i = plainStart; i < start; i++) offsets.push(i);
    for (let i = 0; i < replacement.length; i++) offsets.push(start);
    plainStart = start + consumed;
    specials.lastIndex = plainStart;
  }
  if (plainStart === 0) return null;
  value += raw.slice(plainStart);
  if (value.length === raw.length) return { value };
  for (let i = plainStart; i <= raw.length; i++) offsets.push(i);
  return { value, offsets };
}
