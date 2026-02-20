import { describe, it, expect } from "vitest";
import { BUILTIN_SEMANTICS, createSemanticsLookup } from "@aurelia-ls/compiler";

describe("Builtin controller parity", () => {
  it("repeat carries formal items bindable and $previous contextual", () => {
    const repeatDef = BUILTIN_SEMANTICS.controllers.repeat;
    const repeatCfg = BUILTIN_SEMANTICS.resources.controllers.repeat;

    expect(repeatDef.bindables.items).toBeDefined();
    expect(repeatCfg.props?.items).toBeDefined();
    expect(repeatCfg.injects?.contextuals).toContain("$previous");
  });

  it("portal exposes runtime-aligned lifecycle and placement bindables", () => {
    const lookup = createSemanticsLookup(BUILTIN_SEMANTICS);
    const portal = lookup.controller("portal");

    expect(portal).toBeDefined();
    expect(portal?.props?.target).toBeDefined();
    expect(portal?.props?.position).toBeDefined();
    expect(portal?.props?.activating).toBeDefined();
    expect(portal?.props?.activated).toBeDefined();
    expect(portal?.props?.deactivating).toBeDefined();
    expect(portal?.props?.deactivated).toBeDefined();
    expect(portal?.props?.callbackContext).toBeDefined();
    expect(portal?.props?.renderContext).toBeDefined();
    expect(portal?.props?.strict).toBeDefined();
  });

  it("promise branches expose runtime-aligned value bindable modes", () => {
    const lookup = createSemanticsLookup(BUILTIN_SEMANTICS);
    const pending = lookup.controller("pending");
    const then = lookup.controller("then");
    const caught = lookup.controller("catch");

    expect(pending?.props?.value).toBeDefined();
    expect(then?.props?.value).toBeDefined();
    expect(caught?.props?.value).toBeDefined();
    expect(pending?.props?.value?.mode).toBe("toView");
    expect(then?.props?.value?.mode).toBe("fromView");
    expect(caught?.props?.value?.mode).toBe("fromView");
  });
});
