import { describe, expect, test } from "vitest";
import {
  RESOURCE_EXPLORER_BINDABLE_MODE_ICONS,
  RESOURCE_EXPLORER_ORIGIN_ICONS,
  RESOURCE_EXPLORER_ROLE_ICONS,
  resourceAvailabilityReasonLabel,
  resourceBindableModeIcon,
  resourceBindableModeLabel,
  resourceKindPresentation,
  resourceMetadataStateLabel,
  resourceProjectRootScent,
  resourceProjectRootScentMap,
  resourceOriginIcon,
  resourceOriginLabel,
  resourceTreeRowStateLabel,
  sourceLabel,
} from "../../../out/features/resource-discovery/presentation.js";

describe("resource discovery presentation vocabulary", () => {
  test("keeps non-category tree-role icons stable", () => {
    expect(RESOURCE_EXPLORER_ROLE_ICONS).toEqual({
      project: "project",
      alias: "link",
    });
  });

  test("maps exact resource locality and catalog ownership without guessing", () => {
    expect(RESOURCE_EXPLORER_ORIGIN_ICONS).toEqual({
      localTemplate: "symbol-file",
      project: "code",
      package: "package",
      coreFramework: "library",
      officialPlugin: "extensions",
      external: "link-external",
      unknown: "question",
    });
    const icon = (
      originKind: string,
      catalogOwnerKind: "core-framework" | "official-plugin" | null,
      localityKind: "project" | "local-template" = "project",
    ) => resourceOriginIcon({
      origin: { kind: originKind, catalogOwnerKind },
      locality: { kind: localityKind },
    } as never);

    expect([
      icon("project", null),
      icon("package", null),
      icon("framework", "core-framework"),
      icon("framework", "official-plugin"),
      icon("external", null),
      icon("unknown", null),
      icon("project", null, "local-template"),
    ]).toEqual([
      "code",
      "package",
      "library",
      "extensions",
      "link-external",
      "question",
      "symbol-file",
    ]);
    expect([
      icon("framework", null),
      icon("project", "core-framework"),
      icon("package", "official-plugin"),
    ]).toEqual(["question", "question", "question"]);
    expect(resourceOriginIcon({
      origin: { kind: "framework", catalogOwnerKind: "hostile-owner" },
      locality: { kind: "project" },
    } as never)).toBe("question");
    const hostileLocality = {
      origin: { kind: "project", catalogOwnerKind: null },
      locality: { kind: "hostile-locality" },
    };
    expect(resourceOriginIcon(hostileLocality as never)).toBe("question");
    expect(resourceOriginLabel(hostileLocality as never)).toBe("origin classification unavailable");
    const conflictingLocalTemplate = {
      origin: { kind: "framework", catalogOwnerKind: "official-plugin" },
      locality: { kind: "local-template" },
    };
    expect(resourceOriginIcon(conflictingLocalTemplate as never)).toBe("question");
    expect(resourceOriginLabel(conflictingLocalTemplate as never)).toBe("origin classification unavailable");
    const omittedCatalogOwner = {
      origin: { kind: "project" },
      locality: { kind: "project" },
    };
    expect(resourceOriginIcon(omittedCatalogOwner as never)).toBe("question");
    expect(resourceOriginLabel(omittedCatalogOwner as never)).toBe("origin classification unavailable");
    const originLabel = (
      originKind: string,
      catalogOwnerKind: "core-framework" | "official-plugin" | null | "hostile-owner",
    ) => resourceOriginLabel({
      origin: {
        kind: originKind,
        catalogOwnerKind,
        packageName: "@aurelia/example",
      },
      locality: { kind: "project" },
    } as never);
    expect(originLabel("framework", "core-framework")).toBe("Aurelia framework · @aurelia/example");
    expect(originLabel("framework", "official-plugin")).toBe("official Aurelia plugin · @aurelia/example");
    expect(originLabel("framework", null)).toBe("Aurelia catalog · owner unknown");
    expect(originLabel("project", "hostile-owner")).toBe("origin classification unavailable");
  });

  test("maps every bindable mode to a native direction or lifetime glyph", () => {
    expect(RESOURCE_EXPLORER_BINDABLE_MODE_ICONS).toEqual({
      default: "plug",
      oneTime: "clock",
      toView: "arrow-right",
      fromView: "arrow-left",
      twoWay: "arrow-both",
      unknown: "question",
    });
    const modes = ["default", "oneTime", "toView", "fromView", "twoWay"];
    expect(modes.map((mode) => resourceBindableModeIcon(mode))).toEqual([
      "plug",
      "clock",
      "arrow-right",
      "arrow-left",
      "arrow-both",
    ]);
    expect(modes.map((mode) => resourceBindableModeLabel(mode))).toEqual([
      "default",
      "one time",
      "to view",
      "from view",
      "two way",
    ]);
    expect(resourceBindableModeIcon("hostile-mode")).toBe("question");
    expect(resourceBindableModeLabel("hostile-mode")).toBe("unavailable");
  });

  test("owns one distinct native group icon for every resource kind", () => {
    expect([
      "custom-element",
      "template-controller",
      "custom-attribute",
      "value-converter",
      "binding-behavior",
    ].map((kind) => resourceKindPresentation(kind as never))).toEqual([
      { plural: "Elements", singular: "element", order: 0, groupIcon: "tag" },
      {
        plural: "Template Controllers",
        singular: "template controller",
        order: 1,
        groupIcon: "symbol-structure",
      },
      { plural: "Attributes", singular: "attribute", order: 2, groupIcon: "symbol-property" },
      { plural: "Value Converters", singular: "value converter", order: 3, groupIcon: "arrow-swap" },
      { plural: "Binding Behaviors", singular: "binding behavior", order: 4, groupIcon: "tools" },
    ]);
    expect(new Set([
      "custom-element",
      "template-controller",
      "custom-attribute",
      "value-converter",
      "binding-behavior",
    ].map((kind) => resourceKindPresentation(kind as never).groupIcon)).size).toBe(5);
  });

  test("maps every typed availability reason to closed author-facing copy", () => {
    expect([
      "local",
      "inherited",
      "configured",
      "app-root",
      "routeable",
      "open",
    ].map((kind) => resourceAvailabilityReasonLabel(kind as never))).toEqual([
      "local",
      "inherited",
      "configured",
      "application root",
      "routeable",
      "availability uncertain",
    ]);
  });

  test("keeps metadata and persistent row states in public language", () => {
    expect([
      "full-definition",
      "header-only",
      "visibility-only",
    ].map((state) => resourceMetadataStateLabel(state as never))).toEqual([
      "details complete",
      "details incomplete",
      "declaration not resolved",
    ]);
    expect([
      "out-of-date",
      "discovery-incomplete",
    ].map((state) => resourceTreeRowStateLabel(state as never))).toEqual([
      "out of date",
      "discovery incomplete",
    ]);
  });

  test("builds short distinct root scent without exposing full file or remote URIs", () => {
    const roots = [
      "vscode-remote://ssh-one/home/team/storefront",
      "vscode-remote://ssh-two/home/team/storefront",
    ];
    const labels = roots.map((root) => resourceProjectRootScent(root, roots));

    expect(labels).toEqual(["ssh-one · storefront", "ssh-two · storefront"]);
    expect(labels[0]).not.toContain("vscode-remote://");
    expect(labels[0]).not.toContain("/home/team/");
  });

  test("uses a stable bounded ordinal when local project roots share their final path", () => {
    const left = { rootUri: "file:///x/a/shop", stableKey: "left", value: "left" };
    const right = { rootUri: "file:///z/a/shop", stableKey: "right", value: "right" };
    const forward = resourceProjectRootScentMap([left, right]);
    const reverse = resourceProjectRootScentMap([right, left]);

    expect([forward.get("left"), forward.get("right")]).toEqual([
      "a/shop · project 1 of 2",
      "a/shop · project 2 of 2",
    ]);
    expect(reverse.get("left")).toBe(forward.get("left"));
    expect(reverse.get("right")).toBe(forward.get("right"));
    expect(JSON.stringify([...forward.values()])).not.toMatch(/file:\/\/\/|\/x\/|\/z\//u);
  });

  test.each([
    ["src/attributes/display-hint.ts@98..110", "src/attributes/display-hint.ts"],
    ["C:\\private\\repo\\src\\display-hint.ts@98..110", "repo/src/display-hint.ts"],
    ["file:///C:/private/src/display-hint.ts@98..110", "private/src/display-hint.ts"],
    ["vscode-remote://ssh-host/home/team/src/display-hint.ts@98..110", "team/src/display-hint.ts"],
    ["@scope/package", "@scope/package"],
    ["Decorator declaration", "Decorator declaration"],
    ["My  Project/src/display-hint.ts@98..110", "My  Project/src/display-hint.ts"],
    ["src/attributes/\ndisplay-hint.ts@98..110", "src/attributes/ display-hint.ts"],
  ])("sanitizes source label %j to bounded author-facing copy", (raw, expected) => {
    expect(sourceLabel({
      state: "available",
      location: {
        uri: "file:///private/source.ts",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        role: "declaration",
        label: raw,
      },
    } as never)).toBe(expected);
  });
});
