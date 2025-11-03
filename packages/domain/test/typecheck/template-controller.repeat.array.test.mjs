import test, { describe, it } from "node:test";
import { compileAndCheckFast, assertSuccess, assertFailure } from "./_helpers/overlay-ls.mjs";

const domainIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(domainIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

// unique overlay filename per test (helps when Node runs tests in parallel)
let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true }, // same TTC path as JS
];

for (const lang of langs) {
  describe(`type-checking / repeat array — ${lang.name}`, () => {

    it(`template controller - repeat primitive array - pass`, async () => {
      const { ts, diags } = await compileAndCheckFast({
        html: `<template repeat.for="item of prop">\${item.toLowerCase()}</template>`,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop: string[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat primitive array - pass - with value-converter`, async () => {
      const { ts, diags } = await compileAndCheckFast({
        html: `<template repeat.for="item of prop | identity">\${item}</template>`,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop: string[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-vc-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat primitive array - fail`, async () => {
      const { ts, diags } = await compileAndCheckFast({
        html: `<template repeat.for="item of prop">\${item.tolowercase()}</template>`,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop: string[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "prim-misspell-fail"),
      });
      assertFailure(ts, diags, [/Property 'tolowercase' does not exist on type 'string'/]);
    });

    it(`template controller - repeat from method call - pass`, async () => {
      const { ts, diags } = await compileAndCheckFast({
        html: `<template repeat.for="item of getItems()">\${item.toLowerCase()}</template>`,
        isJs: lang.isJs,
        vmTypeExpr: `({ getItems(): string[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "method-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - multiple repeats - primitive arrays - same declaration - pass`, async () => {
      const html =
        `<template repeat.for="item of prop1">\${item.toLowerCase()}</template>` +
        `<template repeat.for="item of prop2">\${item.toExponential(2)}</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop1: string[]; prop2: number[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-prim-same-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - multiple repeats - primitive arrays - different declarations - pass`, async () => {
      const html =
        `<template repeat.for="item1 of prop1">\${item1.toLowerCase()}</template>` +
        `<template repeat.for="item2 of prop2">\${item2.toExponential(2)}</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop1: string[]; prop2: number[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-prim-diff-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - multiple repeats - primitive arrays - fail - incorrect declaration`, async () => {
      const html =
        `<template repeat.for="item1 of prop1">\${item1.toLowerCase()}</template>` +
        `<template repeat.for="item2 of prop2">\${item.toExponential(2)}</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop1: string[]; prop2: number[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-prim-wrong-decl-fail"),
      });
      assertFailure(ts, diags, [/Property 'item' does not exist/]);
    });

    it(`template controller - multiple repeats - primitive arrays - fail - incorrect usage`, async () => {
      const html =
        `<template repeat.for="item1 of prop1">\${item1.toLowerCase()}</template>` +
        `<template repeat.for="item2 of prop2">\${item2.toexponential(2)}</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop1: string[]; prop2: number[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-prim-wrong-usage-fail"),
      });
      assertFailure(ts, diags, [/Property 'toexponential' does not exist on type 'number'/]);
    });

    it(`template controller - repeat object[] - pass`, async () => {
      const typesText = `type Bar = { x: string };`;
      const { ts, diags } = await compileAndCheckFast({
        html: `<template repeat.for="item of prop">\${item.x.toLowerCase()}</template>`,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop: Bar[] })`,
        preludeText: PRELUDE_TS,
        typesText,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - repeat object[] - fail`, async () => {
      const typesText = `type Bar = { x1: string };`;
      const { ts, diags } = await compileAndCheckFast({
        html: `<template repeat.for="item of prop">\${item.x.toLowerCase()}</template>`,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop: Bar[] })`,
        preludeText: PRELUDE_TS,
        typesText,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "obj-fail"),
      });
      assertFailure(ts, diags, [/Property 'x' does not exist on type 'Bar'/]);
    });

    it(`template controller - multiple repeats - object arrays - pass`, async () => {
      const typesText = `type Bar = { x: string }; type Baz = { y: number };`;
      const html =
        `<template repeat.for="item of prop1">\${item.x.toLowerCase()}</template>` +
        `<template repeat.for="item of prop2">\${item.y.toExponential(2)}</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop1: Bar[]; prop2: Baz[] })`,
        preludeText: PRELUDE_TS,
        typesText,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-obj-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - multiple repeats - object arrays - fail`, async () => {
      const typesText = `type Bar = { x: string }; type Baz = { y1: number };`;
      const html =
        `<template repeat.for="item of prop1">\${item.x.toLowerCase()}</template>` +
        `<template repeat.for="item of prop2">\${item.y.toExponential(2)}</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop1: Bar[]; prop2: Baz[] })`,
        preludeText: PRELUDE_TS,
        typesText,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "multi-obj-fail"),
      });
      assertFailure(ts, diags, [/Property 'y' does not exist on type 'Baz'/]);
    });

    it(`template controller - nested repeats - pass`, async () => {
      const typesText = `type Node = { x: number; children: Node[] };`;
      const html =
        `<template repeat.for="node of nodes">\${node.x}` +
        `  <template repeat.for="child of node.children">\${child.x}</template>` +
        `</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ nodes: Node[] })`,
        preludeText: PRELUDE_TS,
        typesText,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "nested-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`template controller - nested repeats - fail - incorrect declaration`, async () => {
      const typesText = `type Node = { x: number; children: Node[] };`;
      const html =
        `<template repeat.for="node of nodes">\${node.x}` +
        `  <template repeat.for="child of node1.children">\${child.x}</template>` +
        `</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ nodes: Node[] })`,
        preludeText: PRELUDE_TS,
        typesText,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "nested-wrong-decl-fail"),
      });
      assertFailure(ts, diags, [/Property 'node1' does not exist/]);
    });

    it(`template controller - nested repeats - fail - incorrect usage`, async () => {
      const typesText = `type Node = { x: number; children: Node[] };`;
      const html =
        `<template repeat.for="node of nodes">\${node.x}` +
        `  <template repeat.for="child of node.children">\${child.y}</template>` +
        `</template>`;
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ nodes: Node[] })`,
        preludeText: PRELUDE_TS,
        typesText,
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
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop: string[] })`,
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
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop: string[] })`,
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
      const { ts, diags } = await compileAndCheckFast({
        html,
        isJs: lang.isJs,
        vmTypeExpr: `({ prop1: string[]; prop2: string[] })`,
        preludeText: PRELUDE_TS,
        exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "ctx-parent-pass"),
      });
      assertSuccess(ts, diags);
    });

  });
}
