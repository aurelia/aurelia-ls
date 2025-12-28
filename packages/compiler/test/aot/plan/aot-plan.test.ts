import { runVectorTests, getDirname, lowerOpts, createCompilerContext } from "../../_helpers/vector-runner.js";
import { diffByKey } from "../../_helpers/test-utils.js";

import { lowerDocument, resolveHost, bindScopes, planAot } from "../../../out/compiler/index.js";

runVectorTests({
  dirname: getDirname(import.meta.url),
  suiteName: "AOT Plan (aot:plan)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = resolveHost(ir, ctx.sem);
    const scope = bindScopes(linked);
    const plan = planAot(linked, scope, { templateFilePath: "test.html" });
    return reducePlanIntent(plan);
  },
  compare: compareAotPlanIntent,
  categories: ["nodes", "bindings", "controllers", "expressions", "scopes"],
  normalizeExpect: (expect) => ({
    nodes: expect?.nodes ?? [],
    bindings: expect?.bindings ?? [],
    controllers: expect?.controllers ?? [],
    expressions: expect?.expressions ?? [],
    scopes: expect?.scopes ?? [],
  }),
});

// --- Intent Reduction ---

function reducePlanIntent(plan) {
  const nodes = [];
  const bindings = [];
  const controllers = [];
  const expressions = [];
  const scopes = [];

  // Reduce expressions - normalize kind by removing "Expression" suffix for comparison
  for (const expr of plan.expressions) {
    expressions.push({
      kind: expr.ast.$kind,
      frameId: expr.frameId,
    });
  }

  // Reduce scopes
  for (const scope of plan.scopes) {
    scopes.push({
      frameId: scope.frameId,
      parentFrameId: scope.parentFrameId,
      kind: scope.kind,
      locals: scope.locals.map(l => `${l.source}:${l.name}`),
      overrideContext: scope.overrideContext,
    });
  }

  // Walk nodes and collect intent
  walkNode(plan.root, nodes, bindings, controllers);

  return { nodes, bindings, controllers, expressions, scopes };
}

function walkNode(node, nodes, bindings, controllers) {
  switch (node.kind) {
    case "element": {
      const nodeIntent = {
        kind: "element",
        tag: node.tag,
        hasTarget: node.targetIndex !== undefined,
      };
      if (node.staticAttrs.length > 0) {
        nodeIntent.staticAttrs = node.staticAttrs.map(a => `${a.name}=${a.value ?? ""}`);
      }
      if (node.customElement) {
        nodeIntent.customElement = node.customElement.resource;
      }
      if (node.customAttrs.length > 0) {
        nodeIntent.customAttrs = node.customAttrs.map(a => a.resource);
      }
      nodes.push(nodeIntent);

      // Collect bindings
      for (const b of node.bindings) {
        bindings.push(reduceBinding(b));
      }

      // Collect custom element bindings
      if (node.customElement) {
        for (const b of node.customElement.bindings) {
          bindings.push({ ...reduceBinding(b), context: "customElement" });
        }
      }

      // Collect custom attribute bindings
      for (const ca of node.customAttrs) {
        for (const b of ca.bindings) {
          bindings.push({ ...reduceBinding(b), context: `customAttr:${ca.resource}` });
        }
      }

      // Collect controllers
      for (const ctrl of node.controllers) {
        controllers.push(reduceController(ctrl));
        // Recurse into controller template
        if (ctrl.template) {
          walkNode(ctrl.template, nodes, bindings, controllers);
        }
        // Promise branches
        if (ctrl.kind === "promise") {
          if (ctrl.pendingTemplate) walkNode(ctrl.pendingTemplate, nodes, bindings, controllers);
          if (ctrl.thenTemplate) walkNode(ctrl.thenTemplate, nodes, bindings, controllers);
          if (ctrl.catchTemplate) walkNode(ctrl.catchTemplate, nodes, bindings, controllers);
        }
        // Switch cases
        if (ctrl.kind === "switch") {
          for (const c of ctrl.cases ?? []) {
            if (c.template) walkNode(c.template, nodes, bindings, controllers);
          }
          if (ctrl.defaultTemplate) walkNode(ctrl.defaultTemplate, nodes, bindings, controllers);
        }
      }

      // Recurse children
      for (const child of node.children) {
        walkNode(child, nodes, bindings, controllers);
      }
      break;
    }

    case "text": {
      const nodeIntent = { kind: "text" };
      if (node.content) nodeIntent.content = node.content;
      if (node.interpolation) {
        nodeIntent.interpolation = true;
        nodeIntent.parts = node.interpolation.parts.length;
        nodeIntent.exprs = node.interpolation.exprIds.length;
        nodeIntent.hasTarget = true;
      }
      nodes.push(nodeIntent);
      break;
    }

    case "comment": {
      nodes.push({ kind: "comment", content: node.content });
      break;
    }

    case "fragment": {
      for (const child of node.children) {
        walkNode(child, nodes, bindings, controllers);
      }
      break;
    }
  }
}

function reduceBinding(b) {
  switch (b.type) {
    case "propertyBinding":
      return { type: "propertyBinding", to: b.to, mode: b.mode };
    case "attributeBinding":
      return { type: "attributeBinding", to: b.to };
    case "attributeInterpolation":
      return { type: "attributeInterpolation", to: b.to, parts: b.parts.length };
    case "styleBinding":
      return { type: "styleBinding", property: b.property };
    case "listenerBinding":
      return { type: "listenerBinding", event: b.event, capture: b.capture };
    case "refBinding":
      return { type: "refBinding", to: b.to };
    default:
      return { type: b.type };
  }
}

function reduceController(ctrl) {
  const base = { kind: ctrl.kind, frameId: ctrl.frameId };
  switch (ctrl.kind) {
    case "repeat":
      return { ...base, locals: ctrl.locals, contextuals: ctrl.contextuals };
    case "if":
    case "else":
    case "with":
      return base;
    case "switch":
      return { ...base, caseCount: ctrl.cases?.length ?? 0, hasDefault: !!ctrl.defaultTemplate };
    case "promise":
      return {
        ...base,
        hasPending: !!ctrl.pendingTemplate,
        hasThen: !!ctrl.thenTemplate,
        hasCatch: !!ctrl.catchTemplate,
        thenLocal: ctrl.thenLocal,
        catchLocal: ctrl.catchLocal,
      };
    case "portal":
      return { ...base, hasTargetExpr: !!ctrl.targetExprId, targetSelector: ctrl.targetSelector };
    default:
      return base;
  }
}

// --- Intent Comparison ---

function compareAotPlanIntent(actual, expected) {
  const { missing: missingNodes, extra: extraNodes } =
    diffByKey(actual.nodes, expected.nodes, nodeKey);
  const { missing: missingBindings, extra: extraBindings } =
    diffByKey(actual.bindings, expected.bindings, bindingKey);
  const { missing: missingControllers, extra: extraControllers } =
    diffByKey(actual.controllers, expected.controllers, controllerKey);
  const { missing: missingExpressions, extra: extraExpressions } =
    diffByKey(actual.expressions, expected.expressions, exprKey);
  const { missing: missingScopes, extra: extraScopes } =
    diffByKey(actual.scopes, expected.scopes, scopeKey);

  return {
    missingNodes, extraNodes,
    missingBindings, extraBindings,
    missingControllers, extraControllers,
    missingExpressions, extraExpressions,
    missingScopes, extraScopes,
  };
}

function nodeKey(n) {
  if (n.kind === "element") {
    const parts = [n.kind, n.tag, n.hasTarget ? "T" : ""];
    if (n.customElement) parts.push(`ce:${n.customElement}`);
    if (n.customAttrs) parts.push(`ca:${n.customAttrs.join(",")}`);
    return parts.join("|");
  }
  if (n.kind === "text") {
    return `${n.kind}|${n.content ?? ""}|${n.interpolation ? `interp:${n.parts}x${n.exprs}` : ""}`;
  }
  return `${n.kind}|${n.content ?? ""}`;
}

function bindingKey(b) {
  const context = b.context ? `@${b.context}` : "";
  switch (b.type) {
    case "propertyBinding":
      return `${b.type}:${b.to}:${b.mode}${context}`;
    case "listenerBinding":
      return `${b.type}:${b.event}:${b.capture}${context}`;
    case "attributeInterpolation":
      return `${b.type}:${b.to}:${b.parts}${context}`;
    default:
      return `${b.type}:${b.to ?? b.property ?? b.event ?? ""}${context}`;
  }
}

function controllerKey(c) {
  const parts = [c.kind, `frame:${c.frameId}`];
  if (c.kind === "repeat") {
    parts.push(`locals:${c.locals.join(",")}`);
    parts.push(`ctx:${c.contextuals.join(",")}`);
  }
  // if and else are separate controllers now - no hasElse flag
  if (c.kind === "switch") parts.push(`cases:${c.caseCount}`, `default:${c.hasDefault}`);
  if (c.kind === "promise") {
    parts.push(`pending:${c.hasPending}`, `then:${c.hasThen}`, `catch:${c.hasCatch}`);
  }
  return parts.join("|");
}

function exprKey(e) {
  return `${e.kind}:frame${e.frameId}`;
}

function scopeKey(s) {
  return `${s.frameId}:${s.kind}:parent=${s.parentFrameId}:locals=${s.locals.join(",")}:oc=${s.overrideContext.join(",")}`;
}
