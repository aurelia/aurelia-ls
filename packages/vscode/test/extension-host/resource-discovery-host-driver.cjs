const assert = require("assert");
const { createHash } = require("crypto");

const baselineTreeFactKeys = Object.freeze([
  "published",
  "generation",
  "fingerprint",
  "nodeCount",
  "rootCount",
]);

const predecessorRaceFactKeys = Object.freeze([
  "pendingInvalidated",
  "blocked",
  "pendingTreePublicationCount",
  "pendingViewStateCount",
  "invalidated",
  "released",
  "discarded",
  "successorPublished",
  "predecessorGeneration",
  "successorGeneration",
  "predecessorFingerprint",
  "successorFingerprint",
  "latePredecessorPublishCount",
]);

const durablePublicationNodeFields = Object.freeze([
  "ordinal",
  "parentId",
  "nodeId",
  "nodeKind",
  "label",
  "description",
  "accessibilityLabel",
  "contextValue",
  "command",
  "navigationWorkspaceIdentity",
  "navigationProjectKey",
  "navigationResourceIdentity",
  "navigationChildIdentity",
  "navigationRole",
  "navigationPlacement",
  "implementationAvailable",
  "implementationWorkspaceIdentity",
  "implementationProjectKey",
  "implementationResourceIdentity",
  "implementationRole",
  "implementationPlacement",
  "collapsible",
  "defaultExpanded",
  "rowStates",
  "answerResult",
  "answerCoverage",
  "answerRowCount",
]);

function assertExactFactKeys(value, expectedKeys, label) {
  assert(value != null && typeof value === "object" && !Array.isArray(value), `${label} must be an object.`);
  assert.deepStrictEqual(Object.keys(value).sort(), [...expectedKeys].sort(), `${label} keys changed.`);
  return value;
}

function publicationNodeDurableShape(node) {
  return Object.fromEntries(durablePublicationNodeFields.map((field) => [field, node?.[field]]));
}

function observedWorkspaceIdentity(workspaceKey) {
  assert(typeof workspaceKey === "string" && workspaceKey.length > 0, "workspace key must be nonempty");
  return `workspace:${createHash("sha256").update(workspaceKey, "utf8").digest("hex")}`;
}

function assertScopedPublicationFingerprintCoherence(publication, nodes, label) {
  assert.strictEqual(publication?.source, "resource-explorer", `${label} source`);
  assert.strictEqual(publication?.phase, "publish-complete", `${label} phase`);
  assert.strictEqual(publication?.publicationKind, "current", `${label} publication kind`);
  assert(
    typeof publication.workspaceIdentity === "string" && publication.workspaceIdentity.length > 0,
    `${label} workspace identity must be nonempty.`,
  );
  assert(
    typeof publication.fingerprint === "string" && publication.fingerprint.length > 0,
    `${label} fingerprint must be nonempty.`,
  );
  assert(Array.isArray(nodes) && nodes.length > 0, `${label} nodes must be nonempty.`);
  assert.strictEqual(nodes.length, publication.nodeCount, `${label} node count`);

  let targetLaneCount = 0;
  for (const [index, node] of nodes.entries()) {
    assert.strictEqual(node?.source, "resource-explorer", `${label} nodes[${index}] source`);
    assert.strictEqual(node?.phase, "publish-node", `${label} nodes[${index}] phase`);
    assert.strictEqual(node?.observationId, publication.observationId, `${label} nodes[${index}] observation`);
    assert.strictEqual(node?.generation, publication.generation, `${label} nodes[${index}] generation`);
    assert.strictEqual(node?.publicationKind, publication.publicationKind, `${label} nodes[${index}] kind`);
    for (const lane of ["navigation", "implementation"]) {
      const workspaceIdentity = node?.[`${lane}WorkspaceIdentity`];
      const fingerprint = node?.[`${lane}Fingerprint`];
      assert.strictEqual(
        workspaceIdentity == null,
        fingerprint == null,
        `${label} nodes[${index}].${lane} workspace/fingerprint presence`,
      );
      if (workspaceIdentity !== publication.workspaceIdentity) continue;
      targetLaneCount += 1;
      assert.strictEqual(
        fingerprint,
        publication.fingerprint,
        `${label} nodes[${index}].${lane} fingerprint`,
      );
    }
  }
  assert(targetLaneCount > 0, `${label} must authenticate at least one target workspace navigation lane.`);
  return targetLaneCount;
}

function assertFinalRecoveredWorkspaceFingerprints(nodes, recoveries, label) {
  assert(Array.isArray(nodes) && nodes.length > 0, `${label} nodes must be nonempty.`);
  assert(Array.isArray(recoveries) && recoveries.length === 2, `${label} must contain two workspace recoveries.`);
  const expected = new Map();
  for (const [index, recovery] of recoveries.entries()) {
    assert(
      typeof recovery?.workspaceIdentity === "string" && recovery.workspaceIdentity.length > 0,
      `${label} recoveries[${index}].workspaceIdentity must be nonempty.`,
    );
    assert(
      typeof recovery?.fingerprint === "string" && recovery.fingerprint.length > 0,
      `${label} recoveries[${index}].fingerprint must be nonempty.`,
    );
    assert(!expected.has(recovery.workspaceIdentity), `${label} workspace recoveries must be unique.`);
    expected.set(recovery.workspaceIdentity, recovery.fingerprint);
  }

  const observed = new Map();
  for (const [index, node] of nodes.entries()) {
    for (const lane of ["navigation", "implementation"]) {
      const workspaceIdentity = node?.[`${lane}WorkspaceIdentity`];
      const fingerprint = node?.[`${lane}Fingerprint`];
      assert.strictEqual(
        workspaceIdentity == null,
        fingerprint == null,
        `${label} nodes[${index}].${lane} workspace/fingerprint presence`,
      );
      if (workspaceIdentity == null) continue;
      let fingerprints = observed.get(workspaceIdentity);
      if (fingerprints == null) {
        fingerprints = new Set();
        observed.set(workspaceIdentity, fingerprints);
      }
      fingerprints.add(fingerprint);
    }
  }
  assert.deepStrictEqual([...observed.keys()].sort(), [...expected.keys()].sort(), `${label} workspace identities`);
  for (const [workspaceIdentity, fingerprint] of expected) {
    assert.deepStrictEqual(
      [...observed.get(workspaceIdentity)],
      [fingerprint],
      `${label} ${workspaceIdentity} latest fingerprint`,
    );
  }
}

function assertScopedStablePendingEvidence({
  observations,
  invalidated,
  blocked,
  barrierControlId,
  blockedWorkspaceKey,
  label,
}) {
  assert(Array.isArray(observations), `${label} observations must be an array.`);
  assert(
    typeof barrierControlId === "string" && barrierControlId.length > 0,
    `${label} barrier control id must be nonempty.`,
  );
  const evidence = [invalidated, blocked];
  assert.strictEqual(new Set(evidence).size, evidence.length, `${label} evidence records must be distinct.`);
  for (const [index, event] of evidence.entries()) {
    assert.strictEqual(
      observations.filter((candidate) => candidate === event).length,
      1,
      `${label} evidence[${index}] must occur exactly once.`,
    );
  }

  assert.strictEqual(invalidated?.source, "resource-explorer-view", `${label} invalidation source`);
  assert.strictEqual(invalidated?.phase, "invalidation", `${label} invalidation phase`);
  assert.strictEqual(invalidated?.scope, "workspace", `${label} invalidation scope`);
  assert.strictEqual(invalidated?.workspaceKey, blockedWorkspaceKey, `${label} invalidation workspace`);

  assert.strictEqual(blocked?.source, "resource-discovery-host-control", `${label} barrier source`);
  assert.strictEqual(blocked?.observationId, barrierControlId, `${label} barrier control id`);
  assert.strictEqual(blocked?.phase, "blocked", `${label} barrier phase`);
  assert.strictEqual(blocked?.operation, "inventory", `${label} barrier operation`);
  assert.strictEqual(blocked?.stage, "after-response", `${label} barrier stage`);
  assert.strictEqual(blocked?.workspaceKey, blockedWorkspaceKey, `${label} barrier workspace`);
  assert.strictEqual(blocked?.includeTypeSurfaces, true, `${label} barrier type surfaces`);
  assert(
    Number.isInteger(blocked?.requestOrdinal) && blocked.requestOrdinal > 0,
    `${label} barrier request ordinal must be positive.`,
  );
  assert(
    typeof blocked?.responseFingerprint === "string" && blocked.responseFingerprint.length > 0,
    `${label} barrier response fingerprint must be nonempty.`,
  );

  const invalidatedIndex = observations.indexOf(invalidated);
  const blockedIndex = observations.indexOf(blocked);
  assert(
    invalidatedIndex < blockedIndex,
    `${label} must order invalidation < barrier.`,
  );
  const invalidationToBarrier = observations.slice(invalidatedIndex + 1, blockedIndex);
  const treePublications = invalidationToBarrier.filter((event) =>
    event?.source === "resource-explorer"
      && ["publish-start", "publish-node", "publish-complete"].includes(event.phase)
  );
  assert.strictEqual(
    treePublications.length,
    0,
    `${label} must not republish retained tree rows before the replacement settles.`,
  );
  const viewStates = invalidationToBarrier.filter((event) =>
    event?.source === "resource-explorer"
      && event.phase === "view-state"
  );
  assert.strictEqual(
    viewStates.length,
    0,
    `${label} must not insert transient view-state copy before the replacement settles.`,
  );
  return {
    pendingTreePublicationCount: treePublications.length,
    pendingViewStateCount: viewStates.length,
  };
}

async function closeTextDocumentWithNativeEditor(
  document,
  message,
  { workspace, window, wait },
) {
  const documentKey = document?.uri?.toString?.();
  assert(typeof documentKey === "string" && documentKey.length > 0, `${message} document must have an exact URI.`);
  const openDocuments = workspace.textDocuments.filter(
    (candidate) => candidate?.uri?.toString?.() === documentKey,
  );
  assert.strictEqual(
    openDocuments.length,
    1,
    `${message} document ${documentKey} must identify exactly one open text document before its native close.`,
  );

  const tabGroups = window?.tabGroups;
  assert(Array.isArray(tabGroups?.all), `${message} requires the public VS Code tab-groups surface.`);
  const exactTabs = [];
  const seenTabs = new Set();
  for (const group of tabGroups.all) {
    assert(Array.isArray(group?.tabs), `${message} encountered an invalid VS Code tab group.`);
    for (const tab of group.tabs) {
      if (tab?.input?.uri?.toString?.() !== documentKey) continue;
      assert(
        !seenTabs.has(tab),
        `${message} exact tab target ${documentKey} is ambiguous across VS Code tab groups.`,
      );
      seenTabs.add(tab);
      exactTabs.push(tab);
    }
  }
  assert(
    exactTabs.length > 0,
    `${message} document ${documentKey} must have at least one exact text tab before its native close.`,
  );

  let closeCount = 0;
  const subscription = workspace.onDidCloseTextDocument((closedDocument) => {
    if (closedDocument?.uri?.toString?.() === documentKey) closeCount += 1;
  });
  try {
    const closed = await tabGroups.close(exactTabs, true);
    assert.strictEqual(
      closed,
      true,
      `${message} exact tab close for ${documentKey} must be admitted by VS Code.`,
    );
    const closedState = () => {
      const matchingDocuments = workspace.textDocuments.filter(
        (candidate) => candidate?.uri?.toString?.() === documentKey,
      );
      const matchingTabs = tabGroups.all.flatMap((group, groupIndex) => group.tabs
        .filter((tab) => tab?.input?.uri?.toString?.() === documentKey)
        .map((tab) => ({
          groupIndex,
          isActive: tab.isActive,
          isDirty: tab.isDirty,
          isPreview: tab.isPreview,
          isPinned: tab.isPinned,
        })));
      return {
        closeCount,
        documentCount: matchingDocuments.length,
        documents: matchingDocuments.map((candidate) => ({
          isClosed: candidate.isClosed,
          isDirty: candidate.isDirty,
          languageId: candidate.languageId,
        })),
        tabCount: matchingTabs.length,
        tabs: matchingTabs,
        activeEditor: window.activeTextEditor?.document.uri.toString() ?? null,
        visibleEditorCount: (window.visibleTextEditors ?? []).filter(
          (editor) => editor?.document?.uri?.toString?.() === documentKey,
        ).length,
      };
    };
    await wait(
      () => {
        const state = closedState();
        return state.closeCount > 0 || (state.tabCount === 0 && state.visibleEditorCount === 0);
      },
      () => `${message} should reach an exact public editor-closed state for ${documentKey}; `
        + `last public state ${JSON.stringify(closedState())}`,
      60_000,
    );
    const terminalState = closedState();
    assert(
      closeCount === 0 || closeCount === 1,
      `${message} may correlate at most one native close event for ${documentKey}.`,
    );
    assert(
      terminalState.tabCount === 0,
      `${message} document ${documentKey} must have no remaining exact text tabs after its native close.`,
    );
    assert.strictEqual(
      terminalState.visibleEditorCount,
      0,
      `${message} document ${documentKey} must have no remaining visible text editor after its native close.`,
    );
    if (closeCount > 0) {
      assert.strictEqual(
        terminalState.documentCount,
        0,
        `${message} document ${documentKey} must be absent after its native document-close event.`,
      );
    }
    return documentKey;
  } finally {
    subscription.dispose();
  }
}

function publicationContainsProjectIssue(observations, publication, projectKey) {
  if (typeof projectKey !== "string" || projectKey.length === 0) return false;
  const nodes = correlatedCurrentPublicationNodes(observations, publication);
  return nodes != null && nodes.some((event) =>
    event.nodeKind === "project"
      && event.contextValue === "resourceProjectIssue"
      && typeof event.label === "string"
      && event.label.split(" · ").includes(projectKey)
  );
}

function publicationHasExactProjectIssueNodeIds(observations, publication, expectedNodeIds) {
  const nodes = correlatedCurrentPublicationNodes(observations, publication);
  if (
    nodes == null
    || !Array.isArray(expectedNodeIds)
    || expectedNodeIds.length === 0
    || expectedNodeIds.some((nodeId) => typeof nodeId !== "string" || nodeId.length === 0)
    || new Set(expectedNodeIds).size !== expectedNodeIds.length
  ) return false;
  const projectNodes = nodes.filter((event) => event.nodeKind === "project");
  if (
    projectNodes.length !== expectedNodeIds.length
    || projectNodes.some((event) =>
      event.contextValue !== "resourceProjectIssue"
        || typeof event.nodeId !== "string"
        || event.nodeId.length === 0
    )
  ) return false;
  const actualNodeIds = codeUnitSorted(projectNodes.map((event) => event.nodeId));
  const expected = codeUnitSorted(expectedNodeIds);
  return actualNodeIds.every((nodeId, index) => nodeId === expected[index]);
}

function correlatedCurrentPublicationNodes(observations, publication) {
  if (
    !Array.isArray(observations)
    || publication?.source !== "resource-explorer"
    || publication.phase !== "publish-complete"
    || publication.publicationKind !== "current"
    || typeof publication.observationId !== "string"
    || !Number.isInteger(publication.generation)
    || !Number.isInteger(publication.nodeCount)
    || publication.nodeCount < 0
    || !Number.isInteger(publication.rootCount)
    || publication.rootCount < 0
  ) return null;
  const tupleMatches = (event) =>
    event?.source === publication.source
      && event.observationId === publication.observationId
      && event.generation === publication.generation
      && event.publicationKind === publication.publicationKind;
  if (observations.filter((event) => event === publication).length !== 1) return null;
  const starts = observations.filter((event) => tupleMatches(event) && event.phase === "publish-start");
  const completions = observations.filter((event) => tupleMatches(event) && event.phase === "publish-complete");
  if (
    starts.length !== 1
    || completions.length !== 1
    || completions[0] !== publication
  ) return null;
  const start = starts[0];
  if (
    start.rootCount !== publication.rootCount
    || start.workspaceIdentity !== publication.workspaceIdentity
    || start.fingerprint !== publication.fingerprint
  ) return null;
  const startIndex = observations.indexOf(start);
  const completionIndex = observations.indexOf(publication);
  if (startIndex < 0 || completionIndex <= startIndex) return null;
  const nodes = [];
  for (const [index, event] of observations.entries()) {
    if (!tupleMatches(event) || event.phase !== "publish-node") continue;
    if (index <= startIndex || index >= completionIndex) return null;
    nodes.push(event);
  }
  if (
    nodes.length !== publication.nodeCount
    || nodes.some((event, ordinal) => event.ordinal !== ordinal)
    || nodes.filter((event) => event.parentId === null).length !== publication.rootCount
  ) return null;
  return nodes;
}

function codeUnitSorted(values) {
  return [...values].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

module.exports = {
  assertExactFactKeys,
  assertFinalRecoveredWorkspaceFingerprints,
  assertScopedPublicationFingerprintCoherence,
  assertScopedStablePendingEvidence,
  baselineTreeFactKeys,
  closeTextDocumentWithNativeEditor,
  durablePublicationNodeFields,
  predecessorRaceFactKeys,
  publicationContainsProjectIssue,
  publicationHasExactProjectIssueNodeIds,
  publicationNodeDurableShape,
};
