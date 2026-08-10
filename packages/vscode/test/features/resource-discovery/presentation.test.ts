import { describe, expect, test } from "vitest";
import {
  resourceAvailabilityReasonLabel,
  resourceMetadataStateLabel,
  resourceProjectRootScent,
  resourceProjectRootScentMap,
  resourceTreeRowStateLabel,
  sourceLabel,
} from "../../../out/features/resource-discovery/presentation.js";

describe("resource discovery presentation vocabulary", () => {
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
      "updating",
      "out-of-date",
      "discovery-incomplete",
    ].map((state) => resourceTreeRowStateLabel(state as never))).toEqual([
      "updating",
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
