import { execFileSync } from "node:child_process";
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
import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-case-registry.js";
import { BROWSER_TREE_ORACLE_CASES } from "../src/testing/browser-tree-oracle-cases.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const aureliaRoot = resolve(repositoryRoot, "aurelia");
const workspaceAuthoritySource = new Map<string, string>();
const frameworkAuthoritySources = new Map<string, string>();

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

  it("anchors catalog and case authorities to canonical files at their pinned revisions", () => {
    const roles = new Set<string>();

    const owners = [
      ...COMPILER_OBLIGATION_CATALOG.map((obligation) => ({
        id: obligation.id,
        authorities: obligation.authorities,
      })),
      ...JIT_ORACLE_CASES.map((candidate) => ({ id: candidate.id, authorities: candidate.provenance })),
      ...BROWSER_TREE_ORACLE_CASES.map((candidate) => ({ id: candidate.id, authorities: candidate.provenance })),
    ];
    for (const owner of owners) {
      expect(owner.authorities.length, owner.id).toBeGreaterThan(0);
      for (const authority of owner.authorities) {
        roles.add(authority.role);
        if (authority.repository === "aurelia") {
          expect(authority.revision, owner.id).toBe(COMPILER_CORPUS_FRAMEWORK_REVISION);
        } else {
          expect(authority.revision, owner.id).toMatch(/^[0-9a-f]{40}$/u);
        }
        expect(authority.filePath, owner.id).toMatch(/^(?:packages|scripts)\//u);
        expect(authority.filePath, owner.id).not.toMatch(/\\|(?:^|\/)\.\.(?:\/|$)/u);
        expect(authority.startLine, owner.id).toBeGreaterThan(0);
        expect(authority.endLine ?? authority.startLine, owner.id).toBeGreaterThanOrEqual(
          authority.startLine,
        );
        expect(authority.summary.trim().length, owner.id).toBeGreaterThan(0);
        const source = authority.repository === "aurelia"
          ? frameworkAuthoritySource(authority.filePath)
          : historicalWorkspaceAuthoritySource(authority.revision, authority.filePath);
        const lineCount = source.split(/\r?\n/u).length;
        expect(authority.endLine ?? authority.startLine, `${owner.id}: ${authority.filePath}`).toBeLessThanOrEqual(
          lineCount,
        );
      }
    }

    expect(roles).toEqual(new Set([
      "behavior",
      "history",
      "implementation",
      "regression",
      "runtime-consequence",
    ]));
  });

  it("records independent axes and names the only explicitly closed obligation", () => {
    const closed: string[] = [];
    for (const obligation of COMPILER_OBLIGATION_CATALOG) {
      const audit = obligation.disposition;
      expect(audit.source, obligation.id).not.toBe("unreviewed");
      expect(audit.oracle.length, obligation.id).toBeGreaterThan(0);
      expect(audit.semanticRuntime.length, obligation.id).toBeGreaterThan(0);
      expect(audit.effect.length, obligation.id).toBeGreaterThan(0);
      expect(audit.policy.length, obligation.id).toBeGreaterThan(0);
      expect(audit.closure.reason.trim().length, obligation.id).toBeGreaterThan(0);
      if (audit.closure.state === "closed") {
        closed.push(obligation.id);
        expect(audit.gaps, obligation.id).toEqual([]);
      } else {
        expect(audit.gaps.length, obligation.id).toBeGreaterThan(0);
      }
    }
    expect(closed).toEqual(["compiler.browser-tree.fragment-context"]);
  });
});

function frameworkAuthoritySource(filePath: string): string {
  const existing = frameworkAuthoritySources.get(filePath);
  if (existing != null) {
    return existing;
  }
  const fullPath = resolve(aureliaRoot, filePath);
  expect(existsSync(fullPath), filePath).toBe(true);
  const source = readFileSync(fullPath, "utf8");
  frameworkAuthoritySources.set(filePath, source);
  return source;
}

function historicalWorkspaceAuthoritySource(revision: string, filePath: string): string {
  const key = `${revision}:${filePath}`;
  const existing = workspaceAuthoritySource.get(key);
  if (existing != null) {
    return existing;
  }
  const source = execFileSync("git", ["-C", repositoryRoot, "show", key], {
    encoding: "utf8",
    windowsHide: true,
  });
  workspaceAuthoritySource.set(key, source);
  return source;
}
