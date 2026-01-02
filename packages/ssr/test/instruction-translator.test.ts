/**
 * Instruction Translator Tests
 *
 * Verifies that the AOT compiler emits correct instruction types with exact property values.
 * These tests check the serialized instruction structure, not just that "something renders".
 */

import { describe, it, expect } from "vitest";

import { compileWithAot } from "@aurelia-ls/ssr";
import {
  INSTRUCTION_TYPE,
  type SerializedInstruction,
  type SerializedListenerBinding,
  type SerializedRefBinding,
  type SerializedSetAttribute,
  type SerializedHydrateLetElement,
  type SerializedInterpolation,
  type SerializedPropertyBinding,
  type SerializedTextBinding,
} from "@aurelia-ls/compiler";

/**
 * Helper to find instruction by type in flat instruction list.
 */
function findInstruction<T extends SerializedInstruction>(
  instructions: SerializedInstruction[][],
  type: number,
): T | undefined {
  return instructions.flat().find((i) => i.type === type) as T | undefined;
}

/**
 * Helper to find all instructions of a type.
 */
function findAllInstructions<T extends SerializedInstruction>(
  instructions: SerializedInstruction[][],
  type: number,
): T[] {
  return instructions.flat().filter((i) => i.type === type) as T[];
}

// =============================================================================
// Listener Bindings
// =============================================================================

describe("Instruction: listenerBinding", () => {
  it("emits listenerBinding for click.trigger with capture=false", () => {
    const aot = compileWithAot(
      '<button click.trigger="handleClick()">Click</button>',
      { name: "test" },
    );

    const listener = findInstruction<SerializedListenerBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.listenerBinding,
    );

    expect(listener).toBeDefined();
    expect(listener!.type).toBe(INSTRUCTION_TYPE.listenerBinding);
    expect(listener!.to).toBe("click");
    expect(listener!.capture).toBe(false);
    expect(listener!.exprId).toBeDefined();

    // Verify the expression exists in the expression table
    const expr = aot.raw.codeResult.expressions.find(
      (e) => e.id === listener!.exprId,
    );
    expect(expr).toBeDefined();
    // CallScope is a method call on the view-model scope
    expect(expr!.ast.$kind).toBe("CallScope");
  });

  it("emits listenerBinding for click.capture with capture=true", () => {
    const aot = compileWithAot(
      '<div click.capture="onCapture()">Capture</div>',
      { name: "test" },
    );

    const listener = findInstruction<SerializedListenerBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.listenerBinding,
    );

    expect(listener).toBeDefined();
    expect(listener!.to).toBe("click");
    expect(listener!.capture).toBe(true);
  });

  it("emits multiple listenerBindings for multiple events", () => {
    const aot = compileWithAot(
      '<input focus.trigger="onFocus()" blur.trigger="onBlur()">',
      { name: "test" },
    );

    const listeners = findAllInstructions<SerializedListenerBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.listenerBinding,
    );

    expect(listeners.length).toBe(2);

    const eventNames = listeners.map((l) => l.to).sort();
    expect(eventNames).toEqual(["blur", "focus"]);
  });

  it("emits listenerBinding with modifier in event name", () => {
    const aot = compileWithAot(
      '<input keydown.enter.trigger="onEnter()">',
      { name: "test" },
    );

    const listener = findInstruction<SerializedListenerBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.listenerBinding,
    );

    expect(listener).toBeDefined();
    // Event name includes the modifier
    expect(listener!.to).toBe("keydown.enter");
    expect(listener!.capture).toBe(false);
  });
});

// =============================================================================
// Ref Bindings
// =============================================================================

describe("Instruction: refBinding", () => {
  it("emits refBinding for ref attribute", () => {
    const aot = compileWithAot(
      '<input ref="nameInput">',
      { name: "test" },
    );

    const ref = findInstruction<SerializedRefBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.refBinding,
    );

    expect(ref).toBeDefined();
    expect(ref!.type).toBe(INSTRUCTION_TYPE.refBinding);
    // 'to' is the type of reference ("element", "viewModel", etc.)
    expect(ref!.to).toBe("element");
    expect(ref!.exprId).toBeDefined();

    // The actual ref name is in the expression
    const expr = aot.raw.codeResult.expressions.find(
      (e) => e.id === ref!.exprId,
    );
    expect(expr).toBeDefined();
    // Expression assigns to the ref variable name
    expect(expr!.ast.$kind).toBe("AccessScope");
    expect((expr!.ast as { name: string }).name).toBe("nameInput");
  });

  it("emits refBinding with ref name in expression", () => {
    const aot = compileWithAot(
      '<div ref="containerElement" class="box">Content</div>',
      { name: "test" },
    );

    const ref = findInstruction<SerializedRefBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.refBinding,
    );

    expect(ref).toBeDefined();
    expect(ref!.to).toBe("element");

    // Verify the ref name is in the expression
    const expr = aot.raw.codeResult.expressions.find(
      (e) => e.id === ref!.exprId,
    );
    expect(expr).toBeDefined();
    expect((expr!.ast as { name: string }).name).toBe("containerElement");
  });
});

// =============================================================================
// Set Attribute
// =============================================================================

describe("Instruction: setAttribute", () => {
  // Note: Static attributes like data-*, aria-* are preserved in the template HTML,
  // not emitted as instructions. The setAttribute instruction is used for dynamic
  // attribute setting scenarios.

  it("preserves static data-* attributes in template HTML", () => {
    const aot = compileWithAot(
      '<div data-id="123" data-type="item">Content</div>',
      { name: "test" },
    );

    // Static attributes stay in template, not as instructions
    expect(aot.template).toContain('data-id="123"');
    expect(aot.template).toContain('data-type="item"');
  });

  it("preserves static aria-* attributes in template HTML", () => {
    const aot = compileWithAot(
      '<button aria-label="Close" aria-pressed="false">X</button>',
      { name: "test" },
    );

    expect(aot.template).toContain('aria-label="Close"');
    expect(aot.template).toContain('aria-pressed="false"');
  });

  it("preserves boolean attributes in template HTML", () => {
    const aot = compileWithAot(
      '<input disabled>',
      { name: "test" },
    );

    expect(aot.template).toContain("disabled");
  });
});

// =============================================================================
// Let Element
// =============================================================================

describe("Instruction: hydrateLetElement", () => {
  it("emits hydrateLetElement with correct bindings", () => {
    const aot = compileWithAot(
      '<let computed.bind="x * 2"></let>',
      { name: "test" },
    );

    const letEl = findInstruction<SerializedHydrateLetElement>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.hydrateLetElement,
    );

    expect(letEl).toBeDefined();
    expect(letEl!.type).toBe(INSTRUCTION_TYPE.hydrateLetElement);
    expect(letEl!.toBindingContext).toBe(false);
    expect(letEl!.instructions.length).toBe(1);
    expect(letEl!.instructions[0]!.to).toBe("computed");
    expect(letEl!.instructions[0]!.exprId).toBeDefined();

    // Verify expression
    const expr = aot.raw.codeResult.expressions.find(
      (e) => e.id === letEl!.instructions[0]!.exprId,
    );
    expect(expr).toBeDefined();
    expect(expr!.ast.$kind).toBe("Binary");
  });

  it("emits hydrateLetElement with toBindingContext=true", () => {
    const aot = compileWithAot(
      '<let to-binding-context value.bind="x"></let>',
      { name: "test" },
    );

    const letEl = findInstruction<SerializedHydrateLetElement>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.hydrateLetElement,
    );

    expect(letEl).toBeDefined();
    expect(letEl!.toBindingContext).toBe(true);
  });

  it("preserves kebab-case binding name (runtime converts to camelCase)", () => {
    const aot = compileWithAot(
      '<let full-name.bind="firstName + lastName"></let>',
      { name: "test" },
    );

    const letEl = findInstruction<SerializedHydrateLetElement>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.hydrateLetElement,
    );

    expect(letEl).toBeDefined();
    // AOT preserves kebab-case; Aurelia runtime converts to camelCase
    expect(letEl!.instructions[0]!.to).toBe("full-name");
  });

  it("emits hydrateLetElement with multiple bindings", () => {
    const aot = compileWithAot(
      '<let a.bind="1" b.bind="2" c.bind="3"></let>',
      { name: "test" },
    );

    const letEl = findInstruction<SerializedHydrateLetElement>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.hydrateLetElement,
    );

    expect(letEl).toBeDefined();
    expect(letEl!.instructions.length).toBe(3);

    const names = letEl!.instructions.map((b) => b.to).sort();
    expect(names).toEqual(["a", "b", "c"]);
  });
});

// =============================================================================
// Interpolation (on attributes)
// =============================================================================

describe("Instruction: interpolation (attribute)", () => {
  it("emits interpolation for class interpolation", () => {
    const aot = compileWithAot(
      '<div class="prefix-${suffix}">Content</div>',
      { name: "test" },
    );

    const interp = findInstruction<SerializedInterpolation>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.interpolation,
    );

    expect(interp).toBeDefined();
    expect(interp!.type).toBe(INSTRUCTION_TYPE.interpolation);
    expect(interp!.to).toBe("class");
    expect(interp!.parts).toEqual(["prefix-", ""]);
    expect(interp!.exprIds.length).toBe(1);
  });

  it("emits interpolation with multiple expressions", () => {
    const aot = compileWithAot(
      '<span title="${greeting}, ${name}!">Hover</span>',
      { name: "test" },
    );

    const interp = findInstruction<SerializedInterpolation>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.interpolation,
    );

    expect(interp).toBeDefined();
    expect(interp!.to).toBe("title");
    expect(interp!.parts).toEqual(["", ", ", "!"]);
    expect(interp!.exprIds.length).toBe(2);
  });

  it("emits correct parts for prefix and suffix text", () => {
    const aot = compileWithAot(
      '<div data-info="User: ${name} (ID: ${id})">Info</div>',
      { name: "test" },
    );

    const interp = findInstruction<SerializedInterpolation>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.interpolation,
    );

    expect(interp).toBeDefined();
    expect(interp!.parts).toEqual(["User: ", " (ID: ", ")"]);
    expect(interp!.exprIds.length).toBe(2);
  });
});

// =============================================================================
// Text Binding (interpolation in text nodes)
// =============================================================================

describe("Instruction: textBinding", () => {
  it("emits textBinding for text interpolation", () => {
    const aot = compileWithAot(
      '<span>${message}</span>',
      { name: "test" },
    );

    const textBinding = findInstruction<SerializedTextBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.textBinding,
    );

    expect(textBinding).toBeDefined();
    expect(textBinding!.type).toBe(INSTRUCTION_TYPE.textBinding);
    expect(textBinding!.parts).toEqual(["", ""]);
    expect(textBinding!.exprIds.length).toBe(1);
  });

  it("emits textBinding with surrounding text", () => {
    const aot = compileWithAot(
      '<span>Hello, ${name}!</span>',
      { name: "test" },
    );

    const textBinding = findInstruction<SerializedTextBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.textBinding,
    );

    expect(textBinding).toBeDefined();
    expect(textBinding!.parts).toEqual(["Hello, ", "!"]);
  });

  it("emits textBinding with multiple expressions", () => {
    const aot = compileWithAot(
      '<span>${first} ${last}</span>',
      { name: "test" },
    );

    const textBinding = findInstruction<SerializedTextBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.textBinding,
    );

    expect(textBinding).toBeDefined();
    expect(textBinding!.parts).toEqual(["", " ", ""]);
    expect(textBinding!.exprIds.length).toBe(2);
  });
});

// =============================================================================
// Property Binding
// =============================================================================

describe("Instruction: propertyBinding", () => {
  it("emits propertyBinding for value.bind on input (two-way mode)", () => {
    const aot = compileWithAot(
      '<input value.bind="name">',
      { name: "test" },
    );

    const propBinding = findInstruction<SerializedPropertyBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.propertyBinding,
    );

    expect(propBinding).toBeDefined();
    expect(propBinding!.type).toBe(INSTRUCTION_TYPE.propertyBinding);
    expect(propBinding!.to).toBe("value");
    expect(propBinding!.exprId).toBeDefined();
    // Form element value.bind defaults to two-way (6)
    expect(propBinding!.mode).toBe(6);
  });

  it("emits propertyBinding for checked.bind (two-way mode)", () => {
    const aot = compileWithAot(
      '<input type="checkbox" checked.bind="isChecked">',
      { name: "test" },
    );

    const propBinding = findInstruction<SerializedPropertyBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.propertyBinding,
    );

    expect(propBinding).toBeDefined();
    expect(propBinding!.to).toBe("checked");
    // checked.bind defaults to two-way (6)
    expect(propBinding!.mode).toBe(6);
  });

  it("emits propertyBinding with one-time mode", () => {
    const aot = compileWithAot(
      '<span title.one-time="staticTitle">Text</span>',
      { name: "test" },
    );

    const propBinding = findInstruction<SerializedPropertyBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.propertyBinding,
    );

    expect(propBinding).toBeDefined();
    expect(propBinding!.to).toBe("title");
    // one-time mode is 1
    expect(propBinding!.mode).toBe(1);
  });

  it("verifies expression AST for property binding", () => {
    const aot = compileWithAot(
      '<div title.bind="user.name">Content</div>',
      { name: "test" },
    );

    const propBinding = findInstruction<SerializedPropertyBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.propertyBinding,
    );

    expect(propBinding).toBeDefined();

    const expr = aot.raw.codeResult.expressions.find(
      (e) => e.id === propBinding!.exprId,
    );
    expect(expr).toBeDefined();
    expect(expr!.ast.$kind).toBe("AccessMember");
  });
});

// =============================================================================
// Expression Table Integrity
// =============================================================================

describe("Expression Table", () => {
  it("deduplicates identical expressions", () => {
    const aot = compileWithAot(
      '<div>${x}</div><div>${x}</div><div>${x}</div>',
      { name: "test" },
    );

    // All three should reference the same expression
    const textBindings = findAllInstructions<SerializedTextBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.textBinding,
    );

    expect(textBindings.length).toBe(3);

    // All should have the same exprId
    const exprIds = textBindings.map((t) => t.exprIds[0]);
    expect(new Set(exprIds).size).toBe(1);

    // Expression table should only have one entry for 'x'
    const xExprs = aot.raw.codeResult.expressions.filter(
      (e) => e.ast.$kind === "AccessScope" && (e.ast as { name: string }).name === "x",
    );
    expect(xExprs.length).toBe(1);
  });

  it("stores different expressions separately", () => {
    const aot = compileWithAot(
      '<div>${x}</div><div>${y}</div>',
      { name: "test" },
    );

    const textBindings = findAllInstructions<SerializedTextBinding>(
      aot.raw.codeResult.definition.instructions,
      INSTRUCTION_TYPE.textBinding,
    );

    expect(textBindings.length).toBe(2);

    // Should have different exprIds
    const exprIds = textBindings.map((t) => t.exprIds[0]);
    expect(new Set(exprIds).size).toBe(2);
  });
});
