import { createHash } from "node:crypto";
import {
  browserTemplateStructure,
  parseBrowserTemplateFragmentDraft,
} from "@aurelia-ls/semantic-runtime/browser-template";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
import type {
  CompilerFocusedInvariant,
  CompilerInvariantSelector,
  CompilerOracleLaneId,
} from "./compiler-case.js";
import type { BrowserTreeOracleCase } from "./browser-tree-oracle-cases.js";

export interface BrowserTreeStructureAttribute {
  readonly name: string;
  readonly value: string;
  readonly namespaceUri: string | null;
  readonly prefix: string | null;
}

export type BrowserTreeStructureNode =
  | {
      readonly kind: "element";
      readonly tagName: string;
      readonly namespaceUri: string;
      readonly attributes: readonly BrowserTreeStructureAttribute[];
      readonly children: readonly BrowserTreeStructureNode[];
      readonly content: readonly BrowserTreeStructureNode[] | null;
    }
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "comment"; readonly value: string }
  | { readonly kind: "doctype"; readonly name: string; readonly publicId: string; readonly systemId: string };

export interface BrowserTreeObservation {
  readonly id: string;
  readonly serialized: string;
  readonly structure: readonly BrowserTreeStructureNode[];
}

export interface SemanticBrowserTreeAuthorityProfile {
  readonly schemaVersion: string;
  readonly parser: "parse5";
  readonly parserVersion: string;
  readonly context: "html-template-fragment";
  readonly scriptingEnabled: false;
}

export interface SemanticBrowserTreeBatch {
  readonly authority: SemanticBrowserTreeAuthorityProfile;
  readonly observations: readonly BrowserTreeObservation[];
}

export type BrowserTreeCaseOutcome = "matched-equivalence" | "matched-expected-divergence" | "failed";

export interface BrowserTreeOracleAuthorityVersions {
  readonly chromium: string;
  readonly semanticRuntimeParser: string;
}

export interface BrowserTreeCaseEvaluation {
  readonly id: string;
  readonly expectation: "equivalent" | "expected-divergence";
  readonly outcome: BrowserTreeCaseOutcome;
  readonly declaredDivergence: {
    readonly reasonCode: string;
    readonly reason: string;
    readonly authorityVersions: BrowserTreeOracleAuthorityVersions;
  } | null;
  readonly serializationEqual: boolean;
  readonly structureEqual: boolean;
  readonly chromium: {
    readonly serialized: string;
    readonly structureDigest: string;
  };
  readonly semanticRuntime: {
    readonly serialized: string;
    readonly structureDigest: string;
  };
  readonly problems: readonly string[];
}

/** Run the semantic-runtime side through its pinned browser-template profile. */
export function observeSemanticBrowserTrees(cases: readonly BrowserTreeOracleCase[]): SemanticBrowserTreeBatch {
  let authority: SemanticBrowserTreeAuthorityProfile | undefined;
  const observations = cases.map((candidate) => {
    const draft = parseBrowserTemplateFragmentDraft(candidate.markup);
    const currentAuthority: SemanticBrowserTreeAuthorityProfile = {
      schemaVersion: draft.authority.schemaVersion,
      parser: draft.authority.parser,
      parserVersion: draft.authority.parserVersion,
      context: draft.authority.context,
      scriptingEnabled: draft.authority.scriptingEnabled,
    };
    if (authority == null) {
      authority = currentAuthority;
    } else if (canonicalCompilerJson(authority) !== canonicalCompilerJson(currentAuthority)) {
      throw new Error(`Semantic browser-tree authority changed while parsing ${candidate.id}.`);
    }
    return {
      id: candidate.id,
      serialized: draft.serialized,
      structure: browserTemplateStructure(draft.fragment),
    };
  });
  if (authority == null) {
    throw new Error("Cannot observe an empty semantic browser-tree batch.");
  }
  return { authority, observations };
}

/** Compare one independent Chromium observation to the semantic-runtime draft. */
export function evaluateBrowserTreeCase(
  candidate: BrowserTreeOracleCase,
  chromium: BrowserTreeObservation,
  semanticRuntime: BrowserTreeObservation,
  authorityVersions: BrowserTreeOracleAuthorityVersions,
): BrowserTreeCaseEvaluation {
  if (chromium.id !== candidate.id || semanticRuntime.id !== candidate.id) {
    throw new Error(`Browser-tree observation identity mismatch for ${candidate.id}.`);
  }
  const chromiumStructureDigest = structureDigest(chromium.structure);
  const semanticStructureDigest = structureDigest(semanticRuntime.structure);
  const serializationEqual = chromium.serialized === semanticRuntime.serialized;
  const structureEqual = chromiumStructureDigest === semanticStructureDigest
    && canonicalCompilerJson(chromium.structure) === canonicalCompilerJson(semanticRuntime.structure);
  const problems: string[] = [];
  const claim = browserComparisonClaim(candidate);

  switch (claim.kind) {
    case "equivalent":
      if (!structureEqual) {
        problems.push("Chromium and semantic-runtime structural normal forms differ.");
      }
      break;
    case "expected-divergence": {
      const expectedAuthorities = browserDivergenceAuthorityVersions(candidate.id, claim.authorityVersions);
      if (authorityVersions.chromium !== expectedAuthorities.chromium) {
        problems.push(
          `Expected-divergence Chromium authority changed: expected ${expectedAuthorities.chromium}, received ${authorityVersions.chromium}.`,
        );
      }
      if (authorityVersions.semanticRuntimeParser !== expectedAuthorities.semanticRuntimeParser) {
        problems.push(
          `Expected-divergence semantic parser authority changed: expected ${expectedAuthorities.semanticRuntimeParser}, received ${authorityVersions.semanticRuntimeParser}.`,
        );
      }
      if (structureEqual) {
        problems.push(
          "The declared customizable-select divergence disappeared; review the authority versions and convert this case to equivalence instead of silently passing it.",
        );
      }
      break;
    }
  }
  problems.push(...browserInvariantProblems(candidate.invariants, chromium, semanticRuntime));

  return {
    id: candidate.id,
    expectation: claim.kind,
    outcome: problems.length > 0
      ? "failed"
      : claim.kind === "equivalent"
        ? "matched-equivalence"
        : "matched-expected-divergence",
    declaredDivergence: claim.kind === "expected-divergence"
      ? {
          reasonCode: claim.reasonCode,
          reason: claim.reason,
          authorityVersions: browserDivergenceAuthorityVersions(candidate.id, claim.authorityVersions),
        }
      : null,
    serializationEqual,
    structureEqual,
    chromium: {
      serialized: chromium.serialized,
      structureDigest: chromiumStructureDigest,
    },
    semanticRuntime: {
      serialized: semanticRuntime.serialized,
      structureDigest: semanticStructureDigest,
    },
    problems,
  };
}

function browserComparisonClaim(candidate: BrowserTreeOracleCase): BrowserTreeOracleCase["oracles"]["claims"][number] {
  if (candidate.oracles.claims.length !== 1) {
    throw new Error(`Browser-tree case ${candidate.id} requires exactly one comparison claim.`);
  }
  return candidate.oracles.claims[0]!;
}

function browserDivergenceAuthorityVersions(
  caseId: string,
  versions: Readonly<Record<string, string>>,
): BrowserTreeOracleAuthorityVersions {
  const chromium = versions.chromium;
  const semanticRuntimeParser = versions.semanticRuntimeParser;
  if (chromium == null || semanticRuntimeParser == null) {
    throw new Error(`Browser-tree case ${caseId} has incomplete expected-divergence authorities.`);
  }
  return { chromium, semanticRuntimeParser };
}

function browserInvariantProblems(
  invariants: readonly CompilerFocusedInvariant[],
  chromium: BrowserTreeObservation,
  semanticRuntime: BrowserTreeObservation,
): readonly string[] {
  const problems: string[] = [];
  for (const invariant of invariants) {
    for (const lane of invariant.lanes) {
      const observation = browserObservationForLane(lane, chromium, semanticRuntime);
      const selected = browserInvariantValue(invariant.selector, observation);
      switch (invariant.assertion.kind) {
        case "equal":
          if (
            selected === browserMissingValue
            || canonicalCompilerJson(selected) !== canonicalCompilerJson(invariant.assertion.expected)
          ) {
            problems.push(`Focused invariant ${invariant.id} failed in ${lane}.`);
          }
          break;
        case "includes":
          if (typeof selected !== "string" || !selected.includes(invariant.assertion.expected)) {
            problems.push(`Focused invariant ${invariant.id} failed in ${lane}.`);
          }
          break;
      }
    }
  }
  return problems;
}

function browserObservationForLane(
  lane: CompilerOracleLaneId,
  chromium: BrowserTreeObservation,
  semanticRuntime: BrowserTreeObservation,
): BrowserTreeObservation {
  switch (lane) {
    case "chromium-parser":
      return chromium;
    case "semantic-runtime":
      return semanticRuntime;
    default:
      throw new Error(`Browser-tree invariant cannot read ${lane}.`);
  }
}

const browserMissingValue = Symbol("browser-missing-value");

function browserInvariantValue(
  selector: CompilerInvariantSelector,
  observation: BrowserTreeObservation,
): unknown {
  switch (selector.kind) {
    case "browser-serialization":
      return observation.serialized;
    case "browser-tree-path": {
      let value: unknown = observation.structure;
      for (const segment of selector.path) {
        if (value == null || typeof value !== "object") {
          return browserMissingValue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, String(segment));
        if (descriptor == null || !("value" in descriptor)) {
          return browserMissingValue;
        }
        value = descriptor.value;
      }
      return value;
    }
    default:
      throw new Error(`Browser-tree observation cannot read selector ${selector.kind}.`);
  }
}

function structureDigest(structure: readonly BrowserTreeStructureNode[]): string {
  const hash = createHash("sha256");
  hash.update(canonicalCompilerJson(structure));
  return `sha256:${hash.digest("hex")}`;
}
