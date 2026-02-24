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
// Entry helpers: basic (if, switch/case)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Entry helpers: promise
// ---------------------------------------------------------------------------

function entryPromiseOfString(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Promise<string>', isTs)}
}
`;
}
function entryString(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'string', isTs)}
}
`;
}
function entryTwoPromises(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop1', 'Promise<string>', isTs)}

  ${prop('prop2', 'Promise<number>', isTs)}
}
`;
}

// ---------------------------------------------------------------------------
// Entry helpers: with
// ---------------------------------------------------------------------------

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

// ===========================================================================
// Tests: basic (if, switch/case)
// ===========================================================================

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

// ===========================================================================
// Tests: promise
// ===========================================================================

const promiseSyntaxes = ['promise.bind', 'promise'];
const thenSyntaxes = ['then.from-view', 'then'];
const catchSyntaxes = ['catch.from-view', 'catch'];

for (const lang of langs) {
  describe(`type-checking / template-controller.promise — ${lang.name}`, () => {
    for (const p of promiseSyntaxes) {
      for (const t of thenSyntaxes) {
        for (const c of catchSyntaxes) {
          const suffix = `${p.replace('.', '-')}_${t.replace('.', '-')}_${c.replace('.', '-')}`;

          it(`pass — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryPromiseOfString(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `pass-${suffix}`),
            });
            assertSuccess(ts, diags);
          });

          it(`fail — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop">
  <span ${t}="data">\${data.touppercase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryPromiseOfString(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `fail-${suffix}`),
            });
            assertFailure(ts, diags, [/Property 'touppercase' does not exist on type 'string'/]);
          });

          it(`non-promise - pass — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryString(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `nonpromise-pass-${suffix}`),
            });
            assertSuccess(ts, diags);
          });

          it(`non-promise - fail — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop">
  <span ${t}="data">\${data.touppercase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryString(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `nonpromise-fail-${suffix}`),
            });
            assertFailure(ts, diags, [/Property 'touppercase' does not exist on type 'string'/]);
          });

          it(`multiple promises - same then/catch declaration - pass — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop1">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>

<template ${p}="prop2">
  <span ${t}="data">\${data.toExponential(2)}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryTwoPromises(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `multi-same-${suffix}`),
            });
            assertSuccess(ts, diags);
          });

          it(`multiple promises - different then/catch declaration - pass — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop1">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>

<template ${p}="prop2">
  <span ${t}="data1">\${data1.toExponential(2)}</span>
  <span ${c}="error1">\${error1}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryTwoPromises(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `multi-diff-${suffix}`),
            });
            assertSuccess(ts, diags);
          });

          it(`multiple promises - fail — mismatched usage — ${p} / ${t} / ${c}`, async () => {
            const { ts, diags } = await compileFromEntry({
              html: `<template ${p}="prop1">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>

<template ${p}="prop2">
  <span ${t}="data">\${data.toUpperCase()}</span>
  <span ${c}="error">\${error}</span>
  <span pending>loading...</span>
</template>`,
              markupFile: "view.html",
              isJs: lang.isJs,
              entrySource: entryTwoPromises(lang.isJs),
              preludeText: PRELUDE_TS, exprParser, attrParser,
              overlayBaseName: nextBase(lang.langKey, `multi-fail-${suffix}`),
            });
            assertFailure(ts, diags, [/Property 'toUpperCase' does not exist on type 'number'/]);
          });
        }
      }
    }
  });
}

// ===========================================================================
// Tests: with
// ===========================================================================

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
