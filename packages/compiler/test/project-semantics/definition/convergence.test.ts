import { describe, expect, it } from "vitest";
import { normalizePathForId, type CustomElementDef, type ResourceCollections } from "../../../src/index.js";
import { buildBindableDefs, buildCustomElementDef } from "../../../src/project-semantics/assemble/resource-def.js";
import { unwrapSourced } from "../../../src/project-semantics/assemble/sourced.js";
import {
  createCanonicalSourceIdV1,
  serializeCanonicalSourceIdV1,
  mergeResourceDefinitionCandidates,
  mergeResolvedResourceCollections,
  sortResourceDefinitionCandidates,
  type ResourceDefinitionCandidate,
} from "../../../src/project-semantics/definition/index.js";

describe("definition convergence", () => {
  it("merges bindables field-wise for resource definition candidates", () => {
    const fileHigh = normalizePathForId("/repo/high.ts");
    const fileLow = normalizePathForId("/repo/low.ts");

    const high = buildCustomElementDef({
      name: "device-list",
      className: "DeviceList",
      file: fileHigh,
      bindables: buildBindableDefs([{ name: "displayData", mode: "toView" }], fileHigh),
    });
    const low = buildCustomElementDef({
      name: "device-list",
      className: "DeviceList",
      file: fileLow,
      bindables: buildBindableDefs([{ name: "displayData", mode: "twoWay", type: "DisplayData" }], fileLow),
    });

    const candidates: ResourceDefinitionCandidate[] = [
      {
        candidateId: "high",
        resource: high,
        sourceKind: "analysis-explicit",
        evidenceRank: 1,
      },
      {
        candidateId: "low",
        resource: low,
        sourceKind: "analysis-convention",
        evidenceRank: 4,
      },
    ];

    const merged = mergeResourceDefinitionCandidates(candidates).value as CustomElementDef;
    const bindable = merged.bindables.displayData!;
    expect(unwrapSourced(bindable.mode)).toBe("toView");
    expect(unwrapSourced(bindable.type)).toBe("DisplayData");
  });

  it("does not report locked-identity conflicts for equal semantic values with different provenance", () => {
    const fileA = normalizePathForId("/repo/a.ts");
    const fileB = normalizePathForId("/repo/b.ts");
    const a = buildCustomElementDef({
      name: "device-list",
      className: "DeviceList",
      file: fileA,
      bindables: buildBindableDefs([{ name: "displayData", mode: "toView" }], fileA),
    });
    const b = buildCustomElementDef({
      name: "device-list",
      className: "DeviceList",
      file: fileB,
      bindables: buildBindableDefs([{ name: "displayData", mode: "toView" }], fileB),
    });

    const merged = mergeResourceDefinitionCandidates([
      { candidateId: "a", resource: a, sourceKind: "analysis-explicit", evidenceRank: 1 },
      { candidateId: "b", resource: b, sourceKind: "analysis-convention", evidenceRank: 4 },
    ]);

    expect(merged.reasons.some((reason) => reason.code === "field-conflict")).toBe(false);
  });

  it("merges resolved collections without dropping known bindable type", () => {
    const base: ResourceCollections = {
      elements: {
        "device-list": {
          kind: "element",
          name: "device-list",
          bindables: {
            displayData: {
              name: "displayData",
              mode: "toView",
              type: { kind: "ts", name: "DisplayData" },
            },
          },
        },
      },
      attributes: {},
      controllers: {},
      valueConverters: {},
      bindingBehaviors: {},
    };
    const extra: Partial<ResourceCollections> = {
      elements: {
        "device-list": {
          kind: "element",
          name: "device-list",
          bindables: {
            displayData: {
              name: "displayData",
              mode: "twoWay",
            },
          },
        },
      },
    };

    const merged = mergeResolvedResourceCollections(base, extra);
    const bindable = merged.elements["device-list"]!.bindables.displayData!;
    expect(bindable.mode).toBe("twoWay");
    expect(bindable.type).toEqual({ kind: "ts", name: "DisplayData" });
  });

  it("serializes canonical source id with the locked v1 payload shape", () => {
    const file = normalizePathForId("/repo/source/device-list.ts");
    const resource = {
      ...buildCustomElementDef({
        name: "device-list",
        className: "DeviceList",
        file,
        bindables: {},
      }),
      package: "@scope/devices",
    };

    const id = createCanonicalSourceIdV1({
      resource,
      sourceKind: "analysis-explicit",
    });
    expect(id).toEqual({
      v: 1,
      sourceKind: "analysis-explicit",
      packageName: "@scope/devices",
      sourceFileKey: "abs:/repo/source/device-list.ts",
      symbolKey: "DeviceList",
      resourceKind: "custom-element",
      resourceName: "device-list",
    });
    expect(serializeCanonicalSourceIdV1(id)).toBe(
      "{\"packageName\":\"@scope/devices\",\"resourceKind\":\"custom-element\",\"resourceName\":\"device-list\",\"sourceFileKey\":\"abs:/repo/source/device-list.ts\",\"sourceKind\":\"analysis-explicit\",\"symbolKey\":\"DeviceList\",\"v\":1}",
    );
  });

  it("uses npm canonical source file key when file is under node_modules package root", () => {
    const resource = {
      ...buildCustomElementDef({
        name: "device-list",
        className: "DeviceList",
        file: normalizePathForId("/repo/node_modules/@scope/devices/src/device-list.ts"),
        bindables: {},
      }),
      package: "@scope/devices",
    };
    const id = createCanonicalSourceIdV1({
      resource,
      sourceKind: "analysis-explicit",
    });
    expect(id.sourceFileKey).toBe("npm:@scope/devices/src/device-list.ts");
  });

  it("uses workspace canonical source file key when file is under workspace package root", () => {
    const resource = {
      ...buildCustomElementDef({
        name: "device-list",
        className: "DeviceList",
        file: normalizePathForId("/repo/packages/devices/src/device-list.ts"),
        bindables: {},
      }),
      package: "@scope/devices",
    };
    const id = createCanonicalSourceIdV1({
      resource,
      sourceKind: "analysis-explicit",
    });
    expect(id.sourceFileKey).toBe("ws:@scope/devices/src/device-list.ts");
  });

  it("keeps definition merge deterministic when canonical source identities match", () => {
    const file = normalizePathForId("/repo/source/device-list.ts");
    const first = buildCustomElementDef({
      name: "device-list",
      className: "DeviceList",
      file,
      bindables: buildBindableDefs([{ name: "displayData", mode: "toView" }], file),
    });
    const second = buildCustomElementDef({
      name: "device-list",
      className: "DeviceList",
      file,
      bindables: buildBindableDefs([{ name: "displayData", mode: "twoWay" }], file),
    });

    const candidates: ResourceDefinitionCandidate[] = [
      { resource: first, sourceKind: "analysis-explicit", evidenceRank: 1 },
      { resource: second, sourceKind: "analysis-explicit", evidenceRank: 1 },
    ];

    const forward = mergeResourceDefinitionCandidates(candidates).value as CustomElementDef;
    const reversed = mergeResourceDefinitionCandidates([...candidates].reverse()).value as CustomElementDef;

    expect(unwrapSourced(forward.bindables.displayData?.mode)).toBe("toView");
    expect(unwrapSourced(reversed.bindables.displayData?.mode)).toBe("toView");
  });

  it("sorts candidates by canonical source id consistently across input order", () => {
    const a = buildCustomElementDef({
      name: "a-item",
      className: "AItem",
      file: normalizePathForId("/repo/source/a.ts"),
      bindables: {},
    });
    const b = buildCustomElementDef({
      name: "b-item",
      className: "BItem",
      file: normalizePathForId("/repo/source/b.ts"),
      bindables: {},
    });

    const candidates: ResourceDefinitionCandidate[] = [
      { resource: b, sourceKind: "analysis-explicit", evidenceRank: 1 },
      { resource: a, sourceKind: "analysis-explicit", evidenceRank: 1 },
    ];

    const forward = sortResourceDefinitionCandidates(candidates).map((candidate) => unwrapSourced(candidate.resource.name));
    const reversed = sortResourceDefinitionCandidates([...candidates].reverse()).map((candidate) => unwrapSourced(candidate.resource.name));

    expect(forward).toEqual(["a-item", "b-item"]);
    expect(reversed).toEqual(["a-item", "b-item"]);
  });

  it("sorts canonical-source ties by payload key instead of arrival order", () => {
    const file = normalizePathForId("/repo/source/device-list.ts");
    const a = buildCustomElementDef({
      name: "device-list",
      className: "DeviceList",
      file,
      bindables: buildBindableDefs([{ name: "displayData", mode: "toView" }], file),
    });
    const b = buildCustomElementDef({
      name: "device-list",
      className: "DeviceList",
      file,
      bindables: buildBindableDefs([{ name: "displayData", mode: "twoWay" }], file),
    });
    const candidates: ResourceDefinitionCandidate[] = [
      { candidateId: "b", resource: b, sourceKind: "analysis-explicit", evidenceRank: 1 },
      { candidateId: "a", resource: a, sourceKind: "analysis-explicit", evidenceRank: 1 },
    ];
    const forward = sortResourceDefinitionCandidates(candidates).map((candidate) => candidate.candidateId);
    const reversed = sortResourceDefinitionCandidates([...candidates].reverse()).map((candidate) => candidate.candidateId);

    expect(forward).toEqual(reversed);
  });
});
