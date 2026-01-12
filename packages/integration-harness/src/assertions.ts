import { INSTRUCTION_TYPE } from "@aurelia-ls/compiler";
import type { ResourceCollections } from "@aurelia-ls/compiler";
import type { AssertionFailure, RegistrationPlanResourceSet, RegistrationPlanScopeExpectation, ScenarioExpectations } from "./schema.js";
import type { IntegrationRun } from "./runner.js";

type InstructionSummary = { type: string; res?: string; target?: number };

const TYPE_NAMES = new Map<number, string>(
  Object.entries(INSTRUCTION_TYPE).map(([key, value]) => [value, key]),
);

export function evaluateExpectations(
  run: IntegrationRun,
  expectations?: ScenarioExpectations,
): AssertionFailure[] {
  if (!expectations) return [];

  const failures: AssertionFailure[] = [];
  failures.push(...assertResources(run, expectations));
  failures.push(...assertBindables(run, expectations));
  failures.push(...assertDiagnostics(run, expectations));
  failures.push(...assertGaps(run, expectations));
  failures.push(...assertAot(run, expectations));
  failures.push(...assertRegistrationPlan(run, expectations));
  return failures;
}

function assertResources(run: IntegrationRun, expectations: ScenarioExpectations): AssertionFailure[] {
  const resources = expectations.resources;
  if (!resources) return [];
  const failures: AssertionFailure[] = [];

  if (resources.global && resources.global.length) {
    const names = collectScopeResourceNames(run.resourceGraph.root, run);
    for (const name of resources.global) {
      if (!names.has(name)) {
        failures.push({
          kind: "resource:global",
          message: `Missing global resource "${name}".`,
        });
      }
    }
  }

  if (resources.local) {
    for (const [key, expected] of Object.entries(resources.local)) {
      const scopeId = resolveScopeKey(key, run);
      const names = collectScopeResourceNames(scopeId, run);
      for (const name of expected) {
        if (!names.has(name)) {
          failures.push({
            kind: "resource:local",
            message: `Missing local resource "${name}" in scope "${scopeId}".`,
          });
        }
      }
    }
  }

  return failures;
}

function assertBindables(run: IntegrationRun, expectations: ScenarioExpectations): AssertionFailure[] {
  if (!expectations.bindables || expectations.bindables.length === 0) return [];
  const failures: AssertionFailure[] = [];
  const collections = run.semantics.resources;

  if (!collections) {
    failures.push({
      kind: "bindable",
      message: "Semantics resources missing; cannot validate bindables.",
    });
    return failures;
  }

  for (const expected of expectations.bindables) {
    const resource = findResource(collections, expected.resource);
    if (!resource) {
      failures.push({
        kind: "bindable",
        message: `Resource "${expected.resource}" not found for bindable check.`,
      });
      continue;
    }

    const bindable = resource.bindables?.[expected.name];
    if (!bindable) {
      failures.push({
        kind: "bindable",
        message: `Bindable "${expected.name}" not found on "${expected.resource}".`,
      });
      continue;
    }

    if (expected.attribute && bindable.attribute !== expected.attribute) {
      failures.push({
        kind: "bindable",
        message: `Bindable "${expected.name}" attribute mismatch for "${expected.resource}".`,
        details: { expected: expected.attribute, actual: bindable.attribute },
      });
    }

    if (expected.mode && bindable.mode !== expected.mode) {
      failures.push({
        kind: "bindable",
        message: `Bindable "${expected.name}" mode mismatch for "${expected.resource}".`,
        details: { expected: expected.mode, actual: bindable.mode },
      });
    }

    if (expected.primary !== undefined && bindable.primary !== expected.primary) {
      failures.push({
        kind: "bindable",
        message: `Bindable "${expected.name}" primary mismatch for "${expected.resource}".`,
        details: { expected: expected.primary, actual: bindable.primary },
      });
    }
  }

  return failures;
}

function assertDiagnostics(run: IntegrationRun, expectations: ScenarioExpectations): AssertionFailure[] {
  if (!expectations.diagnostics || expectations.diagnostics.length === 0) return [];
  const failures: AssertionFailure[] = [];

  for (const expected of expectations.diagnostics) {
    const match = run.diagnostics.find((diag) => {
      if (diag.code !== expected.code) return false;
      if (expected.severity && diag.severity !== expected.severity) return false;
      if (expected.contains && !diag.message.includes(expected.contains)) return false;
      return true;
    });
    if (!match) {
      failures.push({
        kind: "diagnostic",
        message: `Expected diagnostic "${expected.code}" not found.`,
      });
    }
  }
  return failures;
}

function assertGaps(run: IntegrationRun, expectations: ScenarioExpectations): AssertionFailure[] {
  if (!expectations.gaps || expectations.gaps.length === 0) return [];
  const failures: AssertionFailure[] = [];
  const gaps = run.catalog.gaps ?? [];

  for (const expected of expectations.gaps) {
    const match = gaps.find((gap) => {
      if (gap.kind !== expected.kind) return false;
      if (expected.contains && !gap.message.includes(expected.contains)) return false;
      if (expected.file && gap.resource !== expected.file) return false;
      return true;
    });
    if (!match) {
      failures.push({
        kind: "gap",
        message: `Expected gap "${expected.kind}" not found.`,
      });
    }
  }
  return failures;
}

function assertAot(run: IntegrationRun, expectations: ScenarioExpectations): AssertionFailure[] {
  const aot = expectations.aot;
  if (!aot || !aot.instructions || aot.instructions.length === 0) return [];
  const failures: AssertionFailure[] = [];

  const summaries = collectInstructionSummaries(run);
  for (const expected of aot.instructions) {
    const match = summaries.find((summary) => {
      if (summary.type !== expected.type) return false;
      if (expected.res && summary.res !== expected.res) return false;
      if (expected.target !== undefined && summary.target !== expected.target) return false;
      return true;
    });
    if (!match) {
      failures.push({
        kind: "aot",
        message: `Expected instruction "${expected.type}" not found.`,
      });
    }
  }

  return failures;
}

function assertRegistrationPlan(
  run: IntegrationRun,
  expectations: ScenarioExpectations,
): AssertionFailure[] {
  const planExpectations = expectations.registrationPlan;
  if (!planExpectations) return [];
  const failures: AssertionFailure[] = [];
  const plan = run.registrationPlan;

  if (!plan) {
    failures.push({
      kind: "registration-plan",
      message: "Registration plan missing from integration run.",
    });
    return failures;
  }

  for (const [scopeKey, expected] of Object.entries(planExpectations.scopes)) {
    const scopeId = resolveScopeKey(scopeKey, run);
    const scopePlan = plan.scopes[scopeId as keyof typeof plan.scopes];
    if (!scopePlan) {
      failures.push({
        kind: "registration-plan",
        message: `Registration plan scope "${scopeId}" not found.`,
      });
      continue;
    }

    failures.push(...assertPlanResources(scopeId, scopePlan.resources, expected));
  }

  return failures;
}

function collectInstructionSummaries(run: IntegrationRun): InstructionSummary[] {
  const summaries: InstructionSummary[] = [];

  for (const compile of Object.values(run.compile)) {
    const code = compile.aot?.codeResult;
    if (!code) continue;
    const rows = code.definition.instructions ?? [];
    for (let target = 0; target < rows.length; target++) {
      const row = rows[target] ?? [];
      for (const inst of row) {
        const typeName = TYPE_NAMES.get(inst.type) ?? String(inst.type);
        summaries.push({
          type: typeName,
          res: extractResName(inst),
          target,
        });
      }
    }
  }

  return summaries;
}

function extractResName(inst: unknown): string | undefined {
  if (!inst || typeof inst !== "object") return undefined;
  const record = inst as Record<string, unknown>;
  const res = record.res as { name?: string } | string | undefined;
  if (typeof res === "string") return res;
  if (res && typeof res === "object" && "name" in res) {
    return String(res.name ?? "");
  }
  if ("name" in record && typeof record.name === "string") return record.name;
  return undefined;
}

function collectScopeResourceNames(scopeId: string, run: IntegrationRun): Set<string> {
  const scope = run.resourceGraph.scopes[scopeId as keyof typeof run.resourceGraph.scopes];
  const resources = scope?.resources;
  const names = new Set<string>();
  if (!resources) return names;
  addKeys(names, resources.elements);
  addKeys(names, resources.attributes);
  addKeys(names, resources.controllers);
  addKeys(names, resources.valueConverters);
  addKeys(names, resources.bindingBehaviors);
  return names;
}

function addKeys<T>(set: Set<string>, record: Readonly<Record<string, T>> | undefined): void {
  if (!record) return;
  for (const key of Object.keys(record)) {
    set.add(key);
  }
}

function resolveScopeKey(key: string, run: IntegrationRun): string {
  if (key.startsWith("local:")) {
    return key;
  }
  const byName = run.resolution.templates.find((t) => t.resourceName === key);
  if (byName) {
    return `local:${byName.componentPath}`;
  }
  if (run.resourceGraph.scopes[key as keyof typeof run.resourceGraph.scopes]) {
    return key;
  }
  return key;
}

function assertPlanResources(
  scopeId: string,
  resources: ResourceCollections,
  expected: RegistrationPlanScopeExpectation,
): AssertionFailure[] {
  const failures: AssertionFailure[] = [];
  const actual = collectPlanResources(resources);

  failures.push(...assertPlanResourceSet(scopeId, actual, expected, "include"));
  if (expected.exclude) {
    failures.push(...assertPlanResourceSet(scopeId, actual, expected.exclude, "exclude"));
  }

  return failures;
}

function assertPlanResourceSet(
  scopeId: string,
  actual: RegistrationPlanResourceSet,
  expected: RegistrationPlanResourceSet,
  mode: "include" | "exclude",
): AssertionFailure[] {
  const failures: AssertionFailure[] = [];
  const verb = mode === "include" ? "Missing" : "Unexpected";

  const check = (kind: keyof RegistrationPlanResourceSet, label: string) => {
    const expectedList = expected[kind];
    if (!expectedList || expectedList.length === 0) return;
    const actualList = actual[kind] ?? [];
    for (const name of expectedList) {
      const present = actualList.includes(name);
      if (mode === "include" && !present) {
        failures.push({
          kind: "registration-plan",
          message: `${verb} ${label} "${name}" in scope "${scopeId}".`,
        });
      }
      if (mode === "exclude" && present) {
        failures.push({
          kind: "registration-plan",
          message: `${verb} ${label} "${name}" in scope "${scopeId}".`,
        });
      }
    }
  };

  check("elements", "element");
  check("attributes", "attribute");
  check("controllers", "controller");
  check("valueConverters", "value-converter");
  check("bindingBehaviors", "binding-behavior");

  return failures;
}

function collectPlanResources(resources: ResourceCollections): RegistrationPlanResourceSet {
  return {
    elements: Object.keys(resources.elements),
    attributes: Object.keys(resources.attributes),
    controllers: Object.keys(resources.controllers),
    valueConverters: Object.keys(resources.valueConverters),
    bindingBehaviors: Object.keys(resources.bindingBehaviors),
  };
}

function findResource(
  collections: NonNullable<IntegrationRun["semantics"]["resources"]>,
  name: string,
): { bindables?: Record<string, { attribute?: string; mode?: string; primary?: boolean }> } | null {
  if (collections.elements[name]) return collections.elements[name];
  if (collections.attributes[name]) return collections.attributes[name];
  return null;
}
