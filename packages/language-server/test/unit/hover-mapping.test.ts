import { describe, expect, test } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { mapSemanticRuntimeTemplateHover } from "../../src/mapping/lsp-types.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

const documentUris = new WorkspaceDocumentUris();
documentUris.configure("file:///C:/projects/app");

function source(path: string, start: number, end: number, role = "name") {
  return {
    kind: "source-span-address",
    label: `${path}@${start}..${end}`,
    path,
    start,
    end,
    role,
  };
}

function harness(text: string, token: string, occurrence = 0) {
  const path = "src/hover.html";
  const uri = documentUris.uriForWorkspaceRelativePath(path)!;
  const document = TextDocument.create(uri, "html", 1, text);
  let start = -1;
  let from = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    start = text.indexOf(token, from);
    from = start + token.length;
  }
  if (start < 0) throw new Error(`Missing test token ${token}.`);
  const activeSource = source(path, start, start + token.length);
  return {
    activeSource,
    document,
    map(
      valueOverrides: Record<string, unknown>,
      answerOverrides: Record<string, unknown> = {},
    ) {
      return mapSemanticRuntimeTemplateHover({
        schemaVersion: "0.2",
        result: "answered",
        selection: "exact",
        coverage: "complete",
        summary: "mock",
        ...answerOverrides,
        value: {
          displayText: "must stay below the presentation boundary",
          siteKind: "expression",
          activeSource,
          expressionFrontier: null,
          missingInputs: [],
          template: { compilationLane: "authoring", source: null },
          html: {
            nodeKind: "text",
            tagName: null,
            namespace: null,
            attributeName: null,
            attributeValue: null,
            source: null,
            tagNameSource: null,
            closingTagNameSource: null,
            attributeSource: null,
          },
          valueSite: null,
          selectedDefinition: null,
          selectedBindable: null,
          selectedRouteTarget: null,
          selectedMemberName: null,
          selectedMember: null,
          selectedExpression: null,
          uncertainty: null,
          memberOwnerType: null,
          diagnostics: [],
          diagnosticPresentation: null,
          ...valueOverrides,
        },
      } as never, {
        documentUris,
        originDocument: document,
      });
    },
  };
}

function markdown(mapped: ReturnType<typeof mapSemanticRuntimeTemplateHover>): string {
  return (mapped.value?.contents as { value?: string } | undefined)?.value ?? "";
}

function member(name: string, scopeRole: string | null, typeDisplay = "Item") {
  return {
    name,
    memberKind: "property",
    typeDisplay,
    isOptional: false,
    isReadonly: false,
    scopeRole,
    source: null,
    declarationSource: null,
  };
}

function expression(
  sourceReference: ReturnType<typeof source>,
  overrides: Record<string, unknown> = {},
) {
  return {
    expressionKind: "AccessThis",
    authoredScopeAncestor: 0,
    scopeLookupAncestor: 0,
    typeDisplay: "HoverApp",
    typeShapeKind: "class",
    typeOrigin: "type-checker",
    openKind: null,
    openReason: null,
    source: sourceReference,
    typeSource: null,
    typeDeclarationSource: null,
    ...overrides,
  };
}

function definition(overrides: Record<string, unknown> = {}) {
  const matchedName = typeof overrides.matchedName === "string"
    ? overrides.matchedName
    : "product-card";
  return {
    resourceKind: "custom-element",
    name: "product-card",
    matchedName,
    authoredMatchedName: null,
    runtimeMatchedName: matchedName,
    targetName: "ProductCard",
    source: null,
    nameSource: null,
    matchedNameSource: null,
    targetSource: null,
    ...overrides,
  };
}

function bindable(overrides: Record<string, unknown> = {}) {
  return {
    name: "item",
    attribute: "item",
    callback: "itemChanged",
    mode: "toView",
    setterKind: "property",
    setterTargetName: "item",
    nullable: false,
    valueType: "Item",
    valueTypeShapeKind: "class",
    effectiveValueTypeShapeKind: "class",
    valueTypeHasCallSignature: false,
    valueTypeHasMembers: true,
    valueTypeIsWeak: false,
    source: null,
    nameSource: null,
    attributeSource: null,
    propertySource: null,
    callbackSource: null,
    callbackTargetSource: null,
    modeSource: null,
    setSource: null,
    setterTargetSource: null,
    typeSource: null,
    nullableSource: null,
    ownerDefinitionProductHandle: null,
    ...overrides,
  };
}

function diagnostic(
  summary: string,
  severity: "error" | "information" | "warning",
  diagnosticKind = "missing-expression-member",
) {
  return {
    diagnosticKind,
    diagnosticAuthority: "semantic-authoring-policy",
    frameworkErrorCode: null,
    severity,
    summary,
    missingInput: null,
    missingInputs: [],
    source: null,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: null,
  };
}

describe("bounded semantic hover mapping", () => {
  test("requires an exact inquiry selection before reading an otherwise valid carrier", () => {
    const test = harness("<template>${item}</template>", "item");
    const value = {
      selectedMemberName: "item",
      selectedMember: member("item", null),
    };
    for (const selection of ["absent", "ambiguous", "rerouted", "not-applicable"]) {
      expect(test.map(value, { selection })).toEqual({
        value: null,
        failures: [`Semantic runtime returned hover selection=${selection}; exact selection is required.`],
      });
    }
  });

  test("keeps a repeat local primary and omits its resource and bindable machinery", () => {
    const test = harness("<template>${item}</template>", "item");
    const mapped = test.map({
      selectedMemberName: "item",
      selectedMember: member("item", "repeat-local"),
      selectedBindable: bindable(),
      selectedDefinition: definition(),
    });

    expect(markdown(mapped)).toBe("```ts\nitem: Item\n```\n\nRepeat local.");
    expect(markdown(mapped)).not.toContain("Default mode");
    expect(markdown(mapped)).not.toContain("product-card");
    expect(mapped.failures).toEqual([]);

  });

  test("preserves an exact kebab-case let declaration while requiring its member source", () => {
    const test = harness(
      '<template><let local-title.bind="title"></let></template>',
      "local-title",
    );
    const selectedMember = {
      ...member("localTitle", "let-local", "string"),
      source: test.activeSource,
    };
    const mapped = test.map({
      siteKind: "attribute-name",
      selectedMemberName: "localTitle",
      selectedMember,
    });

    expect(markdown(mapped)).toBe("```ts\nlocal-title: string\n```\n\nLet local.");
    expect(mapped.failures).toEqual([]);

    const mismatched = test.map({
      siteKind: "attribute-name",
      selectedMemberName: "localTitle",
      selectedMember: {
        ...selectedMember,
        source: source(
          "src/hover.html",
          test.activeSource.start + 1,
          test.activeSource.end,
        ),
      },
    });
    expect(mismatched.value).toBeNull();
    expect(mismatched.failures).toEqual([
      "Hover selected member does not match the exact authored token.",
    ]);
  });

  test("authenticates an exact callback-parameter declaration carrier", () => {
    const test = harness(
      "<template>${items.map(entry => entry.name)}</template>",
      "entry",
    );
    const mapped = test.map({
      selectedMemberName: "entry",
      selectedMember: {
        ...member("entry", "callback-parameter", "Item"),
        source: test.activeSource,
      },
    });

    expect(markdown(mapped)).toBe("```ts\nentry: Item\n```\n\nCallback parameter.");
    expect(mapped.failures).toEqual([]);
  });

  test("renders each exact bare binding-context qualifier from authored ancestry", () => {
    const current = harness("<template>${$this}</template>", "$this");
    const currentMapped = current.map({
      selectedExpression: expression(current.activeSource),
    });
    expect(markdown(currentMapped)).toBe([
      "```ts",
      "$this: HoverApp",
      "```",
      "",
      "Current Aurelia binding context.",
    ].join("\n"));
    expect(currentMapped.value?.range).toEqual({
      start: current.document.positionAt(current.activeSource.start),
      end: current.document.positionAt(current.activeSource.end),
    });
    expect(currentMapped.failures).toEqual([]);

    const parent = harness("<template>${$parent}</template>", "$parent");
    const parentMapped = parent.map({
      selectedExpression: expression(parent.activeSource, {
        authoredScopeAncestor: 1,
        scopeLookupAncestor: 1,
        typeDisplay: "HoverApp",
      }),
    });
    expect(markdown(parentMapped)).toBe([
      "```ts",
      "$parent: HoverApp",
      "```",
      "",
      "Parent Aurelia binding context.",
    ].join("\n"));
    expect(parentMapped.value?.range).toEqual({
      start: parent.document.positionAt(parent.activeSource.start),
      end: parent.document.positionAt(parent.activeSource.end),
    });
    expect(parentMapped.failures).toEqual([]);

    const nested = harness("<template>${$parent.$parent}</template>", "$parent", 1);
    const nestedMapped = nested.map({
      selectedExpression: expression(nested.activeSource, {
        authoredScopeAncestor: 2,
        scopeLookupAncestor: 4,
        typeDisplay: "RootApp",
      }),
    });
    expect(markdown(nestedMapped)).toBe([
      "```ts",
      "$parent: RootApp",
      "```",
      "",
      "Aurelia binding context 2 parent scopes up.",
    ].join("\n"));
    expect(nestedMapped.value?.range).toEqual({
      start: nested.document.positionAt(nested.activeSource.start),
      end: nested.document.positionAt(nested.activeSource.end),
    });
    expect(nestedMapped.failures).toEqual([]);
  });

  test("keeps missing parent ancestry typed as unavailable without fabricating a type", () => {
    const parent = harness("<template>${$parent}</template>", "$parent");
    const mapped = parent.map({
      selectedExpression: expression(parent.activeSource, {
        authoredScopeAncestor: 1,
        scopeLookupAncestor: 1,
        typeDisplay: null,
        typeShapeKind: null,
        typeOrigin: null,
        openKind: "missing-ancestor",
        openReason: "No parent scope exists.",
      }),
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "binding-context",
        affectedLocus: "selected-expression",
      },
    }, { coverage: "open" });

    expect(markdown(mapped)).toBe([
      "```ts",
      "$parent",
      "```",
      "",
      "Parent Aurelia binding context.",
      "",
      "No parent Aurelia binding context is reachable.",
    ].join("\n"));
    expect(markdown(mapped)).not.toContain("No parent scope exists");
    expect(markdown(mapped)).not.toContain("missing-ancestor");
    expect(mapped.value?.range).toEqual({
      start: parent.document.positionAt(parent.activeSource.start),
      end: parent.document.positionAt(parent.activeSource.end),
    });
    expect(mapped.failures).toEqual([]);

    const excess = harness("<template>${$parent.$parent}</template>", "$parent", 1);
    const excessMapped = excess.map({
      selectedExpression: expression(excess.activeSource, {
        authoredScopeAncestor: 2,
        scopeLookupAncestor: 2,
        typeDisplay: null,
        typeShapeKind: null,
        typeOrigin: null,
        openKind: "missing-ancestor",
        openReason: "Only one parent scope exists.",
      }),
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "binding-context",
        affectedLocus: "selected-expression",
      },
    }, { coverage: "open" });
    expect(markdown(excessMapped)).toBe([
      "```ts",
      "$parent",
      "```",
      "",
      "Aurelia binding context 2 parent scopes up.",
      "",
      "No Aurelia binding context is reachable 2 parent scopes up.",
    ].join("\n"));
    expect(excessMapped.value?.range).toEqual({
      start: excess.document.positionAt(excess.activeSource.start),
      end: excess.document.positionAt(excess.activeSource.end),
    });
    expect(excessMapped.failures).toEqual([]);
  });

  test("fails closed for incoherent binding-context ancestry and token spelling", () => {
    const parent = harness("<template>${$parent}</template>", "$parent");
    for (const overrides of [
      { authoredScopeAncestor: -1 },
      { authoredScopeAncestor: 1.5 },
      { scopeLookupAncestor: -1 },
      { authoredScopeAncestor: 2, scopeLookupAncestor: 1 },
      { scopeLookupAncestor: Number.MAX_SAFE_INTEGER + 1 },
      { expressionKind: "AccessScope" },
    ]) {
      expect(parent.map({
        selectedExpression: expression(parent.activeSource, {
          authoredScopeAncestor: 1,
          scopeLookupAncestor: 1,
          ...overrides,
        }),
      }).failures).toEqual([
        "Hover selected expression has unsupported binding-context ancestry.",
      ]);
    }

    expect(parent.map({
      selectedExpression: expression(parent.activeSource, {
        authoredScopeAncestor: 0,
        scopeLookupAncestor: 0,
      }),
    }).failures).toEqual([
      "Hover selected expression does not match its exact authored binding-context token.",
    ]);

    expect(parent.map({
      selectedExpression: expression(parent.activeSource, {
        authoredScopeAncestor: 1,
        scopeLookupAncestor: 1,
        openKind: "missing-ancestor",
        openReason: "forged missing ancestor",
        typeDisplay: "FabricatedParent",
      }),
    }).failures).toEqual([
      "Hover selected expression has incoherent missing-ancestor evidence.",
    ]);

    const current = harness("<template>${$this}</template>", "$this");
    expect(current.map({
      selectedExpression: expression(current.activeSource, {
        authoredScopeAncestor: 0,
        scopeLookupAncestor: 0,
        openKind: "missing-ancestor",
        openReason: "forged missing ancestor",
        typeDisplay: null,
      }),
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "binding-context",
        affectedLocus: "selected-expression",
      },
    }, { coverage: "open" }).failures).toEqual([
      "Hover selected expression has incoherent missing-ancestor evidence.",
    ]);
  });

  test("keeps a component property named $parent as an ordinary member after $this", () => {
    const property = harness("<template>${$this.$parent}</template>", "$parent");
    const mapped = property.map({
      selectedMemberName: "$parent",
      selectedMember: {
        ...member("$parent", null, "17"),
        isReadonly: true,
      },
    });

    expect(markdown(mapped)).toBe("```ts\nreadonly $parent: 17\n```");
    expect(markdown(mapped)).not.toContain("binding context");
    expect(mapped.value?.range).toEqual({
      start: property.document.positionAt(property.activeSource.start),
      end: property.document.positionAt(property.activeSource.end),
    });
    expect(mapped.failures).toEqual([]);
  });

  test("requires typed member uncertainty for a missing type and rejects unknown scope roles", () => {
    const test = harness("<template>${item}</template>", "item");
    const missingType = member("item", "repeat-local", null);
    expect(test.map({
      selectedMemberName: "item",
      selectedMember: missingType,
    }).failures).toEqual([
      "Hover selected member has neither a type nor typed member uncertainty.",
    ]);

    const qualified = test.map({
      selectedMemberName: "item",
      selectedMember: missingType,
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "member",
        affectedLocus: "selected-member",
      },
    });
    expect(markdown(qualified)).toBe([
      "```ts",
      "item",
      "```",
      "",
      "Repeat local.",
      "",
      "Type unavailable in the current template scope.",
    ].join("\n"));

    expect(test.map({
      selectedMemberName: "item",
      selectedMember: member("item", "invented-role"),
    }).failures).toEqual(["Hover selected member has an unsupported scope role."]);

    const openProjected = test.map({
      selectedMemberName: "item",
      selectedMember: member("item", "repeat-local", "Item"),
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "member",
        affectedLocus: "selected-member",
      },
    });
    expect(markdown(openProjected)).toContain("item: Item");
    expect(markdown(openProjected)).toContain("Type information is incomplete for this expression.");

    const literalUnknown = test.map({
      selectedMemberName: "item",
      selectedMember: member("item", "repeat-local", "unknown"),
    });
    expect(markdown(literalUnknown)).toContain("item: unknown");
    expect(markdown(literalUnknown)).not.toContain("incomplete");
  });

  test("leads with the exact resource alias and keeps canonical identity in one context line", () => {
    const test = harness("<template><legacy-card></legacy-card></template>", "legacy-card");
    const mapped = test.map({
      siteKind: "tag-name",
      html: {
        nodeKind: "element",
        tagName: "legacy-card",
        attributeName: null,
        attributeValue: null,
        source: null,
        tagNameSource: test.activeSource,
        closingTagNameSource: null,
        attributeSource: null,
      },
      selectedDefinition: definition({ matchedName: "legacy-card" }),
    });

    expect(markdown(mapped)).toBe([
      "```html",
      "<legacy-card>",
      "```",
      "",
      "Aurelia custom element. Alias for: `product-card`.",
    ].join("\n"));
    expect(markdown(mapped)).not.toContain("ProductCard");
    expect(mapped.value?.range).toEqual({
      start: test.document.positionAt(test.activeSource.start),
      end: test.document.positionAt(test.activeSource.end),
    });

    const sourceBacked = test.map({
      siteKind: "tag-name",
      html: {
        nodeKind: "element",
        tagName: "legacy-card",
        attributeName: null,
        attributeValue: null,
        source: null,
        tagNameSource: test.activeSource,
        closingTagNameSource: null,
        attributeSource: null,
      },
      selectedDefinition: definition({
        matchedName: "legacy-card",
        targetSource: source("src/product-card.ts", 13, 24),
      }),
    });
    expect(markdown(sourceBacked)).toContain(
      "Aurelia custom element. Alias for: `product-card`. Implementation: `ProductCard`.",
    );
  });

  test("preserves authored tag spelling while authenticating browser-normalized element identity", () => {
    const text = "<template><PrOdUcT-CaRd></pRoDuCt-CaRd></template>";
    const closing = harness(text, "pRoDuCt-CaRd");
    const openingStart = text.indexOf("PrOdUcT-CaRd");
    const mapped = closing.map({
      siteKind: "tag-name",
      html: {
        nodeKind: "element",
        tagName: "PrOdUcT-CaRd",
        namespace: "html",
        attributeName: null,
        attributeValue: null,
        source: null,
        tagNameSource: source("src/hover.html", openingStart, openingStart + "PrOdUcT-CaRd".length),
        closingTagNameSource: closing.activeSource,
        attributeSource: null,
      },
      selectedDefinition: definition({
        authoredMatchedName: null,
        runtimeMatchedName: "product-card",
      }),
    });

    expect(markdown(mapped)).toContain("<pRoDuCt-CaRd>");
    expect(mapped.failures).toEqual([]);
    expect(mapped.value?.range).toEqual({
      start: closing.document.positionAt(closing.activeSource.start),
      end: closing.document.positionAt(closing.activeSource.end),
    });
  });

  test("authenticates authored HTML, SVG, command, and as-element identities on both axes", () => {
    const htmlAttribute = harness("<template><div FOCUS></div></template>", "FOCUS");
    const htmlMapped = htmlAttribute.map({
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "div",
        namespace: "html",
        attributeName: "FOCUS",
        attributeValue: null,
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: htmlAttribute.activeSource,
      },
      selectedDefinition: definition({
        resourceKind: "custom-attribute",
        name: "focus-ring",
        matchedName: "focus",
        authoredMatchedName: "FOCUS",
        runtimeMatchedName: "focus",
      }),
    });
    expect(markdown(htmlMapped)).toContain("(custom attribute) FOCUS");
    expect(markdown(htmlMapped)).toContain("Alias for: `focus-ring`.");
    expect(htmlMapped.failures).toEqual([]);

    const svgAttribute = harness("<template><svg VIEWBOX=\"0 0 1 1\"></svg></template>", "VIEWBOX");
    const svgMapped = svgAttribute.map({
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "svg",
        namespace: "svg",
        attributeName: "VIEWBOX",
        attributeValue: "0 0 1 1",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          svgAttribute.activeSource.start,
          svgAttribute.activeSource.end + '=\"0 0 1 1\"'.length,
        ),
      },
      selectedDefinition: definition({
        resourceKind: "custom-attribute",
        name: "viewBox",
        matchedName: "viewBox",
        authoredMatchedName: "VIEWBOX",
        runtimeMatchedName: "viewBox",
      }),
    });
    expect(markdown(svgMapped)).toContain("(custom attribute) VIEWBOX");
    expect(svgMapped.failures).toEqual([]);

    const command = harness("<template><input VALUE.BIND=\"item\"></template>", "BIND");
    const attributeStart = command.activeSource.start - "VALUE.".length;
    const commandMapped = command.map({
      siteKind: "binding-command-name",
      html: {
        nodeKind: "element",
        tagName: "input",
        namespace: "html",
        attributeName: "VALUE.BIND",
        attributeValue: "item",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          attributeStart,
          command.activeSource.end + '=\"item\"'.length,
        ),
      },
      valueSite: { bindingCommandName: "bind" },
      selectedDefinition: definition({
        resourceKind: "binding-command",
        name: "bind",
        matchedName: "bind",
        authoredMatchedName: "BIND",
        runtimeMatchedName: "bind",
      }),
    });
    expect(markdown(commandMapped)).toContain("(binding command) BIND");
    expect(commandMapped.failures).toEqual([]);

    const specializedCommand = harness("<template><p T.BIND=\"key\"></p></template>", "BIND");
    const specializedStart = specializedCommand.activeSource.start - "T.".length;
    const specializedMapped = specializedCommand.map({
      siteKind: "binding-command-name",
      html: {
        nodeKind: "element",
        tagName: "p",
        namespace: "html",
        attributeName: "T.BIND",
        attributeValue: "key",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          specializedStart,
          specializedCommand.activeSource.end + '=\"key\"'.length,
        ),
      },
      valueSite: { bindingCommandName: "t.bind" },
      selectedDefinition: definition({
        resourceKind: "binding-command",
        name: "t.bind",
        matchedName: "t.bind",
        authoredMatchedName: "BIND",
        runtimeMatchedName: "t.bind",
      }),
    });
    expect(markdown(specializedMapped)).toContain("(binding command) BIND");
    expect(specializedMapped.failures).toEqual([]);

    const asElement = harness(
      '<template><div AS-ELEMENT="PRODUCT-CARD"></div></template>',
      "PRODUCT-CARD",
    );
    const asElementMapped = asElement.map({
      siteKind: "attribute-value",
      html: {
        nodeKind: "element",
        tagName: "div",
        namespace: "html",
        attributeName: "AS-ELEMENT",
        attributeValue: "PRODUCT-CARD",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          asElement.activeSource.start - 'AS-ELEMENT="'.length,
          asElement.activeSource.end + 1,
        ),
      },
      selectedDefinition: definition({
        authoredMatchedName: "PRODUCT-CARD",
        runtimeMatchedName: "product-card",
      }),
    });
    expect(markdown(asElementMapped)).toContain("(custom element) PRODUCT-CARD");
    expect(asElementMapped.failures).toEqual([]);
  });

  test("rejects stale runtime identity and SVG compound-name guesses", () => {
    const stale = harness("<template><div FOCUS></div></template>", "FOCUS");
    const staleMapped = stale.map({
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "div",
        namespace: "html",
        attributeName: "FOCUS",
        attributeValue: null,
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: stale.activeSource,
      },
      selectedDefinition: definition({
        resourceKind: "custom-attribute",
        name: "focus",
        matchedName: "focus",
        authoredMatchedName: "FOCUS",
        runtimeMatchedName: "other",
      }),
    });
    expect(staleMapped.value).toBeNull();
    expect(staleMapped.failures).toEqual([
      "Hover selected resource does not match the exact authored token.",
    ]);

    const svgCompound = harness(
      '<template><svg VIEWBOX.BIND="item"></svg></template>',
      "VIEWBOX",
    );
    const compoundMapped = svgCompound.map({
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "svg",
        namespace: "svg",
        attributeName: "VIEWBOX.BIND",
        attributeValue: "item",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          svgCompound.activeSource.start,
          svgCompound.activeSource.end + '.BIND="item"'.length,
        ),
      },
      selectedDefinition: definition({
        resourceKind: "custom-attribute",
        name: "viewBox",
        matchedName: "viewBox",
        authoredMatchedName: "VIEWBOX",
        runtimeMatchedName: "viewBox",
      }),
    });
    expect(compoundMapped.value).toBeNull();
    expect(compoundMapped.failures).toEqual([
      "Hover selected resource does not match the exact authored token.",
    ]);
  });

  test("keeps expression resource aliases exact and case-sensitive", () => {
    const alias = harness("<template>${item | FormatName}</template>", "FormatName");
    const mapped = alias.map({
      siteKind: "expression-value-converter",
      html: { namespace: null },
      selectedDefinition: definition({
        resourceKind: "value-converter",
        name: "formatName",
        matchedName: "FormatName",
        authoredMatchedName: "FormatName",
        runtimeMatchedName: "FormatName",
      }),
    });
    expect(markdown(mapped)).toContain("(value converter) FormatName");
    expect(markdown(mapped)).toContain("Alias for: `formatName`.");
    expect(mapped.failures).toEqual([]);
  });

  test("withholds attribute-pattern cards without reporting a mapping failure", () => {
    const pattern = harness('<template><div foo.DATA="item"></div></template>', "DATA");
    const mapped = pattern.map({
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "div",
        namespace: "html",
        attributeName: "foo.DATA",
        attributeValue: "item",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          pattern.activeSource.start - "foo.".length,
          pattern.activeSource.end + '=\"item\"'.length,
        ),
      },
      selectedDefinition: definition({
        resourceKind: "attribute-pattern",
        name: null,
        matchedName: null,
        authoredMatchedName: "DATA",
        runtimeMatchedName: "PART.data",
      }),
    });

    expect(mapped).toEqual({ value: null, failures: [] });
  });

  test("fails closed on an unsupported future HTML namespace", () => {
    const token = harness("<template><product-card></product-card></template>", "product-card");
    const mapped = token.map({
      siteKind: "tag-name",
      html: {
        nodeKind: "element",
        tagName: "product-card",
        namespace: "future-namespace",
        attributeName: null,
        attributeValue: null,
        source: null,
        tagNameSource: token.activeSource,
        closingTagNameSource: null,
        attributeSource: null,
      },
      selectedDefinition: definition(),
    });

    expect(mapped).toEqual({
      value: null,
      failures: ["Hover HTML namespace has an unsupported value."],
    });
  });

  test("renders only an exact as-element value as an audible non-tag custom-element identity", () => {
    const token = "decorator-card-alias";
    const test = harness(
      `<template><button as-element="${token}"></button></template>`,
      token,
    );
    const mapped = test.map({
      siteKind: "attribute-value",
      html: {
        nodeKind: "element",
        tagName: "button",
        attributeName: "as-element",
        attributeValue: token,
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          test.activeSource.start - 'as-element="'.length,
          test.activeSource.end + 1,
        ),
      },
      valueSite: null,
      selectedDefinition: definition({
        name: "decorator-card",
        matchedName: token,
        targetName: "DecoratorCard",
        targetSource: source("src/decorator-card.ts", 13, 26),
      }),
    });

    expect(markdown(mapped)).toContain("(custom element) decorator-card-alias");
    expect(markdown(mapped)).not.toContain("<decorator-card-alias>");
    expect(markdown(mapped)).toContain(
      "Aurelia custom element. Alias for: `decorator-card`. Implementation: `DecoratorCard`.",
    );
    expect(mapped.failures).toEqual([]);

    const unrelated = harness(
      `<template><button title="${token}"></button></template>`,
      token,
    );
    const unrelatedMapped = unrelated.map({
      siteKind: "attribute-value",
      html: {
        nodeKind: "element",
        tagName: "button",
        attributeName: "title",
        attributeValue: token,
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          unrelated.activeSource.start - 'title="'.length,
          unrelated.activeSource.end + 1,
        ),
      },
      selectedDefinition: definition({
        name: "decorator-card",
        matchedName: token,
      }),
    });
    expect(unrelatedMapped.value).toBeNull();
    expect(unrelatedMapped.failures).toEqual([]);
  });

  test("lets an exact custom-attribute token outrank its primary bindable carrier", () => {
    for (const matchedName of ["decorator-tooltip", "decorator-tip"]) {
      const test = harness(
        `<template><button ${matchedName}="hello"></button></template>`,
        matchedName,
      );
      const mapped = test.map({
        siteKind: "attribute-name",
        html: {
          nodeKind: "element",
          tagName: "button",
          attributeName: matchedName,
          attributeValue: "hello",
          source: null,
          tagNameSource: null,
          closingTagNameSource: null,
          attributeSource: source(
            "src/hover.html",
            test.activeSource.start,
            test.activeSource.end + '="hello"'.length,
          ),
        },
        selectedBindable: bindable({ name: "message", attribute: "message" }),
        selectedDefinition: definition({
          resourceKind: "custom-attribute",
          name: "decorator-tooltip",
          matchedName,
          targetName: "DecoratorTooltip",
        }),
      });

      expect(markdown(mapped)).toContain(`(custom attribute) ${matchedName}`);
      expect(markdown(mapped)).not.toContain("(bindable)");
      if (matchedName === "decorator-tip") {
        expect(markdown(mapped)).toContain("Alias for: `decorator-tooltip`.");
      }
      expect(mapped.failures).toEqual([]);
    }

    const controller = harness(
      '<template><div repeat.for="item of items"></div></template>',
      "repeat",
    );
    const controllerMapped = controller.map({
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "div",
        attributeName: "repeat.for",
        attributeValue: "item of items",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          controller.activeSource.start,
          controller.activeSource.end + '.for="item of items"'.length,
        ),
      },
      selectedBindable: bindable({ name: "items", attribute: "items" }),
      selectedDefinition: definition({
        resourceKind: "template-controller",
        name: "repeat",
        matchedName: "repeat",
        targetName: "Repeat",
      }),
    });
    expect(markdown(controllerMapped)).toContain("(template controller) repeat");
    expect(markdown(controllerMapped)).not.toContain("(bindable)");
    expect(controllerMapped.failures).toEqual([]);
  });

  test("accepts an exact bare custom-attribute alias despite an attribute-value site classification", () => {
    const test = harness(
      '<template><ref-panel focus focus-ring.ref="controller"></ref-panel></template>',
      "focus",
    );
    const mapped = test.map({
      siteKind: "attribute-value",
      html: {
        nodeKind: "element",
        tagName: "ref-panel",
        attributeName: "focus",
        attributeValue: null,
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: test.activeSource,
      },
      selectedBindable: bindable({
        name: "value",
        attribute: "value",
        valueType: null,
        valueTypeShapeKind: "unknown",
      }),
      selectedDefinition: definition({
        resourceKind: "custom-attribute",
        name: "focus-ring",
        matchedName: "focus",
        targetName: "FocusRing",
        targetSource: source("src/focus-ring.ts", 13, 22),
      }),
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "bindable",
        affectedLocus: "selected-bindable",
      },
    });

    expect(mapped.failures).toEqual([]);
    expect(markdown(mapped)).toContain("(custom attribute) focus");
    expect(markdown(mapped)).toContain("Alias for: `focus-ring`.");
    expect(markdown(mapped)).toContain("Implementation: `FocusRing`.");
    expect(markdown(mapped)).not.toContain("(bindable)");
    expect(markdown(mapped)).not.toContain("Type unavailable");
  });

  test("renders source-authenticated bindable name, attribute, and default-mode declarations", () => {
    const text = [
      "<template>",
      '  <bindable name="oneTimeValue" attribute="one-time-value" mode="oneTime"></bindable>',
      "</template>",
    ].join("\n");
    const declarationSource = (authored: string) => {
      const start = text.indexOf(`"${authored}"`) + 1;
      return source("src/hover.html", start, start + authored.length);
    };
    const nameSource = declarationSource("oneTimeValue");
    const attributeSource = declarationSource("one-time-value");
    const modeSource = declarationSource("oneTime");
    const declarationBindable = (valueType: string | null = "string") => bindable({
      name: "oneTimeValue",
      attribute: "one-time-value",
      mode: "oneTime",
      valueType,
      nameSource,
      attributeSource,
      modeSource,
    });

    const name = harness(text, "oneTimeValue");
    const nameMapped = name.map({
      siteKind: "unknown",
      selectedMemberName: "oneTimeValue",
      selectedMember: {
        ...member("oneTimeValue", null, "string"),
        source: name.activeSource,
      },
      selectedBindable: declarationBindable(),
    });
    expect(markdown(nameMapped)).toBe([
      "```ts",
      "(bindable) oneTimeValue: string",
      "```",
      "",
      "Public attribute: `one-time-value`. Default mode: one time.",
    ].join("\n"));
    expect(nameMapped.failures).toEqual([]);

    const attribute = harness(text, "one-time-value");
    const attributeMapped = attribute.map({
      siteKind: "unknown",
      selectedBindable: declarationBindable(),
    });
    expect(markdown(attributeMapped)).toBe([
      "```ts",
      "(bindable) one-time-value: string",
      "```",
      "",
      "Maps to: `oneTimeValue`. Default mode: one time.",
    ].join("\n"));
    expect(attributeMapped.failures).toEqual([]);

    const mode = harness(text, "oneTime", 1);
    const modeMapped = mode.map({
      siteKind: "attribute-value",
      selectedBindable: declarationBindable(null),
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "bindable",
        affectedLocus: "selected-bindable",
      },
    });
    expect(modeMapped.failures).toEqual([]);
    expect(markdown(modeMapped)).toBe([
      "```text",
      "(binding mode) oneTime",
      "```",
      "",
      "Default for: `one-time-value`.",
    ].join("\n"));
    expect(markdown(modeMapped)).not.toContain("Type unavailable");

    const forged = name.map({
      siteKind: "unknown",
      selectedBindable: bindable({
        name: "differentName",
        attribute: "one-time-value",
        mode: "oneTime",
        nameSource: name.activeSource,
        attributeSource,
        modeSource,
      }),
    });
    expect(forged.value).toBeNull();
    expect(forged.failures).toEqual([
      "Hover selected bindable declaration does not match the exact authored token.",
    ]);

    const unavailable = harness(
      '<template><bindable name="unusedValue"></bindable></template>',
      "unusedValue",
    );
    const unavailableMapped = unavailable.map({
      siteKind: "unknown",
      selectedBindable: bindable({
        name: "unusedValue",
        attribute: "unusedValue",
        mode: "default",
        valueType: null,
        nameSource: unavailable.activeSource,
      }),
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "bindable",
        affectedLocus: "selected-bindable",
      },
    });
    expect(markdown(unavailableMapped)).toBe([
      "```ts",
      "(bindable) unusedValue",
      "```",
      "",
      "Default mode: default.",
      "",
      "Type unavailable for this bindable.",
    ].join("\n"));
    expect(unavailableMapped.failures).toEqual([]);
  });

  test("labels a commanded bindable target without requiring a value-site carrier", () => {
    const token = "one-time-value";
    const rawAttribute = `${token}.bind`;
    const test = harness(
      `<template><mode-panel ${rawAttribute}="item"></mode-panel></template>`,
      token,
    );
    const targetSource = source("src/mode-panel.ts", 10, 19);
    const mapped = test.map({
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "mode-panel",
        attributeName: rawAttribute,
        attributeValue: "item",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          test.activeSource.start,
          test.activeSource.start + `${rawAttribute}="item"`.length,
        ),
      },
      valueSite: null,
      selectedBindable: bindable({
        name: "oneTimeValue",
        attribute: "one-time-value",
        mode: "oneTime",
        valueType: "string",
      }),
      selectedDefinition: definition({
        name: "mode-panel",
        matchedName: "mode-panel",
        targetName: "ModePanel",
        targetSource,
      }),
    });

    expect(markdown(mapped)).toContain("(bindable) one-time-value: string");
    expect(markdown(mapped)).toContain("Maps to: `ModePanel.oneTimeValue`.");
    expect(markdown(mapped)).toContain("Default mode: one time.");
    expect(markdown(mapped)).not.toContain("Effective mode");
  });

  test("lets the exact binding-command resource own the command suffix locus", () => {
    const rawAttribute = "item.bind";
    const test = harness(
      `<template><product-card ${rawAttribute}="item"></product-card></template>`,
      "bind",
    );
    const mapped = test.map({
      siteKind: "binding-command-name",
      html: {
        nodeKind: "element",
        tagName: "product-card",
        attributeName: rawAttribute,
        attributeValue: "item",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          test.activeSource.start - "item.".length,
          test.activeSource.end,
        ),
      },
      valueSite: { bindingCommandName: "bind" },
      selectedBindable: bindable(),
      selectedDefinition: definition({
        resourceKind: "binding-command",
        name: "bind",
        matchedName: "bind",
        targetName: "BindBindingCommand",
      }),
    });

    expect(markdown(mapped)).toContain("(binding command) bind");
    expect(markdown(mapped)).toContain("Aurelia binding command.");
    expect(markdown(mapped)).not.toContain("(bindable)");
    expect(mapped.failures).toEqual([]);
  });

  test("requires and translates typed bindable uncertainty when its value type is unavailable", () => {
    const token = "item";
    const rawAttribute = `${token}.bind`;
    const test = harness(
      `<template><product-card ${rawAttribute}="item"></product-card></template>`,
      token,
    );
    const value = {
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "product-card",
        attributeName: rawAttribute,
        attributeValue: "item",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: source(
          "src/hover.html",
          test.activeSource.start,
          test.activeSource.start + rawAttribute.length,
        ),
      },
      valueSite: { bindingCommandName: "bind" },
      selectedBindable: bindable({ valueType: null }),
    };
    expect(test.map(value).failures).toEqual([
      "Hover selected bindable has neither a type nor typed bindable uncertainty.",
    ]);

    const qualified = test.map({
      ...value,
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "bindable",
        affectedLocus: "selected-bindable",
      },
    });
    expect(markdown(qualified)).toContain("(bindable) item");
    expect(markdown(qualified)).toContain("Default mode: to view.");
    expect(markdown(qualified)).toContain("Type unavailable for this bindable.");

    const uncommanded = harness(
      '<template><product-card item="item"></product-card></template>',
      "item",
    );
    const uncommandedMapped = uncommanded.map({
      siteKind: "attribute-name",
      html: {
        nodeKind: "element",
        tagName: "product-card",
        attributeName: "item",
        attributeValue: "item",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: uncommanded.activeSource,
      },
      selectedBindable: bindable(),
    });
    expect(markdown(uncommandedMapped)).toContain("(bindable) item: Item");
    expect(uncommandedMapped.failures).toEqual([]);
  });

  test("gives an exact route target precedence over the route bindable", () => {
    const token = "items/:id";
    const test = harness(`<template><a load="${token}"></a></template>`, token);
    const mapped = test.map({
      siteKind: "attribute-value",
      selectedBindable: bindable({ name: "load", attribute: "load" }),
      selectedRouteTarget: {
        targetKind: "route-path",
        matchedName: "items/:id",
        routeConfigId: "item-detail",
        source: source("src/routes.ts", 0, 80),
        targetSource: source("src/routes.ts", 12, 23),
      },
    });

    expect(markdown(mapped)).toBe([
      "```text",
      '(route path) "items/:id"',
      "```",
      "",
      "Configured route id: `item-detail`.",
    ].join("\n"));
    expect(markdown(mapped)).not.toContain("bindable");
    expect(mapped.value?.range == null ? null : test.document.getText(mapped.value.range)).toBe(token);
    expect(mapped.failures).toEqual([]);
  });

  test("preserves a dynamic authored route path and discloses its configured route id", () => {
    const token = "items/item-1";
    const test = harness(
      `<template><a load="${token}?ref=featured#details"></a></template>`,
      token,
    );
    const mapped = test.map({
      siteKind: "attribute-value",
      selectedRouteTarget: {
        targetKind: "route-path",
        matchedName: "items/:itemId",
        routeConfigId: "item-detail",
        source: source("src/routes.ts", 0, 80),
        targetSource: source("src/routes.ts", 12, 25),
      },
    });

    expect(markdown(mapped)).toBe([
      "```text",
      '(route path) "items/item-1"',
      "```",
      "",
      "Configured route id: `item-detail`.",
    ].join("\n"));
    expect(mapped.value?.range == null ? null : test.document.getText(mapped.value.range)).toBe(token);
    expect(mapped.failures).toEqual([]);
  });

  test("preserves unquoted and single-quoted exact route ids", () => {
    const cases = [
      {
        text: '<template><a load="route: product-detail"></a></template>',
        token: "product-detail",
        identity: '(route id) "product-detail"',
      },
      {
        text: '<template><a load.bind="\'product-detail\'"></a></template>',
        token: "'product-detail'",
        identity: "(route id) 'product-detail'",
      },
    ];
    for (const routeCase of cases) {
      const test = harness(routeCase.text, routeCase.token);
      const mapped = test.map({
        siteKind: "attribute-value",
        selectedRouteTarget: {
          targetKind: "route-id",
          matchedName: "product-detail",
          routeConfigId: "product-detail",
          source: source("src/routes.ts", 0, 80),
          targetSource: source("src/routes.ts", 12, 26),
        },
      });
      expect(markdown(mapped)).toContain(routeCase.identity);
      expect(mapped.failures).toEqual([]);
    }
  });

  test("ignores contextual load resource metadata on route query and fragment text", () => {
    const text = '<template><a load="items/item-1?ref=featured#details"></a></template>';
    for (const token of ["ref", "featured", "details"]) {
      const test = harness(text, token);
      const mapped = test.map({
        siteKind: "attribute-value",
        selectedDefinition: definition({
          resourceKind: "custom-attribute",
          name: "load",
          matchedName: "load",
          targetName: "LoadCustomAttribute",
        }),
      });
      expect(mapped).toEqual({ value: null, failures: [] });
    }
  });

  test("fails closed when route source or authored spelling does not authenticate the target", () => {
    const test = harness('<template><a load="items/:other"></a></template>', '"items/:other"');
    const route = {
      targetKind: "route-id",
      matchedName: "item-detail",
      routeConfigId: "item-detail",
      source: source("src/routes.ts", 0, 80),
      targetSource: source("src/routes.ts", 12, 23),
    };
    expect(test.map({ selectedRouteTarget: route }).failures).toEqual([
      "Hover selected route target does not match the exact authored token.",
    ]);
    expect(test.map({ selectedRouteTarget: { ...route, targetSource: null } }).failures).toEqual([
      "Hover selected route target has no exact declaration source.",
    ]);
  });

  test("renders one presenter-selected diagnostic and excludes overlapping uncertainty", () => {
    const test = harness("<template>${missing}</template>", "missing");
    const rows = [
      diagnostic("Checker context must stay in Problems.", "information", "template-expression-typescript-diagnostic"),
      { ...diagnostic("`missing` is not declared.", "warning"), source: test.activeSource },
      diagnostic("A co-located withheld row.", "warning", "weak-expression-member-owner"),
    ];
    const mapped = test.map({
      selectedMemberName: "missing",
      diagnostics: rows,
      diagnosticPresentation: {
        kind: "presented",
        rawRowCount: 3,
        group: {
          groupKey: "missing:missing",
          subject: null,
          primary: { rowId: "primary", rowIndex: 1, role: "primary", relation: null },
          related: [{
            rowId: "checker",
            rowIndex: 0,
            role: "contextual",
            relation: "checker-evidence",
          }],
          rawRowCount: 2,
          primarySeverity: "warning",
          maxRawSeverity: "warning",
        },
      },
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "member",
        affectedLocus: "selected-member",
      },
    });

    expect(markdown(mapped)).toContain("Warning `missing-expression-member`: \\`missing\\` is not declared.");
    expect(markdown(mapped)).not.toContain("Checker context");
    expect(markdown(mapped)).not.toContain("co-located withheld");
    expect(markdown(mapped)).not.toContain("Type information is incomplete");
  });

  test("ranges a diagnostic-only card to its authenticated primary instead of the broad active expression", () => {
    const test = harness("<template>${describe(true)}</template>", "describe(true)");
    const trueSource = source(
      "src/hover.html",
      test.activeSource.start + "describe(".length,
      test.activeSource.end - 1,
    );
    const mapped = test.map({
      diagnostics: [{
        ...diagnostic("No overload matches this call.", "error", "template-expression-typescript-diagnostic"),
        typeScriptDiagnosticCode: 2769,
        source: trueSource,
      }],
      diagnosticPresentation: {
        kind: "presented",
        rawRowCount: 1,
        group: {
          groupKey: "typescript:2769",
          subject: null,
          primary: { rowId: "primary", rowIndex: 0, role: "primary", relation: null },
          related: [],
          rawRowCount: 1,
          primarySeverity: "error",
          maxRawSeverity: "error",
        },
      },
    });

    expect(markdown(mapped)).toContain("Error `TS2769`: No overload matches this call.");
    expect(mapped.value?.range == null ? null : test.document.getText(mapped.value.range)).toBe("true");
    expect(mapped.failures).toEqual([]);
  });

  test("fails closed for malformed compact diagnostic group counts, indices, severities, and relations", () => {
    const test = harness("<template>${missing}</template>", "missing");
    const rows = [
      { ...diagnostic("Primary.", "warning"), source: test.activeSource },
      diagnostic("Context.", "information", "template-expression-typescript-diagnostic"),
    ];
    const validGroup = {
      groupKey: "missing:missing",
      subject: null,
      primary: { rowId: "primary", rowIndex: 0, role: "primary", relation: null },
      related: [{
        rowId: "context",
        rowIndex: 1,
        role: "contextual",
        relation: "checker-evidence",
      }],
      rawRowCount: 2,
      primarySeverity: "warning",
      maxRawSeverity: "warning",
    };
    const scenarios = [{
      presentation: { kind: "presented", rawRowCount: 1, group: validGroup },
      failure: "Hover diagnostic presentation does not conserve its compact raw rows.",
    }, {
      presentation: {
        kind: "presented",
        rawRowCount: 2,
        group: { ...validGroup, rawRowCount: 1 },
      },
      failure: "Hover diagnostic presentation has an invalid group structure.",
    }, {
      presentation: {
        kind: "presented",
        rawRowCount: 2,
        group: {
          ...validGroup,
          related: [{ ...validGroup.related[0], rowIndex: 0 }],
        },
      },
      failure: "Hover diagnostic presentation has an invalid or duplicate compact row index.",
    }, {
      presentation: {
        kind: "presented",
        rawRowCount: 2,
        group: { ...validGroup, primarySeverity: "error" },
      },
      failure: "Hover diagnostic presentation primary severity does not match its compact row.",
    }, {
      presentation: {
        kind: "presented",
        rawRowCount: 2,
        group: { ...validGroup, maxRawSeverity: "information" },
      },
      failure: "Hover diagnostic presentation maximum severity does not match its compact rows.",
    }, {
      presentation: {
        kind: "presented",
        rawRowCount: 2,
        group: {
          ...validGroup,
          related: [{ ...validGroup.related[0], relation: "made-up-relation" }],
        },
      },
      failure: "Hover diagnostic presentation has an invalid contextual row.",
    }];

    for (const scenario of scenarios) {
      expect(test.map({
        diagnostics: rows,
        diagnosticPresentation: scenario.presentation,
      }).failures).toEqual([scenario.failure]);
    }
  });

  test("authenticates presented primary severity, document, and active-locus overlap", () => {
    const test = harness("<template>${missing}</template>", "missing");
    const presentation = {
      kind: "presented",
      rawRowCount: 1,
      group: {
        groupKey: "missing:missing",
        subject: null,
        primary: { rowId: "primary", rowIndex: 0, role: "primary", relation: null },
        related: [],
        rawRowCount: 1,
        primarySeverity: "warning",
        maxRawSeverity: "warning",
      },
    };
    const cases = [{
      row: diagnostic("No source.", "warning"),
      failure: "Hover presented diagnostic primary has no exact authored source.",
    }, {
      row: {
        ...diagnostic("Wrong document.", "warning"),
        source: { ...test.activeSource, path: "src/foreign.html" },
      },
      failure: "Hover presented diagnostic primary does not target the requesting document.",
    }, {
      row: {
        ...diagnostic("Wrong locus.", "warning"),
        source: source("src/hover.html", 0, 1),
      },
      failure: "Hover presented diagnostic primary does not overlap the active authored locus.",
    }, {
      row: {
        ...diagnostic("Unknown severity.", "warning"),
        severity: "catastrophic",
        source: test.activeSource,
      },
      presentation: {
        ...presentation,
        group: {
          ...presentation.group,
          primarySeverity: "catastrophic",
          maxRawSeverity: "catastrophic",
        },
      },
      failure: "Hover diagnostic presentation has an unsupported severity.",
    }];

    for (const candidate of cases) {
      expect(test.map({
        diagnostics: [candidate.row],
        diagnosticPresentation: candidate.presentation ?? presentation,
      }).failures).toEqual([candidate.failure]);
    }
  });

  test("validates a withheld outcome but emits neither raw diagnostics nor a synthetic card", () => {
    const test = harness("<template>${maybe}</template>", "maybe");
    const rows = [{
      ...diagnostic("Weak owner detail.", "information", "weak-expression-member-owner"),
      source: test.activeSource,
    }];
    const mapped = test.map({
      diagnostics: rows,
      diagnosticPresentation: {
        kind: "withheld",
        rawRowCount: 1,
        withheld: { rowId: "weak", rowIndex: 0, reason: "context-only-weak-owner" },
      },
    });
    expect(mapped).toEqual({ value: null, failures: [] });

    const malformed = test.map({
      diagnostics: rows,
      diagnosticPresentation: {
        kind: "withheld",
        rawRowCount: 1,
        withheld: { rowId: "weak", rowIndex: 2, reason: "context-only-weak-owner" },
      },
    });
    expect(malformed.failures).toEqual([
      "Hover diagnostic presentation has no valid compact withheld row.",
    ]);

    const wrongDocument = test.map({
      diagnostics: [{
        ...rows[0],
        source: { ...test.activeSource, path: "src/foreign.html" },
      }],
      diagnosticPresentation: {
        kind: "withheld",
        rawRowCount: 1,
        withheld: { rowId: "weak", rowIndex: 0, reason: "context-only-weak-owner" },
      },
    });
    expect(wrongDocument.failures).toEqual([
      "Hover withheld diagnostic row does not target the requesting document.",
    ]);

    for (const ineligible of [{
      ...rows[0],
      diagnosticAuthority: "typescript",
    }, {
      ...rows[0],
      missingInputs: ["expression-member-owner-type:missing-slot-type"],
    }]) {
      expect(test.map({
        diagnostics: [ineligible],
        diagnosticPresentation: {
          kind: "withheld",
          rawRowCount: 1,
          withheld: { rowId: "weak", rowIndex: 0, reason: "context-only-weak-owner" },
        },
      }).failures).toEqual([
        "Hover diagnostic presentation withheld row is not eligible weak-owner context.",
      ]);
    }
  });

  test("allows typed route uncertainty alone but not low-scent member or resource uncertainty", () => {
    const test = harness("<template>${target}</template>", "target");
    const dynamicRoute = test.map({
      uncertainty: {
        category: "dynamic-route-target",
        affectedDomain: "route",
        affectedLocus: "route-target",
      },
    });
    expect(markdown(dynamicRoute)).toBe("Dynamic route target.");

    const memberOnly = test.map({
      uncertainty: {
        category: "type-information-incomplete",
        affectedDomain: "member",
        affectedLocus: "selected-member",
      },
    });
    const resourceOnly = test.map({
      uncertainty: {
        category: "resource-availability-incomplete",
        affectedDomain: "resource",
        affectedLocus: "selected-resource",
      },
    });
    expect(memberOnly).toEqual({
      value: null,
      failures: ["Hover uncertainty has an unsupported domain or locus relationship."],
    });
    expect(resourceOnly).toEqual({
      value: null,
      failures: ["Hover uncertainty has an unsupported domain or locus relationship."],
    });
  });

  test("returns null for generic HTML, value-site, and unpresented raw-diagnostic fallbacks", () => {
    const test = harness('<template><div title="hello"></div></template>', "title");
    const generic = test.map({
      html: {
        nodeKind: "element",
        tagName: "div",
        attributeName: "title",
        attributeValue: "hello",
        source: null,
        tagNameSource: null,
        closingTagNameSource: null,
        attributeSource: test.activeSource,
      },
      valueSite: {
        siteKind: "attribute-value",
        rawValue: "hello",
        entryFamily: null,
        bindingCommandName: null,
        bindableName: null,
        bindableAttribute: null,
        source: test.activeSource,
      },
      diagnostics: [diagnostic("Raw only.", "error")],
    });

    expect(generic).toEqual({ value: null, failures: [] });
  });
});
