import test, { describe, it } from "node:test";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.mjs";

const compilerIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(compilerIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-tc-with-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

function entryWithPerson(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('person', '{ name: string }', isTs)}
}
`;
}
function entryWithNameNumber(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('name', 'number', isTs)}
}
`;
}
function entryWithAandB(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('a', '{ name: number }', isTs)}
  ${prop('b', '{ name: string }', isTs)}
}
`;
}
function entryWithItems(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('items', '{ id: number }[]', isTs)}
}
`;
}
function entryEmpty(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {}
`;
}

for (const lang of langs) {
  describe(`type-checking / template-controller.with — ${lang.name}`, () => {
    for (const withSyntax of ['with.bind', 'with']) {
      it(`with (${withSyntax}) - pass`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template ${withSyntax}="person">\${name.toUpperCase()}</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithPerson(lang.isJs),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, `with-${withSyntax}-pass`),
        });
        assertSuccess(ts, diags);
      });
    }

    it(`with - leak guard - fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template with.bind="person">\${name.toUpperCase()}</template>\n\${name}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithPerson(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "with-leak-fail"),
      });
      assertFailure(ts, diags, [/Property 'name' does not exist/]);
    });

    it(`with - precedence (with > vm) - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template with.bind="person">\${name.toUpperCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: `
${lang.isJs ? "" : "import { customElement } from '@aurelia/runtime-html';"}
import template from './view.html';
${lang.isJs ? "" : "@customElement({ name: 'foo', template })"}
export class Foo {
  ${prop('name', 'number', !lang.isJs)}
  ${prop('person', '{ name: string }', !lang.isJs)}
}
`,
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "with-precedence-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`with + let - precedence (let > with) - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template with.bind="person"><let name.bind="'x'"></let>\${name.toUpperCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithPerson(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "with-let-precedence-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`with - this.x uses vm - fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template with.bind="{ name: 'x' }">\${this.name.toUpperCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithNameNumber(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "with-this-vm-fail"),
      });
      assertFailure(ts, diags, [/Property 'toUpperCase' does not exist on type 'number'|does not exist on type 'number'/]);
    });

    it(`with - primitive rhs - fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template with.bind="42">\${name}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryEmpty(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "with-primitive-fail"),
      });
      assertFailure(ts, diags, [/Property 'name' does not exist/]);
    });

    it(`with - nested - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template with.bind="a">
  <template with.bind="b">
    \${name.toUpperCase()}
  </template>
</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithAandB(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "with-nested-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`with + repeat - scope - fail (outside)`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of items">
  <template with.bind="item">\${id.toFixed(2)}</template>
</template>
\${id}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithItems(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "with-repeat-outside-fail"),
      });
      assertFailure(ts, diags, [/Property 'id' does not exist/]);
    });
  });
}
