import { describe, it } from "vitest";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.js";
import { PRELUDE_TS } from "../../out/prelude.js";
import { getExpressionParser } from "../../out/parsing/expression-parser.js";
import { DEFAULT_SYNTAX } from "../../out/parsing/attribute-parser.js";

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

// ---------------------------------------------------------------------------
// Entry helpers: array
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Entry helpers: map
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Entry helpers: object (record iteration)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Entry helpers: range
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Entry helpers: set
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Entry helpers: misc (FileList, kitchen sink)
// ---------------------------------------------------------------------------

function entryWithFiles(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('files', 'FileList', isTs)}
}
`;
}
function entryKitchenSink(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Map<string, Set<number>>[]', isTs)}
}
`;
}

// ===========================================================================
// Tests: repeat — array
// ===========================================================================

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

// ===========================================================================
// Tests: repeat — map
// ===========================================================================

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

// ===========================================================================
// Tests: repeat — object (record iteration via keys/values)
// ===========================================================================

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

// ===========================================================================
// Tests: repeat — range (numeric)
// ===========================================================================

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

// ===========================================================================
// Tests: repeat — set
// ===========================================================================

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

// ===========================================================================
// Tests: repeat — misc (FileList, kitchen sink)
// ===========================================================================

for (const lang of langs) {
  describe(`type-checking / template-controller.repeat (misc) — ${lang.name}`, () => {
    it(`repeat FileList - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="file of files">\${file.name}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithFiles(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "filelist-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`repeat - kitchen sink - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="map of prop">
  <template repeat.for="[key, value] of map">
    \${key.toUpperCase()}
    <template repeat.for="item of value">
      <template repeat.for="i of item">\${i.toExponential(2)}</template>
    </template>
  </template>
</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryKitchenSink(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "kitchen-sink"),
      });
      assertSuccess(ts, diags);
    });
  });
}
