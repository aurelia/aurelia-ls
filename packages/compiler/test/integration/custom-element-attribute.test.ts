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
// Entry helpers: focus
// ---------------------------------------------------------------------------

function entryWithFlag(isJs, className, propName = "isFocused") {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'app', template })" : ""}
export class ${className} {
  ${prop(propName, "boolean", isTs)}
}
`;
}

// ---------------------------------------------------------------------------
// Entry helpers: compose
// ---------------------------------------------------------------------------

function entryWithVm(isJs, className, vmProp = "vm") {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'app', template })" : ""}
export class ${className} {
  ${prop(vmProp, "any", isTs)}
}
`;
}

// ---------------------------------------------------------------------------
// Tests: custom-attribute.focus
// ---------------------------------------------------------------------------

for (const lang of langs) {
  describe(`type-checking / custom-attribute.focus - ${lang.name}`, () => {
    const className = "Foo";

    it("focus.bind overlays to VM prop (pass)", async () => {
      const { ts, diags } = await compileFromEntry({
        html: "<div focus.bind='isFocused'></div>",
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithFlag(lang.isJs, className, "isFocused"),
        className,
        overlayBaseName: nextBase(lang.langKey, "focus-pass"),
        exprParser,
        attrParser,
        preludeText: PRELUDE_TS,
      });
      assertSuccess(ts, diags);
    });

    it("focus.bind missing on VM (fail)", async () => {
      const { ts, diags } = await compileFromEntry({
        html: "<div focus.bind='isFocused'></div>",
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithFlag(lang.isJs, className, "other"),
        className,
        overlayBaseName: nextBase(lang.langKey, "focus-fail"),
        exprParser,
        attrParser,
        preludeText: PRELUDE_TS,
      });
      assertFailure(ts, diags, [/Property 'isFocused' does not exist/]);
    });
  });
}

// ---------------------------------------------------------------------------
// Tests: custom-element.compose
// ---------------------------------------------------------------------------

for (const lang of langs) {
  describe(`type-checking / custom-element.compose - ${lang.name}`, () => {
    const className = "Foo";

    it("subject.bind overlays to VM prop (pass)", async () => {
      const { ts, diags } = await compileFromEntry({
        html: "<au-compose subject.bind='vm'></au-compose>",
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithVm(lang.isJs, className, "vm"),
        className,
        overlayBaseName: nextBase(lang.langKey, "subject-pass"),
        exprParser,
        attrParser,
        preludeText: PRELUDE_TS,
      });
      assertSuccess(ts, diags);
    });

    it("subject.bind missing on VM (fail)", async () => {
      const { ts, diags } = await compileFromEntry({
        html: "<au-compose subject.bind='vm'></au-compose>",
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithVm(lang.isJs, className, "other"),
        className,
        overlayBaseName: nextBase(lang.langKey, "subject-fail"),
        exprParser,
        attrParser,
        preludeText: PRELUDE_TS,
      });
      assertFailure(ts, diags, [/Property 'vm' does not exist/]);
    });
  });
}
