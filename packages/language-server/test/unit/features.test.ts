/**
 * Unit tests for features.ts handler utilities
 */

import { describe, it, expect } from "vitest";
import { findImportAtOffset, getMetaElementHover } from "../../src/handlers/features.js";
import type { TemplateMetaIR, ImportMetaIR, BindableMetaIR } from "@aurelia-ls/compiler";

/* =============================================================================
 * HELPER: Create test meta structures
 * ============================================================================= */

function createImport(
  from: string,
  fromStart: number,
  fromEnd: number,
  options?: {
    kind?: "import" | "require";
    defaultAlias?: string;
    namedAliases?: Array<{ exportName: string; alias: string }>;
  }
): ImportMetaIR {
  return {
    kind: options?.kind ?? "import",
    elementLoc: { start: 0, end: 30 },
    tagLoc: { start: 0, end: 6 },
    from: {
      value: from,
      loc: { start: fromStart, end: fromEnd },
    },
    defaultAlias: options?.defaultAlias
      ? { value: options.defaultAlias, loc: { start: 0, end: 0 } }
      : null,
    namedAliases: (options?.namedAliases ?? []).map((a) => ({
      exportName: { value: a.exportName, loc: { start: 0, end: 0 } },
      alias: { value: a.alias, loc: { start: 0, end: 0 } },
    })),
  };
}

function createBindable(
  name: string,
  nameStart: number,
  nameEnd: number,
  options?: {
    tagLoc?: { start: number; end: number };
    mode?: string;
    modeStart?: number;
    modeEnd?: number;
    attribute?: string;
    attributeStart?: number;
    attributeEnd?: number;
  }
): BindableMetaIR {
  return {
    elementLoc: { start: 0, end: 50 },
    tagLoc: options?.tagLoc ?? { start: 0, end: 8 },
    name: {
      value: name,
      loc: { start: nameStart, end: nameEnd },
    },
    mode: options?.mode
      ? { value: options.mode, loc: { start: options.modeStart ?? 0, end: options.modeEnd ?? 0 } }
      : null,
    attribute: options?.attribute
      ? { value: options.attribute, loc: { start: options.attributeStart ?? 0, end: options.attributeEnd ?? 0 } }
      : null,
  };
}

function createMeta(
  imports: ImportMetaIR[],
  options?: {
    bindables?: BindableMetaIR[];
    shadowDom?: { tagLoc: { start: number; end: number } };
    containerless?: { tagLoc: { start: number; end: number } };
    capture?: { tagLoc: { start: number; end: number } };
    aliases?: Array<{ tagLoc: { start: number; end: number } }>;
  }
): TemplateMetaIR {
  return {
    imports,
    bindables: options?.bindables ?? [],
    shadowDom: options?.shadowDom
      ? {
          elementLoc: { start: 0, end: 20 },
          tagLoc: options.shadowDom.tagLoc,
          mode: { value: 'open' as const, loc: { start: 0, end: 0 } },
        }
      : null,
    aliases: (options?.aliases ?? []).map(a => ({
      elementLoc: { start: 0, end: 15 },
      tagLoc: a.tagLoc,
      names: [{ value: "alias", loc: { start: 0, end: 0 } }],
    })),
    containerless: options?.containerless
      ? {
          elementLoc: { start: 0, end: 20 },
          tagLoc: options.containerless.tagLoc,
        }
      : null,
    capture: options?.capture
      ? {
          elementLoc: { start: 0, end: 15 },
          tagLoc: options.capture.tagLoc,
        }
      : null,
    hasSlot: false,
  };
}

/* =============================================================================
 * findImportAtOffset Tests
 * ============================================================================= */

describe("findImportAtOffset", () => {
  describe("with no meta", () => {
    it("returns null for undefined meta", () => {
      expect(findImportAtOffset(undefined, 10)).toBeNull();
    });
  });

  describe("with empty imports", () => {
    it("returns null when no imports exist", () => {
      const meta = createMeta([]);
      expect(findImportAtOffset(meta, 10)).toBeNull();
    });
  });

  describe("with single import", () => {
    // Template: <import from="./nav-bar">
    // Positions:          14       23
    const imp = createImport("./nav-bar", 14, 23);
    const meta = createMeta([imp]);

    it("returns null when offset is before from span", () => {
      expect(findImportAtOffset(meta, 13)).toBeNull();
    });

    it("returns import when offset is at start of from span", () => {
      expect(findImportAtOffset(meta, 14)).toBe(imp);
    });

    it("returns import when offset is within from span", () => {
      expect(findImportAtOffset(meta, 18)).toBe(imp);
    });

    it("returns null when offset is at end of from span (exclusive)", () => {
      expect(findImportAtOffset(meta, 23)).toBeNull();
    });

    it("returns null when offset is after from span", () => {
      expect(findImportAtOffset(meta, 25)).toBeNull();
    });
  });

  describe("with multiple imports", () => {
    // Template:
    // <import from="./nav-bar">
    // <import from="./footer">
    const imp1 = createImport("./nav-bar", 14, 23);
    const imp2 = createImport("./footer", 40, 48);
    const meta = createMeta([imp1, imp2]);

    it("returns first import when offset is within first from span", () => {
      expect(findImportAtOffset(meta, 16)).toBe(imp1);
    });

    it("returns second import when offset is within second from span", () => {
      expect(findImportAtOffset(meta, 44)).toBe(imp2);
    });

    it("returns null when offset is between imports", () => {
      expect(findImportAtOffset(meta, 30)).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles zero-length from span", () => {
      const imp = createImport("", 10, 10);
      const meta = createMeta([imp]);
      // Zero-length span: start == end, so no offset matches
      expect(findImportAtOffset(meta, 10)).toBeNull();
    });

    it("handles offset 0", () => {
      const imp = createImport("./foo", 0, 5);
      const meta = createMeta([imp]);
      expect(findImportAtOffset(meta, 0)).toBe(imp);
    });

    it("handles require kind the same as import", () => {
      const imp = createImport("./legacy", 14, 22, { kind: "require" });
      const meta = createMeta([imp]);
      expect(findImportAtOffset(meta, 18)).toBe(imp);
    });
  });
});

/* =============================================================================
 * getMetaElementHover Tests
 * ============================================================================= */

describe("getMetaElementHover", () => {
  describe("with no meta", () => {
    it("returns null for undefined meta", () => {
      expect(getMetaElementHover(undefined, 10)).toBeNull();
    });
  });

  describe("with empty meta", () => {
    it("returns null when no meta elements exist", () => {
      const meta = createMeta([]);
      expect(getMetaElementHover(meta, 10)).toBeNull();
    });
  });

  describe("import hover", () => {
    // Template: <import from="./nav-bar">
    // Tag:       1      7 (import)
    // From:                14     23 (./nav-bar)
    const imp = createImport("./nav-bar", 14, 23, {
      kind: "import",
    });
    // Override tagLoc
    (imp as any).tagLoc = { start: 1, end: 7 };
    const meta = createMeta([imp]);

    it("returns hover for import tag name", () => {
      const result = getMetaElementHover(meta, 3);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**<import>**");
      expect(result!.span).toEqual({ start: 1, end: 7 });
    });

    it("returns hover for from attribute value", () => {
      const result = getMetaElementHover(meta, 18);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**Module:**");
      expect(result!.contents).toContain("`./nav-bar`");
      expect(result!.span).toEqual({ start: 14, end: 23 });
    });

    it("returns null when offset is outside import", () => {
      expect(getMetaElementHover(meta, 30)).toBeNull();
    });
  });

  describe("import with alias hover", () => {
    const imp = createImport("./foo", 14, 19, {
      defaultAlias: "bar",
    });
    // Set alias location
    (imp as any).defaultAlias = { value: "bar", loc: { start: 25, end: 28 } };
    const meta = createMeta([imp]);

    it("returns hover with alias info on from value", () => {
      const result = getMetaElementHover(meta, 16);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("*Has aliases configured*");
    });

    it("returns hover for default alias", () => {
      const result = getMetaElementHover(meta, 26);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**Alias:**");
      expect(result!.contents).toContain("`bar`");
    });
  });

  describe("require hover (legacy)", () => {
    const imp = createImport("./legacy", 15, 23, { kind: "require" });
    (imp as any).tagLoc = { start: 1, end: 8 };
    const meta = createMeta([imp]);

    it("returns hover for require tag", () => {
      const result = getMetaElementHover(meta, 4);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**<require>**");
    });
  });

  describe("bindable hover", () => {
    // Template: <bindable name="value" mode="two-way">
    // Tag:       1        9
    // Name:                   16    21 (value)
    // Mode:                              28      35 (two-way)
    const bindable = createBindable("value", 16, 21, {
      tagLoc: { start: 1, end: 9 },
      mode: "two-way",
      modeStart: 28,
      modeEnd: 35,
    });
    const meta = createMeta([], { bindables: [bindable] });

    it("returns hover for bindable tag", () => {
      const result = getMetaElementHover(meta, 5);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**<bindable>**");
      expect(result!.span).toEqual({ start: 1, end: 9 });
    });

    it("returns hover for bindable name", () => {
      const result = getMetaElementHover(meta, 18);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**Bindable:**");
      expect(result!.contents).toContain("`value`");
      expect(result!.contents).toContain("mode: two-way");
    });

    it("returns hover for bindable mode", () => {
      const result = getMetaElementHover(meta, 30);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**Binding Mode:**");
      expect(result!.contents).toContain("`two-way`");
    });
  });

  describe("shadow-dom hover", () => {
    const meta = createMeta([], {
      shadowDom: { tagLoc: { start: 1, end: 15 } },
    });

    it("returns hover for use-shadow-dom tag", () => {
      const result = getMetaElementHover(meta, 8);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**<use-shadow-dom>**");
      expect(result!.contents).toContain("Shadow DOM encapsulation");
    });
  });

  describe("containerless hover", () => {
    const meta = createMeta([], {
      containerless: { tagLoc: { start: 1, end: 14 } },
    });

    it("returns hover for containerless tag", () => {
      const result = getMetaElementHover(meta, 8);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**<containerless>**");
      expect(result!.contents).toContain("without the host element");
    });
  });

  describe("capture hover", () => {
    const meta = createMeta([], {
      capture: { tagLoc: { start: 1, end: 8 } },
    });

    it("returns hover for capture tag", () => {
      const result = getMetaElementHover(meta, 4);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**<capture>**");
      expect(result!.contents).toContain("unrecognized attributes");
    });
  });

  describe("alias hover", () => {
    const meta = createMeta([], {
      aliases: [{ tagLoc: { start: 1, end: 6 } }],
    });

    it("returns hover for alias tag", () => {
      const result = getMetaElementHover(meta, 3);
      expect(result).not.toBeNull();
      expect(result!.contents).toContain("**<alias>**");
      expect(result!.contents).toContain("alternative name");
    });
  });
});
