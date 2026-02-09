import { describe, expect, it } from "vitest";
import type { ResourceDef, SourceLocation, Sourced } from "@aurelia-ls/compiler";
import { selectResourceCandidate } from "../../src/resource-precedence-policy.js";

type Candidate = {
  id: string;
  def: ResourceDef;
};

function sourceLocation(file: string): SourceLocation {
  return { file: file as SourceLocation["file"], pos: 0, end: 0 };
}

function sourcedString(value: string, origin: "builtin" | "config" | "source", file?: string): Sourced<string> {
  switch (origin) {
    case "builtin":
      return { origin: "builtin", value };
    case "config":
      return {
        origin: "config",
        value,
        location: sourceLocation(file ?? "/config.json"),
      };
    case "source":
    default:
      return {
        origin: "source",
        state: "known",
        value,
        ...(file ? { location: sourceLocation(file) } : {}),
      };
  }
}

function elementDef(
  name: string,
  options: {
    file?: string;
    origin?: "builtin" | "config" | "source";
    package?: string;
  } = {},
): ResourceDef {
  const origin = options.origin ?? "source";
  const file = options.file;
  return {
    kind: "custom-element",
    className: sourcedString("MyElement", origin, file),
    ...(file ? { file: file as ResourceDef["file"] } : {}),
    ...(options.package ? { package: options.package } : {}),
    name: sourcedString(name, origin, file),
    aliases: [],
    containerless: { origin: "builtin", value: false },
    shadowOptions: { origin: "builtin", value: undefined },
    capture: { origin: "builtin", value: false },
    processContent: { origin: "builtin", value: false },
    boundary: { origin: "builtin", value: true },
    bindables: {},
    dependencies: [],
  };
}

describe("resource precedence policy", () => {
  it("prefers exact file matches when file is known", () => {
    const first: Candidate = { id: "first", def: elementDef("badge", { file: "/repo/src/a.ts" }) };
    const second: Candidate = { id: "second", def: elementDef("badge", { file: "/repo/src/b.ts" }) };
    const selected = selectResourceCandidate([first, second], {
      file: "/repo/src/b.ts",
      preferredRoots: ["/repo"],
    });
    expect(selected?.id).toBe("second");
  });

  it("prefers resources inside preferred workspace roots", () => {
    const local: Candidate = { id: "local", def: elementDef("tooltip", { file: "/repo/src/tooltip.ts" }) };
    const thirdParty: Candidate = {
      id: "third-party",
      def: elementDef("tooltip", {
        file: "/repo/node_modules/@pkg/tooltip.ts",
        package: "@pkg/ui",
      }),
    };
    const selected = selectResourceCandidate([thirdParty, local], {
      preferredRoots: ["/repo/src"],
    });
    expect(selected?.id).toBe("local");
  });

  it("prefers first-party resources over package resources when both are available", () => {
    const firstParty: Candidate = { id: "first-party", def: elementDef("chip", { file: "/repo/src/chip.ts" }) };
    const pkg: Candidate = {
      id: "pkg",
      def: elementDef("chip", {
        file: "/repo/node_modules/@pkg/chip.ts",
        package: "@pkg/ui",
      }),
    };
    const selected = selectResourceCandidate([pkg, firstParty], {
      preferredRoots: [],
    });
    expect(selected?.id).toBe("first-party");
  });

  it("prefers config-origin package entries over source-origin package entries", () => {
    const analyzed: Candidate = {
      id: "analyzed",
      def: elementDef("table", {
        file: "/repo/node_modules/@pkg/table.ts",
        package: "@pkg/ui",
        origin: "source",
      }),
    };
    const explicit: Candidate = {
      id: "explicit",
      def: elementDef("table", {
        file: "/repo/node_modules/@pkg/table.ts",
        package: "@pkg/ui",
        origin: "config",
      }),
    };
    const selected = selectResourceCandidate([analyzed, explicit], {
      preferredRoots: [],
    });
    expect(selected?.id).toBe("explicit");
  });

  it("falls back deterministically when candidates tie", () => {
    const zed: Candidate = { id: "zed", def: elementDef("avatar", { file: "/repo/src/z.ts" }) };
    const alpha: Candidate = { id: "alpha", def: elementDef("avatar", { file: "/repo/src/a.ts" }) };
    const selected = selectResourceCandidate([zed, alpha], {
      preferredRoots: [],
    });
    expect(selected?.id).toBe("alpha");
  });
});
