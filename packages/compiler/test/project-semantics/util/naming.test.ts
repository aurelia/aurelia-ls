import { describe, it, expect } from "vitest";
import {
  toKebabCase,
  toCamelCase,
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
  canonicalBindableName,
  canonicalAliases,
  isKindOfSame,
} from "@aurelia-ls/compiler";

/**
 * Tests for naming utility functions.
 *
 * These functions process class names and attribute names for Aurelia conventions.
 * The test cases focus on inputs that actually occur in practice:
 *
 * - toKebabCase: Converts class names (PascalCase) to element names (kebab-case)
 * - toCamelCase: Converts HTML attributes (kebab-case) to property names (camelCase)
 *
 * Note: We intentionally don't test edge cases like dots, stars, or leading/trailing
 * separators because these never appear in valid TypeScript class names or HTML attributes.
 */

describe("Naming Utilities", () => {
  // ===========================================================================
  // toKebabCase - Class Name to Element Name
  // ===========================================================================

  describe("toKebabCase", () => {
    describe("PascalCase class names (primary use case)", () => {
      it("converts simple PascalCase", () => {
        expect(toKebabCase("MyApp")).toBe("my-app");
        expect(toKebabCase("NavBar")).toBe("nav-bar");
        expect(toKebabCase("UserProfileCard")).toBe("user-profile-card");
      });

      it("converts single word", () => {
        expect(toKebabCase("App")).toBe("app");
        expect(toKebabCase("Button")).toBe("button");
      });

      it("handles short suffixes", () => {
        expect(toKebabCase("FooB")).toBe("foo-b");
        expect(toKebabCase("BarX")).toBe("bar-x");
      });
    });

    describe("acronyms and consecutive capitals", () => {
      it("handles acronym at start", () => {
        expect(toKebabCase("XMLParser")).toBe("xml-parser");
        expect(toKebabCase("HTMLElement")).toBe("html-element");
        expect(toKebabCase("IOStream")).toBe("io-stream");
      });

      it("handles acronym in middle", () => {
        expect(toKebabCase("getHTMLElement")).toBe("get-html-element");
        expect(toKebabCase("parseXMLDocument")).toBe("parse-xml-document");
      });

      it("handles acronym at end", () => {
        expect(toKebabCase("streamIO")).toBe("stream-io");
        expect(toKebabCase("convertToJSON")).toBe("convert-to-json");
      });

      it("handles all caps (treated as single word)", () => {
        expect(toKebabCase("HTML")).toBe("html");
        expect(toKebabCase("XML")).toBe("xml");
        expect(toKebabCase("ABC")).toBe("abc");
      });

      it("handles mixed patterns", () => {
        expect(toKebabCase("FOOBarBAZ")).toBe("foo-bar-baz");
        expect(toKebabCase("FOOBarBaz")).toBe("foo-bar-baz");
        expect(toKebabCase("ABCdef")).toBe("ab-cdef");
        expect(toKebabCase("abcDEF")).toBe("abc-def");
      });
    });

    describe("numbers in names", () => {
      it("handles numbers after letters", () => {
        expect(toKebabCase("Route404")).toBe("route404");
        expect(toKebabCase("Page2Component")).toBe("page2-component");
      });

      it("handles numbers before capitals", () => {
        expect(toKebabCase("Route404Page")).toBe("route404-page");
        expect(toKebabCase("get4Real")).toBe("get4-real");
      });

      it("handles numbers in middle", () => {
        expect(toKebabCase("fooBar1Baz23")).toBe("foo-bar1-baz23");
      });
    });

    describe("already kebab-case (pass-through)", () => {
      it("preserves kebab-case", () => {
        expect(toKebabCase("my-app")).toBe("my-app");
        expect(toKebabCase("nav-bar")).toBe("nav-bar");
      });

      it("lowercases capitalized kebab", () => {
        expect(toKebabCase("Foo-Bar-Baz")).toBe("foo-bar-baz");
        expect(toKebabCase("FOO-BAR-BAZ")).toBe("foo-bar-baz");
      });

      it("handles kebab with numbers", () => {
        expect(toKebabCase("foo-123-baz")).toBe("foo-123-baz");
        expect(toKebabCase("route-404")).toBe("route-404");
      });
    });

    describe("snake_case conversion", () => {
      it("converts snake_case to kebab-case", () => {
        expect(toKebabCase("foo_bar_baz")).toBe("foo-bar-baz");
        expect(toKebabCase("my_custom_element")).toBe("my-custom-element");
      });

      it("handles capitalized snake_case", () => {
        expect(toKebabCase("Foo_Bar_Baz")).toBe("foo-bar-baz");
        expect(toKebabCase("FOO_BAR_BAZ")).toBe("foo-bar-baz");
      });
    });

    describe("space-separated (rare but valid)", () => {
      it("converts spaces to hyphens", () => {
        expect(toKebabCase("foo bar baz")).toBe("foo-bar-baz");
        expect(toKebabCase("Foo Bar Baz")).toBe("foo-bar-baz");
      });
    });

    describe("edge cases", () => {
      it("handles empty string", () => {
        expect(toKebabCase("")).toBe("");
      });

      it("handles single character", () => {
        expect(toKebabCase("A")).toBe("a");
        expect(toKebabCase("a")).toBe("a");
      });

      it("handles all lowercase", () => {
        expect(toKebabCase("foobarbaz")).toBe("foobarbaz");
      });

      it("handles all uppercase", () => {
        expect(toKebabCase("FOOBARBAZ")).toBe("foobarbaz");
      });

      it("handles iOS-style names", () => {
        expect(toKebabCase("iOS")).toBe("i-os");
        expect(toKebabCase("macOS")).toBe("mac-os");
      });
    });
  });

  // ===========================================================================
  // toCamelCase - HTML Attribute to Property Name
  // ===========================================================================

  describe("toCamelCase", () => {
    describe("kebab-case attributes (primary use case)", () => {
      it("converts kebab-case to camelCase", () => {
        expect(toCamelCase("value-changed")).toBe("valueChanged");
        expect(toCamelCase("is-disabled")).toBe("isDisabled");
        expect(toCamelCase("my-custom-property")).toBe("myCustomProperty");
      });

      it("handles single word (no change needed)", () => {
        expect(toCamelCase("value")).toBe("value");
        expect(toCamelCase("checked")).toBe("checked");
      });

      it("handles numbers in kebab", () => {
        expect(toCamelCase("item-1-value")).toBe("item1Value");
        expect(toCamelCase("route-404")).toBe("route404");
        expect(toCamelCase("get-2nd-item")).toBe("get2ndItem");
      });

      it("handles multiple hyphens", () => {
        expect(toCamelCase("foo-bar-baz-qux")).toBe("fooBarBazQux");
      });
    });

    describe("already camelCase (pass-through)", () => {
      it("preserves camelCase", () => {
        expect(toCamelCase("fooBarBaz")).toBe("fooBarBaz");
        expect(toCamelCase("valueChanged")).toBe("valueChanged");
      });
    });

    describe("edge cases", () => {
      it("handles empty string", () => {
        expect(toCamelCase("")).toBe("");
      });

      it("handles single character", () => {
        expect(toCamelCase("a")).toBe("a");
      });

      it("handles trailing hyphen (unusual)", () => {
        expect(toCamelCase("foo-")).toBe("foo-");
      });

      it("handles leading hyphen (triggers uppercase)", () => {
        // Leading hyphen triggers the uppercase conversion
        expect(toCamelCase("-foo")).toBe("Foo");
      });
    });
  });

  // ===========================================================================
  // canonicalElementName
  // ===========================================================================

  describe("canonicalElementName", () => {
    it("converts PascalCase class name to kebab-case element name", () => {
      expect(canonicalElementName("MyApp")).toBe("my-app");
      expect(canonicalElementName("NavBar")).toBe("nav-bar");
      expect(canonicalElementName("UserProfileCard")).toBe("user-profile-card");
    });

    it("handles CustomElement suffix", () => {
      // Note: The suffix is converted, not stripped
      expect(canonicalElementName("MyAppCustomElement")).toBe("my-app-custom-element");
    });

    it("preserves already kebab-case", () => {
      expect(canonicalElementName("my-app")).toBe("my-app");
    });

    it("handles acronyms", () => {
      expect(canonicalElementName("HTMLViewer")).toBe("html-viewer");
      expect(canonicalElementName("XMLParser")).toBe("xml-parser");
    });
  });

  // ===========================================================================
  // canonicalAttrName
  // ===========================================================================

  describe("canonicalAttrName", () => {
    it("converts PascalCase to kebab-case", () => {
      expect(canonicalAttrName("MyAttribute")).toBe("my-attribute");
      expect(canonicalAttrName("IfCustomAttribute")).toBe("if-custom-attribute");
    });

    it("preserves already kebab-case", () => {
      expect(canonicalAttrName("my-attr")).toBe("my-attr");
    });
  });

  // ===========================================================================
  // canonicalSimpleName (for value converters, binding behaviors)
  // ===========================================================================

  describe("canonicalSimpleName", () => {
    it("applies acronym-aware camelCase from @aurelia/kernel", () => {
      // Per vocabulary-contract.md §Resource naming normalization:
      // Uses @aurelia/kernel's baseCase + camelCase callback.
      // NOT lcfirst ("lowercase first char, preserve rest").
      expect(canonicalSimpleName("Date")).toBe("date");
      expect(canonicalSimpleName("  JSON  ")).toBe("json"); // all-caps → all-lowercase
      expect(canonicalSimpleName("NumberFormat")).toBe("numberFormat"); // word boundary at F
    });

    it("handles acronym-rich names correctly", () => {
      expect(canonicalSimpleName("HTMLParser")).toBe("htmlParser");
      expect(canonicalSimpleName("URLEncoder")).toBe("urlEncoder");
      expect(canonicalSimpleName("XMLHTTPRequest")).toBe("xmlhttpRequest");
    });

    it("treats hyphens as word separators", () => {
      // Hyphens are separators in the baseCase algorithm
      expect(canonicalSimpleName("my-converter")).toBe("myConverter");
    });

    it("handles PascalCase with word boundaries", () => {
      expect(canonicalSimpleName("CamelCase")).toBe("camelCase");
      expect(canonicalSimpleName("FormatDate")).toBe("formatDate");
      expect(canonicalSimpleName("Throttle")).toBe("throttle");
    });
  });

  // ===========================================================================
  // canonicalBindableName
  // ===========================================================================

  describe("canonicalBindableName", () => {
    it("converts kebab-case to camelCase", () => {
      expect(canonicalBindableName("value-changed")).toBe("valueChanged");
      expect(canonicalBindableName("is-disabled")).toBe("isDisabled");
    });

    it("preserves already camelCase", () => {
      expect(canonicalBindableName("valueChanged")).toBe("valueChanged");
    });

    it("returns null for empty/whitespace", () => {
      expect(canonicalBindableName("")).toBeNull();
      expect(canonicalBindableName("   ")).toBeNull();
    });

    it("handles single word", () => {
      expect(canonicalBindableName("value")).toBe("value");
    });

    it("handles numbers", () => {
      expect(canonicalBindableName("item-1-value")).toBe("item1Value");
    });

    it("handles common DOM attribute patterns", () => {
      expect(canonicalBindableName("data-value")).toBe("dataValue");
      expect(canonicalBindableName("aria-label")).toBe("ariaLabel");
      expect(canonicalBindableName("on-click")).toBe("onClick");
    });
  });

  // ===========================================================================
  // canonicalAliases
  // ===========================================================================

  describe("canonicalAliases", () => {
    it("converts to kebab-case", () => {
      expect(canonicalAliases(["FooBar", "BazQux"])).toEqual(["baz-qux", "foo-bar"]);
    });

    it("deduplicates equivalent names", () => {
      expect(canonicalAliases(["foo-bar", "FooBar", "fooBar"])).toEqual(["foo-bar"]);
    });

    it("sorts alphabetically", () => {
      expect(canonicalAliases(["zebra", "apple", "mango"])).toEqual(["apple", "mango", "zebra"]);
    });

    it("filters empty strings", () => {
      expect(canonicalAliases(["foo", "", "bar"])).toEqual(["bar", "foo"]);
    });

    it("handles empty input", () => {
      expect(canonicalAliases([])).toEqual([]);
    });

    it("handles single alias", () => {
      expect(canonicalAliases(["MyElement"])).toEqual(["my-element"]);
    });
  });

  // ===========================================================================
  // isKindOfSame - Convention Matching
  // ===========================================================================

  describe("isKindOfSame", () => {
    describe("primary use case: file name ↔ class name matching", () => {
      it("matches kebab-case file to PascalCase class", () => {
        expect(isKindOfSame("my-app", "MyApp")).toBe(true);
        expect(isKindOfSame("nav-bar", "NavBar")).toBe(true);
        expect(isKindOfSame("user-profile-card", "UserProfileCard")).toBe(true);
      });

      it("matches kebab-case file to camelCase class", () => {
        expect(isKindOfSame("my-app", "myApp")).toBe(true);
      });

      it("handles real-world component names", () => {
        expect(isKindOfSame("cortex-devices", "CortexDevices")).toBe(true);
        expect(isKindOfSame("data-grid", "DataGrid")).toBe(true);
      });
    });

    describe("identical strings", () => {
      it("matches identical strings", () => {
        expect(isKindOfSame("foo", "foo")).toBe(true);
        expect(isKindOfSame("FooBar", "FooBar")).toBe(true);
      });
    });

    describe("case insensitivity", () => {
      it("ignores case differences", () => {
        expect(isKindOfSame("myapp", "MYAPP")).toBe(true);
        expect(isKindOfSame("MyApp", "myapp")).toBe(true);
      });
    });

    describe("non-matching cases", () => {
      it("rejects different names", () => {
        expect(isKindOfSame("foo", "bar")).toBe(false);
        expect(isKindOfSame("my-app", "YourApp")).toBe(false);
      });

      it("rejects names with underscores (not kebab convention)", () => {
        // Intentional: Aurelia convention is kebab-case, not snake_case
        // my_app.ts should NOT match MyApp class
        expect(isKindOfSame("my_app", "MyApp")).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("handles empty strings", () => {
        expect(isKindOfSame("", "")).toBe(true);
        expect(isKindOfSame("", "foo")).toBe(false);
      });

      it("handles single characters", () => {
        expect(isKindOfSame("a", "A")).toBe(true);
        expect(isKindOfSame("a", "b")).toBe(false);
      });

      it("handles numbers", () => {
        expect(isKindOfSame("route404", "Route404")).toBe(true);
        expect(isKindOfSame("404-page", "404Page")).toBe(true);
      });
    });
  });
});

// =============================================================================
// Round-trip Property Tests
// =============================================================================

describe("Round-trip Properties", () => {
  describe("kebab → camel round-trip", () => {
    // Note: kebab-case with numbers (like "route-404") doesn't survive round-trip
    // because toCamelCase("route-404") → "route404", and toKebabCase("route404") → "route404"
    // (no case boundary before the number to insert a hyphen)
    const kebabCases = [
      "my-app",
      "nav-bar",
      "user-profile-card",
      "html-viewer",
    ];

    for (const kebab of kebabCases) {
      it(`"${kebab}" survives round-trip`, () => {
        const camel = toCamelCase(kebab);
        const backToKebab = toKebabCase(camel);
        expect(backToKebab).toBe(kebab);
      });
    }
  });

  describe("PascalCase → kebab → camel produces lowercase-start camelCase", () => {
    const pascalCases = [
      ["MyApp", "myApp"],
      ["NavBar", "navBar"],
      ["XMLParser", "xmlParser"],
      ["HTMLElement", "htmlElement"],
    ];

    for (const [pascal, expectedCamel] of pascalCases) {
      it(`"${pascal}" → kebab → camel = "${expectedCamel}"`, () => {
        const kebab = toKebabCase(pascal);
        const camel = toCamelCase(kebab);
        expect(camel).toBe(expectedCamel);
      });
    }
  });
});
