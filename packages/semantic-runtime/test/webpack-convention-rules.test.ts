import ts from 'typescript';
import { expect, test } from 'vitest';
import { StaticEvaluator } from '../src/evaluation/evaluator.js';
import { readWebpackConventionRules } from '../src/resources/webpack-convention-rules.js';

function read(config: string) {
  const source = ts.createSourceFile('webpack.config.cjs', `const config = ${config};`, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  return readWebpackConventionRules(new StaticEvaluator().evaluateSourceFile(source).environment.readValue('config'));
}

const loader = "'@aurelia/webpack-loader'";
const paths = ['/app/src/item.ts', '/app/src/item.html', '/app/test/item.ts', '/app/src/item.css'];
test.each([
  [`{include:'/app/src', test: {or:[/\\.ts$/i,/\\.html$/i]}, use: [ {loader:${loader}} ]}`, [true,true,false,false]],
  [`{test: {and:[/item/, {not:/\\.css$/}]}, exclude:['/app/test'], loader:${loader}}`, [true,true,false,false]],
  [`{oneOf:[{test:/\\.ts$/, use:'ts-loader'}, {test:/\\.(html|ts)$/, use:${loader}}]}`, [false,true,false,false]],
  [`{oneOf:[{test:/\\.css$/, issuer: () => true, use:'other'}, {use:${loader}}]}`, [true,true,true,false]],
  [`{test:/item/, rules:[{test:/\\.ts$/, use:${loader}, options:undefined}, {test:/\\.html$/, loader:${loader}, options:{enableConventions:false}}]}`, [true,false,true,false]],
  [`{oneOf:[{issuer: () => true, use:'other'}, {use:${loader}}]}`, [false,false,false,false]],
  [`{test:/item/g, use:${loader}}`, [false,false,false,false]],
] as const)('applies the webpack rule %s', (rule, expected) => {
  const rules = read(`{module:{rules:[${rule}]}}`);
  expect(paths.map(rules.admits)).toEqual(expected);
});

test.each([
  `{resolveLoader:{alias:{'@aurelia/webpack-loader':'other'}},module:{rules:[{use:${loader}}]}}`,
  `{then(resolve){resolve({})},module:{rules:[{use:${loader}}]}}`,
  `{module:{rules:[{test:()=>true, use:${loader}}]}}`,
  `{module:{rules:[{loader:${loader}, options:{enableConventions:globalThis.dynamic}}]}}`,
])('keeps unresolved loader reach open for %s', config => {
  const rules = read(config);
  expect(rules.open).toBe(true);
  expect(paths.some(rules.admits)).toBe(false);
});
