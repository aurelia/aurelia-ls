import { describe, it, expect } from "vitest";
import ts from "typescript";
import { extractClassFacts } from "../../src/extraction/class-extractor.js";

/**
 * Helper to create a source file and extract class facts.
 */
function extractFromSource(source: string) {
  const sourceFile = ts.createSourceFile(
    "test.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  // Create a minimal program for type checking
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName) => fileName === "test.ts" ? sourceFile : undefined,
    getDefaultLibFileName: () => "lib.d.ts",
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getCanonicalFileName: (f) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    fileExists: () => true,
    readFile: () => undefined,
  };

  const program = ts.createProgram(["test.ts"], {}, compilerHost);
  const checker = program.getTypeChecker();

  // Find the first class declaration
  let classDecl: ts.ClassDeclaration | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isClassDeclaration(node)) {
      classDecl = node;
    }
  });

  if (!classDecl) {
    throw new Error("No class declaration found in source");
  }

  return extractClassFacts(classDecl, checker);
}

describe("Object Eval Hardening: parseDependencyArray", () => {
  describe("identifier handling", () => {
    it("extracts simple identifiers from static dependencies", () => {
      const facts = extractFromSource(`
        import { MyComponent, OtherComponent } from './components';

        class MyElement {
          static dependencies = [MyComponent, OtherComponent];
        }
      `);

      expect(facts.staticDependencies).toBeTruthy();
      expect(facts.staticDependencies!.references).toHaveLength(2);
      expect(facts.staticDependencies!.references[0]).toMatchObject({
        kind: "identifier",
        name: "MyComponent",
      });
      expect(facts.staticDependencies!.references[1]).toMatchObject({
        kind: "identifier",
        name: "OtherComponent",
      });
      expect(facts.extractionGaps).toBeUndefined();
    });
  });

  describe("property access handling", () => {
    it("extracts property access from static dependencies", () => {
      const facts = extractFromSource(`
        import * as Components from './components';

        class MyElement {
          static dependencies = [Components.Button, Components.Input];
        }
      `);

      expect(facts.staticDependencies).toBeTruthy();
      expect(facts.staticDependencies!.references).toHaveLength(2);
      expect(facts.staticDependencies!.references[0]).toMatchObject({
        kind: "property-access",
        object: "Components",
        property: "Button",
      });
      expect(facts.staticDependencies!.references[1]).toMatchObject({
        kind: "property-access",
        object: "Components",
        property: "Input",
      });
      expect(facts.extractionGaps).toBeUndefined();
    });

    it("extracts nested property access", () => {
      const facts = extractFromSource(`
        import * as UI from './ui';

        class MyElement {
          static dependencies = [UI.Components.Button];
        }
      `);

      expect(facts.staticDependencies).toBeTruthy();
      expect(facts.staticDependencies!.references).toHaveLength(1);
      expect(facts.staticDependencies!.references[0]).toMatchObject({
        kind: "property-access",
        object: "UI.Components",
        property: "Button",
      });
    });
  });

  describe("spread handling", () => {
    it("reports gap for spread elements in static dependencies", () => {
      const facts = extractFromSource(`
        const baseComponents = [A, B];

        class MyElement {
          static dependencies = [...baseComponents, C];
        }
      `);

      expect(facts.staticDependencies).toBeTruthy();
      // Should still extract the explicit identifier C
      expect(facts.staticDependencies!.references).toHaveLength(1);
      expect(facts.staticDependencies!.references[0]).toMatchObject({
        kind: "identifier",
        name: "C",
      });

      // Should have a gap for the spread
      expect(facts.extractionGaps).toBeDefined();
      expect(facts.extractionGaps).toHaveLength(1);
      expect(facts.extractionGaps![0].why).toMatchObject({
        kind: "spread-unknown",
        spreadOf: "baseComponents",
      });
      expect(facts.extractionGaps![0].what).toContain("dependencies");
    });

    it("reports gap for spread in static $au dependencies", () => {
      const facts = extractFromSource(`
        const baseDeps = [A, B];

        class MyElement {
          static $au = {
            type: 'custom-element',
            name: 'my-element',
            dependencies: [...baseDeps],
          };
        }
      `);

      expect(facts.staticAu).toBeTruthy();
      expect(facts.extractionGaps).toBeDefined();
      expect(facts.extractionGaps).toHaveLength(1);
      expect(facts.extractionGaps![0].why).toMatchObject({
        kind: "spread-unknown",
        spreadOf: "baseDeps",
      });
    });
  });

  describe("function call handling", () => {
    it("reports gap for function calls in static dependencies", () => {
      const facts = extractFromSource(`
        function getComponents() { return [A, B]; }

        class MyElement {
          static dependencies = [getComponents(), C];
        }
      `);

      // C should still be extracted
      expect(facts.staticDependencies).toBeTruthy();
      expect(facts.staticDependencies!.references).toHaveLength(1);
      expect(facts.staticDependencies!.references[0]).toMatchObject({
        kind: "identifier",
        name: "C",
      });

      // Should have a gap for the function call
      expect(facts.extractionGaps).toBeDefined();
      expect(facts.extractionGaps).toHaveLength(1);
      expect(facts.extractionGaps![0].why).toMatchObject({
        kind: "function-return",
        functionName: "getComponents",
      });
    });
  });
});

describe("Object Eval Hardening: parseBindablesArray", () => {
  describe("standard bindable formats", () => {
    it("extracts string bindables from static $au", () => {
      const facts = extractFromSource(`
        class MyElement {
          static $au = {
            type: 'custom-element',
            name: 'my-element',
            bindables: ['value', 'label'],
          };
        }
      `);

      expect(facts.staticAu).toBeTruthy();
      expect(facts.staticAu!.bindables).toHaveLength(2);
      expect(facts.staticAu!.bindables![0]).toMatchObject({ name: "value" });
      expect(facts.staticAu!.bindables![1]).toMatchObject({ name: "label" });
      expect(facts.extractionGaps).toBeUndefined();
    });

    it("extracts object bindables from static $au", () => {
      const facts = extractFromSource(`
        class MyElement {
          static $au = {
            type: 'custom-element',
            name: 'my-element',
            bindables: [
              { name: 'value', mode: 'twoWay' },
              { name: 'label', primary: true },
            ],
          };
        }
      `);

      expect(facts.staticAu).toBeTruthy();
      expect(facts.staticAu!.bindables).toHaveLength(2);
      expect(facts.staticAu!.bindables![0]).toMatchObject({ name: "value", mode: "twoWay" });
      expect(facts.staticAu!.bindables![1]).toMatchObject({ name: "label", primary: true });
      expect(facts.extractionGaps).toBeUndefined();
    });
  });

  describe("spread handling", () => {
    it("reports gap for spread in bindables array", () => {
      const facts = extractFromSource(`
        const baseBindables = ['a', 'b'];

        class MyElement {
          static $au = {
            type: 'custom-element',
            name: 'my-element',
            bindables: [...baseBindables, 'extra'],
          };
        }
      `);

      expect(facts.staticAu).toBeTruthy();
      // Should still extract the explicit string 'extra'
      expect(facts.staticAu!.bindables).toHaveLength(1);
      expect(facts.staticAu!.bindables![0]).toMatchObject({ name: "extra" });

      // Should have a gap for the spread
      expect(facts.extractionGaps).toBeDefined();
      expect(facts.extractionGaps).toHaveLength(1);
      expect(facts.extractionGaps![0].why).toMatchObject({
        kind: "spread-unknown",
        spreadOf: "baseBindables",
      });
      expect(facts.extractionGaps![0].what).toContain("bindables");
    });
  });

  describe("variable reference handling", () => {
    it("reports gap for variable references in bindables array", () => {
      const facts = extractFromSource(`
        const sharedBindable = { name: 'shared', mode: 'twoWay' };

        class MyElement {
          static $au = {
            type: 'custom-element',
            name: 'my-element',
            bindables: [sharedBindable, 'direct'],
          };
        }
      `);

      expect(facts.staticAu).toBeTruthy();
      // Should still extract the explicit string 'direct'
      expect(facts.staticAu!.bindables).toHaveLength(1);
      expect(facts.staticAu!.bindables![0]).toMatchObject({ name: "direct" });

      // Should have a gap for the variable reference
      expect(facts.extractionGaps).toBeDefined();
      expect(facts.extractionGaps).toHaveLength(1);
      expect(facts.extractionGaps![0].why).toMatchObject({
        kind: "dynamic-value",
        expression: "sharedBindable",
      });
    });
  });
});

describe("Object Eval Hardening: gap propagation", () => {
  it("accumulates multiple gaps from the same class", () => {
    const facts = extractFromSource(`
      const baseDeps = [A];
      const baseBindables = ['x'];

      class MyElement {
        static $au = {
          type: 'custom-element',
          name: 'my-element',
          bindables: [...baseBindables],
          dependencies: [...baseDeps],
        };
      }
    `);

    expect(facts.extractionGaps).toBeDefined();
    expect(facts.extractionGaps).toHaveLength(2);

    // One gap for bindables spread, one for dependencies spread
    const gapKinds = facts.extractionGaps!.map(g => (g.why as any).kind);
    expect(gapKinds).toContain("spread-unknown");
    expect(gapKinds.filter(k => k === "spread-unknown")).toHaveLength(2);
  });

  it("provides actionable suggestions in gaps", () => {
    const facts = extractFromSource(`
      const deps = [A];

      class MyElement {
        static dependencies = [...deps];
      }
    `);

    expect(facts.extractionGaps).toBeDefined();
    expect(facts.extractionGaps![0].suggestion).toBeTruthy();
    expect(facts.extractionGaps![0].suggestion.length).toBeGreaterThan(10);
  });

  it("provides source location in gaps", () => {
    const facts = extractFromSource(`
      const deps = [A];

      class MyElement {
        static dependencies = [...deps];
      }
    `);

    expect(facts.extractionGaps).toBeDefined();
    expect(facts.extractionGaps![0].where).toBeDefined();
    expect(facts.extractionGaps![0].where!.file).toBe("test.ts");
    expect(typeof facts.extractionGaps![0].where!.line).toBe("number");
    expect(facts.extractionGaps![0].where!.snippet).toContain("...deps");
  });
});

describe("Object Eval Hardening: mixed patterns", () => {
  it("handles mixed identifiers and property access", () => {
    const facts = extractFromSource(`
      import { Direct } from './direct';
      import * as Namespaced from './namespaced';

      class MyElement {
        static dependencies = [Direct, Namespaced.Button, Namespaced.Input];
      }
    `);

    expect(facts.staticDependencies).toBeTruthy();
    expect(facts.staticDependencies!.references).toHaveLength(3);
    expect(facts.staticDependencies!.references[0]).toMatchObject({
      kind: "identifier",
      name: "Direct",
    });
    expect(facts.staticDependencies!.references[1]).toMatchObject({
      kind: "property-access",
      object: "Namespaced",
      property: "Button",
    });
    expect(facts.staticDependencies!.references[2]).toMatchObject({
      kind: "property-access",
      object: "Namespaced",
      property: "Input",
    });
    expect(facts.extractionGaps).toBeUndefined();
  });

  it("extracts what it can and reports gaps for the rest", () => {
    const facts = extractFromSource(`
      import { A } from './a';
      import * as B from './b';
      const dynamicDeps = [C];

      class MyElement {
        static dependencies = [A, B.Component, ...dynamicDeps, getMoreDeps()];
      }
    `);

    expect(facts.staticDependencies).toBeTruthy();
    // Should extract A and B.Component
    expect(facts.staticDependencies!.references).toHaveLength(2);
    expect(facts.staticDependencies!.references[0]).toMatchObject({
      kind: "identifier",
      name: "A",
    });
    expect(facts.staticDependencies!.references[1]).toMatchObject({
      kind: "property-access",
      object: "B",
      property: "Component",
    });

    // Should report gaps for spread and function call
    expect(facts.extractionGaps).toBeDefined();
    expect(facts.extractionGaps).toHaveLength(2);
    const gapKinds = facts.extractionGaps!.map(g => (g.why as any).kind);
    expect(gapKinds).toContain("spread-unknown");
    expect(gapKinds).toContain("function-return");
  });
});
