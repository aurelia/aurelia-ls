import { createHash } from "node:crypto";
import {
  browserTemplateStructure,
  parseBrowserTemplateFragmentDraft,
} from "@aurelia-ls/semantic-runtime/browser-template";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
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
  readonly expectation: BrowserTreeOracleCase["expectation"]["kind"];
  readonly outcome: BrowserTreeCaseOutcome;
  readonly declaredDivergence: {
    readonly reasonCode: "customizable-select-parser-support";
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

  switch (candidate.expectation.kind) {
    case "equivalent":
      if (chromium.serialized !== candidate.expectation.serialization) {
        problems.push(
          `Chromium serialization changed: expected ${quoted(candidate.expectation.serialization)}, received ${quoted(chromium.serialized)}.`,
        );
      }
      if (semanticRuntime.serialized !== candidate.expectation.serialization) {
        problems.push(
          `Semantic-runtime serialization changed: expected ${quoted(candidate.expectation.serialization)}, received ${quoted(semanticRuntime.serialized)}.`,
        );
      }
      if (!structureEqual) {
        problems.push("Chromium and semantic-runtime structural normal forms differ.");
      }
      break;
    case "expected-divergence":
      if (authorityVersions.chromium !== candidate.expectation.authorityVersions.chromium) {
        problems.push(
          `Expected-divergence Chromium authority changed: expected ${candidate.expectation.authorityVersions.chromium}, received ${authorityVersions.chromium}.`,
        );
      }
      if (
        authorityVersions.semanticRuntimeParser
        !== candidate.expectation.authorityVersions.semanticRuntimeParser
      ) {
        problems.push(
          `Expected-divergence semantic parser authority changed: expected ${candidate.expectation.authorityVersions.semanticRuntimeParser}, received ${authorityVersions.semanticRuntimeParser}.`,
        );
      }
      if (chromium.serialized !== candidate.expectation.chromiumSerialization) {
        problems.push(
          `Chromium expected-divergence serialization changed: expected ${quoted(candidate.expectation.chromiumSerialization)}, received ${quoted(chromium.serialized)}.`,
        );
      }
      if (semanticRuntime.serialized !== candidate.expectation.semanticRuntimeSerialization) {
        problems.push(
          `Semantic-runtime expected-divergence serialization changed: expected ${quoted(candidate.expectation.semanticRuntimeSerialization)}, received ${quoted(semanticRuntime.serialized)}.`,
        );
      }
      if (serializationEqual || structureEqual) {
        problems.push(
          "The declared customizable-select divergence disappeared; review the authority versions and convert this case to equivalence instead of silently passing it.",
        );
      }
      break;
  }

  return {
    id: candidate.id,
    expectation: candidate.expectation.kind,
    outcome: problems.length > 0
      ? "failed"
      : candidate.expectation.kind === "equivalent"
        ? "matched-equivalence"
        : "matched-expected-divergence",
    declaredDivergence: candidate.expectation.kind === "expected-divergence"
      ? {
          reasonCode: candidate.expectation.reasonCode,
          reason: candidate.expectation.reason,
          authorityVersions: candidate.expectation.authorityVersions,
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

function structureDigest(structure: readonly BrowserTreeStructureNode[]): string {
  const hash = createHash("sha256");
  hash.update(canonicalCompilerJson(structure));
  return `sha256:${hash.digest("hex")}`;
}

function quoted(value: string): string {
  return JSON.stringify(value);
}
