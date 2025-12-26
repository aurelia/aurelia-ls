import test, { describe, it } from "node:test";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.mjs";

const compilerIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(compilerIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-focus-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

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
