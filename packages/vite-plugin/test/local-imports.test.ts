import { describe, expect, it } from "vitest";
import { convertToLocalImports } from "../src/local-imports.js";
import type { ImportMetaIR } from "@aurelia-ls/compiler/model/ir.js";
import type { ElementRes } from "@aurelia-ls/compiler/schema/types.js";
function createImport(from: string, defaultAlias?: string): ImportMetaIR {
  return {
    kind: "import",
    elementLoc: { start: 0, end: from.length },
    tagLoc: { start: 0, end: 6 },
    from: {
      value: from,
      loc: { start: 0, end: from.length },
    },
    defaultAlias: defaultAlias ? { value: defaultAlias, loc: { start: 0, end: defaultAlias.length } } : null,
    namedAliases: [],
  };
}

describe("convertToLocalImports", () => {
  it("derives normalized names and merges bindables/aliases", () => {
    const imports = [
      createImport("./components/UserCard.ts", "Card"),
      createImport("./attributes/Highlight.html"),
    ];

    const elementRes: ElementRes = {
      kind: "element",
      name: "user-card",
      bindables: {
        name: { name: "name" } as any,
      },
      aliases: ["user-card", "user-card-alt"],
    };

    const elements = {
      usercard: elementRes,
    } as const;

    const result = convertToLocalImports(imports, elements);

    expect(result[0]).toEqual({
      name: "usercard",
      bindables: elementRes.bindables,
      alias: "Card",
      aliases: ["user-card", "user-card-alt"],
    });

    expect(result[1]).toEqual({
      name: "highlight",
      bindables: {},
      alias: undefined,
      aliases: undefined,
    });
  });

  it("handles paths with nested segments and non-standard extensions", () => {
    const imports = [
      createImport("@scope/pkg/nested/my-element.js"),
      createImport("/abs/path/to/thing.html"),
    ];

    const result = convertToLocalImports(imports);

    expect(result[0]?.name).toBe("my-element");
    expect(result[1]?.name).toBe("thing");
  });
});
