import test, { describe, it } from "node:test";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.mjs";

const domainIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(domainIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-tc-basic-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

function entryWithUnknownProp(isJs, propName = "prop") {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop(propName, 'unknown', isTs)}
}
`;
}

for (const lang of langs) {
  describe(`type-checking / template-controller.basic — ${lang.name}`, () => {
    // if
    describe("if", () => {
      it(`if - pass`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template if.bind="prop">awesome</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs, "prop"),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "if-pass"),
        });
        assertSuccess(ts, diags);
      });

      it(`if - fail`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template if.bind="prop">awesome</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs, "prop1"),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "if-fail"),
        });
        assertFailure(ts, diags, [/Property 'prop' does not exist on type '.*Foo.*'/]);
      });

      it(`if - value-converter - pass`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template if.bind="prop | identity">awesome</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "if-vc-pass"),
        });
        assertSuccess(ts, diags);
      });

      it(`if - binding-behavior - pass`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template if.bind="prop & identity">awesome</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "if-bb-pass"),
        });
        assertSuccess(ts, diags);
      });
    });

    // switch / case
    describe("switch / case", () => {
      it(`switch - pass`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template switch.bind="prop">
  <span case="foo">Foo</span>
  <span case="bar">Bar</span>
</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "switch-pass"),
        });
        assertSuccess(ts, diags);
      });

      it(`switch - fail`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template switch.bind="prop">
  <span case="foo">Foo</span>
  <span case="bar">Bar</span>
</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs, "prop1"),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "switch-fail"),
        });
        assertFailure(ts, diags, [/Property 'prop' does not exist on type '.*Foo.*'/]);
      });

      it(`switch - value-converter - pass`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template switch.bind="prop | identity">
  <span case="foo">Foo</span>
  <span case="bar">Bar</span>
</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "switch-vc-pass"),
        });
        assertSuccess(ts, diags);
      });

      it(`switch - binding behavior - pass`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template switch.bind="prop & identity">
  <span case="foo">Foo</span>
  <span case="bar">Bar</span>
</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "switch-bb-pass"),
        });
        assertSuccess(ts, diags);
      });

      it(`case.bind - pass`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template switch.bind="true">
  <span case.bind="prop">Foo</span>
  <span case="bar">Bar</span>
</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "case-pass"),
        });
        assertSuccess(ts, diags);
      });

      it(`case.bind - fail`, async () => {
        const { ts, diags } = await compileFromEntry({
          html: `<template switch.bind="true">
  <span case.bind="prop">Foo</span>
  <span case="bar">Bar</span>
</template>`,
          markupFile: "view.html",
          isJs: lang.isJs,
          entrySource: entryWithUnknownProp(lang.isJs, "prop1"),
          preludeText: PRELUDE_TS, exprParser, attrParser,
          overlayBaseName: nextBase(lang.langKey, "case-fail"),
        });
        assertFailure(ts, diags, [/Property 'prop' does not exist on type '.*Foo.*'/]);
      });
    });
  });
}
