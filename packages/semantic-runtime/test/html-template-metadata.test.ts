import { expect, test } from 'vitest';
import { readHtmlTemplateMetadata } from '../src/resources/html-template-metadata.js';

test('extracts only enclosing template imports and preserves the positions of retained markup', () => {
  const rawText = '<textarea><import from="./text"></import></textarea>';
  const local = '<template as-custom-element="child"><require from="./local"></require><slot></slot></template>';
  const imported = '<IMPORT from=./cards/card as="main-card" other.as="other-card">';
  const child = '<div></div>';
  const usage = '<main-card></main-card>';
  const source = rawText + local + imported + child + '</IMPORT>' + usage;
  const metadata = readHtmlTemplateMetadata(source);
  expect(metadata.markup).toBe(rawText + local + child + usage);
  expect(metadata.hasSlot).toBe(false);
  expect(metadata.imports).toHaveLength(1);
  const [record] = metadata.imports;
  expect(record?.specifier).toBe('./cards/card');
  expect([...record!.aliases]).toEqual([['__MAIN__', 'main-card'], ['other', 'other-card']]);
  expect(source.slice(record!.sourceStart, record!.sourceEnd)).toBe(imported);
  const offsets = metadata.sourceMap!.decodedToSourceOffsets;
  expect(offsets[metadata.markup.indexOf(child)]).toBe(source.indexOf(child));
  expect(offsets[metadata.markup.indexOf(usage)]).toBe(source.indexOf(usage));
  expect(offsets.at(-1)).toBe(source.length);
});
