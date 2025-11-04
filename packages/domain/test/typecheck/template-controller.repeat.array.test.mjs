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

function entryForPrimitiveArray(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'string[]', isTs)}
}
`;
}

function entryForObjectArray(isJs, withX = true) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Bar[]', isTs)}
}
class Bar { ${prop(withX ? 'x' : 'x1', 'string', isTs)} }
`;
}

function entryForTwoObjects(isJs, ok = true) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop1', 'Bar[]', isTs)}
  ${prop('prop2', ok ? 'Baz[]' : 'Baz[]', isTs)}
}
class Bar { ${prop('x', 'string', isTs)} }
class Baz { ${prop(ok ? 'y' : 'y1', 'number', isTs)} }
`;
}

function entryForNestedNodes(isJs) {
  const isTs = !isJs;
  const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('nodes', 'Node[]', isTs)}
}
class Node { ${prop('x', 'number', isTs)} ${prop('children', 'Node[]', isTs)} }
`;
}

for (const lang of langs) {
  describe(`type-checking / repeat array — ${lang.name}`, () => {

    it(`template controller - repeat primitive array - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.toLowerCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveArray(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat primitive array - pass - with value-converter`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop | identity">\${item}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveArray(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-vc-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat primitive array - fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.tolowercase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveArray(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-misspell-fail"),
      });
      assertFailure(ts, diags, [/Property 'tolowercase' does not exist on type 'string'/]);
    });

    it(`template controller - repeat from method call - pass`, async () => {
      const isTs = !lang.isJs;
      const decorator = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
      const entrySource = `
${decorator}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('getItems', '() => string[]', isTs)} // purely for type on TS side
}
`;
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of getItems()">\${item.toLowerCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "method-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - multiple repeats - primitive arrays - same declaration - pass`, async () => {
      const entrySource = `
${!lang.isJs ? "import { customElement } from '@aurelia/runtime-html';" : ""}
import template from './view.html';
${!lang.isJs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop1', 'string[]', !lang.isJs)}
  ${prop('prop2', 'number[]', !lang.isJs)}
}
`;
      const html =
        `<template repeat.for="item of prop1">\${item.toLowerCase()}</template>` +
        `<template repeat.for="item of prop2">\${item.toExponential(2)}</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-prim-same-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - multiple repeats - primitive arrays - different declarations - pass`, async () => {
      const entrySource = `
${!lang.isJs ? "import { customElement } from '@aurelia/runtime-html';" : ""}
import template from './view.html';
${!lang.isJs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop1', 'string[]', !lang.isJs)}
  ${prop('prop2', 'number[]', !lang.isJs)}
}
`;
      const html =
        `<template repeat.for="item1 of prop1">\${item1.toLowerCase()}</template>` +
        `<template repeat.for="item2 of prop2">\${item2.toExponential(2)}</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-prim-diff-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - multiple repeats - primitive arrays - fail - incorrect declaration`, async () => {
      const entrySource = `
${!lang.isJs ? "import { customElement } from '@aurelia/runtime-html';" : ""}
import template from './view.html';
${!lang.isJs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop1', 'string[]', !lang.isJs)}
  ${prop('prop2', 'number[]', !lang.isJs)}
}
`;
      const html =
        `<template repeat.for="item1 of prop1">\${item1.toLowerCase()}</template>` +
        `<template repeat.for="item2 of prop2">\${item.toExponential(2)}</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-prim-wrong-decl-fail"),
      });
      assertFailure(ts, diags, [/Property 'item' does not exist/]);
    });

    it(`template controller - multiple repeats - primitive arrays - fail - incorrect usage`, async () => {
      const entrySource = `
${!lang.isJs ? "import { customElement } from '@aurelia/runtime-html';" : ""}
import template from './view.html';
${!lang.isJs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop1', 'string[]', !lang.isJs)}
  ${prop('prop2', 'number[]', !lang.isJs)}
}
`;
      const html =
        `<template repeat.for="item1 of prop1">\${item1.toLowerCase()}</template>` +
        `<template repeat.for="item2 of prop2">\${item2.toexponential(2)}</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-prim-wrong-usage-fail"),
      });
      assertFailure(ts, diags, [/Property 'toexponential' does not exist on type 'number'/]);
    });

    it(`template controller - repeat object[] - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.x.toLowerCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectArray(lang.isJs, /*withX*/ true),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat object[] - fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="item of prop">\${item.x.toLowerCase()}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForObjectArray(lang.isJs, /*withX*/ false),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-fail"),
      });
      assertFailure(ts, diags, [/Property 'x' does not exist on type 'Bar'/]);
    });

    it(`template controller - multiple repeats - object arrays - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html:
          `<template repeat.for="item of prop1">\${item.x.toLowerCase()}</template>` +
          `<template repeat.for="item of prop2">\${item.y.toExponential(2)}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForTwoObjects(lang.isJs, /*ok*/ true),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-obj-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - multiple repeats - object arrays - fail`, async () => {
      const { ts, diags } = await compileFromEntry({
        html:
          `<template repeat.for="item of prop1">\${item.x.toLowerCase()}</template>` +
          `<template repeat.for="item of prop2">\${item.y.toExponential(2)}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForTwoObjects(lang.isJs, /*ok*/ false),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-obj-fail"),
      });
      assertFailure(ts, diags, [/Property 'y' does not exist on type 'Baz'/]);
    });

    it(`template controller - nested repeats - pass`, async () => {
      const html =
        `<template repeat.for="node of nodes">\${node.x}` +
        `  <template repeat.for="child of node.children">\${child.x}</template>` +
        `</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForNestedNodes(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "nested-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - nested repeats - fail - incorrect declaration`, async () => {
      const html =
        `<template repeat.for="node of nodes">\${node.x}` +
        `  <template repeat.for="child of node1.children">\${child.x}</template>` +
        `</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForNestedNodes(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "nested-wrong-decl-fail"),
      });
      assertFailure(ts, diags, [/Property 'node1' does not exist/]);
    });

    it(`template controller - nested repeats - fail - incorrect usage`, async () => {
      const html =
        `<template repeat.for="node of nodes">\${node.x}` +
        `  <template repeat.for="child of node.children">\${child.y}</template>` +
        `</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForNestedNodes(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "nested-wrong-usage-fail"),
      });
      assertFailure(ts, diags, [/Property 'y' does not exist on type 'Node'/]);
    });

    it(`template controller - repeat - contextual properties - pass`, async () => {
      const html =
        `<template repeat.for="item of prop">` +
        `\${$index} - \${item.toLowerCase()} - \${$first} - \${$last} - \${$even} - \${$odd} - \${$length}` +
        `</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveArray(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "ctx-props-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat - contextual properties - $this - pass`, async () => {
      const html =
        `<template repeat.for="item of prop">` +
        `\${$this.$index} - \${item.toLowerCase()} - \${$this.$first} - \${$this.$last} - \${$this.$even} - \${$this.$odd} - \${$this.$length}` +
        `</template>`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryForPrimitiveArray(lang.isJs),
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "ctx-props-this-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - nested repeat - contextual via $parent - pass`, async () => {
      const html = `
        <template repeat.for="item1 of prop1">
          <template repeat.for="item2 of prop2">
            \${$parent.$index} - \${item1.toLowerCase()} - \${$parent.$first} - \${$parent.$last} - \${$parent.$even} - \${$parent.$odd} - \${$parent.$length}
            \${$index} - \${item2.toLowerCase()} - \${$first} - \${$last} - \${$even} - \${$odd} - \${$length}
          </template>
        </template>`;
      const entrySource = `
${!lang.isJs ? "import { customElement } from '@aurelia/runtime-html';" : ""}
import template from './view.html';
${!lang.isJs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop1', 'string[]', !lang.isJs)}
  ${prop('prop2', 'string[]', !lang.isJs)}
}
`;
      const { ts, diags } = await compileFromEntry({
        html,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "ctx-parent-pass"),
      });
      assertSuccess(ts, diags);
    });

  });
}
