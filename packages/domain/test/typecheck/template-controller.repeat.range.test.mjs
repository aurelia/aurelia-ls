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

function entryWithNumProp(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'number', isTs)}
}
`;
}
function entryEmpty(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {}
`;
}

for (const lang of langs) {
  describe(`type-checking / template-controller.repeat.range — ${lang.name}`, () => {
    it(`template controller - repeat range - pass - numeric property`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.toExponential(2)}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithNumProp(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "range-prop-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat range - pass - numeric literal`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of 10">\${item.toExponential(2)}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryEmpty(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "range-literal-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat range - fail - numeric property`, async () => {
      // faithful to original suite: this used the literal too; we keep it identical
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of 10">\${item.toexponential(2)}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithNumProp(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "range-prop-fail"),
      });
      assertFailure(ts, diags, [/Property 'toexponential' does not exist on type 'number'/]);
    });

    it(`template controller - repeat range - fail - numeric literal`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of 10">\${item.toexponential(2)}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryEmpty(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "range-literal-fail"),
      });
      assertFailure(ts, diags, [/Property 'toexponential' does not exist on type 'number'/]);
    });

    it(`template controller - nested repeat range - pass - numeric property`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop"><template repeat.for="i of item">\${i.toExponential(2)}</template></template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithNumProp(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "range-nested-prop-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - nested repeat range - pass - numeric literal`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of 10"><template repeat.for="i of item">\${i.toExponential(2)}</template></template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithNumProp(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "range-nested-literal-pass"),
      });
      assertSuccess(ts, diags);
    });
  });
}
