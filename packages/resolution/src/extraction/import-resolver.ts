import type { NormalizedPath } from "@aurelia-ls/compiler";
import type {
  SourceFacts,
  ClassFacts,
  DependencyRef,
  StaticDependenciesFact,
  StaticAuFact,
  DecoratorFact,
  DecoratorArgFact,
  PropertyValueFact,
} from "./types.js";

/**
 * Resolve import paths for all DependencyRef instances in the extracted facts.
 *
 * This is a separate phase from extraction because:
 * 1. Extraction is pure AST parsing
 * 2. Import resolution is a distinct concern (mapping identifiers to files)
 * 3. Clean phase separation enables independent testing
 *
 * Note: This function does NOT need a ts.Program because ImportFact.resolvedPath
 * is already populated during extraction. We just need to look up identifiers
 * in the import map and copy the resolved paths.
 */
export function resolveImports(
  facts: Map<NormalizedPath, SourceFacts>,
): Map<NormalizedPath, SourceFacts> {
  const result = new Map<NormalizedPath, SourceFacts>();

  for (const [path, fileFacts] of facts) {
    result.set(path, resolveImportsInFile(fileFacts));
  }

  return result;
}

/**
 * Resolve imports for a single file's facts.
 */
function resolveImportsInFile(fileFacts: SourceFacts): SourceFacts {
  // Build lookup map: local identifier name → resolved file path
  const importMap = buildImportMap(fileFacts);

  // If no imports to resolve, return unchanged
  if (importMap.size === 0) {
    return fileFacts;
  }

  // Resolve DependencyRefs in all classes
  const resolvedClasses = fileFacts.classes.map((cls) =>
    resolveClassDependencies(cls, importMap),
  );

  return {
    ...fileFacts,
    classes: resolvedClasses,
  };
}

/**
 * Build a map from local identifier names to their resolved file paths.
 *
 * Handles:
 * - Named imports: `import { Foo, Bar as Baz } from "./foo"` → Foo, Baz
 * - Default imports: `import Foo from "./foo"` → Foo
 *
 * Namespace imports (`import * as ns from "./foo"`) are not mapped here
 * because they're accessed via property access (ns.Foo), not direct identifiers.
 */
function buildImportMap(fileFacts: SourceFacts): Map<string, NormalizedPath> {
  const map = new Map<string, NormalizedPath>();

  for (const imp of fileFacts.imports) {
    if (!imp.resolvedPath) continue;

    if (imp.kind === "named") {
      for (const name of imp.names) {
        // Use alias if present, otherwise the original name
        // import { Foo } → local name is "Foo"
        // import { Foo as Bar } → local name is "Bar"
        const localName = name.alias ?? name.name;
        map.set(localName, imp.resolvedPath);
      }
    } else if (imp.kind === "default") {
      // import Foo from "./foo" → local name is "Foo" (stored in alias)
      map.set(imp.alias, imp.resolvedPath);
    }
    // Namespace imports are intentionally skipped - they require property access
  }

  return map;
}

/**
 * Resolve DependencyRefs in a class's dependencies.
 */
function resolveClassDependencies(
  cls: ClassFacts,
  importMap: Map<string, NormalizedPath>,
): ClassFacts {
  const staticDependencies = cls.staticDependencies
    ? resolveStaticDependencies(cls.staticDependencies, importMap)
    : null;

  const staticAu = cls.staticAu
    ? resolveStaticAu(cls.staticAu, importMap)
    : null;

  const decorators = cls.decorators.map((dec) =>
    resolveDecorator(dec, importMap),
  );

  // Only create new object if something changed
  if (
    staticDependencies === cls.staticDependencies &&
    staticAu === cls.staticAu &&
    decorators === cls.decorators
  ) {
    return cls;
  }

  return {
    ...cls,
    staticDependencies,
    staticAu,
    decorators,
  };
}

/**
 * Resolve DependencyRefs in static dependencies array.
 */
function resolveStaticDependencies(
  deps: StaticDependenciesFact,
  importMap: Map<string, NormalizedPath>,
): StaticDependenciesFact {
  const references = deps.references.map((ref) =>
    resolveDependencyRef(ref, importMap),
  );

  // Check if anything changed
  const changed = references.some((ref, i) => ref !== deps.references[i]);
  if (!changed) {
    return deps;
  }

  return { references };
}

/**
 * Resolve a single DependencyRef.
 */
function resolveDependencyRef(
  ref: DependencyRef,
  importMap: Map<string, NormalizedPath>,
): DependencyRef {
  if (ref.kind !== "identifier") return ref;
  if (ref.resolvedPath !== null) return ref; // Already resolved

  const resolvedPath = importMap.get(ref.name) ?? null;

  // If we couldn't resolve it, return unchanged
  if (resolvedPath === null) {
    return ref;
  }

  return {
    ...ref,
    resolvedPath,
  };
}

/**
 * Resolve DependencyRefs in static $au.dependencies.
 */
function resolveStaticAu(
  au: StaticAuFact,
  importMap: Map<string, NormalizedPath>,
): StaticAuFact {
  if (!au.dependencies || au.dependencies.length === 0) {
    return au;
  }

  const dependencies = au.dependencies.map((ref) =>
    resolveDependencyRef(ref, importMap),
  );

  // Check if anything changed
  const changed = dependencies.some((ref, i) => ref !== au.dependencies![i]);
  if (!changed) {
    return au;
  }

  return {
    ...au,
    dependencies,
  };
}

/**
 * Resolve DependencyRefs in decorator dependencies.
 */
function resolveDecorator(
  dec: DecoratorFact,
  importMap: Map<string, NormalizedPath>,
): DecoratorFact {
  if (!dec.args || dec.args.kind !== "object") {
    return dec;
  }

  const depsProp = dec.args.properties["dependencies"];
  if (!depsProp || depsProp.kind !== "dependencyArray") {
    return dec;
  }

  const resolvedRefs = depsProp.refs.map((ref) =>
    resolveDependencyRef(ref, importMap),
  );

  // Check if anything changed
  const changed = resolvedRefs.some((ref, i) => ref !== depsProp.refs[i]);
  if (!changed) {
    return dec;
  }

  const newDepsProp: PropertyValueFact = {
    kind: "dependencyArray",
    refs: resolvedRefs,
  };

  const newArgs: DecoratorArgFact = {
    kind: "object",
    properties: {
      ...dec.args.properties,
      dependencies: newDepsProp,
    },
  };

  return {
    ...dec,
    args: newArgs,
  };
}
