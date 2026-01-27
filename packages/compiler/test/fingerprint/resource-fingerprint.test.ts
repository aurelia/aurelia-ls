import { expect, test } from "vitest";

import type { Bindable, BindingCommandConfig, ElementRes } from "../../src/language/types.js";
import type { NormalizedPath } from "../../src/model/index.js";
import {
  fingerprintBindingCommandConfig,
  fingerprintElementRes,
  fingerprintTemplateControllerUsage,
} from "../../src/fingerprint/resource.js";

const bindable = (name: string): Bindable => ({ name });

test("fingerprintElementRes ignores provenance metadata", () => {
  const emptyBindables: Record<string, Bindable> = {};
  const base: ElementRes = {
    kind: "element",
    name: "my-element",
    bindables: emptyBindables,
  };
  const withMeta: ElementRes = {
    ...base,
    className: "MyElement",
    file: "/src/my-element.ts" as NormalizedPath,
    package: "pkg",
    dependencies: ["other-element"],
  };

  expect(fingerprintElementRes(base)).toBe(fingerprintElementRes(withMeta));
});

test("fingerprintElementRes tracks semantic changes", () => {
  const base: ElementRes = {
    kind: "element",
    name: "my-element",
    bindables: { foo: bindable("foo") },
  };
  const changed: ElementRes = {
    ...base,
    bindables: { foo: bindable("foo"), bar: bindable("bar") },
  };

  expect(fingerprintElementRes(base)).not.toBe(fingerprintElementRes(changed));
});

test("fingerprintBindingCommandConfig tracks behavior fields", () => {
  const base: BindingCommandConfig = { name: "bind", kind: "property" };
  const changed: BindingCommandConfig = { ...base, forceAttribute: "value" };

  expect(fingerprintBindingCommandConfig(base)).not.toBe(fingerprintBindingCommandConfig(changed));
});

test("fingerprintTemplateControllerUsage tracks attribute aliases", () => {
  const config = {
    name: "if",
    trigger: { kind: "value", prop: "value" as string },
    scope: "overlay" as const,
    props: {},
  };
  const baseAttr = {
    kind: "attribute" as const,
    name: "if",
    bindables: {},
    isTemplateController: true,
  };
  const aliasAttr = { ...baseAttr, aliases: ["when"] };

  expect(fingerprintTemplateControllerUsage(config, baseAttr)).not.toBe(
    fingerprintTemplateControllerUsage(config, aliasAttr),
  );
});
