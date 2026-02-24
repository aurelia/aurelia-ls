import { describe, it, expect } from "vitest";
import { parseFragment } from "parse5";
import {
  extractMeta,
  extractTemplateMeta,
  stripMetaFromHtml,
} from "../../out/analysis/10-lower/meta-extraction.js";
import { resolveSourceFile } from "../../out/model/source.js";

function extract(html: string) {
  const p5 = parseFragment(html, { sourceCodeLocationInfo: true });
  const source = resolveSourceFile("test.html");
  return extractMeta(p5, source, html);
}

describe("Meta Extraction", () => {
  describe("<import> elements", () => {
    it("extracts simple import", () => {
      const html = `<import from="./foo">`;
      const { meta } = extract(html);

      expect(meta.imports).toHaveLength(1);
      expect(meta.imports[0]!.kind).toBe("import");
      expect(meta.imports[0]!.from.value).toBe("./foo");
      expect(meta.imports[0]!.defaultAlias).toBeNull();
      expect(meta.imports[0]!.namedAliases).toHaveLength(0);
    });

    it("extracts import with default alias", () => {
      const html = `<import from="./foo" as="bar">`;
      const { meta } = extract(html);

      expect(meta.imports).toHaveLength(1);
      expect(meta.imports[0]!.from.value).toBe("./foo");
      expect(meta.imports[0]!.defaultAlias?.value).toBe("bar");
    });

    it("extracts import with named alias", () => {
      const html = `<import from="./converters" DateFormat.as="df">`;
      const { meta } = extract(html);

      expect(meta.imports).toHaveLength(1);
      expect(meta.imports[0]!.namedAliases).toHaveLength(1);
      expect(meta.imports[0]!.namedAliases[0]!.exportName.value).toBe("DateFormat");
      expect(meta.imports[0]!.namedAliases[0]!.alias.value).toBe("df");
    });

    it("extracts import with multiple named aliases", () => {
      const html = `<import from="./utils" Foo.as="foo" Bar.as="bar">`;
      const { meta } = extract(html);

      expect(meta.imports).toHaveLength(1);
      expect(meta.imports[0]!.namedAliases).toHaveLength(2);
      expect(meta.imports[0]!.namedAliases[0]!.exportName.value).toBe("Foo");
      expect(meta.imports[0]!.namedAliases[1]!.exportName.value).toBe("Bar");
    });

    it("extracts multiple imports", () => {
      const html = `<import from="./a"><import from="./b">`;
      const { meta } = extract(html);

      expect(meta.imports).toHaveLength(2);
      expect(meta.imports[0]!.from.value).toBe("./a");
      expect(meta.imports[1]!.from.value).toBe("./b");
    });

    it("handles <require> as legacy alias", () => {
      const html = `<require from="./legacy">`;
      const { meta } = extract(html);

      expect(meta.imports).toHaveLength(1);
      expect(meta.imports[0]!.kind).toBe("require");
      expect(meta.imports[0]!.from.value).toBe("./legacy");
    });

    it("preserves provenance for from value", () => {
      const html = `<import from="./my-component">`;
      const { meta } = extract(html);

      const fromLoc = meta.imports[0]!.from.loc;
      expect(html.slice(fromLoc.start, fromLoc.end)).toBe("./my-component");
    });

    it("preserves provenance for named alias export name", () => {
      const html = `<import from="./x" MyExport.as="alias">`;
      const { meta } = extract(html);

      const exportNameLoc = meta.imports[0]!.namedAliases[0]!.exportName.loc;
      expect(html.slice(exportNameLoc.start, exportNameLoc.end)).toBe("MyExport");
    });
  });

  describe("<bindable> elements", () => {
    it("extracts simple bindable", () => {
      const html = `<bindable name="value">`;
      const { meta } = extract(html);

      expect(meta.bindables).toHaveLength(1);
      expect(meta.bindables[0]!.name.value).toBe("value");
      expect(meta.bindables[0]!.mode).toBeNull();
      expect(meta.bindables[0]!.attribute).toBeNull();
    });

    it("extracts bindable with mode", () => {
      const html = `<bindable name="items" mode="two-way">`;
      const { meta } = extract(html);

      expect(meta.bindables[0]!.name.value).toBe("items");
      expect(meta.bindables[0]!.mode?.value).toBe("two-way");
    });

    it("extracts bindable with attribute", () => {
      const html = `<bindable name="selectedItem" attribute="selected-item">`;
      const { meta } = extract(html);

      expect(meta.bindables[0]!.name.value).toBe("selectedItem");
      expect(meta.bindables[0]!.attribute?.value).toBe("selected-item");
    });

    it("extracts multiple bindables", () => {
      const html = `<bindable name="a"><bindable name="b">`;
      const { meta } = extract(html);

      expect(meta.bindables).toHaveLength(2);
      expect(meta.bindables[0]!.name.value).toBe("a");
      expect(meta.bindables[1]!.name.value).toBe("b");
    });

    it("preserves provenance for name value", () => {
      const html = `<bindable name="myProperty">`;
      const { meta } = extract(html);

      const nameLoc = meta.bindables[0]!.name.loc;
      expect(html.slice(nameLoc.start, nameLoc.end)).toBe("myProperty");
    });
  });

  describe("<use-shadow-dom> elements", () => {
    it("extracts shadow dom with default mode", () => {
      const html = `<use-shadow-dom>`;
      const { meta } = extract(html);

      expect(meta.shadowDom).not.toBeNull();
      expect(meta.shadowDom!.mode.value).toBe("open");
    });

    it("extracts shadow dom with explicit open mode", () => {
      const html = `<use-shadow-dom mode="open">`;
      const { meta } = extract(html);

      expect(meta.shadowDom!.mode.value).toBe("open");
    });

    it("extracts shadow dom with closed mode", () => {
      const html = `<use-shadow-dom mode="closed">`;
      const { meta } = extract(html);

      expect(meta.shadowDom!.mode.value).toBe("closed");
    });
  });

  describe("<containerless> elements", () => {
    it("extracts containerless element", () => {
      const html = `<containerless>`;
      const { meta } = extract(html);

      expect(meta.containerless).not.toBeNull();
      expect(meta.containerless!.elementLoc.start).toBe(0);
    });
  });

  describe("<capture> elements", () => {
    it("extracts capture element", () => {
      const html = `<capture>`;
      const { meta } = extract(html);

      expect(meta.capture).not.toBeNull();
    });
  });

  describe("<alias> elements", () => {
    it("extracts single alias", () => {
      const html = `<alias name="my-alias">`;
      const { meta } = extract(html);

      expect(meta.aliases).toHaveLength(1);
      expect(meta.aliases[0]!.names).toHaveLength(1);
      expect(meta.aliases[0]!.names[0]!.value).toBe("my-alias");
    });

    it("extracts comma-separated aliases", () => {
      const html = `<alias name="foo, bar, baz">`;
      const { meta } = extract(html);

      expect(meta.aliases[0]!.names).toHaveLength(3);
      expect(meta.aliases[0]!.names[0]!.value).toBe("foo");
      expect(meta.aliases[0]!.names[1]!.value).toBe("bar");
      expect(meta.aliases[0]!.names[2]!.value).toBe("baz");
    });

    it("preserves provenance for each alias name", () => {
      const html = `<alias name="foo, bar">`;
      const { meta } = extract(html);

      const fooLoc = meta.aliases[0]!.names[0]!.loc;
      const barLoc = meta.aliases[0]!.names[1]!.loc;
      expect(html.slice(fooLoc.start, fooLoc.end)).toBe("foo");
      expect(html.slice(barLoc.start, barLoc.end)).toBe("bar");
    });
  });

  describe("<slot> detection", () => {
    it("detects slot element", () => {
      const html = `<div><slot></slot></div>`;
      const { meta } = extract(html);

      expect(meta.hasSlot).toBe(true);
    });

    it("no slot when absent", () => {
      const html = `<div>content</div>`;
      const { meta } = extract(html);

      expect(meta.hasSlot).toBe(false);
    });
  });

  describe("template attribute form", () => {
    it("extracts containerless from template attribute", () => {
      const html = `<template containerless><div></div></template>`;
      const { meta } = extract(html);

      expect(meta.containerless).not.toBeNull();
    });

    it("extracts use-shadow-dom from template attribute", () => {
      const html = `<template use-shadow-dom><div></div></template>`;
      const { meta } = extract(html);

      expect(meta.shadowDom).not.toBeNull();
      expect(meta.shadowDom!.mode.value).toBe("open");
    });

    it("extracts use-shadow-dom=closed from template attribute", () => {
      const html = `<template use-shadow-dom="closed"><div></div></template>`;
      const { meta } = extract(html);

      expect(meta.shadowDom!.mode.value).toBe("closed");
    });

    it("extracts bindable from template attribute", () => {
      const html = `<template bindable="firstName, lastName"><div></div></template>`;
      const { meta } = extract(html);

      expect(meta.bindables).toHaveLength(2);
      expect(meta.bindables[0]!.name.value).toBe("firstName");
      expect(meta.bindables[1]!.name.value).toBe("lastName");
    });

    it("extracts alias from template attribute", () => {
      const html = `<template alias="foo, bar"><div></div></template>`;
      const { meta } = extract(html);

      expect(meta.aliases).toHaveLength(1);
      expect(meta.aliases[0]!.names).toHaveLength(2);
    });
  });

  describe("remove ranges", () => {
    it("collects ranges for import elements", () => {
      const html = `<import from="./foo"><div>content</div>`;
      const { removeRanges } = extract(html);

      expect(removeRanges.length).toBeGreaterThan(0);
    });

    it("collects ranges for template meta attributes", () => {
      const html = `<template containerless><div></div></template>`;
      const { removeRanges } = extract(html);

      expect(removeRanges.length).toBeGreaterThan(0);
    });
  });

  describe("stripMetaFromHtml", () => {
    it("removes import elements", () => {
      const html = `<import from="./foo"><div>content</div>`;
      const { removeRanges } = extract(html);
      const stripped = stripMetaFromHtml(html, removeRanges);

      expect(stripped).toBe("<div>content</div>");
    });

    it("removes multiple meta elements", () => {
      const html = `<import from="./a"><bindable name="x"><div>content</div>`;
      const { removeRanges } = extract(html);
      const stripped = stripMetaFromHtml(html, removeRanges);

      expect(stripped).toBe("<div>content</div>");
    });

    it("preserves non-meta content", () => {
      const html = `<div><span>text</span></div>`;
      const { removeRanges } = extract(html);
      const stripped = stripMetaFromHtml(html, removeRanges);

      expect(stripped).toBe(html);
    });

    it("handles import with end tag", () => {
      const html = `<import from="./foo"></import><div>content</div>`;
      const { removeRanges } = extract(html);
      const stripped = stripMetaFromHtml(html, removeRanges);

      expect(stripped).toBe("<div>content</div>");
    });
  });

  describe("skips template as-custom-element", () => {
    it("ignores imports inside local element definitions", () => {
      const html = `<import from="./global"><template as-custom-element="local"><import from="./local"></template>`;
      const { meta } = extract(html);

      // Should only find the global import, not the one inside as-custom-element
      expect(meta.imports).toHaveLength(1);
      expect(meta.imports[0]!.from.value).toBe("./global");
    });

    it("can include local element roots when explicitly requested", () => {
      const html = `<template as-custom-element="local-card" containerless><bindable name="value"></template>`;
      const meta = extractTemplateMeta(html, "test.html", { includeLocalTemplateRoots: true });

      expect(meta.bindables).toHaveLength(1);
      expect(meta.bindables[0]!.name.value).toBe("value");
      expect(meta.containerless).not.toBeNull();
    });
  });

  describe("tag name provenance", () => {
    it("preserves tag name span for import", () => {
      const html = `<import from="./foo">`;
      const { meta } = extract(html);

      const tagLoc = meta.imports[0]!.tagLoc;
      expect(html.slice(tagLoc.start, tagLoc.end)).toBe("import");
    });

    it("preserves tag name span for bindable", () => {
      const html = `<bindable name="x">`;
      const { meta } = extract(html);

      const tagLoc = meta.bindables[0]!.tagLoc;
      expect(html.slice(tagLoc.start, tagLoc.end)).toBe("bindable");
    });

    it("preserves element span for containerless", () => {
      const html = `<containerless>`;
      const { meta } = extract(html);

      const elemLoc = meta.containerless!.elementLoc;
      expect(html.slice(elemLoc.start, elemLoc.end)).toBe("<containerless>");
    });
  });
});
