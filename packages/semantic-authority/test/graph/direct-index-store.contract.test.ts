import { describe, expect, it } from "vitest";
import {
  GraphDirectIndexStore,
  GraphNodeStore,
  type ClaimNodeBase,
  type CompletenessKey,
  type NodeKey,
  type ResourceKey,
} from "../../out/graph/index.js";
import {
  serializeBoundaryKey,
  serializeConsultedContext,
  serializeConsultedWorld,
} from "../../out/shared/index.js";

function createResourceKey(
  resourceKind: ResourceKey["resourceKind"] = "custom-element",
  canonicalName = "app",
): ResourceKey {
  return {
    keyKind: "resource",
    resourceKind,
    canonicalName,
    ownerKey: null,
  };
}

function createNode(
  key: NodeKey,
  nodeKind: ClaimNodeBase["nodeKind"],
  familyTag: string,
): ClaimNodeBase {
  return {
    key,
    nodeKind,
    familyTag,
    claimState: "holds",
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
  };
}

describe("semantic-authority graph direct index store", () => {
  it("indexes the direct fan-out surfaces used by InspectEntity and DiscoverReferences", () => {
    const nodeStore = new GraphNodeStore();
    const indexStore = new GraphDirectIndexStore(nodeStore);

    const elementKey = createResourceKey("custom-element", "app");
    const commandKey = createResourceKey("binding-command", "trigger");
    const bindableKey = {
      keyKind: "bindable" as const,
      ownerResourceKey: elementKey,
      propertyName: "value",
    };

    const templateWorld = serializeConsultedWorld({
      worldIdentifier: "root/app",
      boundaryIdentifier: "root/app",
    });

    const fieldName = createNode(
      {
        keyKind: "field-fact",
        resourceKey: elementKey,
        fieldPath: "name",
      },
      "field-fact",
      "claim.resource.custom-element-field",
    );
    const fieldTemplate = createNode(
      {
        keyKind: "field-fact",
        resourceKey: elementKey,
        fieldPath: "template",
      },
      "field-fact",
      "claim.resource.custom-element-field",
    );
    const bindableIdentity = createNode(
      bindableKey,
      "bindable-identity",
      "claim.interface.bindable-identity",
    );
    const bindableAttribute = createNode(
      {
        keyKind: "bindable-trait",
        bindableKey,
        traitKind: "attribute",
      },
      "bindable-trait",
      "claim.interface.bindable-attribute",
    );
    const bindableMode = createNode(
      {
        keyKind: "bindable-trait",
        bindableKey,
        traitKind: "mode",
      },
      "bindable-trait",
      "claim.interface.bindable-mode",
    );
    const admission = createNode(
      {
        keyKind: "admission",
        consultedWorld: templateWorld,
        subjectKey: elementKey,
      },
      "admission",
      "claim.availability.resource-admission",
    );
    const governedSemantic = createNode(
      {
        keyKind: "governed-semantic",
        resourceKey: commandKey,
        governedFamily: "binding-command-semantics",
      },
      "governed-semantic",
      "claim.governed.binding-command-semantics",
    );
    const referenceEntry = createNode(
      {
        keyKind: "reference-entry",
        subjectEntityKey: elementKey,
        referenceKind: "resource",
        site: {
          documentUri: "file:///app.html",
          span: { start: 1, end: 4 },
          siteKind: "tag-name",
        },
      },
      "reference-entry",
      "infrastructure.reference-entry.declaration",
    );

    for (const node of [
      fieldName,
      fieldTemplate,
      bindableIdentity,
      bindableAttribute,
      bindableMode,
      admission,
      governedSemantic,
      referenceEntry,
    ]) {
      nodeStore.set(node);
      indexStore.upsert(node);
    }

    expect(indexStore.getFieldFactsForResource(elementKey)).toEqual([fieldName, fieldTemplate]);
    expect(indexStore.getBindableIdentitiesForOwner(elementKey)).toEqual([bindableIdentity]);
    expect(indexStore.getBindableTraitsForBindable(bindableKey)).toEqual([
      bindableAttribute,
      bindableMode,
    ]);
    expect(indexStore.getAdmissionsForSubject(elementKey)).toEqual([admission]);
    expect(indexStore.getGovernedSemanticsForResource(commandKey)).toEqual([governedSemantic]);
    expect(indexStore.getReferenceEntriesForSubject(elementKey)).toEqual([referenceEntry]);
  });

  it("supports direct lookup for reachability and completeness witness entries", () => {
    const nodeStore = new GraphNodeStore();
    const indexStore = new GraphDirectIndexStore(nodeStore);
    const elementKey = createResourceKey("custom-element", "app");
    const consultedContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });

    const reachability = createNode(
      {
        keyKind: "reachability",
        consultedContext,
        subjectKey: elementKey,
      },
      "reachability",
      "claim.reachability.resource-scope",
    );

    const completenessKey: CompletenessKey = {
      keyKind: "completeness",
      boundaryKey: serializeBoundaryKey({
        completenessFamily: "resource-scope",
        consultedContext,
        resourceFamily: "custom-element",
      }),
      completenessFamily: "resource-scope",
    };
    const completenessWitness = createNode(
      completenessKey,
      "completeness-witness",
      "witness.completeness.resource-scope",
    );

    for (const node of [reachability, completenessWitness]) {
      nodeStore.set(node);
      indexStore.upsert(node);
    }

    expect(indexStore.getReachabilityForSubjectInContext(elementKey, consultedContext)).toBe(
      reachability,
    );
    expect(indexStore.getCompletenessWitness(completenessKey)).toBe(completenessWitness);
  });

  it("keeps direct index buckets stable across repeated upserts, deletes, and clear", () => {
    const nodeStore = new GraphNodeStore();
    const indexStore = new GraphDirectIndexStore(nodeStore);
    const elementKey = createResourceKey("custom-element", "app");
    const fieldNode = createNode(
      {
        keyKind: "field-fact",
        resourceKey: elementKey,
        fieldPath: "aliases",
      },
      "field-fact",
      "claim.resource.custom-element-field",
    );

    nodeStore.set(fieldNode);
    indexStore.upsert(fieldNode);
    indexStore.upsert(fieldNode);

    expect(indexStore.getFieldFactsForResource(elementKey)).toEqual([fieldNode]);

    expect(indexStore.delete(fieldNode.key)).toBe(true);
    expect(indexStore.delete(fieldNode.key)).toBe(false);
    expect(indexStore.getFieldFactsForResource(elementKey)).toEqual([]);

    nodeStore.set(fieldNode);
    indexStore.upsert(fieldNode);
    indexStore.clear();

    expect(indexStore.getFieldFactsForResource(elementKey)).toEqual([]);
  });
});
