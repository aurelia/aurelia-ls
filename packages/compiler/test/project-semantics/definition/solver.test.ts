import { describe, expect, it } from "vitest";
import {
  getDefinitionFieldRule,
  normalizeDefinitionRuleKey,
  reduceDefinitionAtoms,
  sortDefinitionAtoms,
  type DefinitionEvidenceAtom,
} from "../../../src/project-semantics/definition/index.js";

describe("definition rulebook skeleton", () => {
  it("resolves static and bindable field rules", () => {
    const staticRule = getDefinitionFieldRule("resource.className");
    const bindableRule = getDefinitionFieldRule("bindables.displayData.type");

    expect(staticRule.key).toBe("resource.className");
    expect(staticRule.operator).toBe("locked-identity");

    expect(bindableRule.key).toBe("bindables.*.type");
    expect(bindableRule.operator).toBe("known-over-unknown");

    expect(normalizeDefinitionRuleKey("bindables.foo.mode")).toBe("bindables.*.mode");
  });

  it("sorts atoms deterministically using source/evidence/id tie-break", () => {
    const atoms: DefinitionEvidenceAtom<string>[] = [
      atom("b", "resource.className", "analysis-explicit", 2, { state: "known", value: "B" }),
      atom("a", "resource.className", "analysis-explicit", 2, { state: "known", value: "A" }),
      atom("c", "resource.className", "explicit-config", 5, { state: "known", value: "C" }),
    ];

    const sorted = sortDefinitionAtoms(atoms);
    expect(sorted.map((entry) => entry.atomId)).toEqual(["c", "a", "b"]);
  });

  it("backfills known over unknown for bindable type and records reason", () => {
    const result = reduceDefinitionAtoms<string>([
      atom("high-unknown", "bindables.displayData.type", "explicit-config", 0, { state: "unknown" }),
      atom("low-known", "bindables.displayData.type", "analysis-explicit", 3, { state: "known", value: "DisplayData" }),
    ]);

    expect(result.value).toEqual({ state: "known", value: "DisplayData" });
    expect(result.trace.ruleKey).toBe("bindables.*.type");
    expect(result.trace.winnerAtomId).toBe("low-known");
    expect(result.trace.reasons.some((reason) => reason.code === "unknown-backfilled")).toBe(true);
  });

  it("uses conflictValue for locked identity comparisons", () => {
    const result = reduceDefinitionAtoms([
      {
        ...atom(
          "high",
          "resource.className",
          "analysis-explicit",
          1,
          { state: "known", value: { origin: "source", state: "known", value: "DeviceList", location: { file: "/a.ts", pos: 1, end: 5 } } },
        ),
        conflictValue: "DeviceList",
      },
      {
        ...atom(
          "low",
          "resource.className",
          "analysis-convention",
          4,
          { state: "known", value: { origin: "source", state: "known", value: "DeviceList", location: { file: "/b.ts", pos: 10, end: 14 } } },
        ),
        conflictValue: "DeviceList",
      },
    ]);

    expect(result.trace.reasons.some((reason) => reason.code === "field-conflict")).toBe(false);
  });
});

function atom<T>(
  atomId: string,
  field: DefinitionEvidenceAtom<T>["field"],
  sourceKind: DefinitionEvidenceAtom<T>["sourceKind"],
  evidenceRank: number,
  value: DefinitionEvidenceAtom<T>["value"],
): DefinitionEvidenceAtom<T> {
  return {
    atomId,
    subject: {
      kind: "custom-element",
      name: "device-list",
      scope: "root",
    },
    field,
    value,
    sourceKind,
    evidenceRank,
  };
}
