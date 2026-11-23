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
    const document = html(`<p title="ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬" style="${style}"></p>\r\n<script>\r\n${script}\r\n</script>`);
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
    const raw = "width: ${w}%; content:&quot;ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬&quot;; color:#12zz34";
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

  test("maps an expected value at a generated attribute terminator to the authored end of the declaration", () => {
    const value = "width:${width}%; color:";
    const doc = html(`<div style="${value}"></div>`);
    const [diagnostic] = validateEmbeddedLanguages(doc, [region(doc, "css", "attribute", value)], settings);
    const end = doc.positionAt(doc.getText().indexOf('"></div>'));
    expect(diagnostic).toMatchObject({ code: "css-propertyvalueexpected", range: { start: end, end } });
  });
});
