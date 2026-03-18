import { describe, expect, it } from "vitest";
import {
  parseConsultedContext,
  parseConsultedWorld,
  parseOccurrenceAnchor,
  serializeAdmissionKey,
  serializeBindableKey,
  serializeBindableTraitKey,
  serializeEntityKey,
  serializeGovernedSemanticKey,
  serializeLookupKey,
  serializeOpenBoundaryKey,
  serializeConsultedContext,
  serializeConsultedWorld,
  serializeOccurrenceKey,
  serializeOccurrenceAnchor,
  serializeRelationKey,
  serializeSupportBundleKey,
} from "../../out/shared/index.js";

describe("semantic-authority shared key encoding helpers", () => {
  it("serializes and parses occurrence anchors with zero-padded coordinates", () => {
    const anchor = serializeOccurrenceAnchor({
      documentUri: "file:///src/app.html",
      position: { line: 12, character: 4 },
    });

    expect(anchor).toBe("file:///src/app.html:00012:0004");
    expect(parseOccurrenceAnchor(anchor)).toEqual({
      documentUri: "file:///src/app.html",
      position: { line: 12, character: 4 },
    });
  });

  it("serializes and parses consulted contexts", () => {
    const context = serializeConsultedContext({
      scopeChainRef: "root/parent/child",
      boundaryIdentifier: "root/parent",
    });

    expect(context).toBe("root/parent/child::root/parent");
    expect(parseConsultedContext(context)).toEqual({
      scopeChainRef: "root/parent/child",
      boundaryIdentifier: "root/parent",
    });
  });

  it("serializes and parses consulted worlds", () => {
    const world = serializeConsultedWorld({
      worldIdentifier: "root/my-component",
      boundaryIdentifier: "root/my-component",
    });

    expect(world).toBe("root/my-component::root/my-component");
    expect(parseConsultedWorld(world)).toEqual({
      worldIdentifier: "root/my-component",
      boundaryIdentifier: "root/my-component",
    });
  });

  it("rejects malformed structured axis strings", () => {
    expect(() => parseOccurrenceAnchor("file:///src/app.html:12:4")).toThrow(
      /zero-padded coordinates/u,
    );
    expect(() =>
      serializeConsultedContext({
        scopeChainRef: "root::child",
        boundaryIdentifier: "root",
      }),
    ).toThrow(/must not contain/u);
    expect(() => parseConsultedWorld("root::boundary::extra")).toThrow(
      /exactly one/u,
    );
  });

  it("serializes entity and nested bindable keys", () => {
    const resourceKey = {
      kind: "custom-element",
      canonicalName: "app",
    } as const;
    const bindableKey = {
      ownerResourceKey: resourceKey,
      propertyName: "value",
    } as const;

    expect(serializeEntityKey(resourceKey)).toBe("resource:custom-element:app");
    expect(
      serializeEntityKey({
        kind: "attribute-pattern",
        pattern: "foo.*",
        symbols: ["foo", "bar"],
      }),
    ).toBe("resource:attribute-pattern:foo.*|foo,bar");
    expect(
      serializeEntityKey({
        kind: "local-custom-element",
        ownerResourceKey: resourceKey,
        localName: "inner-card",
      }),
    ).toBe("resource:local-custom-element:resource:custom-element:app/inner-card");
    expect(serializeBindableKey(bindableKey)).toBe(
      "bindable:resource:custom-element:app:value",
    );
    expect(
      serializeBindableTraitKey({
        bindableKey,
        traitKind: "attribute",
      }),
    ).toBe("bindable-trait:bindable:resource:custom-element:app:value:attribute");
  });

  it("serializes occurrence-driven keys", () => {
    const consultedContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });
    const occurrenceAnchor = serializeOccurrenceAnchor({
      documentUri: "file:///src/app.html",
      position: { line: 3, character: 9 },
    });
    const occurrenceKey = {
      consultedContext,
      occurrenceAnchor,
      family: "attribute-name",
    } as const;

    expect(serializeOccurrenceKey(occurrenceKey)).toBe(
      "occ:root/app::root:file:///src/app.html:00003:0009:attribute-name",
    );
    expect(
      serializeLookupKey({
        occurrenceKey,
        lookupDomain: "resource-scope",
        lookupName: "if",
      }),
    ).toBe(
      "lookup:occ:root/app::root:file:///src/app.html:00003:0009:attribute-name:resource-scope:if",
    );
    expect(
      serializeRelationKey({
        lhsKey: occurrenceKey,
        rhsKey: {
          kind: "custom-attribute",
          canonicalName: "if",
        },
        relationKind: "subject-derived-resource-misuse",
      }),
    ).toBe(
      "rel:occ:root/app::root:file:///src/app.html:00003:0009:attribute-name:resource:custom-attribute:if:subject-derived-resource-misuse",
    );
  });

  it("serializes dependency-stage and witness-style keys", () => {
    const consultedWorld = serializeConsultedWorld({
      worldIdentifier: "root",
      boundaryIdentifier: "root",
    });
    const resourceKey = {
      kind: "custom-attribute",
      canonicalName: "if",
    } as const;

    expect(
      serializeAdmissionKey({
        consultedWorld,
        subjectKey: resourceKey,
      }),
    ).toBe("admission:root::root:resource:custom-attribute:if");
    expect(
      serializeGovernedSemanticKey({
        subjectKey: resourceKey,
        governedFamily: "controller-semantics",
      }),
    ).toBe("governed:resource:custom-attribute:if:controller-semantics");
    expect(
      serializeSupportBundleKey({
        targetFamilyId: "claim.identity.custom-attribute",
        subjectKey: resourceKey,
      }),
    ).toBe("support-bundle:claim.identity.custom-attribute:resource:custom-attribute:if");
    expect(
      serializeOpenBoundaryKey({
        targetFamilyId: "claim.identity.custom-attribute",
        subjectKey: resourceKey,
        blockedDependency: "registration-missing",
      }),
    ).toBe(
      "open-boundary:claim.identity.custom-attribute:resource:custom-attribute:if:registration-missing",
    );
  });
});
