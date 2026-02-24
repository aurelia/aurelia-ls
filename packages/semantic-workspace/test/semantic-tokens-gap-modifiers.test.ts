import { describe, it, expect } from "vitest";
import {
  BUILTIN_SEMANTICS,
  buildTemplateSyntaxRegistry,
  buildResourceCatalog,
  compileTemplate,
  createSemanticModel,
  prepareProjectSemantics,
} from "@aurelia-ls/compiler";
import { collectSemanticTokens } from "../out/semantic-tokens.js";
import {
  WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
  WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
} from "../out/types.js";

function createVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

const VM = createVmReflection();
const NOOP_MODULE_RESOLVER = (_specifier: string, _containingFile: string) => null;

function buildQuery(semantics = BUILTIN_SEMANTICS) {
  const sem = "catalog" in semantics && "resources" in semantics
    ? semantics : prepareProjectSemantics(semantics);
  const syntax = buildTemplateSyntaxRegistry(sem);
  const catalog = buildResourceCatalog(sem.resources, syntax.bindingCommands, syntax.attributePatterns);
  const model = createSemanticModel({
    semantics: sem, catalog, syntax,
    resourceGraph: { root: null, scopes: {} } as any,
    semanticSnapshot: { version: "test" as const, symbols: [], catalog: { resources: {} }, graph: null, gaps: [], confidence: "complete" as const },
    apiSurfaceSnapshot: { version: "test" as const, symbols: [] },
    definition: { authority: [], evidence: [], convergence: [] },
    registration: { sites: [], orphans: [], unresolved: [] },
    templates: [], inlineTemplates: [], diagnostics: [],
    recognizedBindingCommands: [], recognizedAttributePatterns: [],
    facts: new Map(),
  } as any);
  return { query: model.query(), syntax };
}

function compileForTokens(markup: string) {
  const { query, syntax } = buildQuery();
  const compilation = compileTemplate({
    html: markup,
    templateFilePath: "test.html",
    isJs: false,
    vm: VM,
    query,
    moduleResolver: NOOP_MODULE_RESOLVER,
  });
  return { syntax, compilation };
}

function findToken(
  tokens: readonly { type: string; span: { start: number; end: number }; modifiers?: readonly string[] }[],
  text: string,
  type: string,
  tokenText: string,
) {
  return tokens.find((token) => token.type === type && text.slice(token.span.start, token.span.end) === tokenText);
}

describe("semantic tokens gap-aware modifiers", () => {
  it("adds partial/low gap modifiers for resource-backed tokens", () => {
    const markup = "<div repeat.for=\"item of items\" show.bind=\"visible\">${value | sanitize & signal}</div>";
    const { syntax, compilation } = compileForTokens(markup);
    const tokens = collectSemanticTokens(markup, compilation, syntax, undefined, {
      resourceConfidence: ({ kind, name }) => {
        if (kind === "template-controller" && name === "repeat") return "partial";
        if (kind === "custom-attribute" && name === "show") return "low";
        if (kind === "value-converter" && name === "sanitize") return "partial";
        if (kind === "binding-behavior" && name === "signal") return "low";
        return "high";
      },
    });

    const repeat = findToken(tokens, markup, "aureliaController", "repeat");
    expect(repeat?.modifiers).toEqual([WORKSPACE_TOKEN_MODIFIER_GAP_AWARE]);

    const show = findToken(tokens, markup, "aureliaAttribute", "show");
    expect(show?.modifiers).toEqual([
      WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
      WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
    ]);

    const sanitize = findToken(tokens, markup, "aureliaConverter", "sanitize");
    expect(sanitize?.modifiers).toEqual([WORKSPACE_TOKEN_MODIFIER_GAP_AWARE]);

    const signal = findToken(tokens, markup, "aureliaBehavior", "signal");
    expect(signal?.modifiers).toEqual([
      WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
      WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
    ]);
  });
});
