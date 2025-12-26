import * as ts from "typescript";

export function createProgramFromMemory(memFiles, rootNames, options = {}) {
  const opts = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noEmit: true,
    allowJs: true,
    allowImportingTsExtensions: true,
    ...options,
  };

  const normalize = (f) => f.replace(/\\/g, "/");
  const mem = new Map(Object.entries(memFiles).map(([k, v]) => [normalize(k), v]));

  const base = ts.createCompilerHost(opts, true);

  const host = {
    ...base,
    getCurrentDirectory: () => "/mem",
    getCanonicalFileName: (f) => f.toLowerCase(),
    fileExists: (f) => mem.has(normalize(f)) || base.fileExists(f),
    readFile: (f) => (mem.get(normalize(f)) ?? base.readFile(f)),
    getSourceFile: (f, lang, onErr, shouldCreate) => {
      const key = normalize(f);
      if (mem.has(key)) {
        return ts.createSourceFile(f, mem.get(key), lang, true);
      }
      return base.getSourceFile(f, lang, onErr, shouldCreate);
    },
  };

  const program = ts.createProgram(rootNames, opts, host);
  return { ts, program, host, options: opts };
}
