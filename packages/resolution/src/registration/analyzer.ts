import type ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { SourceFacts, ImportFact, ExportFact, DependencyRef, ClassFacts } from "../extraction/types.js";
import type { ResourceCandidate } from "../inference/types.js";
import type { RegistrationIntent, RegistrationEvidence, ImportGraph } from "./types.js";
import { buildImportGraph } from "./import-graph.js";

/**
 * Registration analyzer interface.
 */
export interface RegistrationAnalyzer {
  analyze(
    candidates: readonly ResourceCandidate[],
    facts: Map<NormalizedPath, SourceFacts>,
    program: ts.Program,
  ): readonly RegistrationIntent[];
}

/**
 * Create a registration analyzer.
 */
export function createRegistrationAnalyzer(): RegistrationAnalyzer {
  return {
    analyze(candidates, facts, program) {
      const graph = buildImportGraph(program);
      const context = new AnalysisContext(facts, graph);
      const intents: RegistrationIntent[] = [];

      for (const candidate of candidates) {
        const intent = analyzeCandidate(candidate, context);
        intents.push(intent);
      }

      return intents;
    },
  };
}

/**
 * Analysis context with precomputed indexes.
 */
class AnalysisContext {
  /** Map from file path to namespace imports in that file: alias → resolvedPath */
  private namespaceImports = new Map<NormalizedPath, Map<string, NormalizedPath>>();

  /** Map from file path to exported class names (including re-exports) */
  private exportedClasses = new Map<NormalizedPath, Set<string>>();

  constructor(
    public readonly facts: Map<NormalizedPath, SourceFacts>,
    public readonly graph: ImportGraph,
  ) {
    this.buildIndexes();
  }

  private buildIndexes(): void {
    // Index namespace imports
    for (const [path, fileFacts] of this.facts) {
      const nsImports = new Map<string, NormalizedPath>();
      for (const imp of fileFacts.imports) {
        if (imp.kind === "namespace" && imp.resolvedPath) {
          nsImports.set(imp.alias, imp.resolvedPath);
        }
      }
      if (nsImports.size > 0) {
        this.namespaceImports.set(path, nsImports);
      }
    }

    // Index exported classes (resolve re-exports)
    for (const [path, _fileFacts] of this.facts) {
      this.exportedClasses.set(path, this.collectExportedClasses(path, new Set()));
    }
  }

  /**
   * Collect all class names exported from a file, resolving re-exports.
   */
  private collectExportedClasses(path: NormalizedPath, visited: Set<NormalizedPath>): Set<string> {
    if (visited.has(path)) return new Set();
    visited.add(path);

    const fileFacts = this.facts.get(path);
    if (!fileFacts) return new Set();

    const classes = new Set<string>();

    // Add directly exported classes
    for (const cls of fileFacts.classes) {
      classes.add(cls.name);
    }

    // Process export declarations
    for (const exp of fileFacts.exports) {
      if (exp.kind === "named") {
        for (const name of exp.names) {
          classes.add(name);
        }
      } else if (exp.kind === "reexport-all" && exp.resolvedPath) {
        // export * from "./foo" - recursively collect
        const reexported = this.collectExportedClasses(exp.resolvedPath, visited);
        for (const name of reexported) {
          classes.add(name);
        }
      } else if (exp.kind === "reexport-named" && exp.resolvedPath) {
        // export { a, b } from "./foo"
        for (const exported of exp.names) {
          classes.add(exported.alias ?? exported.name);
        }
      }
    }

    return classes;
  }

  /**
   * Get the resolved path for a namespace import alias.
   */
  getNamespaceImportPath(file: NormalizedPath, alias: string): NormalizedPath | null {
    return this.namespaceImports.get(file)?.get(alias) ?? null;
  }

  /**
   * Get all class names exported from a file (including re-exports).
   */
  getExportedClasses(file: NormalizedPath): Set<string> {
    return this.exportedClasses.get(file) ?? new Set();
  }

  /**
   * Check if a class is exported from a file (directly or via re-export).
   */
  isClassExportedFrom(className: string, file: NormalizedPath): boolean {
    return this.getExportedClasses(file).has(className);
  }
}

function analyzeCandidate(
  candidate: ResourceCandidate,
  context: AnalysisContext,
): RegistrationIntent {
  // 1. Check if resource is in static dependencies of another component
  const localScope = findLocalScope(candidate, context);
  if (localScope) {
    return {
      resource: candidate,
      kind: "local",
      scope: localScope.component,
      evidence: [
        {
          kind: "static-dependencies",
          component: localScope.component,
          className: localScope.className,
        },
      ],
    };
  }

  // 2. Check if resource traces to Aurelia.register() / container.register()
  const globalEvidence = findGlobalRegistration(candidate, context);
  if (globalEvidence) {
    return {
      resource: candidate,
      kind: "global",
      scope: null,
      evidence: [globalEvidence],
    };
  }

  // 3. Unknown - resource defined but registration not found
  return {
    resource: candidate,
    kind: "unknown",
    scope: null,
    evidence: [{ kind: "inferred", reason: "no registration site found" }],
  };
}

/**
 * Find if a resource is used in local dependencies of another component.
 * Checks all dependency declaration forms:
 * - static dependencies = [...]
 * - static $au = { dependencies: [...] }
 * - @customElement({ dependencies: [...] })
 */
function findLocalScope(
  candidate: ResourceCandidate,
  context: AnalysisContext,
): { component: NormalizedPath; className: string } | null {
  for (const [path, fileFacts] of context.facts) {
    // Don't look in the same file where the resource is defined
    if (path === candidate.source) continue;

    for (const cls of fileFacts.classes) {
      // Collect all dependency refs from all sources
      const allDeps = collectAllDependencies(cls);

      // Check if candidate's className is referenced
      for (const ref of allDeps) {
        if (ref.kind === "identifier" && ref.name === candidate.className) {
          return { component: path, className: cls.name };
        }
      }
    }
  }

  return null;
}

/**
 * Collect dependency references from all declaration forms on a class.
 */
function collectAllDependencies(cls: ClassFacts): DependencyRef[] {
  const deps: DependencyRef[] = [];

  // 1. static dependencies = [...]
  if (cls.staticDependencies) {
    deps.push(...cls.staticDependencies.references);
  }

  // 2. static $au = { dependencies: [...] }
  if (cls.staticAu?.dependencies) {
    deps.push(...cls.staticAu.dependencies);
  }

  // 3. @customElement({ dependencies: [...] }) or similar decorators
  for (const dec of cls.decorators) {
    if (dec.args?.kind === "object") {
      const depsProp = dec.args.properties["dependencies"];
      if (depsProp?.kind === "dependencyArray") {
        deps.push(...depsProp.refs);
      }
    }
  }

  return deps;
}

/**
 * Find if a resource is registered globally via Aurelia.register() or container.register().
 */
function findGlobalRegistration(
  candidate: ResourceCandidate,
  context: AnalysisContext,
): RegistrationEvidence | null {
  for (const [path, fileFacts] of context.facts) {
    for (const call of fileFacts.registrationCalls) {
      // Check if candidate is registered via this call
      if (isRegisteredViaCall(candidate, call, path, context)) {
        return {
          kind: call.receiver === "Aurelia" ? "aurelia-register" : "container-register",
          file: path,
          position: call.position,
        };
      }
    }
  }

  return null;
}

type RegistrationArg = SourceFacts["registrationCalls"][0]["arguments"][number];
type RegistrationCall = SourceFacts["registrationCalls"][0];

/**
 * Check if a candidate is registered via a specific register() call.
 */
function isRegisteredViaCall(
  candidate: ResourceCandidate,
  call: RegistrationCall,
  callFile: NormalizedPath,
  context: AnalysisContext,
): boolean {
  for (const arg of call.arguments) {
    if (isRegisteredViaArg(candidate, arg, callFile, context)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a candidate is registered via a specific argument.
 */
function isRegisteredViaArg(
  candidate: ResourceCandidate,
  arg: RegistrationArg,
  argFile: NormalizedPath,
  context: AnalysisContext,
): boolean {
  // Direct identifier: Aurelia.register(MyElement)
  if (arg.kind === "identifier") {
    if (arg.name === candidate.className) {
      return true;
    }
  }

  // Array literal: Aurelia.register([A, B, C])
  if (arg.kind === "arrayLiteral") {
    for (const el of arg.elements) {
      if (isRegisteredViaArg(candidate, el, argFile, context)) {
        return true;
      }
    }
  }

  // Spread: Aurelia.register(...components)
  if (arg.kind === "spread") {
    // Look up what "components" refers to
    const barrelPath = context.getNamespaceImportPath(argFile, arg.name);
    if (barrelPath) {
      // Check if candidate's class is exported from the barrel
      if (context.isClassExportedFrom(candidate.className, barrelPath)) {
        return true;
      }
    }
  }

  return false;
}
