import { test, describe, it } from "vitest";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.js";

const compilerIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(compilerIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

function entryForObjectRecord(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', '{foo: string, bar: number}', isTs)}
}
`;
}

for (const lang of langs) {
  describe(`type-checking / template-controller.repeat.object — ${lang.name}`, () => {
    it(`template controller - repeat object - pass - keys`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="key of prop | keys">\${prop[key]}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectRecord(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-keys-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat object - pass - values`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="value of prop | values">\${value}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectRecord(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-values-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat object - fail - keys`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="key of prop | keys">\${prop[key1]}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectRecord(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-keys-fail"),
      });
      // be tolerant to overlay name suffixing / qualification
      assertFailure(ts, diags, [/Property '.*key1[\w$]*' does not exist/]);
    });

    it(`template controller - repeat object - fail - values`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="value of prop | values">\${value1}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectRecord(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-values-fail"),
      });
      assertFailure(ts, diags, [/Property '.*value1[\w$]*' does not exist/]);
    });
  });
}
