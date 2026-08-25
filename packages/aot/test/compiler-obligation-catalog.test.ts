import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMPILER_CORPUS_FRAMEWORK_REVISION } from "../src/testing/compiler-case.js";
import {
  COMPILER_OBLIGATION_FAMILIES,
  type CompilerObligationFamily,
} from "../src/testing/compiler-obligation-audit.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const aureliaRoot = resolve(repositoryRoot, "aurelia");

describe("compiler obligation catalog", () => {
  it("uses one stable semantic identity per obligation", () => {
    const ids = COMPILER_OBLIGATION_CATALOG.map((obligation) => obligation.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^compiler\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/u);
      expect(id).not.toMatch(/:\d+|\.spec\.|\\|\//u);
    }

    const catalogIds = new Set(ids);
    for (const witnessedId of [
      "compiler.attribute.plain-binding-command",
      "compiler.attribute.plain-static",
      "compiler.binding-mode.native-default",
      "compiler.expression.property-entry",
      "compiler.instruction.listener-binding",
      "compiler.instruction.property-binding",
      "compiler.text.interpolation-expansion",
      "compiler.tree.marker.element-target",
      "compiler.tree.marker.text-target",
      "compiler.tree.no-target.static-only",
    ] as const) {
      expect(catalogIds.has(witnessedId), witnessedId).toBe(true);
    }
  });

  it("covers every declared horizontal obligation family", () => {
    const actualFamilies = new Set<CompilerObligationFamily>(
      COMPILER_OBLIGATION_CATALOG.map((obligation) => obligation.family),
    );

    expect([...actualFamilies].sort()).toEqual([...COMPILER_OBLIGATION_FAMILIES].sort());
  });

  it("anchors authorities to canonical files at the pinned framework revision", () => {
    const roles = new Set<string>();

    for (const obligation of COMPILER_OBLIGATION_CATALOG) {
      expect(obligation.authorities.length, obligation.id).toBeGreaterThan(0);
      for (const authority of obligation.authorities) {
        roles.add(authority.role);
        expect(authority.repository, obligation.id).toBe("aurelia");
        expect(authority.revision, obligation.id).toBe(COMPILER_CORPUS_FRAMEWORK_REVISION);
        expect(authority.filePath, obligation.id).toMatch(/^(?:packages|scripts)\//u);
        expect(authority.filePath, obligation.id).not.toMatch(/\\|(?:^|\/)\.\.(?:\/|$)/u);
        expect(authority.startLine, obligation.id).toBeGreaterThan(0);
        expect(authority.endLine ?? authority.startLine, obligation.id).toBeGreaterThanOrEqual(
          authority.startLine,
        );
        expect(authority.summary.trim().length, obligation.id).toBeGreaterThan(0);
        expect(existsSync(resolve(aureliaRoot, authority.filePath)), authority.filePath).toBe(true);
        const lineCount = readFileSync(resolve(aureliaRoot, authority.filePath), "utf8").split(/\r?\n/u).length;
        expect(authority.endLine ?? authority.startLine, `${obligation.id}: ${authority.filePath}`).toBeLessThanOrEqual(
          lineCount,
        );
      }
    }

    expect(roles).toEqual(new Set(["behavior", "implementation", "runtime-consequence"]));
  });

  it("records independent initial axes without implying conservation closure", () => {
    for (const obligation of COMPILER_OBLIGATION_CATALOG) {
      const audit = obligation.disposition;
      expect(audit.source, obligation.id).not.toBe("unreviewed");
      expect(audit.oracle.length, obligation.id).toBeGreaterThan(0);
      expect(audit.semanticRuntime.length, obligation.id).toBeGreaterThan(0);
      expect(audit.effect.length, obligation.id).toBeGreaterThan(0);
      expect(audit.policy.length, obligation.id).toBeGreaterThan(0);
      expect(audit.closure.state, obligation.id).not.toBe("closed");
      expect(audit.closure.reason.trim().length, obligation.id).toBeGreaterThan(0);
      expect(audit.gaps.length, obligation.id).toBeGreaterThan(0);
    }
  });
});
