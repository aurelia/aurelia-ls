import { describe, expect, test } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { EmbeddedLanguageRegion } from "@aurelia-ls/semantic-runtime/embedded-languages";
import { validateEmbeddedLanguages } from "../../src/embedded-validation.js";

const settings = { styles: true, scripts: true };
const html = (text: string) => TextDocument.create("file:///template.html", "aurelia-html", 1, text);
function region(
  document: TextDocument,
  language: EmbeddedLanguageRegion["language"],
  context: EmbeddedLanguageRegion["context"],
  value: string,
  from = 0,
): EmbeddedLanguageRegion {
  const start = document.getText().indexOf(value, from);
  if (start < 0) throw new Error("Missing fixture region");
  const holes = [...value.matchAll(/\$\{[^}]+\}/gu)].map(match => ({
    start: match.index, end: match.index + match[0].length,
  }));
  return { language, context, start, end: start + value.length, value, holes };
}

describe("embedded validation on a template with a compiler-owned interpolation", () => {
  test("keeps a genuine colour error in the same style attribute and an independent script syntax error", () => {
    const style = "width: ${amount}%; border-color:#${hex}; color: #12zz34";
    const script = "const real = ;";
    const document = html(`<p title="ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬" style="${style}"></p>\r\n<script>\r\n${script}\r\n</script>`);
    const regions = [region(document, "css", "attribute", style), region(document, "javascript", "element", script)];
    const diagnostics = validateEmbeddedLanguages(document, regions, settings);
    expect(diagnostics.map(d => [d.source, document.getText(d.range)])).toEqual([["css", "#12zz34"], ["javascript", ";"]]);
    expect(diagnostics[0]).toMatchObject({ severity: 1, code: "css-propertyvalueexpected" });
    expect(diagnostics[1]).toMatchObject({ severity: 1, message: "Expression expected.", range: { start: { line: 2 } } });
    expect(validateEmbeddedLanguages(document, regions, { styles: false, scripts: true }).map(d => d.source)).toEqual(["javascript"]);
    expect(validateEmbeddedLanguages(document, regions, { styles: true, scripts: false, css: { validate: false } })).toEqual([]);
  });

  test("honours CSS lint settings and keeps dynamic selectors and declaration values out of diagnostic ranges", () => {
    const style = ".${className}{ width: ${size}px; madeup-property: red; }";
    const document = html(`<style>${style}</style>`);
    const regions = [region(document, "css", "element", style)];
    const diagnostics = validateEmbeddedLanguages(document, regions, { ...settings, css: { lint: { unknownProperties: "error" } } });
    expect(diagnostics.map(d => [d.severity, d.code, document.getText(d.range)])).toEqual([[1, "unknownProperties", "madeup-property"]]);
    expect(validateEmbeddedLanguages(document, regions, { ...settings, css: { lint: { unknownProperties: "ignore" } } })).toEqual([]);
  });

  test("treats consecutive holes, hex prefixes and units as one dynamic CSS token", () => {
    const value = "width: ${prefix}${suffix}%; color:#fff${alpha}; height:10.${size}em; background:#12zz34;";
    const doc = html(`<div style="${value}"></div>`);
    const diagnostics = validateEmbeddedLanguages(doc, [region(doc, "css", "attribute", value)], settings);
    expect(diagnostics.map(d => [d.code, doc.getText(d.range)])).toEqual([["css-propertyvalueexpected", "#12zz34"]]);
  });

  test("maps browser-decoded attribute diagnostics back across HTML entities and an astral character", () => {
    const raw = "width: ${w}%; content:&quot;ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬&quot;; color:#12zz34";
    const document = html(`<div\r\n  style='${raw}'></div>`);
    const source = region(document, "css", "attribute", raw);
    const value = raw.replaceAll("&quot;", '"');
    const offsets: number[] = [];
    for (let i = 0; i < raw.length; ++i) {
      offsets.push(i);
      if (raw.startsWith("&quot;", i)) i += "&quot;".length - 1;
    }
    offsets.push(raw.length);
    const [diagnostic] = validateEmbeddedLanguages(document, [{ ...source, value, offsets }], settings);
    expect(diagnostic).toBeDefined();
    expect(document.getText(diagnostic!.range)).toBe("#12zz34");
    expect(diagnostic!.range.start).toEqual(document.positionAt(source.start + raw.indexOf("#12zz34")));
  });

  test("preserves shared classic script scope and checks each module independently", () => {
    const global = "const value = 42;";
    const use = "value();";
    const module = "const value = 1;";
    const templateLiteral = 'const label = `hello ${name}`;';
    const doc = html(`<script>// @ts-check\n${global}\n</script><p onclick="${use}"></p><script type="module">${module}</script><script>${templateLiteral}</script>`);
    const regions = [
      region(doc, "javascript", "element", "// @ts-check\n" + global),
      region(doc, "javascript", "attribute", use),
      { ...region(doc, "javascript", "element", module), module: true },
      region(doc, "javascript", "element", templateLiteral),
    ];
    const diagnostics = validateEmbeddedLanguages(doc, regions, settings);
    expect(diagnostics).toHaveLength(1);
    expect(doc.getText(diagnostics[0]!.range)).toBe("value");
    expect(diagnostics[0]!.message).toContain("not callable");
  });

  test("preserves the dynamic type of a JS template literal while ignoring scope errors inside its Aurelia hole", () => {
    const script = '// @ts-check\nconst label = `hello ${name}`; if (label === "hello Joe") { document.title = label; }';
    const doc = html(`<script>${script}</script>`);
    expect(validateEmbeddedLanguages(doc, [region(doc, "javascript", "element", script)], settings)).toEqual([]);
  });

  test("an authored script binding cannot supply the type of an interpolated JS value", () => {
    const script = "// @ts-check\nconst __aureliaInterpolation = 3; const supplied = ${value}; supplied.load();";
    const doc = html(`<script>${script}</script>`);
    expect(validateEmbeddedLanguages(doc, [region(doc, "javascript", "element", script)], settings)).toEqual([]);
  });

  test("revalidates unchanged scripts when implicit compiler options change", () => {
    const script = '// @ts-check\nconst node = document.querySelector("p"); node.textContent;\nfunction mark(...args) {} class C { method(@mark x) {} }';
    const doc = html(`<script>${script}</script>`);
    const regions = [region(doc, "javascript", "element", script)];
    const errors = (strictNullChecks: boolean, experimentalDecorators: boolean) =>
      validateEmbeddedLanguages(doc, regions, { ...settings, javascript: { strictNullChecks, experimentalDecorators } }).map(d => String(d.message));
    expect(errors(true, true).some(m => m.includes("possibly 'null'"))).toBe(true);
    expect(errors(false, false).some(m => m.includes("possibly 'null'"))).toBe(false);
    expect(errors(false, false).some(m => m.includes("Decorators are not valid here"))).toBe(true);
    expect(errors(true, true).some(m => m.includes("Decorators are not valid here"))).toBe(false);
  });

  test("leaves HTML's ambient jQuery names open while preserving actual local and DOM faults", () => {
    const script = '// @ts-check\n$("p").hide(); jQuery(document); document.missingDomProperty; { const $=4; $(); }';
    const doc = html(`<script>${script}</script>`);
    const diagnostics = validateEmbeddedLanguages(doc, [region(doc, "javascript", "element", script)], settings);
    expect(diagnostics.map(d => [doc.getText(d.range), String(d.message).includes("not callable")])).toEqual([
      ["missingDomProperty", false], ["$", true],
    ]);
  });

  test("uses the host's actual HTML declaration library and invalidates it independently of document text", () => {
    const script = '// @ts-check\n$("p").hasClass("active"); $("p").hasClass(42);';
    const document = html(`<script>${script}</script>`);
    const regions = [region(document, "javascript", "element", script)];
    const declarations = (type: string) => `declare function $(selector: string): { hasClass(name: ${type}): boolean };`;
    const validate = (nativeHtmlScriptLibrary?: string) =>
      validateEmbeddedLanguages(document, regions, { ...settings, nativeHtmlScriptLibrary }).map(d => document.getText(d.range));
    expect(validate()).toEqual([]);
    expect(validate(declarations("string"))).toEqual(["42"]);
    expect(validate(declarations("number"))).toEqual(['"active"']);
    expect(validate()).toEqual([]);
  });

  test("maps an expected value at a generated attribute terminator to the authored end of the declaration", () => {
    const value = "width:${width}%; color:";
    const doc = html(`<div style="${value}"></div>`);
    const [diagnostic] = validateEmbeddedLanguages(doc, [region(doc, "css", "attribute", value)], settings);
    const end = doc.positionAt(doc.getText().indexOf('"></div>'));
    expect(diagnostic).toMatchObject({ code: "css-propertyvalueexpected", range: { start: end, end } });
  });
});
