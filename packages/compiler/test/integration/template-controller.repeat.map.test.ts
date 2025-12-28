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

function entryForPrimitiveMap(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Map<string, number>', isTs)}
}
`;
}

function entryForObjectMap(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Map<Key, Value>', isTs)}
}

class Key {
  ${prop('x', 'number', isTs)}
  ${prop('y', 'number', isTs)}
}

class Value {
  ${prop('a', 'string', isTs)}
  ${prop('b', 'string', isTs)}
}
`;
}

function entryForNestedMap(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Map<Salt, Map<Shot, Lime>>', isTs)}
}

class Salt {
  ${prop('x', 'number', isTs)}
  ${prop('y', 'number', isTs)}
}

class Lime {
  ${prop('a', 'string', isTs)}
  ${prop('b', 'string', isTs)}
}

class Shot {
  ${prop('m', 'string', isTs)}
  ${prop('n', 'string', isTs)}
}
`;
}

for (const lang of langs) {
  describe(`type-checking / template-controller.repeat.map — ${lang.name}`, () => {
    it(`template controller - repeat primitive map - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop">\${key.toLowerCase()} - \${value}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-map-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat primitive map - fail - incorrect key declaration`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop">\${k.toLowerCase()} - \${value}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-map-wrong-key-decl"),
      });
      assertFailure(ts, diags, [/Property 'k' does not exist/]);
    });

    it(`template controller - repeat primitive map - fail - incorrect value declaration`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop">\${key.toLowerCase()} - \${v}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-map-wrong-value-decl"),
      });
      assertFailure(ts, diags, [/Property 'v' does not exist/]);
    });

    it(`template controller - repeat primitive map - fail - incorrect key usage`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop">\${key.tolowercase()} - \${value}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-map-wrong-key-usage"),
      });
      assertFailure(ts, diags, [/Property 'tolowercase' does not exist on type 'string'/]);
    });

    it(`template controller - repeat primitive map - fail - incorrect value usage`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop">\${key.toLowerCase()} - \${value.toexponential(2)}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-map-wrong-value-usage"),
      });
      assertFailure(ts, diags, [/Property 'toexponential' does not exist on type 'number'/]);
    });

    it(`template controller - repeat primitive map - pass - with value-converter`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop | identity">\${key.toLowerCase()} - \${value}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-map-vc-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat object map - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop">(\${key.x},\${key.y}) - (\${value.a},\${value.b})</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-map-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat object map - fail - incorrect key usage`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop">(\${key.x},\${key.z}) - (\${value.a},\${value.b})</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-map-wrong-key-usage"),
      });
      assertFailure(ts, diags, [/Property 'z' does not exist on type 'Key'/]);
    });

    it(`template controller - repeat object map - fail - incorrect value usage`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="[key, value] of prop">(\${key.x},\${key.y}) - (\${value.a},\${value.c})</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-map-wrong-value-usage"),
      });
      assertFailure(ts, diags, [/Property 'c' does not exist on type 'Value'/]);
    });

    it(`template controller - nested repeat object map - pass`, async () => {
      const html = `<template repeat.for="[sl, v] of prop">(\${sl.x},\${sl.y}) <template repeat.for="[sh, lm] of v">(\${sh.m},\${sh.n}) - (\${lm.a},\${lm.b})</template></template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForNestedMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "nested-map-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - nested repeat object map - fail - incorrect declaration`, async () => {
      const html = `<template repeat.for="[sl, v] of prop">(\${sl.x},\${sl.y}) <template repeat.for="[sh, lm] of v1">(\${sh.m},\${sh.n}) - (\${lm.a},\${lm.b})</template></template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForNestedMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "nested-map-wrong-decl"),
      });
      // allow for suffixing in generated identifiers or multiple diag lines
      assertFailure(ts, diags, [/Property 'v1'?[\w$]*/]);
    });

    it(`template controller - nested repeat object map - fail - incorrect usage`, async () => {
      const html = `<template repeat.for="[sl, v] of prop">(\${sl.x},\${sl.y}) <template repeat.for="[sh, lm] of v">(\${sh.m},\${sh.n}) - (\${lm.aa},\${lm.b})</template></template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForNestedMap(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "nested-map-wrong-usage"),
      });
      assertFailure(ts, diags, [/Property 'aa' does not exist on type 'Lime'/]);
    });
  });
}
