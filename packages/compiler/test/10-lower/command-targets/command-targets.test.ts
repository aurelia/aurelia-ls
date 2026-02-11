import { lowerDocument } from "@aurelia-ls/compiler";

import {
  getDirname,
  lowerOpts,
  runVectorTests,
  type CompilerContext,
  type TestVector,
} from "../../_helpers/vector-runner.js";
import { diffByKey } from "../../_helpers/test-utils.js";

interface CommandTargetBinding {
  kind: "attributeBinding" | "stylePropertyBinding";
  attr?: string;
  to: string;
  code: string;
}

interface CommandTargetExpect {
  bindings?: CommandTargetBinding[];
}

interface CommandTargetIntent {
  bindings: CommandTargetBinding[];
}

interface CommandTargetDiff {
  missingBindings: string[];
  extraBindings: string[];
}

runVectorTests<CommandTargetExpect, CommandTargetIntent, CommandTargetDiff>({
  dirname: getDirname(import.meta.url),
  suiteName: "Lower (10) - Command Targets",
  execute: (v: TestVector<CommandTargetExpect>, ctx: CompilerContext) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    return reduceCommandTargetIntent(ir);
  },
  compare: compareCommandTargetIntent,
  categories: ["bindings"],
  normalizeExpect: (e) => ({
    bindings: e?.bindings ?? [],
  }),
});

interface LowerModule {
  templates?: Array<{
    rows?: Array<{
      instructions?: Array<{
        type: string;
        attr?: string;
        to?: string;
        from?: { code?: string };
      }>;
    }>;
  }>;
}

function reduceCommandTargetIntent(ir: LowerModule): CommandTargetIntent {
  const bindings: CommandTargetBinding[] = [];
  const rows = ir.templates?.[0]?.rows ?? [];
  for (const row of rows) {
    for (const ins of row.instructions ?? []) {
      if (ins.type === "attributeBinding") {
        bindings.push({
          kind: "attributeBinding",
          attr: ins.attr,
          to: ins.to ?? "",
          code: ins.from?.code ?? "",
        });
      } else if (ins.type === "stylePropertyBinding") {
        bindings.push({
          kind: "stylePropertyBinding",
          to: ins.to ?? "",
          code: ins.from?.code ?? "",
        });
      }
    }
  }
  return { bindings };
}

function compareCommandTargetIntent(
  actual: CommandTargetIntent,
  expected: CommandTargetExpect,
): CommandTargetDiff {
  const key = (binding: CommandTargetBinding): string =>
    `${binding.kind}|${binding.attr ?? ""}|${binding.to}|${binding.code}`;
  const { missing, extra } = diffByKey(actual.bindings, expected.bindings ?? [], key);
  return {
    missingBindings: missing,
    extraBindings: extra,
  };
}
