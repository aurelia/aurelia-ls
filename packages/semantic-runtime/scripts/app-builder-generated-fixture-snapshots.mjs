import path from 'node:path';

export function appBuilderGeneratedFixtureDetailRequest(request) {
  return {
    ...request,
    sourceLoweringSourcePlan: {
      ...request.sourceLoweringSourcePlan,
      includeDecisionBundleExpansionRows: true,
      includeSourcePlanWitnessRows: true,
      includeControlUseInventoryRows: true,
      includeExpectedEffectRows: true,
      includeSourceLoweringRequestFields: true,
    },
  };
}

export function appBuilderGeneratedFixturePublicResponseSnapshot(answer, normalizedRequest, fixtureRoot) {
  return normalizeFixtureRootValue({
    outcome: answer.outcome,
    summary: answer.summary,
    value: {
      displayText: normalizeFixtureRootText(answer.value.displayText, fixtureRoot),
      rootDir: normalizedRequest.sourceLoweringSourcePlan.rootDir,
      templatePath: answer.value.templatePath,
      sourceTargetPath: answer.value.sourceTargetPath,
      issueCount: answer.value.issues.length,
      issues: answer.value.issues,
      sourceLoweringSelectionKind: answer.value.sourceLoweringSelectionKind,
      sourceLoweringResultDetailsIncluded: answer.value.sourceLoweringResultDetailsIncluded,
      ontologyTargetRefs: answer.value.sourceLoweringTargetRefs,
      effectContractIds: answer.value.effectContractIds,
      expectedEffectKinds: answer.value.expectedEffectKinds,
      expectedEffectCount: answer.value.expectedEffectCount,
      ...(answer.value.expectedEffects == null
        ? {}
        : { expectedEffects: answer.value.expectedEffects }),
      controlUseInventoryRowCount: answer.value.controlUseInventoryRowCount,
      ...(answer.value.controlUseInventoryRows == null
        ? {}
        : { controlUseInventoryRows: answer.value.controlUseInventoryRows }),
      sourceLoweringRequestFieldSummary: answer.value.sourceLoweringRequestFieldSummary,
      sourcePlanWitnessCount: answer.value.sourcePlanWitnessCount,
      ...(answer.value.sourcePlanWitnessRows == null
        ? {}
        : { sourcePlanWitnessRows: answer.value.sourcePlanWitnessRows }),
      suppliedInputCount: answer.value.suppliedInputCount,
      explicitSuppliedInputCount: answer.value.explicitSuppliedInputCount,
      decisionBundleCount: answer.value.decisionBundleCount,
      decisionBundleDecisionCount: answer.value.decisionBundleDecisionCount,
      ...(answer.value.decisionBundleExpansionRows == null
        ? {}
        : { decisionBundleExpansionRows: answer.value.decisionBundleExpansionRows }),
      sourcePlan: sourcePlanSnapshot(answer.value.sourcePlan, normalizedRequest.sourceLoweringSourcePlan.rootDir),
    },
  }, fixtureRoot);
}

export function normalizeFixtureRootValue(value, fixtureRoot) {
  if (typeof value === 'string') {
    return normalizeFixtureRootText(value, fixtureRoot);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFixtureRootValue(item, fixtureRoot));
  }
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeFixtureRootValue(item, fixtureRoot)]),
    );
  }
  return value;
}

function normalizeFixtureRootText(value, fixtureRoot) {
  return String(value)
    .replaceAll(fixtureRoot, '.')
    .replaceAll(slash(fixtureRoot), '.')
    .replaceAll(`.${path.sep}`, './');
}

function sourcePlanSnapshot(sourcePlan, normalizedRootDir) {
  if (sourcePlan == null) {
    return null;
  }
  return {
    rootDir: normalizedRootDir,
    policy: sourcePlan.policy,
    hasCompleteFileText: sourcePlan.hasCompleteFileText,
    files: sourcePlan.files.map((file) => ({
      path: file.path,
      role: file.role,
      language: file.language,
      editKind: file.editKind,
      operationKind: file.operationKind,
      textAuthority: file.text?.authority ?? null,
      textLength: file.text?.text.length ?? 0,
      contributionCount: file.contributionCount ?? file.contributions?.length ?? 0,
      ...(file.contributions == null
        ? {}
        : {
            contributions: file.contributions.map((contribution) => ({
              kind: contribution.kind,
              origin: contribution.origin,
            })),
          }),
    })),
    projectTooling: sourcePlan.projectTooling == null
      ? null
      : {
          packageManager: sourcePlan.projectTooling.packageManager,
          buildToolPolicy: sourcePlan.projectTooling.buildToolPolicy,
          dependencies: sourcePlan.projectTooling.dependencies,
          scripts: sourcePlan.projectTooling.scripts,
          files: sourcePlan.projectTooling.files.map((file) => ({
            path: file.path,
            fileKind: file.fileKind,
            language: file.language,
            textAuthority: file.textAuthority,
            textLength: file.text.length,
          })),
        },
    pattern: sourcePlan.pattern,
  };
}

function slash(value) {
  return value.replaceAll(path.sep, '/');
}
