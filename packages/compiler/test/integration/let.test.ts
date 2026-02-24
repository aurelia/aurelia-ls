import { describe, it } from "vitest";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.js";
import { PRELUDE_TS } from "../../out/prelude.js";
import { getExpressionParser } from "../../out/parsing/expression-parser.js";
import { DEFAULT_SYNTAX } from "../../out/parsing/attribute-parser.js";

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-let-${String(++seq).padStart(3, "0")}-${slug}`;

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
function entryWithXOnVm(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('x', 'string', isTs)}
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
function entryWithPeople(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('people', '{ name: string }[]', isTs)}
}
`;
}

for (const lang of langs) {
  describe(`type-checking / let — ${lang.name}`, () => {
    it(`basic pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<let a.bind="person.name"></let>\n\${a.toUpperCase()}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithPerson(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "basic-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`basic fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<let a.bind="person.name"></let>\n\${a.nonExistent}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithPerson(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "basic-fail"),
      });
      assertFailure(ts, diags, [/Property 'nonExistent' does not exist on type 'string'/]);
    });

    it(`multiple lets & override`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<let v.bind="1"></let>\n<let v.bind="'hi'"></let>\n\${v.toUpperCase()}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryEmpty(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "override"),
      });
      assertSuccess(ts, diags);
    });

    it(`to-binding-context overlay + collision (pass)`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<let x.bind="1" to-binding-context></let>\n\${x.toFixed(2)}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithXOnVm(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "tobc-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`command variants (to-view/two-way)`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<let a.to-view="person.name"></let>\n<let b.two-way="'ok'"></let>\n\${a.toUpperCase()} \${b.toUpperCase()}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithPerson(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "cmd-variants"),
      });
      assertSuccess(ts, diags);
    });

    it(`duplicate declarations in one <let> (last wins)`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<let a.bind="1" a.one-time="'hi'"></let>\n\${a.toUpperCase()}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryEmpty(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "dup-decls"),
      });
      assertSuccess(ts, diags);
    });

    it(`visibility: inside repeat (pass)`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="p of people">
  <let upper.bind="p.name.toUpperCase()"></let>
  \${upper}
</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithPeople(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "let-in-repeat-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`visibility: let inside repeat does not leak (fail)`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="i of 3"><let a.bind="i"></let></template>\n\${a}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryEmpty(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "let-in-repeat-fail"),
      });
      assertFailure(ts, diags, [/Property 'a' does not exist on type '.*Foo.*'/]);
    });

    it(`visibility: before if.bind is visible inside branch (pass)`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<let v.bind="person.name"></let>\n<template if.bind="true">\${v.toUpperCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithPerson(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "let-before-if"),
      });
      assertSuccess(ts, diags);
    });

    it(`visibility: let inside if-branch does not leak (fail)`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template if.bind="true"><let z.bind="1"></let></template>\n\${z}`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryEmpty(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "let-in-if-fail"),
      });
      assertFailure(ts, diags, [/Property 'z' does not exist on type '.*Foo.*'/]);
    });
  });
}
