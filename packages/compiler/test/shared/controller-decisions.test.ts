import { describe, expect, test } from "vitest";

import type {
  ControllerBindableIR,
  ExprId,
  ExprRef,
} from "@aurelia-ls/compiler";
import type { ControllerConfig } from "../../src/schema/registry.js";
import {
  isPromiseParentController,
  planControllerAttribute,
  planControllerBareValue,
  planControllerBranchInfo,
  planIteratorTailBinding,
  resolveIteratorTarget,
  resolvePromiseBranchKind,
} from "../../src/analysis/shared/controller-decisions.js";

function exprRef(code: string): ExprRef {
  return {
    id: `expr:${code}` as ExprId,
    code,
  };
}

function valueBinding(code: string): ControllerBindableIR {
  return {
    type: "propertyBinding",
    to: "value",
    from: exprRef(code),
    mode: "default",
  };
}

function controller(overrides: Partial<ControllerConfig>): ControllerConfig {
  return {
    name: "test",
    trigger: { kind: "value", prop: "value" },
    scope: "overlay",
    props: {},
    ...overrides,
  };
}

describe("controller decisions", () => {
  test("attribute planner rejects promise branches and iterator command mismatches", () => {
    const promiseBranch = controller({
      name: "then",
      trigger: { kind: "branch", parent: "promise" },
      linksTo: "promise",
      scope: "overlay",
    });
    const promiseDecision = planControllerAttribute(promiseBranch, "from-view");
    expect(promiseDecision).toEqual({
      accepted: false,
      reason: "promise-branch-specialized",
    });

    const iterator = controller({
      name: "repeat",
      trigger: { kind: "iterator", prop: "items", command: "for" },
      scope: "overlay",
    });
    const mismatch = planControllerAttribute(iterator, "bind");
    expect(mismatch).toEqual({
      accepted: false,
      reason: "iterator-command-mismatch",
      expectedCommand: "for",
    });
    expect(planControllerAttribute(iterator, "for")).toEqual({
      accepted: true,
      reason: "accepted",
    });
  });

  test("bare controller value planner uses placement semantics", () => {
    const teleported = controller({
      name: "portal",
      placement: "teleported",
      trigger: { kind: "value", prop: "target" },
      scope: "reuse",
    });
    expect(planControllerBareValue(teleported)).toEqual({
      mode: "literal-string",
      reason: "teleported-placement-literal",
    });

    const inPlace = controller({ name: "with" });
    expect(planControllerBareValue(inPlace)).toEqual({
      mode: "expression",
      reason: "default-expression",
    });
  });

  test("branch planner handles switch and promise patterns", () => {
    const switchDefault = controller({
      name: "default-case",
      trigger: { kind: "marker" },
      linksTo: "switch",
      scope: "reuse",
    });
    expect(planControllerBranchInfo(switchDefault, "", [])).toEqual({
      branch: { kind: "default" },
      reason: "switch-default",
    });

    const switchCase = controller({
      name: "case",
      trigger: { kind: "branch", parent: "switch" },
      linksTo: "switch",
      scope: "reuse",
    });
    expect(planControllerBranchInfo(switchCase, "x", [valueBinding("x")])).toEqual({
      branch: { kind: "case", expr: exprRef("x") },
      reason: "switch-case",
    });
    expect(planControllerBranchInfo(switchCase, "x", [])).toEqual({
      branch: null,
      reason: "switch-case-missing-expr",
    });

    const thenBranch = controller({
      name: "then",
      trigger: { kind: "branch", parent: "promise" },
      linksTo: "promise",
      scope: "overlay",
    });
    expect(planControllerBranchInfo(thenBranch, "result", [])).toEqual({
      branch: { kind: "then", local: "result" },
      reason: "promise-branch",
    });
  });

  test("promise helpers classify parent and branch controllers", () => {
    const promiseParent = controller({
      name: "promise",
      trigger: { kind: "value", prop: "value" },
      scope: "overlay",
      branches: {
        names: ["then", "catch", "pending"],
        relationship: "child",
      },
    });
    expect(isPromiseParentController(promiseParent)).toBe(true);

    const pendingBranch = controller({
      name: "pending",
      trigger: { kind: "branch", parent: "promise" },
      linksTo: "promise",
      scope: "reuse",
    });
    expect(resolvePromiseBranchKind(pendingBranch)).toBe("pending");
  });

  test("iterator planners resolve target and tail options from controller config", () => {
    const iterator = controller({
      name: "repeat",
      trigger: { kind: "iterator", prop: "items", command: "for" },
      tailProps: {
        key: { name: "key", accepts: ["bind", null], type: "string" },
      },
    });
    expect(resolveIteratorTarget(iterator)).toEqual({
      to: "items",
      reason: "controller-trigger",
    });

    const accepted = planIteratorTailBinding(iterator, "key", "toView");
    expect(accepted.accepted).toBe(true);
    expect(accepted.normalized).toEqual({
      name: "key",
      mode: "toView",
      type: "string",
    });

    const unknown = planIteratorTailBinding(iterator, "missing", "default");
    expect(unknown).toEqual({
      accepted: false,
      reason: "unknown-tail-prop",
    });
  });
});
