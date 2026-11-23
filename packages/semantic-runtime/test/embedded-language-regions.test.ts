import { expect, test } from 'vitest';
import { templateEmbeddedLanguageRegions } from '../src/template/embedded-languages.js';
import type { SemanticTemplateSemanticTokenRow } from '../src/api/contracts.js';

function delimiter(text: string, marker: string, from = 0): SemanticTemplateSemanticTokenRow {
  const start = text.indexOf(marker, from);
  if (start < 0) throw new Error(`Missing marker: ${marker}`);
  return {
    tokenType: 'aureliaExpression', tokenModifiers: [], definitionName: 'app',
    source: { kind: 'source-span-address', label: marker, path: 'src/app.html', start, end: start + marker.length, role: 'expression' },
  };
}

test('joins only proved interpolation delimiters to native embedded regions in authored order', () => {
  const text = [
    '<!-- <i style="color:${ignored}"></i> -->',
    '<div style="width: &#36;{amount}%; color: broken" onclick="run()"></div>',
    '<p>${outside}</p><script type="application/json">{"color":"${unbound}"}</script>',
    '<script type="module">const color = "green";</script>',
    '<style>.static { color: red; }</style>',
  ].join('\r\n');
  const start = text.indexOf('&#36;');
  const tokens = [delimiter(text, '&#36;{'), delimiter(text,'}',start), delimiter(text,'${',text.indexOf('<p>')), delimiter(text,'}',text.indexOf('${outside'))];
  const regions = templateEmbeddedLanguageRegions(text,tokens);
  expect(regions.map(region => [region.language,region.context,region.holes.length,Boolean(region.module)])).toEqual([
    ['css','attribute',1,false], ['javascript','attribute',0,false],
    ['javascript','element',0,true], ['css','element',0,false],
  ]);
  const [style] = regions;
  expect(style!.value.slice(style!.holes[0]!.start,style!.holes[0]!.end)).toBe('${amount}');
  expect(style!.start + style!.offsets![style!.holes[0]!.start]!).toBe(start);
  expect(templateEmbeddedLanguageRegions(text, tokens.slice(2))).toEqual([]);
  expect(templateEmbeddedLanguageRegions(text, [])).toEqual([]);
});

test('an unclosed interpolation ends at its own inline value and preserves subsequent authorable code', () => {
  const text = '<div style="color: ${name" oninput="const x = ;"></div>';
  const [style,event] = templateEmbeddedLanguageRegions(text, [delimiter(text, '${')]);
  expect(style!.value.slice(style!.holes[0]!.start,style!.holes[0]!.end)).toBe('${name');
  expect(event?.value).toBe('const x = ;');
});
