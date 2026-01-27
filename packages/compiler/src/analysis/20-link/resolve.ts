/* =============================================================================
 * PHASE 20 - LINK TEMPLATE SEMANTICS
 * IR → LinkModule (pure; no IR mutation)
 * - Links host node semantics (custom/native/none)
 * - Normalizes attr→prop (global/per-tag/DOM overrides)
 * - Resolves binding targets (custom bindable > native DOM prop > attribute)
 * - Computes effective binding mode (incl. static two-way defaults)
 * - Lifts controller metadata (repeat/with/promise/if/switch/portal)
 * - Emits canonical link diagnostics
 * ============================================================================= */

import type {
  IrModule,
  TemplateIR,
  DOMNode,
  PropertyBindingIR,
  AttributeBindingIR,
  StylePropertyBindingIR,
  ListenerBindingIR,
  RefBindingIR,
  SetAttributeIR,
  SetClassAttributeIR,
  SetStyleAttributeIR,
  TextBindingIR,
  TranslationBindingIR,
  IteratorBindingIR,
  HydrateTemplateControllerIR,
  HydrateLetElementIR,
  BindingMode,
  NodeId,
  InstructionIR,
  InstructionRow,
  SetPropertyIR,
  HydrateElementIR,
  HydrateAttributeIR,
  ElementBindableIR,
  AttributeBindableIR,
  SourceSpan,
} from "../../model/ir.js";

import { getControllerConfig, type SemanticsLookupOptions } from "../../language/registry.js";
import type { ResourceGraph } from "../../language/resource-graph.js";
import type { ModuleResolver } from "../../shared/module-resolver.js";

import type {
  LinkModule,
  LinkedTemplate,
  LinkedRow,
  NodeSem,
  LinkedInstruction,
  LinkedPropertyBinding,
  LinkedAttributeBinding,
  LinkedStylePropertyBinding,
  LinkedListenerBinding,
  LinkedRefBinding,
  LinkedTextBinding,
  LinkedTranslationBinding,
  LinkedSetAttribute,
  LinkedSetClassAttribute,
  LinkedSetStyleAttribute,
  LinkedIteratorBinding,
  LinkedHydrateTemplateController,
  LinkedHydrateElement,
  LinkedHydrateAttribute,
  LinkedElementBindable,
  LinkedHydrateLetElement,
  LinkedSetProperty,
  TargetSem,
  AttrResRef,
} from "./types.js";
import { normalizeAttrToProp, normalizePropLikeName } from "./name-normalizer.js";
import {
  resolveAttrBindable,
  resolveAttrResRef,
  resolveAttrTarget,
  resolveBindableMode,
  resolveControllerBindable,
  resolveControllerSem,
  resolveEffectiveMode,
  resolveElementResRef,
  resolvePropertyTarget,
  resolveIteratorAuxSpec,
} from "./resolution-helpers.js";
import { reportDiagnostic } from "../../diagnostics/report.js";
import { resolveNodeSem } from "./node-semantics.js";
import {
  type Diagnosed,
  pure,
  diag,
  withStub,
  DiagnosticAccumulator,
} from "../../shared/diagnosed.js";
import { extractExprResources, extractHostAssignments } from "../../shared/expr-utils.js";
import { CompilerAttributes, type CompileTrace } from "../../shared/trace.js";
import { createResolveContext, createResolveServices, type ResolveContext, type ResolveDiagnosticEmitter } from "./resolve-context.js";
import type { SemanticsSnapshot } from "../../language/snapshot.js";

function assertUnreachable(_x: never): never {
  throw new Error("unreachable");
}

/**
 * Check if a NodeSem represents a truly unknown custom element.
 * Custom elements have tags containing '-' (per HTML spec).
 * When both custom and native are null for such elements, it's unknown.
 *
 * Used for stub propagation: we suppress unknown-target diagnostics for props on unknown
 * custom elements since the root cause is the missing element, not the prop.
 *
 * IMPORTANT: If a resource graph is provided and the element exists in ANY
 * scope of that graph, it's NOT truly unknown (just out-of-scope), so we
 * should NOT suppress unknown-target diagnostics in that case.
 */
function isMissingCustomElement(host: NodeSem): boolean {
  if (host.kind !== "element" || !host.tag.includes("-")) {
    return false;
  }
  return !host.custom && !host.native;
}

function elementExistsInGraph(tag: string, graph?: ResourceGraph | null): boolean {
  if (!graph) return false;
  const needle = tag.toLowerCase();
  for (const scope of Object.values(graph.scopes)) {
    if (scope.resources?.elements?.[needle]) {
      return true;
    }
  }
  return false;
}

function isUnknownCustomElement(host: NodeSem, graph?: ResourceGraph | null): boolean {
  if (host.kind !== "element") return false;
  if (!isMissingCustomElement(host)) return false;
  return !elementExistsInGraph(host.tag, graph);
}

type ResolverContext = ResolveContext;

/* ============================================================================
 * Public API
 * ============================================================================ */

export interface LinkOptions {
  /** Module resolver for validating template meta imports. */
  moduleResolver: ModuleResolver;
  /** Template file path for module resolution. */
  templateFilePath: string;
  diagnostics: ResolveDiagnosticEmitter;
  /** Optional trace for instrumentation. Defaults to NOOP_TRACE. */
  trace?: CompileTrace;
}

export function linkTemplateSemantics(ir: IrModule, snapshot: SemanticsSnapshot, opts: LinkOptions): LinkModule {
  if (!opts.moduleResolver) {
    throw new Error("linkTemplateSemantics requires a moduleResolver; missing resolver is a wiring error.");
  }
  if (!opts.templateFilePath) {
    throw new Error("linkTemplateSemantics requires templateFilePath for module resolution.");
  }
  const { services, diagCount, diagErrorCount } = createResolveServices({
    diagnostics: opts.diagnostics,
    trace: opts.trace,
  });
  const trace = services.trace;

  return trace.span("link.template", () => {
    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: ir.name ?? "<unknown>",
      "link.templateCount": ir.templates.length,
      "link.exprCount": ir.exprTable?.length ?? 0,
    });

    const lookupOpts: SemanticsLookupOptions | undefined = buildLookupOpts(snapshot);
    const ctxGraph = snapshot.resourceGraph ?? snapshot.semantics.resourceGraph ?? null;
    const ctx: ResolverContext = createResolveContext(
      snapshot.semantics,
      services,
      lookupOpts,
      ctxGraph,
      opts.moduleResolver,
      opts.templateFilePath,
    );

    for (const template of ir.templates) {
      if (template.templateMeta) {
        validateTemplateMeta(template, ctx);
      }
    }

    // Link all templates
    trace.event("resolve.templates.start");
    const templates: LinkedTemplate[] = ir.templates.map((t) => linkTemplate(t, ctx));
    trace.event("resolve.templates.complete", { count: templates.length });

    // Validate branch controller relationships on ROOT template only.
    // Nested templates (controller defs) are validated via validateNestedIrRows during recursion.
    // ir.templates[0] is always the root; others are nested templates for controllers.
    if (templates[0]) {
      trace.event("resolve.validateBranches.start");
      validateBranchControllers(templates[0].rows, ctx);
      trace.event("resolve.validateBranches.complete");
    }

    // Validate expression resources (canonical diagnostics)
    if (ir.exprTable) {
      trace.event("resolve.validateExprResources.start");
      validateExpressionResources(ir.exprTable, ctx);
      trace.event("resolve.validateExprResources.complete");
    }

    // Count linked instructions
    let instrCount = 0;
    for (const t of templates) {
      for (const r of t.rows) {
        instrCount += r.instructions.length;
      }
    }

    // Record output metrics
    trace.setAttributes({
      [CompilerAttributes.INSTR_COUNT]: instrCount,
      [CompilerAttributes.DIAG_COUNT]: diagCount(),
      [CompilerAttributes.DIAG_ERROR_COUNT]: diagErrorCount(),
    });

    return {
      version: "aurelia-linked@1",
      templates,
      exprTable: ir.exprTable ?? [], // passthrough for Analysis/tooling
    };
  });
}

/* ============================================================================
 * Template / Row linking
 * ============================================================================ */

function buildLookupOpts(snapshot: SemanticsSnapshot): SemanticsLookupOptions {
  return {
    ...(snapshot.semantics.resources ? { resources: snapshot.semantics.resources } : {}),
    ...(snapshot.resourceGraph !== undefined ? { graph: snapshot.resourceGraph } : {}),
    ...(snapshot.scopeId !== undefined ? { scope: snapshot.scopeId ?? null } : {}),
  };
}

function linkTemplate(t: TemplateIR, ctx: ResolverContext): LinkedTemplate {
  const idToNode = new Map<NodeId, DOMNode>();
  indexDom(t.dom, idToNode);

    // Validate unknown custom elements across the entire DOM tree.
    // This emits aurelia/unknown-element for any custom element tag that isn't registered.
  validateUnknownElements(t.dom, ctx);

  const rows: LinkedRow[] = t.rows.map((row) => {
    const dom = idToNode.get(row.target);
    const nodeSem = resolveNodeSem(dom, ctx.lookup);
    const linkedInstrs = row.instructions.map((i) => linkInstruction(i, nodeSem, ctx));
    return { target: row.target, node: nodeSem, instructions: linkedInstrs };
  });

  const result: LinkedTemplate = { dom: t.dom, rows, name: t.name! };

  // Carry template meta through for AOT emission
  if (t.templateMeta) {
    result.templateMeta = t.templateMeta;
  }

  return result;
}

function validateTemplateMeta(
  template: TemplateIR,
  ctx: ResolverContext,
): void {
  const meta = template.templateMeta;
  if (!meta) return;

  const templateFilePath = ctx.templateFilePath;
  const moduleResolver = ctx.moduleResolver;
  for (const imp of meta.imports) {
    const specifier = imp.from.value;
    const resolvedPath = moduleResolver(specifier, templateFilePath);
    if (!resolvedPath) {
      reportDiagnostic(ctx.services.diagnostics, "aurelia/unresolved-import", `Cannot resolve module '${specifier}'`, {
        span: imp.from.loc,
        data: { specifier },
      });
    }
  }

  const aliasSeen = new Map<string, SourceSpan>();
  for (const alias of meta.aliases) {
    for (const name of alias.names) {
      const key = name.value.toLowerCase();
      if (aliasSeen.has(key)) {
        reportDiagnostic(ctx.services.diagnostics, "aurelia/alias-conflict", `Alias '${name.value}' is already declared.`, {
          span: name.loc,
          data: { name: name.value },
        });
      } else {
        aliasSeen.set(key, name.loc);
      }
    }
  }

  const bindableSeen = new Map<string, SourceSpan>();
  for (const bindable of meta.bindables) {
    const key = bindable.name.value.toLowerCase();
    if (bindableSeen.has(key)) {
      reportDiagnostic(ctx.services.diagnostics, "aurelia/bindable-decl-conflict", `Bindable '${bindable.name.value}' is already declared.`, {
        span: bindable.name.loc,
        data: { name: bindable.name.value },
      });
    } else {
      bindableSeen.set(key, bindable.name.loc);
    }
  }
}

/* ============================================================================
 * Expression Resource Validation
 * ============================================================================ */

/**
 * Validates binding behaviors and value converters referenced in expressions.
 *
 * Diagnostics:
 * - aurelia/unknown-behavior: Binding behavior not found in registry
 * - aurelia/invalid-binding-pattern: Duplicate behaviors, $host assignment, rate-limit conflicts
 * - aurelia/unknown-converter: Value converter not found in registry
 */
function validateExpressionResources(
  exprTable: NonNullable<IrModule["exprTable"]>,
  ctx: ResolverContext,
): void {
  // Check for $host assignments (invalid binding pattern)
  const hostAssignments = extractHostAssignments(exprTable);
  for (const ref of hostAssignments) {
    reportDiagnostic(ctx.services.diagnostics, "aurelia/invalid-binding-pattern", "Assignment to $host is not allowed.", {
      span: ref.span,
      data: { aurCode: "AUR0106" },
    });
  }

  const refs = extractExprResources(exprTable);

  // Group refs by exprId for duplicate detection
  const byExpr = new Map<typeof refs[0]["exprId"], typeof refs>();
  for (const ref of refs) {
    const list = byExpr.get(ref.exprId) ?? [];
    list.push(ref);
    byExpr.set(ref.exprId, list);
  }

  // Rate-limit behaviors that conflict with each other
  const RATE_LIMIT_BEHAVIORS = new Set(["throttle", "debounce"]);

  // Check each expression for duplicates and unknown resources
  for (const [, exprRefs] of byExpr) {
    const seenBehaviors = new Set<string>();
    // Track unique rate-limiters for conflict detection (different behaviors only)
    const seenRateLimiters = new Map<string, SourceSpan>();

    for (const ref of exprRefs) {
      if (ref.kind === "bindingBehavior") {
        // Check for duplicate
          if (seenBehaviors.has(ref.name)) {
            reportDiagnostic(ctx.services.diagnostics, "aurelia/invalid-binding-pattern", `Binding behavior '${ref.name}' applied more than once in the same expression.`, {
              span: ref.span,
              data: { aurCode: "AUR0102" },
            });
          } else {
            seenBehaviors.add(ref.name);
          }

          // Check if registered
          if (!ctx.lookup.sem.resources.bindingBehaviors[ref.name]) {
            reportDiagnostic(ctx.services.diagnostics, "aurelia/unknown-behavior", `Binding behavior '${ref.name}' not found.`, {
              span: ref.span,
              data: { resourceKind: "binding-behavior", name: ref.name },
            });
          }

        // Track unique rate-limiters for conflict detection
        if (RATE_LIMIT_BEHAVIORS.has(ref.name) && !seenRateLimiters.has(ref.name)) {
          seenRateLimiters.set(ref.name, ref.span);
        }
      } else {
        // valueConverter
        if (!ctx.lookup.sem.resources.valueConverters[ref.name]) {
          reportDiagnostic(ctx.services.diagnostics, "aurelia/unknown-converter", `Value converter '${ref.name}' not found.`, {
            span: ref.span,
            data: { resourceKind: "value-converter", name: ref.name },
          });
        }
      }
    }

    // Check for conflicting rate-limiters (invalid binding pattern)
    // Only triggers when DIFFERENT rate-limiters are used (e.g., throttle + debounce)
    if (seenRateLimiters.size > 1) {
      const names = [...seenRateLimiters.keys()].join(" and ");
      // Report on the second rate-limiter (the conflict)
      const entries = [...seenRateLimiters.entries()];
      const conflicting = entries[1]!;
      reportDiagnostic(ctx.services.diagnostics, "aurelia/invalid-binding-pattern", `Conflicting rate-limit behaviors: ${names} cannot be used together on the same binding.`, {
        span: conflicting[1],
        data: { aurCode: "AUR9996" },
      });
    }
  }
}

/**
 * Validates branch controller relationships (sibling and child).
 *
 * - Sibling relationship (else→if): preceding row must have parent controller
 * - Child relationship (then→promise): must be inside parent controller's def
 *
 * Diagnostics:
 * - aurelia/invalid-command-usage: branch controllers without required parent/sibling
 */
function validateBranchControllers(
  rows: LinkedRow[],
  ctx: ResolverContext,
  parentController: string | null = null,
): void {
  let prevRowControllers: string[] = [];

  for (const row of rows) {
    const currentRowControllers: string[] = [];

    for (const ins of row.instructions) {
      if (ins.kind === "hydrateTemplateController") {
        currentRowControllers.push(ins.res);

        // Check if this controller requires a parent (sibling or child relationship)
        const config = ins.controller.config;
        if (config.linksTo) {
          const parentConfig = getControllerConfig(config.linksTo);
          const relationship = parentConfig?.branches?.relationship;

            if (relationship === "sibling") {
              // Sibling relationship: parent must be in the previous row
              if (!prevRowControllers.includes(config.linksTo)) {
                const aurCode = config.linksTo === "if" ? "AUR0810" : "AUR0815";
                const msg = `[${ins.res}] without preceding [${config.linksTo}]`;
                reportDiagnostic(ctx.services.diagnostics, "aurelia/invalid-command-usage", msg, {
                  span: ins.loc,
                  data: { aurCode },
                });
              }
            } else if (relationship === "child") {
              // Child relationship: must be inside parent controller's def
              if (parentController !== config.linksTo) {
                const aurCode = config.linksTo === "promise" ? "AUR0813" : "AUR0815";
                const msg = `[${ins.res}] without parent [${config.linksTo}]`;
                reportDiagnostic(ctx.services.diagnostics, "aurelia/invalid-command-usage", msg, {
                  span: ins.loc,
                  data: { aurCode },
                });
              }
            }
        }

        // Recursively validate nested def (raw IR rows)
        if (ins.def?.rows) {
          validateNestedIrRows(ins.def.rows, ctx, ins.res);
        }
      }
    }

    prevRowControllers = currentRowControllers;
  }
}

/**
 * Validates branch controllers in nested IR rows (unlinked).
 * Used to check child relationships (then/catch inside promise, case inside switch).
 *
 * Diagnostics:
 * - aurelia/invalid-command-usage: Multiple marker controllers in same parent (e.g., [default-case] in [switch])
 *
 * Note: Marker controllers (trigger.kind="marker") are presence-based and implicitly unique.
 * This check is CONFIG-DRIVEN: any userland marker controller gets the same validation.
 */
function validateNestedIrRows(
  rows: InstructionRow[],
  ctx: ResolverContext,
  parentController: string,
): void {
  let prevRowControllers: string[] = [];

  // Track uniqueness for marker-triggered controllers (presence-based, only one per parent).
  // This is CONFIG-DRIVEN: any controller with trigger.kind="marker" is implicitly unique.
  // Example: default-case can only appear once per switch.
  const markerCounts = new Map<string, number>();

  for (const row of rows) {
    const currentRowControllers: string[] = [];

    for (const ins of row.instructions) {
      if (ins.type === "hydrateTemplateController") {
        currentRowControllers.push(ins.res);

        // Get config for this controller
        const config = getControllerConfig(ins.res);
        if (config?.linksTo) {
          const parentConfig = getControllerConfig(config.linksTo);
          const relationship = parentConfig?.branches?.relationship;

          if (relationship === "sibling") {
            // Sibling relationship: parent must be in the previous row
            if (!prevRowControllers.includes(config.linksTo)) {
              const aurCode = config.linksTo === "if" ? "AUR0810" : "AUR0815";
              const msg = `[${ins.res}] without preceding [${config.linksTo}]`;
              reportDiagnostic(ctx.services.diagnostics, "aurelia/invalid-command-usage", msg, {
                span: ins.loc,
                data: { aurCode },
              });
            }
          } else if (relationship === "child") {
            // Child relationship: must be inside parent controller's def
            if (parentController !== config.linksTo) {
              const aurCode = config.linksTo === "promise" ? "AUR0813" : "AUR0815";
              const msg = `[${ins.res}] without parent [${config.linksTo}]`;
              reportDiagnostic(ctx.services.diagnostics, "aurelia/invalid-command-usage", msg, {
                span: ins.loc,
                data: { aurCode },
              });
            }
          }
        }

        // Uniqueness check for marker-triggered controllers (config-driven).
        // Marker controllers are presence-based (no value), so duplicates are invalid.
        // Multiple [X] in same [parent]
        if (config?.trigger.kind === "marker" && config.linksTo === parentController) {
          const count = (markerCounts.get(ins.res) ?? 0) + 1;
          markerCounts.set(ins.res, count);
          if (count === 2) {
            // Emit diagnostic on the second occurrence
            reportDiagnostic(ctx.services.diagnostics, "aurelia/invalid-command-usage", `Multiple [${ins.res}] in same [${parentController}]`, {
              span: ins.loc,
              data: { aurCode: "AUR0816" },
            });
          }
          // For 3+, we don't emit more diagnostics (one per parent is enough)
        }

        // Recursively validate nested def
        if (ins.def?.rows) {
          validateNestedIrRows(ins.def.rows, ctx, ins.res);
        }
      }
    }

    prevRowControllers = currentRowControllers;
  }
}

function indexDom(n: DOMNode, map: Map<NodeId, DOMNode>): void {
  map.set(n.id, n);
  switch (n.kind) {
    case "element":
    case "template":
      for (const c of n.children) indexDom(c, map);
      break;
    case "text":
    case "comment":
      break;
    default:
      break;
  }
}

/**
 * Walk the DOM tree to emit aurelia/unknown-element for truly unknown custom elements.
 * This catches elements that have no instruction rows (no bindings).
 *
 * TODO: For auto-import, the resolution package should track a third layer:
 * resources that exist in the project or dependencies but aren't registered.
 * That would enable suggestions like "Did you mean to import 'x-widget'?"
 */
function validateUnknownElements(n: DOMNode, ctx: ResolverContext): void {
  if (n.kind === "element") {
    const nodeSem = resolveNodeSem(n, ctx.lookup);
      if (nodeSem.kind === "element" && isMissingCustomElement(nodeSem)) {
        const existsInGraph = elementExistsInGraph(nodeSem.tag, ctx.graph);
        const message = existsInGraph
          ? `Custom element '<${nodeSem.tag}>' is not registered in this scope.`
          : `Unknown custom element '<${nodeSem.tag}>'.`;
        reportDiagnostic(ctx.services.diagnostics, "aurelia/unknown-element", message, {
          span: n.loc,
          data: { resourceKind: "custom-element", name: nodeSem.tag },
        });
      }
  }

  // Recurse into children
  if (n.kind === "element" || n.kind === "template") {
    for (const c of n.children) {
      validateUnknownElements(c, ctx);
    }
  }
}

/* ============================================================================
 * Instruction linking
 * ============================================================================ */

/**
 * Helper to extract value from Diagnosed<T> and merge diagnostics into context.
 * This bridges Elm-style internal functions with the imperative boundary.
 */
function merge<T>(diagnosed: Diagnosed<T>, _ctx: ResolverContext): T {
  return diagnosed.value;
}

function linkInstruction(ins: InstructionIR, host: NodeSem, ctx: ResolverContext): LinkedInstruction {
  switch (ins.type) {
    case "propertyBinding":
      return merge(linkPropertyBinding(ins, host, ctx), ctx);
    case "attributeBinding":
      return merge(linkAttributeBinding(ins, host, ctx), ctx);
    case "stylePropertyBinding":
      return linkStylePropertyBinding(ins);
    case "listenerBinding":
      return merge(linkListenerBinding(ins, host, ctx), ctx);
    case "refBinding":
      return linkRefBinding(ins);
    case "textBinding":
      return linkTextBinding(ins);
    case "translationBinding":
      return linkTranslationBinding(ins);
    case "setAttribute":
      return linkSetAttribute(ins);
    case "setProperty":
      return merge(linkSetProperty(ins, host, ctx), ctx);
    case "setClassAttribute":
      return linkSetClassAttribute(ins);
    case "setStyleAttribute":
      return linkSetStyleAttribute(ins);
    case "hydrateElement":
      return linkHydrateElement(ins, host, ctx);
    case "hydrateAttribute":
      return linkHydrateAttribute(ins, host, ctx);
    case "iteratorBinding":
      return merge(linkIteratorBinding(ins, ctx), ctx);
    case "hydrateTemplateController":
      return linkHydrateTemplateController(ins, host, ctx);
    case "hydrateLetElement":
      return linkHydrateLetElement(ins);
    /* c8 ignore next 2 -- type exhaustiveness guard */
    default:
      return assertUnreachable(ins as never);
  }
}

/* ---- PropertyBinding ---- */

function linkPropertyBinding(ins: PropertyBindingIR, host: NodeSem, ctx: ResolverContext): Diagnosed<LinkedPropertyBinding> {
  // Normalize against naming/perTag/DOM overrides before resolving targets.
  const to = normalizePropLikeName(host, ins.to, ctx.lookup);
  const { target, effectiveMode } = resolvePropertyTarget(ctx, host, to, ins.mode);
  const linked: LinkedPropertyBinding = {
    kind: "propertyBinding",
    to,
    from: ins.from,
    mode: ins.mode,
    effectiveMode,
    target,
    loc: ins.loc ?? null,
  };
    if (target.kind === "unknown") {
      // Stub propagation: suppress unknown-target diagnostics for unknown custom elements.
      // The root cause is the missing element registration, not individual props.
      if (isUnknownCustomElement(host, ctx.graph)) {
        return pure(linked); // No diagnostic - root cause is element, not prop
      }
      const bindable = {
        name: to,
        attribute: ins.to,
        ...(host.kind === "element"
          ? { ownerKind: "element" as const, ownerName: host.custom?.def.name ?? host.tag }
          : {}),
      };
      const d = ctx.services.diagnostics.emit("aurelia/unknown-bindable", {
        message: `Property target '${to}' not found on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
        span: ins.loc,
        data: { bindable },
      });
      return diag(d, withStub(linked, { diagnostic: d, span: ins.loc ?? undefined }));
    }
  return pure(linked);
}

/* ---- AttributeBinding (interpolation on attr) ---- */

function linkAttributeBinding(ins: AttributeBindingIR, host: NodeSem, ctx: ResolverContext): Diagnosed<LinkedAttributeBinding> {
  // Preserve data-* / aria-* authored forms: never camelCase or map to props.
  if (ctx.lookup.hasPreservedPrefix(ins.attr)) {
    return pure({
      kind: "attributeBinding",
      attr: ins.attr,
      to: ins.attr,
      from: ins.from,
      target: { kind: "attribute", attr: ins.attr },
      loc: ins.loc ?? null,
    });
  }

  const to = normalizeAttrToProp(host, ins.attr, ctx.lookup);
  const target = resolveAttrTarget(host, to);
  const linked: LinkedAttributeBinding = {
    kind: "attributeBinding",
    attr: ins.attr,
    to,
    from: ins.from,
    target,
    loc: ins.loc ?? null,
  };

  if (target.kind === "unknown") {
    // Stub propagation: suppress unknown-target diagnostics for unknown custom elements.
    if (isUnknownCustomElement(host, ctx.graph)) {
      return pure(linked);
    }
    const d = ctx.services.diagnostics.emit("aurelia/unknown-attribute", {
      message: `Attribute '${ins.attr}' could not be resolved to a property on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
      span: ins.loc,
      data: {
        resourceKind: "custom-attribute",
        name: ins.attr,
      },
    });
    return diag(d, withStub(linked, { diagnostic: d, span: ins.loc ?? undefined }));
  }

  return pure(linked);
}

/* ---- StylePropertyBinding ---- */

function linkStylePropertyBinding(ins: StylePropertyBindingIR): LinkedStylePropertyBinding {
  return { kind: "stylePropertyBinding", to: ins.to, from: ins.from, target: { kind: "style" }, loc: ins.loc ?? null };
}

/* ---- ListenerBinding ---- */

function linkListenerBinding(ins: ListenerBindingIR, host: NodeSem, ctx: ResolverContext): Diagnosed<LinkedListenerBinding> {
  const tag = host.kind === "element" ? host.tag : null;
  const eventRes = ctx.lookup.event(ins.to, tag ?? undefined);
  const eventType = eventRes.type;
  const linked: LinkedListenerBinding = {
    kind: "listenerBinding",
    to: ins.to,
    from: ins.from,
    eventType,
    capture: ins.capture!,
    modifier: ins.modifier ?? null,
    loc: ins.loc ?? null,
  };
  if (eventType.kind === "unknown") {
    const d = ctx.services.diagnostics.emit("aurelia/unknown-event", {
      message: `Unknown event '${ins.to}'${tag ? ` on <${tag}>` : ""}.`,
      span: ins.loc,
      data: {
        resourceKind: "event",
        name: ins.to,
      },
    });
    return diag(d, withStub(linked, { diagnostic: d, span: ins.loc ?? undefined }));
  }
  return pure(linked);
}

/* ---- RefBinding ---- */

function linkRefBinding(ins: RefBindingIR): LinkedRefBinding {
  return { kind: "refBinding", to: ins.to, from: ins.from, loc: ins.loc ?? null };
}

/* ---- TextBinding ---- */

function linkTextBinding(ins: TextBindingIR): LinkedTextBinding {
  return { kind: "textBinding", from: ins.from, loc: ins.loc ?? null };
}

/* ---- TranslationBinding (i18n) ---- */

function linkTranslationBinding(ins: TranslationBindingIR): LinkedTranslationBinding {
  const result: LinkedTranslationBinding = {
    kind: "translationBinding",
    to: ins.to,
    isExpression: ins.isExpression,
    loc: ins.loc ?? null,
  };
  // Only include from when it's an expression (t.bind)
  if (ins.from) result.from = ins.from;
  // Only include keyValue when it's a literal key (t)
  if (ins.keyValue !== undefined) result.keyValue = ins.keyValue;
  return result;
}

/* ---- SetAttribute / Class / Style ---- */

function linkSetAttribute(ins: SetAttributeIR): LinkedSetAttribute {
  return { kind: "setAttribute", to: ins.to, value: ins.value, loc: ins.loc ?? null };
}
function linkSetClassAttribute(ins: SetClassAttributeIR): LinkedSetClassAttribute {
  return { kind: "setClassAttribute", value: ins.value, loc: ins.loc ?? null };
}
function linkSetStyleAttribute(ins: SetStyleAttributeIR): LinkedSetStyleAttribute {
  return { kind: "setStyleAttribute", value: ins.value, loc: ins.loc ?? null };
}

function linkSetProperty(ins: SetPropertyIR, host: NodeSem, ctx: ResolverContext): Diagnosed<LinkedSetProperty> {
  const to = normalizePropLikeName(host, ins.to, ctx.lookup);
  const { target } = resolvePropertyTarget(ctx, host, to, "default");
  const linked: LinkedSetProperty = { kind: "setProperty", to, value: ins.value, target, loc: ins.loc ?? null };
  if (target.kind === "unknown") {
    // Stub propagation: suppress unknown-target diagnostics for unknown custom elements.
    if (isUnknownCustomElement(host, ctx.graph)) {
      return pure(linked);
    }
    const bindable = {
      name: to,
      attribute: ins.to,
      ...(host.kind === "element"
        ? { ownerKind: "element" as const, ownerName: host.custom?.def.name ?? host.tag }
        : {}),
    };
    const d = ctx.services.diagnostics.emit("aurelia/unknown-bindable", {
      message: `Property target '${to}' not found on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
      span: ins.loc,
      data: { bindable },
    });
    return diag(d, withStub(linked, { diagnostic: d, span: ins.loc ?? undefined }));
  }
  return pure(linked);
}

function linkHydrateElement(ins: HydrateElementIR, host: NodeSem, ctx: ResolverContext): LinkedHydrateElement {
  const res = resolveElementResRef(ctx, ins.res);
  const props = ins.props.map((p) => linkElementBindable(p, host, ctx));
  return {
    kind: "hydrateElement",
    res,
    props,
    projections: ins.projections ?? null,
    containerless: ins.containerless ?? false,
    loc: ins.loc ?? null,
  };
}

function linkHydrateAttribute(ins: HydrateAttributeIR, host: NodeSem, ctx: ResolverContext): LinkedHydrateAttribute {
  const res = resolveAttrResRef(ctx, ins.res);
  if (!res) {
    const name = ins.alias ?? ins.res;
    reportDiagnostic(ctx.services.diagnostics, "aurelia/unknown-attribute", `Custom attribute '${name}' is not registered in this scope.`, {
      span: ins.loc,
      data: { resourceKind: "custom-attribute", name },
    });
  }
  const props = ins.props.map((p) => linkAttributeBindable(p, res));
  return {
    kind: "hydrateAttribute",
    res,
    alias: ins.alias ?? null,
    props,
    loc: ins.loc ?? null,
  };
}

function linkElementBindable(ins: ElementBindableIR, host: NodeSem, ctx: ResolverContext): LinkedElementBindable {
  switch (ins.type) {
    case "propertyBinding":
      return merge(linkPropertyBinding(ins, host, ctx), ctx);
    case "attributeBinding":
      return merge(linkAttributeBinding(ins, host, ctx), ctx);
    case "stylePropertyBinding":
      return linkStylePropertyBinding(ins);
    case "setProperty":
      return merge(linkSetProperty(ins, host, ctx), ctx);
    /* c8 ignore next 2 -- type exhaustiveness guard */
    default:
      return assertUnreachable(ins as never);
  }
}

function linkAttributeBindable(
  ins: AttributeBindableIR,
  attr: AttrResRef | null,
): LinkedElementBindable {
  switch (ins.type) {
    case "propertyBinding": {
      const to = ins.to;
      const bindable = attr ? resolveAttrBindable(attr, to) : null;
      const target: TargetSem = bindable
        ? { kind: "attribute.bindable", attribute: attr!, bindable }
        : { kind: "unknown", reason: "no-bindable" };
      const effectiveMode = resolveBindableMode(ins.mode, bindable);
      return {
        kind: "propertyBinding",
        to,
        from: ins.from,
        mode: ins.mode,
        effectiveMode,
        target,
        loc: ins.loc ?? null,
      };
    }
    case "attributeBinding": {
      const bindable = attr ? resolveAttrBindable(attr, ins.to) : null;
      const target: TargetSem = bindable
        ? { kind: "attribute.bindable", attribute: attr!, bindable }
        : { kind: "unknown", reason: "no-bindable" };
      return {
        kind: "attributeBinding",
        attr: ins.attr,
        to: ins.to,
        from: ins.from,
        target,
        loc: ins.loc ?? null,
      };
    }
    case "setProperty": {
      const bindable = attr ? resolveAttrBindable(attr, ins.to) : null;
      const target: TargetSem = bindable
        ? { kind: "attribute.bindable", attribute: attr!, bindable }
        : { kind: "unknown", reason: "no-bindable" };
      return {
        kind: "setProperty",
        to: ins.to,
        value: ins.value,
        target,
        loc: ins.loc ?? null,
      };
    }
  }
}

/* ---- IteratorBinding (repeat) ---- */

function linkIteratorBinding(ins: IteratorBindingIR, ctx: ResolverContext): Diagnosed<LinkedIteratorBinding> {
  // Get iterator prop from repeat controller config (config-driven)
  const repeatConfig = ctx.lookup.sem.resources.controllers["repeat"];
  const normalizedTo = repeatConfig?.trigger.kind === "iterator" ? repeatConfig.trigger.prop : "items";
  const aux: LinkedIteratorBinding["aux"] = [];
  const acc = new DiagnosticAccumulator();

  if (ins.props?.length) {
    for (const p of ins.props) {
      const authoredMode: BindingMode = p.command === "bind" ? "toView" : "default";
        const spec = resolveIteratorAuxSpec(ctx, p.to, authoredMode);
        if (!spec) {
          acc.push(ctx.services.diagnostics.emit("aurelia/invalid-command-usage", {
            message: `Unknown repeat option '${p.to}'.`,
            span: p.loc,
          }));
        }
      if (!p.from && p.value == null) continue;
      const from: LinkedIteratorBinding["aux"][number]["from"] = p.from ?? {
        id: ins.forOf.astId,
        code: p.value!,
        loc: p.loc ?? null,
      };
      aux.push({ name: p.to, from, spec });
    }
  }

  const linked: LinkedIteratorBinding = {
    kind: "iteratorBinding",
    to: normalizedTo,
    forOf: ins.forOf,
    aux,
    loc: ins.loc ?? null,
  };
  // If there were diagnostics, mark the result as a stub
  if (acc.diagnostics.length > 0) {
    return acc.wrap(withStub(linked, { diagnostic: acc.diagnostics[0]!, span: ins.loc ?? undefined }));
  }
  return acc.wrap(linked);
}

/* ---- HydrateTemplateController ---- */

function linkHydrateTemplateController(
  ins: HydrateTemplateControllerIR,
  host: NodeSem,
  ctx: ResolverContext,
): LinkedHydrateTemplateController {
  // Resolve controller semantics (returns Diagnosed)
  const ctrlSem = merge(resolveControllerSem(ctx, ins.res, ins.loc), ctx);

  // Map controller props
  const props = ins.props.map((p) => {
    if (p.type === "iteratorBinding") {
      // linkIteratorBinding now returns Diagnosed
      return merge(linkIteratorBinding(p, ctx), ctx);
    } else if (p.type === "propertyBinding") {
      const to = normalizePropLikeName(host, p.to, ctx.lookup);
      const target: TargetSem = {
        kind: "controller.prop",
        controller: ctrlSem,
        bindable: resolveControllerBindable(ctrlSem, to),
      };
      const effectiveMode = resolveEffectiveMode(ctx, p.mode, target, host, to);
      const linked: LinkedPropertyBinding = {
        kind: "propertyBinding",
        to,
        from: p.from,
        mode: p.mode,
        effectiveMode,
        target,
        loc: p.loc ?? null,
      };
      return linked;
    } else if (p.type === "setProperty") {
      // Literal value - matches runtime SetPropertyInstruction
      const to = normalizePropLikeName(host, p.to, ctx.lookup);
      const target: TargetSem = {
        kind: "controller.prop",
        controller: ctrlSem,
        bindable: resolveControllerBindable(ctrlSem, to),
      };
      const linked: LinkedSetProperty = {
        kind: "setProperty",
        to,
        value: p.value,
        target,
        loc: p.loc ?? null,
      };
      return linked;
    } else if (p.type === "attributeBinding") {
      // Interpolation binding on controller prop
      const to = normalizePropLikeName(host, p.to, ctx.lookup);
      const target: TargetSem = {
        kind: "controller.prop",
        controller: ctrlSem,
        bindable: resolveControllerBindable(ctrlSem, to),
      };
      const linked: LinkedAttributeBinding = {
        kind: "attributeBinding",
        attr: p.attr,
        to,
        from: p.from,
        target,
        loc: p.loc ?? null,
      };
      return linked;
    } else {
      /* c8 ignore next -- type exhaustiveness guard */
      return assertUnreachable(p as never);
    }
  });

  // Branch metadata (promise/switch) comes structurally from IR
  let branch: LinkedHydrateTemplateController["branch"] = null;
  if (ins.branch) {
    switch (ins.branch.kind) {
      case "then":
      case "catch":
        branch = { kind: ins.branch.kind, local: ins.branch.local ?? null };
        break;
      case "pending":
        branch = { kind: "pending" };
        break;
      case "case":
        branch = { kind: "case", expr: ins.branch.expr };
        break;
      case "default":
        branch = { kind: "default" };
        break;
      /* c8 ignore next 2 -- type exhaustiveness guard */
      default:
        assertUnreachable(ins.branch);
    }
  }

  return {
    kind: "hydrateTemplateController",
    res: ctrlSem.res,
    def: ins.def, // keep nested template as raw IR (ScopeGraph will walk it)
    controller: ctrlSem,
    props,
    branch: branch ?? null,
    containerless: ins.containerless ?? false,
    loc: ins.loc ?? null,
  };
}

/* ---- HydrateLetElement ---- */

function linkHydrateLetElement(ins: HydrateLetElementIR): LinkedHydrateLetElement {
  // <let> is transparent at semantics level; ScopeGraph consumes the inner instructions.
  return {
    kind: "hydrateLetElement",
    instructions: ins.instructions,
    toBindingContext: ins.toBindingContext,
    loc: ins.loc ?? null,
  };
}

/* ============================================================================
 * Target / Controller resolution
 * ============================================================================ */

