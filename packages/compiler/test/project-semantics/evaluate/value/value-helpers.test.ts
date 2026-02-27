/**
 * Value Helper Tests
 *
 * Focused coverage for resolveToString/resolveToBoolean helpers.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
import {
  buildContextWithProgram,
  buildSimpleContext,
  resolveToBoolean,
  resolveToString,
} from "../../../../out/project-semantics/evaluate/value-helpers.js";
import { canonicalPath } from "../../../../out/project-semantics/util/naming.js";

const FILE = "/out/main.ts" as NormalizedPath;

// =============================================================================
// AST Helpers
// =============================================================================

function parseSource(text: string, fileName = FILE): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

function createProgramOnDisk(files: Record<string, string>): {
  program: ts.Program;
  paths: Record<string, string>;
  dir: string;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-ls-value-helpers-"));
  const paths: Record<string, string> = {};

  for (const [virtualPath, contents] of Object.entries(files)) {
    const relPath = virtualPath.replace(/^\//, "");
    const filePath = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents, "utf8");
    paths[virtualPath] = filePath;
  }

  const program = ts.createProgram(Object.values(paths), {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    allowJs: true,
    experimentalDecorators: true,
  });

  return { program, paths, dir };
}

function findVarDecl(sf: ts.SourceFile, name: string): ts.VariableDeclaration {
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.name.text === name) {
        return decl;
      }
    }
  }
  throw new Error(`Variable ${name} not found`);
}

function getInitializer(sf: ts.SourceFile, name: string): ts.Expression {
  const decl = findVarDecl(sf, name);
  if (!decl.initializer) {
    throw new Error(`Variable ${name} has no initializer`);
  }
  return decl.initializer;
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteralLike(name)) return name.text;
  return null;
}

function getObjectPropertyInitializer(
  sf: ts.SourceFile,
  varName: string,
  propName: string
): ts.Expression {
  const decl = findVarDecl(sf, varName);
  if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) {
    throw new Error(`Variable ${varName} is not an object literal`);
  }

  for (const prop of decl.initializer.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = propertyNameText(prop.name);
    if (name === propName) {
      return prop.initializer;
    }
  }

  throw new Error(`Property ${propName} not found on ${varName}`);
}

// =============================================================================
// resolveToString
// =============================================================================

describe("resolveToString", () => {
  it("resolves direct string literals without context", () => {
    const sf = parseSource(`const value = "hello";`);
    const expr = getInitializer(sf, "value");
    expect(resolveToString(expr, null)).toBe("hello");
  });

  it("unwraps assertions without context", () => {
    const sf = parseSource(`const value = ("hello" as const);`);
    const expr = getInitializer(sf, "value");
    expect(resolveToString(expr, null)).toBe("hello");
  });

  it("resolves local identifiers with a simple context", () => {
    const sf = parseSource(`
      const NAME = "my-element";
      const config = { name: NAME };
    `);
    const expr = getObjectPropertyInitializer(sf, "config", "name");
    const ctx = buildSimpleContext(sf, FILE);
    expect(resolveToString(expr, ctx)).toBe("my-element");
  });

  it("resolves property access on local object literals", () => {
    const sf = parseSource(`
      const options = { name: "local-name" };
      const result = options.name;
    `);
    const expr = getInitializer(sf, "result");
    const ctx = buildSimpleContext(sf, FILE);
    expect(resolveToString(expr, ctx)).toBe("local-name");
  });

  it("resolves imported identifiers with a program-backed context", () => {
    const { program, paths, dir } = createProgramOnDisk({
      "/out/constants.ts": `
        export const ELEMENT_NAME = "my-element";
        export const ENABLED = true;
      `,
      "/out/main.ts": `
        import { ELEMENT_NAME, ENABLED } from "./constants.js";
        const config = { name: ELEMENT_NAME, enabled: ENABLED };
      `,
    });

    try {
      const sf = program.getSourceFile(paths["/out/main.ts"])!;
      const expr = getObjectPropertyInitializer(sf, "config", "name");
      const ctx = buildContextWithProgram(sf, canonicalPath(sf.fileName), program);

      expect(resolveToString(expr, ctx)).toBe("my-element");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolves namespace import property access via program context", () => {
    const { program, paths, dir } = createProgramOnDisk({
      "/out/constants.ts": `
        export const ELEMENT_NAME = "ns-element";
      `,
      "/out/main.ts": `
        import * as constants from "./constants.js";
        const config = { name: constants.ELEMENT_NAME };
      `,
    });

    try {
      const sf = program.getSourceFile(paths["/out/main.ts"])!;
      const expr = getObjectPropertyInitializer(sf, "config", "name");
      const ctx = buildContextWithProgram(sf, canonicalPath(sf.fileName), program);

      expect(resolveToString(expr, ctx)).toBe("ns-element");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// resolveToBoolean
// =============================================================================

describe("resolveToBoolean", () => {
  it("resolves boolean literals without context", () => {
    const sf = parseSource(`const enabled = true;`);
    const expr = getInitializer(sf, "enabled");
    expect(resolveToBoolean(expr, null)).toBe(true);
  });

  it("resolves local identifiers with a simple context", () => {
    const sf = parseSource(`
      const ENABLED = true;
      const config = { enabled: ENABLED };
    `);
    const expr = getObjectPropertyInitializer(sf, "config", "enabled");
    const ctx = buildSimpleContext(sf, FILE);
    expect(resolveToBoolean(expr, ctx)).toBe(true);
  });

  it("resolves property access on local object literals", () => {
    const sf = parseSource(`
      const flags = { enabled: false };
      const result = flags.enabled;
    `);
    const expr = getInitializer(sf, "result");
    const ctx = buildSimpleContext(sf, FILE);
    expect(resolveToBoolean(expr, ctx)).toBe(false);
  });

  it("resolves imported identifiers with a program-backed context", () => {
    const { program, paths, dir } = createProgramOnDisk({
      "/out/constants.ts": `
        export const ELEMENT_NAME = "my-element";
        export const ENABLED = false;
      `,
      "/out/main.ts": `
        import { ELEMENT_NAME, ENABLED } from "./constants.js";
        const config = { name: ELEMENT_NAME, enabled: ENABLED };
      `,
    });

    try {
      const sf = program.getSourceFile(paths["/out/main.ts"])!;
      const expr = getObjectPropertyInitializer(sf, "config", "enabled");
      const ctx = buildContextWithProgram(sf, canonicalPath(sf.fileName), program);

      expect(resolveToBoolean(expr, ctx)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolves namespace import property access via program context", () => {
    const { program, paths, dir } = createProgramOnDisk({
      "/out/constants.ts": `
        export const ENABLED = true;
      `,
      "/out/main.ts": `
        import * as constants from "./constants.js";
        const config = { enabled: constants.ENABLED };
      `,
    });

    try {
      const sf = program.getSourceFile(paths["/out/main.ts"])!;
      const expr = getObjectPropertyInitializer(sf, "config", "enabled");
      const ctx = buildContextWithProgram(sf, canonicalPath(sf.fileName), program);

      expect(resolveToBoolean(expr, ctx)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns undefined for identifiers without context", () => {
    const sf = parseSource(`const enabled = ENABLED;`);
    const expr = getInitializer(sf, "enabled");
    expect(resolveToBoolean(expr, null)).toBeUndefined();
  });
});
