import test, { describe, it } from "node:test";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.mjs";

const domainIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(domainIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

function entryForPrimitiveSet(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Set<string>', isTs)}
}
`;
}

function entryForObjectSet(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Set<Bar>', isTs)}
}

class Bar {
  ${prop('x', 'string', isTs)}
}
`;
}

function entryForObjectSetWrong(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Set<Bar>', isTs)}
}

class Bar {
  ${prop('x1', 'string', isTs)}
}
`;
}

for (const lang of langs) {
  describe(`type-checking / template-controller.repeat.set — ${lang.name}`, () => {
    it(`template controller - repeat primitive set - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.toLowerCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveSet(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "set-prim-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat primitive set - fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.tolowercase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveSet(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "set-prim-fail"),
      });
      assertFailure(ts, diags, [/Property 'tolowercase' does not exist on type 'string'/]);
    });

    it(`template controller - repeat Set<object> - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.x.toLowerCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectSet(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "set-obj-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat Set<object> - fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.x.toLowerCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectSetWrong(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "set-obj-fail"),
      });
      assertFailure(ts, diags, [/Property 'x' does not exist on type '.*Bar.*'/]);
    });

    it(`template controller - repeat primitive set - pass - with value converter`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop | identity">\${item.toLowerCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveSet(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "set-prim-vc-pass"),
      });
      assertSuccess(ts, diags);
    });
  });
}
