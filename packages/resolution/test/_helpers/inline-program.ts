/**
 * In-Memory TypeScript Program
 *
 * Create TypeScript programs from inline source strings.
 * Useful for testing specific patterns without file fixtures.
 *
 * Based on compiler/test/_helpers/ts-harness.ts
 */

import * as ts from "typescript";

/**
 * Create a TypeScript program from in-memory file contents.
 *
 * @param files - Map of file paths to source content
 * @param rootNames - Entry point files (defaults to all files)
 * @param options - Additional compiler options
 *
 * @example
 * const { program } = createProgramFromMemory({
 *   "/src/main.ts": `
 *     import { Foo } from "./foo.js";
 *     Aurelia.register(Foo);
 *   `,
 *   "/src/foo.ts": `
 *     import { customElement } from "@aurelia/runtime-html";
 *     @customElement("foo")
 *     export class Foo {}
 *   `,
 * });
 */
export function createProgramFromMemory(
  files: Record<string, string>,
  rootNames?: string[],
  options: ts.CompilerOptions = {}
): { program: ts.Program; host: ts.CompilerHost } {
  const opts: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    allowJs: true,
    experimentalDecorators: true,
    ...options,
  };

  const normalize = (f: string) => f.replace(/\\/g, "/");
  const mem = new Map(
    Object.entries(files).map(([k, v]) => [normalize(k), v])
  );

  // Collect directories from in-memory files
  const dirs = new Set<string>();
  for (const path of mem.keys()) {
    let dir = path;
    while ((dir = dir.substring(0, dir.lastIndexOf("/"))) && dir !== "") {
      dirs.add(dir);
    }
    dirs.add("/"); // Root directory
  }

  const roots = rootNames ?? Object.keys(files);
  const base = ts.createCompilerHost(opts, true);

  const host: ts.CompilerHost = {
    ...base,
    getCurrentDirectory: () => "/",
    getCanonicalFileName: (f) => normalize(f),
    fileExists: (f) => mem.has(normalize(f)) || base.fileExists(f),
    readFile: (f) => mem.get(normalize(f)) ?? base.readFile(f),
    directoryExists: (d) => {
      const key = normalize(d);
      return dirs.has(key) || base.directoryExists?.(d) || false;
    },
    getSourceFile: (f, lang, onErr, shouldCreate) => {
      const key = normalize(f);
      if (mem.has(key)) {
        return ts.createSourceFile(f, mem.get(key)!, lang, true);
      }
      return base.getSourceFile(f, lang, onErr, shouldCreate);
    },
  };

  const program = ts.createProgram(roots, opts, host);
  return { program, host };
}
