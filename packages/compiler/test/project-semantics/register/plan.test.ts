import { describe, it, expect } from "vitest";
import { buildRegistrationPlan } from "@aurelia-ls/compiler/project-semantics/register/plan.js";
import type {
  AttrRes,
  BindingBehaviorSig,
  ControllerConfig,
  ElementRes,
  FeatureUsageSet,
  ResourceCollections,
  ResourceGraph,
  ResourceScopeId,
  ValueConverterSig,
} from "@aurelia-ls/compiler/schema/types.js";
function element(name: string): ElementRes {
  return { kind: "element", name, bindables: {} };
}

function attribute(name: string): AttrRes {
  return { kind: "attribute", name, bindables: {} };
}

function controller(name: string): ControllerConfig {
  return {
    name,
    trigger: { kind: "value", prop: "value" },
    scope: "reuse",
    props: {},
  };
}

function valueConverter(name: string): ValueConverterSig {
  return { name, in: { kind: "unknown" }, out: { kind: "unknown" } };
}

function bindingBehavior(name: string): BindingBehaviorSig {
  return { name };
}

function usage(overrides: Partial<FeatureUsageSet> = {}): FeatureUsageSet {
  return {
    elements: [],
    attributes: [],
    controllers: [],
    commands: [],
    patterns: [],
    valueConverters: [],
    bindingBehaviors: [],
    ...overrides,
  };
}

describe("buildRegistrationPlan", () => {
  it("filters resources by usage per scope", () => {
    const root = "root" as ResourceScopeId;
    const local = "local:/components/local.ts" as ResourceScopeId;

    const rootResources: ResourceCollections = {
      elements: { foo: element("foo") },
      attributes: { bar: attribute("bar") },
      controllers: { if: controller("if") },
      valueConverters: { sanitize: valueConverter("sanitize") },
      bindingBehaviors: { debounce: bindingBehavior("debounce") },
    };

    const graph: ResourceGraph = {
      version: "aurelia-resource-graph@1",
      root,
      scopes: {
        [root]: { id: root, parent: null, label: "root", resources: rootResources },
        [local]: { id: local, parent: root, label: "local", resources: { elements: { "local-el": element("local-el") } } },
      },
    };

    const usageByScope: Record<ResourceScopeId, FeatureUsageSet> = {
      [root]: usage({
        elements: ["foo"],
        attributes: ["bar"],
        controllers: ["if"],
        valueConverters: ["sanitize"],
        bindingBehaviors: ["debounce"],
      }),
      [local]: usage({
        elements: ["local-el"],
      }),
    };

    const plan = buildRegistrationPlan(graph, usageByScope);

    expect(plan.scopes[root].resources.elements).toHaveProperty("foo");
    expect(plan.scopes[root].resources.attributes).toHaveProperty("bar");
    expect(plan.scopes[root].resources.controllers).toHaveProperty("if");
    expect(plan.scopes[root].resources.valueConverters).toHaveProperty("sanitize");
    expect(plan.scopes[root].resources.bindingBehaviors).toHaveProperty("debounce");

    expect(plan.scopes[local].resources.elements).toHaveProperty("local-el");
    expect(plan.scopes[local].resources.elements).not.toHaveProperty("foo");
  });
});
