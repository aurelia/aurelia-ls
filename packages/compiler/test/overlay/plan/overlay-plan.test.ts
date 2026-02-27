import { runVectorTests, getDirname, lowerOpts, indexExprCodeFromIr } from "../../_helpers/vector-runner.js";
import { diffByKey, noopModuleResolver } from "../../_helpers/test-utils.js";

import { lowerDocument, linkTemplateSemantics, buildSemanticsSnapshot, bindScopes, planOverlay } from "@aurelia-ls/compiler";

// --- Types ---

interface FrameEntry {
  label: string;
  typeName: string;
  typeExpr: string;
}

interface LambdaEntry {
  frame: string;
  lambda: string;
  expr: string;
}

interface PlanExpect {
  frames?: FrameEntry[];
  lambdas?: LambdaEntry[];
}

interface PlanIntent {
  frames: FrameEntry[];
  lambdas: LambdaEntry[];
}

interface PlanDiff {
  missingFrames: string[];
  extraFrames: string[];
  missingLambdas: string[];
  extraLambdas: string[];
}

const RESOLVE_OPTS = { moduleResolver: noopModuleResolver, templateFilePath: "mem.html" };

runVectorTests<PlanExpect, PlanIntent, PlanDiff>({
  dirname: getDirname(import.meta.url),
  suiteName: "Plan Overlay (50)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(ctx.sem), {
      ...RESOLVE_OPTS,
      diagnostics: ctx.diagnostics.forSource("link"),
    });
    const scope = bindScopes(linked, { diagnostics: ctx.diagnostics.forSource("bind") });
    const vm = createVmReflection(v.rootVmType ?? "RootVm", v.syntheticPrefix ?? "__AU_TTC_");
    const pl = planOverlay(linked, scope, { isJs: false, vm });
    return reducePlanIntent({ ir, scope, pl });
  },
  compare: comparePlanIntent,
  categories: ["frames", "lambdas"],
  normalizeExpect: (expect) => ({
    frames: expect?.frames ?? [],
    lambdas: expect?.lambdas ?? [],
  }),
});

// --- Helpers ---

interface VmReflection {
  getRootVmTypeExpr(): string;
  getSyntheticPrefix(): string;
}

function createVmReflection(rootType: string, syntheticPrefix: string): VmReflection {
  return {
    getRootVmTypeExpr() {
      return rootType;
    },
    getSyntheticPrefix() {
      return syntheticPrefix;
    },
  };
}

// --- Intent Reduction ---

interface ScopeFrame {
  id: number;
  parent: number | null;
  kind: string;
  overlay?: { kind: string } | null;
  origin?: { kind: string } | null;
}

interface ScopeTemplate {
  frames?: ScopeFrame[];
}

interface ScopeModule {
  templates?: ScopeTemplate[];
}

interface PlanFrame {
  frame: number;
  typeName: string;
  typeExpr: string;
  lambdas?: Array<{ lambda: string; exprId: string }>;
}

interface PlanTemplate {
  vmType?: { alias?: string; typeExpr?: string };
  frames?: PlanFrame[];
}

interface PlanModule {
  templates?: PlanTemplate[];
}

interface ReducePlanInput {
  ir: Parameters<typeof indexExprCodeFromIr>[0];
  scope: ScopeModule;
  pl: PlanModule;
}

function reducePlanIntent({ ir, scope, pl }: ReducePlanInput): PlanIntent {
  const codeIndex = indexExprCodeFromIr(ir);
  const labels = labelFrames(scope.templates?.[0]);
  const frames: FrameEntry[] = [];
  const lambdas: LambdaEntry[] = [];

  const tpl = pl.templates?.[0];
  if (tpl) {
    const alias = tpl.vmType?.alias;
    const aliasType = tpl.vmType?.typeExpr;
    const normalizeTypeExpr = (expr: string): string => {
      if (!alias || !aliasType) return expr;
      return expr.split(alias).join(aliasType);
    };
    for (const f of tpl.frames ?? []) {
      const label = labels[f.frame] ?? `frame#${f.frame}`;
      frames.push({ label, typeName: f.typeName, typeExpr: normalizeTypeExpr(f.typeExpr) });
      for (const lam of f.lambdas ?? []) {
        lambdas.push({
          frame: label,
          lambda: lam.lambda,
          expr: codeIndex.get(lam.exprId) ?? `(expr:${lam.exprId})`,
        });
      }
    }
  }

  return { frames, lambdas };
}

function labelFrames(scopeTemplate: ScopeTemplate | undefined): string[] {
  if (!scopeTemplate) return [];
  const labels: string[] = [];
  let overlayCounter = 0;
  for (const f of scopeTemplate.frames ?? []) {
    if (f.parent == null) {
      labels[f.id] = "root";
      continue;
    }
    if (f.kind === "overlay") {
      overlayCounter++;
      const k =
        (f.origin && f.origin.kind) ? f.origin.kind :
        (f.overlay && f.overlay.kind) ? f.overlay.kind :
        "overlay";
      labels[f.id] = `overlay:${k}@${overlayCounter}`;
    } else {
      labels[f.id] = `frame#${f.id}`;
    }
  }
  return labels;
}

// --- Intent Comparison ---

function comparePlanIntent(actual: PlanIntent, expected: PlanExpect): PlanDiff {
  const { missing: missingFrames, extra: extraFrames } =
    diffByKey(actual.frames, expected.frames, (f: FrameEntry) => `${f.label ?? ""}|${f.typeName ?? ""}|${f.typeExpr ?? ""}`);
  const { missing: missingLambdas, extra: extraLambdas } =
    diffByKey(actual.lambdas, expected.lambdas, (l: LambdaEntry) => `${l.frame ?? ""}|${l.lambda ?? ""}|${l.expr ?? ""}`);
  return { missingFrames, extraFrames, missingLambdas, extraLambdas };
}


