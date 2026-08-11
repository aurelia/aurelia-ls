import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityAvailabilityState,
  type FrameworkCapabilityDemand,
  type FrameworkCapabilityPackageEvidence,
  FrameworkCapabilityDemandSiteKind,
} from '../framework/capability-demand.js';
import {
  FrameworkRegistrationCapability,
} from '../registration/framework-registration-manifest.js';
import { uniqueByKey } from '../collections.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
  openSeamBoundaryKindForReason,
} from '../kernel/open-seam.js';
import type { KernelStore } from '../kernel/store.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  type SemanticFrameworkCapabilityExplanation,
  type SemanticFrameworkCapabilityExplanationBlocker,
  type SemanticFrameworkCapabilityExplanationConclusion,
  type SemanticFrameworkCapabilityExplanationConclusionKind,
  type SemanticFrameworkCapabilityExplanationContender,
  type SemanticFrameworkCapabilityExplanationNextStep,
  type SemanticFrameworkCapabilityExplanationResult,
  type SemanticFrameworkCapabilityExplanationSubject,
  type SemanticFrameworkCapabilityExplanationUncertainty,
  type SemanticFrameworkCapabilityDemandActionability,
  type SemanticFrameworkCapabilityDemandRow,
  type SemanticFrameworkCapabilityDemandsResult,
  type SemanticFrameworkCapabilityPackageEvidenceRow,
  type SemanticAppDiagnosticRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeSourceCursorInput,
  type SemanticRuntimeSourceFileInput,
} from './contracts.js';
import {
  answer,
} from './answer-helpers.js';
import {
  frameworkCapabilityDemandDiagnostic,
} from './template-diagnostic-policy.js';
import {
  describeAddress,
  semanticSourceReferenceContainsFileOffset,
  semanticSourceReferenceMatchesFilePath,
  type SemanticSourceReference,
} from './source-reference.js';
import { resolveSemanticSourceCursor } from './source-cursor.js';

/** Project framework capability-demand products into the public app-query row surface. */
export function readFrameworkCapabilityDemandRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  includeHandles: boolean,
  sourceFile?: SemanticRuntimeSourceFileInput | null,
): readonly SemanticFrameworkCapabilityDemandRow[] {
  const sourceFilePath = sourceFile?.filePath ?? null;
  return emission.capabilityDemands.readDemands()
    .map((demand) => frameworkCapabilityDemandRow(store, demand, includeHandles))
    .filter((row) => sourceFilePath == null || frameworkCapabilityDemandRowMatchesSourceFile(row, sourceFilePath))
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.siteKind}:${left.requiredCapability}:${left.authoredName}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.siteKind}:${right.requiredCapability}:${right.authoredName}`)
    );
}

/** Explain one exact authored framework capability demand without reconstructing admission causality in a client. */
export function readFrameworkCapabilityExplanation(
  workspaceRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
  frameworkCapability: FrameworkRegistrationCapability | `${FrameworkRegistrationCapability}` | null | undefined,
): SemanticRuntimeAnswer<SemanticFrameworkCapabilityExplanationResult> {
  const projectKey = emission.project.projectKey;
  const emptyValue = (
    displayText: string,
    contenders: readonly SemanticFrameworkCapabilityExplanationContender[] = [],
  ): SemanticFrameworkCapabilityExplanationResult => ({
    displayText,
    projectKey,
    explanation: null,
    contenders,
  });
  const discoveryTruncated = emission.project.sourceDiscovery?.truncated === true;
  const selectionCoverage = discoveryTruncated
    ? SemanticRuntimeAnswerCoverage.Truncated
    : SemanticRuntimeAnswerCoverage.Complete;
  if (cursor == null) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'Framework capability explanation requires a source cursor.',
      emptyValue('No source cursor was supplied.'),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: selectionCoverage,
      },
    );
  }
  const resolution = resolveSemanticSourceCursor(
    workspaceRootDir,
    emission.project.rootDir,
    cursor,
    emission.project.inputGeneration.host,
  );
  if (resolution.cursor?.offset == null) {
    const summary = resolution.summary ?? 'The supplied framework capability cursor could not be resolved.';
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(summary),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: selectionCoverage,
      },
    );
  }

  const matches = emission.capabilityDemands.readDemands()
    .filter((demand) => demand.siteKind !== FrameworkCapabilityDemandSiteKind.SourceServiceApi)
    .map((demand) => ({
      demand,
      row: frameworkCapabilityDemandRow(store, demand, false),
    }))
    .filter(({ row }) =>
      (frameworkCapability == null || row.requiredCapability === frameworkCapability)
      && semanticSourceReferenceContainsFileOffset(
        row.source,
        resolution.cursor!.filePath,
        resolution.cursor!.offset,
      )
    )
    .sort((left, right) => frameworkCapabilityDemandSortKey(left.row)
      .localeCompare(frameworkCapabilityDemandSortKey(right.row)));
  const contenders = matches.flatMap(({ row }): readonly SemanticFrameworkCapabilityExplanationContender[] => {
    const subject = frameworkCapabilityExplanationSubject(row);
    return subject == null
      ? []
      : [{ subject, conclusionKind: frameworkCapabilityConclusionKind(row.admissionState) }];
  });
  if (matches.length === 0 || contenders.length === 0) {
    const capabilityText = frameworkCapability == null
      ? ''
      : ` for capability ${frameworkCapability}`;
    const summary = `No framework capability demand was found at the supplied source cursor${capabilityText}.`;
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(summary),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: selectionCoverage,
      },
    );
  }
  if (matches.length !== 1 || contenders.length !== 1) {
    const summary = `The supplied source cursor matches ${contenders.length} framework capability demands.`;
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue('Multiple current app analysis contexts represent this authored use; no explanation was selected.', contenders),
      {
        selection: SemanticRuntimeAnswerSelection.Ambiguous,
        coverage: selectionCoverage,
      },
    );
  }

  const selected = matches[0]!;
  const explanation = frameworkCapabilityExplanation(
    store,
    selected.demand,
    selected.row,
    contenders[0]!.subject,
    discoveryTruncated,
  );
  const coverage = discoveryTruncated
    ? SemanticRuntimeAnswerCoverage.Truncated
    : frameworkCapabilityExplanationCoverage(explanation);
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    explanation.conclusion.title,
    {
      displayText: [
        explanation.conclusion.title,
        explanation.conclusion.explanation,
        explanation.uncertainty.state === 'closed' ? null : explanation.uncertainty.explanation,
        explanation.conclusion.action,
      ].filter((part): part is string => part != null).join('\n'),
      projectKey,
      explanation,
      contenders,
    },
    {
      selection: SemanticRuntimeAnswerSelection.Exact,
      coverage,
    },
  );
}

function frameworkCapabilityExplanation(
  store: KernelStore,
  demand: FrameworkCapabilityDemand,
  row: SemanticFrameworkCapabilityDemandRow,
  subject: SemanticFrameworkCapabilityExplanationSubject,
  discoveryTruncated: boolean,
): SemanticFrameworkCapabilityExplanation {
  const blockers = frameworkCapabilityExplanationBlockers(store, demand);
  const conclusion = frameworkCapabilityExplanationConclusion(row);
  const configurationOpen = blockers.some((blocker) =>
    blocker.seamKindKey === 'configuration.open-configuration-option'
    || blocker.reasonKinds.includes(OpenSeamReasonKind.ConfigurationOptionOpen)
  );
  const uncertainty = frameworkCapabilityExplanationUncertainty(
    row,
    blockers,
    discoveryTruncated,
  );
  return {
    subject,
    conclusion,
    evidence: {
      admission: {
        state: row.admissionState,
        requiredRegistrationKinds: row.requiredRegistrationKinds,
        sources: row.admissionSources,
      },
      configuration: {
        state: row.admissionState === FrameworkCapabilityAdmissionState.ConfiguredOut
          ? 'excluded'
          : configurationOpen
            ? 'open'
            : 'not-indicated',
        sources: row.configurationSources,
      },
      package: {
        availabilityState: row.availabilityState,
        candidateModuleNames: row.candidateModuleNames,
        recommendedModuleName: row.recommendedModuleName,
        evidence: row.packageEvidence,
      },
      blockers,
    },
    uncertainty,
    currentness: {
      authority: 'answer-analysis-basis',
      explanation: 'This explanation describes the semantic basis attached to this answer; requery after source or project input changes.',
    },
    nextSteps: frameworkCapabilityExplanationNextSteps(row, blockers),
  };
}

function frameworkCapabilityExplanationSubject(
  row: SemanticFrameworkCapabilityDemandRow,
): SemanticFrameworkCapabilityExplanationSubject | null {
  if (row.source == null) {
    return null;
  }
  return {
    projectKey: row.projectKey,
    authoredName: row.authoredName,
    siteKind: row.siteKind,
    demandKind: row.demandKind,
    requiredCapability: row.requiredCapability,
    source: row.source,
    templateSource: row.templateSource,
  };
}

function frameworkCapabilityConclusionKind(
  admissionState: FrameworkCapabilityAdmissionState | `${FrameworkCapabilityAdmissionState}`,
): SemanticFrameworkCapabilityExplanationConclusionKind {
  switch (admissionState) {
    case FrameworkCapabilityAdmissionState.Admitted:
      return 'available';
    case FrameworkCapabilityAdmissionState.ConfiguredOut:
      return 'configured-out';
    case FrameworkCapabilityAdmissionState.NotAdmitted:
      return 'not-admitted';
    case FrameworkCapabilityAdmissionState.AdmissionUnknown:
      return 'admission-unknown';
    case FrameworkCapabilityAdmissionState.AdmittedChainUnproven:
      return 'provider-chain-unproven';
  }
  throw new Error('Unsupported framework capability admission state.');
}

function frameworkCapabilityExplanationConclusion(
  row: SemanticFrameworkCapabilityDemandRow,
): SemanticFrameworkCapabilityExplanationConclusion {
  const subject = `“${row.authoredName}”`;
  const capability = frameworkCapabilityRequirementText(row.requiredCapability);
  switch (row.admissionState) {
    case FrameworkCapabilityAdmissionState.Admitted:
      return {
        kind: 'available',
        title: `${subject} is available`,
        explanation: `${subject} requires ${capability}, and that capability is admitted at this authored use.`,
        action: 'No framework registration or configuration change is indicated.',
      };
    case FrameworkCapabilityAdmissionState.ConfiguredOut:
      return {
        kind: 'configured-out',
        title: `${subject} is excluded by configuration`,
        explanation: `${subject} requires ${capability}. Its provider is admitted, but closed application configuration excludes this surface.`,
        action: 'Review the retained configuration source before changing plugin options; no automatic edit is proposed.',
      };
    case FrameworkCapabilityAdmissionState.NotAdmitted:
      return {
        kind: 'not-admitted',
        title: `${subject} requires an unadmitted framework capability`,
        explanation: row.availabilityState === FrameworkCapabilityAvailabilityState.EvidenceFound
          ? `${subject} requires ${capability}. No registration admission reaches this use, although local package or import evidence exists for a candidate provider.`
          : `${subject} requires ${capability}. No registration admission reaches this use, and no local package or import evidence identifies a candidate provider.`,
        action: row.availabilityState === FrameworkCapabilityAvailabilityState.EvidenceFound
          ? 'Review the retained package or import evidence and the application registration path; no automatic registration edit is proposed.'
          : 'Confirm the intended package and application registration path; no automatic install or registration edit is proposed without local provider evidence.',
      };
    case FrameworkCapabilityAdmissionState.AdmissionUnknown:
      return {
        kind: 'admission-unknown',
        title: `Registration admission for ${subject} is uncertain`,
        explanation: `${subject} requires ${capability}, but the available static evidence cannot close whether registration admission reaches this use.`,
        action: 'Inspect the retained semantic blockers before treating this as a missing registration.',
      };
    case FrameworkCapabilityAdmissionState.AdmittedChainUnproven:
      return {
        kind: 'provider-chain-unproven',
        title: `The provider chain for ${subject} is unproven`,
        explanation: `${subject} requires ${capability}. Provider evidence exists, but the available static evidence cannot prove that the consulting container reaches it.`,
        action: 'Inspect the DI and registration context before changing application registration.',
      };
  }
  throw new Error('Unsupported framework capability admission state.');
}

function frameworkCapabilityExplanationBlockers(
  store: KernelStore,
  demand: FrameworkCapabilityDemand,
): readonly SemanticFrameworkCapabilityExplanationBlocker[] {
  return demand.blockingOpenSeamHandles.flatMap((handle): readonly SemanticFrameworkCapabilityExplanationBlocker[] => {
    const seam = store.read(handle);
    if (!(seam instanceof OpenSeam)) {
      return [];
    }
    const sources = uniqueByKey(
      [
        describeAddress(store, seam.addressHandle),
        ...seam.reasonSources.map((reasonSource) => describeAddress(store, reasonSource.addressHandle)),
      ].filter((source): source is SemanticSourceReference => source != null),
      (source) => JSON.stringify(source),
    );
    return [{
      kind: 'open-seam',
      seamKindKey: seam.seamKindKey,
      summary: seam.summary,
      reasonKinds: seam.reasonKinds,
      boundaryKinds: [...new Set(seam.reasonKinds.map(openSeamBoundaryKindForReason))],
      sources,
    }];
  });
}

function frameworkCapabilityExplanationUncertainty(
  row: SemanticFrameworkCapabilityDemandRow,
  blockers: readonly SemanticFrameworkCapabilityExplanationBlocker[],
  discoveryTruncated: boolean,
): SemanticFrameworkCapabilityExplanationUncertainty {
  const reasons: SemanticFrameworkCapabilityExplanationUncertainty['reasons'][number][] = [];
  if (row.admissionState === FrameworkCapabilityAdmissionState.AdmissionUnknown) {
    reasons.push('admission-status-unknown');
  }
  if (row.admissionState === FrameworkCapabilityAdmissionState.AdmittedChainUnproven) {
    reasons.push('provider-chain-unproven');
  }
  if (blockers.length > 0) {
    reasons.push('blocking-open-seam');
  }
  if (
    row.admissionState === FrameworkCapabilityAdmissionState.ConfiguredOut
    && row.configurationSources.length === 0
  ) {
    reasons.push('configuration-source-unavailable');
  }
  if (discoveryTruncated) {
    reasons.push('source-discovery-truncated');
  }
  const uniqueReasons = [...new Set(reasons)];
  if (discoveryTruncated) {
    return {
      state: 'truncated',
      reasons: uniqueReasons,
      explanation: 'Project source discovery was truncated, so this conclusion is limited to the admitted source basis.',
    };
  }
  if (uniqueReasons.length > 0) {
    return {
      state: 'open',
      reasons: uniqueReasons,
      explanation: `This conclusion remains open because ${uniqueReasons.map(frameworkCapabilityUncertaintyReasonText).join('; ')}.`,
    };
  }
  return {
    state: 'closed',
    reasons: [],
    explanation: 'No modeled admission, configuration, or blocker uncertainty remains for this conclusion.',
  };
}

function frameworkCapabilityUncertaintyReasonText(
  reason: SemanticFrameworkCapabilityExplanationUncertainty['reasons'][number],
): string {
  switch (reason) {
    case 'admission-status-unknown':
      return 'registration admission could not be closed';
    case 'provider-chain-unproven':
      return 'the consulting container chain could not be proven';
    case 'blocking-open-seam':
      return 'typed semantic blockers remain';
    case 'source-discovery-truncated':
      return 'project source discovery was truncated';
    case 'configuration-source-unavailable':
      return 'the excluding configuration source is unavailable';
  }
}

function frameworkCapabilityExplanationCoverage(
  explanation: SemanticFrameworkCapabilityExplanation,
): SemanticRuntimeAnswerCoverage {
  return explanation.uncertainty.state === 'closed'
    ? SemanticRuntimeAnswerCoverage.Complete
    : explanation.uncertainty.state === 'truncated'
      ? SemanticRuntimeAnswerCoverage.Truncated
      : SemanticRuntimeAnswerCoverage.Open;
}

function frameworkCapabilityExplanationNextSteps(
  row: SemanticFrameworkCapabilityDemandRow,
  blockers: readonly SemanticFrameworkCapabilityExplanationBlocker[],
): readonly SemanticFrameworkCapabilityExplanationNextStep[] {
  const steps: SemanticFrameworkCapabilityExplanationNextStep[] = [];
  const firstSpecificSource = row.admissionState === FrameworkCapabilityAdmissionState.ConfiguredOut
    ? row.configurationSources[0] ?? null
    : row.admissionState === FrameworkCapabilityAdmissionState.NotAdmitted
      ? row.packageEvidence.find((evidence) => evidence.source != null)?.source ?? null
      : blockers[0]?.sources[0] ?? row.admissionSources[0] ?? null;
  if (firstSpecificSource != null) {
    steps.push({
      kind: 'inspect-source',
      label: row.admissionState === FrameworkCapabilityAdmissionState.ConfiguredOut
        ? 'Open the configuration value that excludes this surface.'
        : row.admissionState === FrameworkCapabilityAdmissionState.NotAdmitted
          ? 'Open the retained package or import evidence.'
          : blockers.length > 0
            ? 'Open the first semantic blocker for this admission.'
            : 'Open the retained registration admission source.',
      source: firstSpecificSource,
      relatedQueryKind: null,
      targetQuery: null,
    });
  }
  steps.push({
    kind: 'inspect-query',
    label: `Inspect ${frameworkRelatedQueryAuthorLabel(row.relatedQueryKind)} for this capability.`,
    source: null,
    relatedQueryKind: row.relatedQueryKind,
    targetQuery: { kind: row.relatedQueryKind },
  });
  if (
    row.admissionState === FrameworkCapabilityAdmissionState.AdmissionUnknown
    || row.admissionState === FrameworkCapabilityAdmissionState.AdmittedChainUnproven
    || blockers.length > 0
  ) {
    steps.push({
      kind: 'inspect-query',
      label: blockers.length > 0
        ? 'Inspect the open semantic sites behind this uncertainty.'
        : 'Inspect DI issues behind the unproven provider chain.',
      source: null,
      relatedQueryKind: blockers.length > 0
        ? SemanticAppQueryKind.OpenSeamSites
        : SemanticAppQueryKind.DiIssues,
      targetQuery: blockers.length > 0
        ? {
            kind: SemanticAppQueryKind.OpenSeamSites,
            ...(row.source?.path == null ? {} : { sourceFile: { filePath: row.source.path } }),
          }
        : { kind: SemanticAppQueryKind.DiIssues },
    });
  } else if (row.source?.path != null) {
    steps.push({
      kind: 'inspect-query',
      label: 'Inspect all framework capability demands in this source file.',
      source: null,
      relatedQueryKind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      targetQuery: {
        kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
        sourceFile: { filePath: row.source.path },
      },
    });
  }
  return steps.slice(0, 3);
}

function frameworkCapabilityRequirementText(
  capability: FrameworkRegistrationCapability | `${FrameworkRegistrationCapability}`,
): string {
  const label = (() => {
    switch (capability) {
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax:
        return 'Aurelia’s default binding syntax';
      case FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax:
        return 'Aurelia’s shorthand binding syntax';
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage:
        return 'Aurelia’s default binding language';
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultResources:
        return 'Aurelia’s default template resources';
      case FrameworkRegistrationCapability.I18nDefaultResources:
        return 'the i18n default resources';
      case FrameworkRegistrationCapability.I18nTranslationSyntax:
        return 'the i18n translation syntax';
      case FrameworkRegistrationCapability.ValidationHtmlDefaultResources:
        return 'the validation HTML resources';
      case FrameworkRegistrationCapability.RouterDefaultResources:
        return 'the router template resources';
      case FrameworkRegistrationCapability.StateDefaultResources:
        return 'the state template resources';
      case FrameworkRegistrationCapability.StateBindingSyntax:
        return 'the state binding syntax';
      case FrameworkRegistrationCapability.UiVirtualizationDefaultResources:
        return 'the UI virtualization resources';
      default:
        return 'a framework capability';
    }
  })();
  return `${label} (${capability})`;
}

function frameworkRelatedQueryAuthorLabel(
  queryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
): string {
  switch (queryKind) {
    case SemanticAppQueryKind.DialogIssues:
      return 'dialog issues';
    case SemanticAppQueryKind.ValidationIssues:
      return 'validation issues';
    case SemanticAppQueryKind.I18nTranslationBindings:
      return 'translation bindings';
    case SemanticAppQueryKind.RouterIssues:
      return 'router issues';
    case SemanticAppQueryKind.StateIssues:
      return 'state issues';
    case SemanticAppQueryKind.ConfigurationIssues:
      return 'configuration issues';
    default:
      return 'related framework facts';
  }
}

function frameworkCapabilityDemandSortKey(
  row: SemanticFrameworkCapabilityDemandRow,
): string {
  return `${row.source?.path ?? ''}:${row.source?.start ?? 0}:${row.source?.end ?? 0}:${row.siteKind}:${row.requiredCapability}:${row.authoredName}`;
}

export function frameworkCapabilityDemandsDisplayText(
  rows: readonly SemanticFrameworkCapabilityDemandRow[],
  totalRows: number,
): SemanticFrameworkCapabilityDemandsResult['displayText'] {
  const byAdmission = countBy(rows, (row) => row.admissionState);
  const bySite = countBy(rows, (row) => row.siteKind);
  const lines = [
    `Framework capability demands: ${rows.length} of ${totalRows} row(s).`,
  ];
  if (rows.length > 0) {
    lines.push(`Admission: ${formatCounts(byAdmission)}.`);
    lines.push(`Sites: ${formatCounts(bySite)}.`);
  }
  if (rows.some((row) => row.admissionState === FrameworkCapabilityAdmissionState.NotAdmitted)) {
    lines.push('Missing registrations are diagnostic/action candidates; edit placement remains source-edit-policy-open until a bootstrap/import planner chooses the exact change.');
  }
  if (rows.some((row) => row.admissionState === FrameworkCapabilityAdmissionState.ConfiguredOut)) {
    lines.push('Configured-out surfaces have an admitted provider but are excluded by closed app configuration; repair belongs at the retained configuration source.');
  }
  if (rows.some((row) => row.admissionState === FrameworkCapabilityAdmissionState.AdmissionUnknown)) {
    lines.push('Unknown admissions should be inspected with open-seam rows before accusing a missing registration.');
  }
  if (rows.some((row) => row.admissionState === FrameworkCapabilityAdmissionState.AdmittedChainUnproven)) {
    lines.push('Chain-unproven admissions found provider evidence, but semantic-runtime could not prove the consulting container chain.');
  }
  return lines.join('\n');
}

/** Project source-faced framework capability demands into unified app diagnostics. */
export function readFrameworkCapabilityDemandDiagnosticRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  includeHandles: boolean,
): readonly SemanticAppDiagnosticRow[] {
  return emission.capabilityDemands.readDemands()
    .filter((demand) =>
      demand.siteKind === FrameworkCapabilityDemandSiteKind.SourceServiceApi
      && demand.admissionState === FrameworkCapabilityAdmissionState.NotAdmitted
    )
    .flatMap((demand): readonly SemanticAppDiagnosticRow[] => {
      const source = describeAddress(store, demand.sourceAddressHandle);
      if (source == null) {
        return [];
      }
      const diagnostic = frameworkCapabilityDemandDiagnostic(demand, source);
      return [{
        projectKey: demand.projectKey,
        diagnosticDomain: 'framework',
        phase: null,
        diagnosticKind: diagnostic.diagnosticKind,
        diagnosticAuthority: diagnostic.diagnosticAuthority,
        frameworkErrorCode: diagnostic.frameworkErrorCode,
        frameworkRawErrorAuthority: null,
        severity: diagnostic.severity,
        summary: diagnostic.summary,
        missingInput: diagnostic.missingInput,
        missingInputs: diagnostic.missingInputs,
        source: diagnostic.source,
        subject: null,
        diagnosticIdentityHandle: demand.identityHandle,
        relatedInformation: [],
        suggestion: diagnostic.suggestion,
        sourceRole: null,
        relatedQueryKind: relatedQueryKindForCapability(demand.requiredCapability),
        ...(includeHandles
          ? {
            handles: {
              productHandle: demand.productHandle,
              identityHandle: demand.identityHandle,
              ownerIdentityHandle: demand.ownerIdentityHandle,
              sourceAddressHandle: demand.sourceAddressHandle,
              relatedSourceAddressHandles: [],
              templateSourceAddressHandle: demand.templateSourceAddressHandle,
              resourceDefinitionProductHandle: demand.resourceDefinitionProductHandle,
              overlayOriginKey: null,
              overlayFileName: null,
              overlaySegmentLabel: null,
            },
          }
          : {}),
      }];
    })
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.diagnosticKind}:${left.missingInput ?? ''}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.diagnosticKind}:${right.missingInput ?? ''}`)
    );
}

function frameworkCapabilityDemandRow(
  store: KernelStore,
  demand: FrameworkCapabilityDemand,
  includeHandles: boolean,
): SemanticFrameworkCapabilityDemandRow {
  const source = describeAddress(store, demand.sourceAddressHandle);
  const templateSource = describeAddress(store, demand.templateSourceAddressHandle);
  const blockingOpenSeamSources = uniqueByKey(
    demand.blockingOpenSeamHandles.flatMap((handle): readonly SemanticSourceReference[] => {
      const seam = store.read(handle);
      if (!(seam instanceof OpenSeam)) {
        return [];
      }
      return [
        seam.addressHandle,
        ...seam.reasonSources.map((reasonSource) => reasonSource.addressHandle),
      ].flatMap((handle) => {
        const source = describeAddress(store, handle);
        return source == null ? [] : [source];
      });
    }),
    (source) => JSON.stringify(source),
  );
  return {
    projectKey: demand.projectKey,
    siteKind: demand.siteKind,
    demandKind: demand.demandKind,
    requiredCapability: demand.requiredCapability,
    requiredRegistrationKinds: demand.requiredRegistrationKinds,
    candidateModuleNames: demand.candidateModuleNames,
    admissionState: demand.admissionState,
    availabilityState: demand.availabilityState,
    actionability: frameworkCapabilityDemandActionability(demand),
    packageEvidence: demand.packageEvidence.map((evidence) =>
      frameworkCapabilityPackageEvidenceRow(store, evidence, includeHandles)
    ),
    recommendedModuleName: demand.recommendedModuleName,
    authoredName: demand.authoredName,
    source,
    templateSource,
    admissionSources: demand.admissionSourceAddressHandles.flatMap((handle) => {
      const source = describeAddress(store, handle);
      return source == null ? [] : [source];
    }),
    configurationSources: demand.configurationSourceAddressHandles.flatMap((handle) => {
      const source = describeAddress(store, handle);
      return source == null ? [] : [source];
    }),
    blockingOpenSeamSources,
    blockingOpenSeamCount: demand.blockingOpenSeamHandles.length,
    relatedQueryKind: relatedQueryKindForCapability(demand.requiredCapability),
    summary: frameworkCapabilityDemandSummary(demand),
    ...(includeHandles ? {
      handles: {
        productHandle: demand.productHandle,
        identityHandle: demand.identityHandle,
        ownerIdentityHandle: demand.ownerIdentityHandle,
        sourceAddressHandle: demand.sourceAddressHandle,
        templateSourceAddressHandle: demand.templateSourceAddressHandle,
        resourceDefinitionProductHandle: demand.resourceDefinitionProductHandle,
        analysisContextProductHandle: demand.analysisContextProductHandle,
        admissionSourceAddressHandles: demand.admissionSourceAddressHandles,
        configurationSourceAddressHandles: demand.configurationSourceAddressHandles,
        blockingOpenSeamHandles: demand.blockingOpenSeamHandles,
      },
    } : {}),
  };
}

function frameworkCapabilityPackageEvidenceRow(
  store: KernelStore,
  evidence: FrameworkCapabilityPackageEvidence,
  includeHandles: boolean,
): SemanticFrameworkCapabilityPackageEvidenceRow {
  return {
    evidenceKind: evidence.evidenceKind,
    packageName: evidence.packageName,
    moduleName: evidence.moduleName,
    scope: evidence.scope,
    source: describeAddress(store, evidence.sourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        sourceAddressHandle: evidence.sourceAddressHandle,
      },
    } : {}),
  };
}

function frameworkCapabilityDemandActionability(
  demand: FrameworkCapabilityDemand,
): SemanticFrameworkCapabilityDemandActionability {
  switch (demand.admissionState) {
    case FrameworkCapabilityAdmissionState.Admitted:
      return 'registered';
    case FrameworkCapabilityAdmissionState.ConfiguredOut:
      return 'configuration-excludes-surface';
    case FrameworkCapabilityAdmissionState.NotAdmitted:
      return 'missing-registration';
    case FrameworkCapabilityAdmissionState.AdmissionUnknown:
      return 'registration-status-unknown';
    case FrameworkCapabilityAdmissionState.AdmittedChainUnproven:
      return 'provider-visible-chain-unproven';
  }
}

function frameworkCapabilityDemandSummary(
  demand: FrameworkCapabilityDemand,
): string {
  const moduleText = demand.recommendedModuleName == null
    ? 'no recommended module'
    : `recommended module ${demand.recommendedModuleName}`;
  const availabilityText = demand.availabilityState === FrameworkCapabilityAvailabilityState.EvidenceFound
    ? 'local package/import evidence found'
    : 'no local package/import evidence';
  return `${demand.siteKind} "${demand.authoredName}" requires ${demand.requiredCapability}; admission=${demand.admissionState}; ${availabilityText}; ${moduleText}.`;
}

function frameworkCapabilityDemandRowMatchesSourceFile(
  row: SemanticFrameworkCapabilityDemandRow,
  sourceFilePath: string,
): boolean {
  return semanticSourceReferenceMatchesFilePath(row.source, sourceFilePath)
    || semanticSourceReferenceMatchesFilePath(row.templateSource, sourceFilePath)
    || row.admissionSources.some((source) => semanticSourceReferenceMatchesFilePath(source, sourceFilePath))
    || row.configurationSources.some((source) => semanticSourceReferenceMatchesFilePath(source, sourceFilePath))
    || row.blockingOpenSeamSources.some((source) => semanticSourceReferenceMatchesFilePath(source, sourceFilePath))
    || row.packageEvidence.some((evidence) => semanticSourceReferenceMatchesFilePath(evidence.source, sourceFilePath));
}

function countBy(
  rows: readonly SemanticFrameworkCapabilityDemandRow[],
  key: (row: SemanticFrameworkCapabilityDemandRow) => string,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function formatCounts(counts: ReadonlyMap<string, number>): string {
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, count]) => `${key}(${count})`)
    .join(', ');
}

export function relatedQueryKindForCapability(
  capability: FrameworkRegistrationCapability,
): SemanticAppQueryKind {
  switch (capability) {
    case FrameworkRegistrationCapability.DialogServiceResolvers:
      return SemanticAppQueryKind.DialogIssues;
    case FrameworkRegistrationCapability.ValidationServiceResolvers:
      return SemanticAppQueryKind.ValidationIssues;
    case FrameworkRegistrationCapability.ValidationHtmlServiceResolvers:
      return SemanticAppQueryKind.ValidationIssues;
    case FrameworkRegistrationCapability.I18nServiceResolvers:
      return SemanticAppQueryKind.I18nTranslationBindings;
    case FrameworkRegistrationCapability.RouterConfigurationResolvers:
    case FrameworkRegistrationCapability.RouterDefaultComponents:
    case FrameworkRegistrationCapability.RouterDefaultResources:
    case FrameworkRegistrationCapability.RouterLifecycleTasks:
      return SemanticAppQueryKind.RouterIssues;
    case FrameworkRegistrationCapability.StateStoreResolvers:
    case FrameworkRegistrationCapability.StateStoreTasks:
      return SemanticAppQueryKind.StateIssues;
    default:
      return SemanticAppQueryKind.ConfigurationIssues;
  }
}
