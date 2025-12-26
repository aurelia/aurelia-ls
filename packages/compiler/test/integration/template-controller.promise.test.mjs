import test, { describe, it } from "node:test";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.mjs";

const compilerIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(compilerIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-tc-promise-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

function entryPromiseOfString(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Promise<string>', isTs)}
}
`;
}
function entryString(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'string', isTs)}
}
`;
}
function entryTwoPromises(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop1', 'Promise<string>', isTs)}

  ${prop('prop2', 'Promise<number>', isTs)}
}
`;
}

const promiseSyntaxes = ['promise.bind', 'promise'];
const thenSyntaxes = ['then.from-view', 'then'];
const catchSyntaxes = ['catch.from-view', 'catch'];

for (const lang of langs) {
  describe(`type-checking / template-controller.promise — ${lang.name}`, () => {
    for (const p of promiseSyntaxes) {
      for (const t of thenSyntaxes) {
        for (const c of catchSyntaxes) {
          const suffix = `${p.replace('.', '-')}_${t.replace('.', '-')}_${c.replace('.', '-')}`;

          it(`pass — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryPromiseOfString(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `pass-${suffix}`),
            });
            assertSuccess(ts, diags);
          });

          it(`fail — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop">
  <span ${t}="data">\${data.touppercase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryPromiseOfString(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `fail-${suffix}`),
            });
            assertFailure(ts, diags, [/Property 'touppercase' does not exist on type 'string'/]);
          });

          it(`non-promise - pass — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryString(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `nonpromise-pass-${suffix}`),
            });
            assertSuccess(ts, diags);
          });

          it(`non-promise - fail — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop">
  <span ${t}="data">\${data.touppercase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryString(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `nonpromise-fail-${suffix}`),
            });
            assertFailure(ts, diags, [/Property 'touppercase' does not exist on type 'string'/]);
          });

          it(`multiple promises - same then/catch declaration - pass — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop1">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>

<template ${p}="prop2">
  <span ${t}="data">\${data.toExponential(2)}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryTwoPromises(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `multi-same-${suffix}`),
            });
            assertSuccess(ts, diags);
          });

          it(`multiple promises - different then/catch declaration - pass — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop1">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>

<template ${p}="prop2">
  <span ${t}="data1">\${data1.toExponential(2)}</span>
  <span ${c}="error1">\${error1}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryTwoPromises(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `multi-diff-${suffix}`),
            });
            assertSuccess(ts, diags);
          });

          it(`multiple promises - fail — mismatched usage — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop1">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>

<template ${p}="prop2">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryTwoPromises(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `multi-fail-${suffix}`),
            });
            assertFailure(ts, diags, [/Property 'toUpperCase' does not exist on type 'number'/]);
          });
        }
      }
    }
  });
}
