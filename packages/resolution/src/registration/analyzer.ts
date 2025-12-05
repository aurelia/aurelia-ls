import type ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/domain";
import type { SourceFacts } from "../extraction/types.js";
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
      const intents: RegistrationIntent[] = [];

      for (const candidate of candidates) {
        const intent = analyzeCandidate(candidate, facts, graph);
        intents.push(intent);
      }

      return intents;
    },
  };
}

function analyzeCandidate(
  candidate: ResourceCandidate,
  facts: Map<NormalizedPath, SourceFacts>,
  _graph: ImportGraph,
): RegistrationIntent {
  // 1. Check if resource is in static dependencies of another component
  const localScope = findLocalScope(candidate, facts);
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
  const globalEvidence = findGlobalRegistration(candidate, facts);
  if (globalEvidence) {
    return {
      resource: candidate,
      kind: "global",
      scope: null,
      evidence: [globalEvidence],
    };
  }

  // 3. Unknown - resource defined but registration not found
  // For now, default to global to avoid breaking compilation
  return {
    resource: candidate,
    kind: "unknown",
    scope: null,
    evidence: [{ kind: "inferred", reason: "no registration site found" }],
  };
}

/**
 * Find if a resource is used in static dependencies of another component.
 */
function findLocalScope(
  candidate: ResourceCandidate,
  facts: Map<NormalizedPath, SourceFacts>,
): { component: NormalizedPath; className: string } | null {
  for (const [path, fileFacts] of facts) {
    // Don't look in the same file where the resource is defined
    if (path === candidate.source) continue;

    for (const cls of fileFacts.classes) {
      if (!cls.staticDependencies) continue;

      // Check if candidate's className is referenced
      for (const ref of cls.staticDependencies.references) {
        if (ref.kind === "identifier" && ref.name === candidate.className) {
          return { component: path, className: cls.name };
        }
        // TODO: Handle imported references
      }
    }
  }

  return null;
}

/**
 * Find if a resource is registered globally via Aurelia.register() or container.register().
 */
function findGlobalRegistration(
  candidate: ResourceCandidate,
  facts: Map<NormalizedPath, SourceFacts>,
): RegistrationEvidence | null {
  for (const [path, fileFacts] of facts) {
    for (const call of fileFacts.registrationCalls) {
      // Check if candidate is directly in the registration arguments
      if (isDirectlyRegistered(candidate.className, call.arguments)) {
        return {
          kind: call.receiver === "Aurelia" ? "aurelia-register" : "container-register",
          file: path,
          position: call.position,
        };
      }
    }
  }

  // TODO: More sophisticated flow analysis:
  // - Track imports: if resource is imported and then registered
  // - Track spreads: if resource is in an array that's spread into register()
  // - Track barrel files: if resource is re-exported through index.ts

  return null;
}

type RegistrationArg = SourceFacts["registrationCalls"][0]["arguments"][number];

/**
 * Check if a class name is directly in the registration arguments.
 */
function isDirectlyRegistered(
  className: string,
  args: readonly RegistrationArg[],
): boolean {
  for (const arg of args) {
    if (arg.kind === "identifier" && arg.name === className) {
      return true;
    }
    if (arg.kind === "arrayLiteral") {
      if (isDirectlyRegistered(className, arg.elements)) {
        return true;
      }
    }
    // TODO: Handle spread arguments
  }
  return false;
}
