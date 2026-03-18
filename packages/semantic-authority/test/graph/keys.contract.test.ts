import { describe, expect, it } from "vitest";
import {
  serializeGraphAdmissionKey,
  serializeGraphBindableTraitKey,
  serializeGraphBridgeArtifactKey,
  serializeGraphCompletenessKey,
  serializeGraphDeclarationWitnessKey,
  serializeGraphEntityKey,
  serializeGraphNodeKey,
  serializeGraphObservationKey,
  serializeGraphOpenBoundaryKey,
  serializeGraphReachabilityKey,
  serializeGraphReferenceEntryKey,
  serializeGraphResourceKey,
  serializeGraphSupportBundleKey,
  serializeGraphVocabularyEntryKey,
} from "../../out/graph/index.js";
import {
  serializeBoundaryKey,
  serializeConsultedContext,
  serializeConsultedWorld,
  serializeOccurrenceAnchor,
} from "../../out/shared/index.js";

describe("semantic-authority graph key encoding helpers", () => {
  it("serializes graph-native resource and entity keys", () => {
    const resourceKey = {
      keyKind: "resource",
      resourceKind: "custom-element",
      canonicalName: "app",
      ownerKey: null,
    } as const;

    const localResourceKey = {
      keyKind: "resource",
      resourceKind: "local-custom-element",
      canonicalName: "inner-card",
      ownerKey: resourceKey,
    } as const;

    const vocabularyEntryKey = {
      keyKind: "vocabulary-entry",
      vocabularyFamily: "binding-command",
      entryIdentity: "click",
    } as const;

    expect(serializeGraphResourceKey(resourceKey)).toBe("resource:custom-element:app");
    expect(serializeGraphResourceKey(localResourceKey)).toBe(
      "resource:local-custom-element:resource:custom-element:app/inner-card",
    );
    expect(serializeGraphVocabularyEntryKey(vocabularyEntryKey)).toBe(
      "vocabulary-entry:binding-command:click",
    );
    expect(serializeGraphEntityKey(vocabularyEntryKey)).toBe(
      "vocabulary-entry:binding-command:click",
    );
  });

  it("serializes admission and reachability keys with nested graph subject variants", () => {
    const consultedWorld = serializeConsultedWorld({
      worldIdentifier: "root/app",
      boundaryIdentifier: "root/app",
    });
    const consultedContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });
    const occurrenceAnchor = serializeOccurrenceAnchor({
      documentUri: "file:///src/app.html",
      position: { line: 4, character: 2 },
    });
    const resourceKey = {
      keyKind: "resource",
      resourceKind: "custom-attribute",
      canonicalName: "if",
      ownerKey: null,
    } as const;

    expect(
      serializeGraphAdmissionKey({
        keyKind: "admission",
        consultedWorld,
        subjectKey: {
          keyKind: "vocabulary-entry",
          vocabularyFamily: "attribute-pattern",
          entryIdentity: "foo.*|foo,bar",
        },
      }),
    ).toBe("admission:root/app::root/app:vocabulary-entry:attribute-pattern:foo.*|foo,bar");

    expect(
      serializeGraphReachabilityKey({
        keyKind: "reachability",
        consultedContext,
        subjectKey: {
          occurrenceAnchor,
          identifierOrReferentKey: "value",
        },
      }),
    ).toBe(
      `reach:root/app::root:template-scope:${occurrenceAnchor}:value`,
    );

    expect(
      serializeGraphReachabilityKey({
        keyKind: "reachability",
        consultedContext,
        subjectKey: resourceKey,
      }),
    ).toBe("reach:root/app::root:resource:custom-attribute:if");
  });

  it("serializes graph witness and open-boundary keys with graph-owned prefixes and ordering", () => {
    const resourceKey = {
      keyKind: "resource",
      resourceKind: "custom-attribute",
      canonicalName: "if",
      ownerKey: null,
    } as const;

    expect(
      serializeGraphBindableTraitKey({
        keyKind: "bindable-trait",
        bindableKey: {
          keyKind: "bindable",
          ownerResourceKey: resourceKey,
          propertyName: "value",
        },
        traitKind: "attribute",
      }),
    ).toBe("bindable-trait:bindable:resource:custom-attribute:if:value:attribute");

    expect(
      serializeGraphDeclarationWitnessKey({
        keyKind: "declaration-witness",
        subjectKey: resourceKey,
        declarationFormSet: "template,typescript",
      }),
    ).toBe("decl-witness:resource:custom-attribute:if:template,typescript");

    expect(
      serializeGraphSupportBundleKey({
        keyKind: "support-bundle",
        targetFamilyId: "claim.identity.custom-attribute",
        subjectKey: resourceKey,
      }),
    ).toBe("support-bundle:claim.identity.custom-attribute:resource:custom-attribute:if");

    expect(
      serializeGraphOpenBoundaryKey({
        keyKind: "open-boundary",
        targetFamilyId: "claim.identity.custom-attribute",
        subjectKey: resourceKey,
        blockedDependency: "registration-missing",
      }),
    ).toBe(
      "open-boundary:claim.identity.custom-attribute:resource:custom-attribute:if:registration-missing",
    );
  });

  it("serializes graph-only node keys through the graph dispatcher", () => {
    const occurrenceAnchor = serializeOccurrenceAnchor({
      documentUri: "file:///src/app.html",
      position: { line: 9, character: 1 },
    });
    const boundaryKey = serializeBoundaryKey({
      completenessFamily: "type-closure",
      consultedContext: serializeConsultedContext({
        scopeChainRef: "root/app",
        boundaryIdentifier: "root",
      }),
      typeClosureSurface: "expression",
    });
    const resourceKey = {
      keyKind: "resource",
      resourceKind: "custom-element",
      canonicalName: "app",
      ownerKey: null,
    } as const;

    expect(
      serializeGraphObservationKey({
        keyKind: "observation",
        documentUri: "file:///src/app.html",
        position: occurrenceAnchor,
        sourceSurface: "template",
      }),
    ).toBe(`obs:file:///src/app.html:${occurrenceAnchor}:template`);

    expect(
      serializeGraphReferenceEntryKey({
        keyKind: "reference-entry",
        subjectEntityKey: resourceKey,
        referenceKind: "resource",
        site: {
          documentUri: "file:///src/app.html",
          span: { start: 12, end: 17 },
          siteKind: "tag-name",
        },
      }),
    ).toBe("ref:resource:custom-element:app:resource:file:///src/app.html:12:17");

    expect(
      serializeGraphBridgeArtifactKey({
        keyKind: "bridge-artifact",
        entityKey: resourceKey,
        artifactKind: "ts-symbol",
      }),
    ).toBe("bridge:resource:custom-element:app:ts-symbol");

    const completenessKey = {
      keyKind: "completeness",
      boundaryKey,
      completenessFamily: "type-closure",
    } as const;

    expect(serializeGraphCompletenessKey(completenessKey)).toBe(
      "completeness:root/app::root::tc::expression:type-closure",
    );
    expect(serializeGraphNodeKey(completenessKey)).toBe(
      "completeness:root/app::root::tc::expression:type-closure",
    );
  });
});
