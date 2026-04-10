import {
  ClaimOutcomeKind,
  ClaimQualifierKind,
  ClaimTruthStatusKind
} from "../../model/claims/claim-model.js";
import { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import {
  CurrentWorldActivityStatusKind,
  SummaryStatusKind
} from "../handoff/world-context-shapes.js";
import type { CustomElementScanResult } from "../registration/custom-element-declaration-scanner.js";
import {
  type ConsultedWorldHandle,
  WorldParticipationFrontierKind
} from "../registration/consulted-world.js";
import type { ExtensionConfigurationScanResult } from "../registration/extension-configuration-scanner.js";
import {
  RegistrationAnalyzabilityTierId,
  RegistrationCompletenessPostureId,
  RegistrationSupportBehaviorKind,
  type RegistrationPatternScanResult
} from "../registration/registration-pattern.js";
import type { TemplateSourceAssociationScanResult } from "../registration/template-source-association-scanner.js";
import { ResourceDeclarationClosureKind } from "../resources/resource-definition.js";
import { ExtensionAdmissionClosureKind } from "../extensions/extension-activation.js";
import { TemplateAssociationClosureKind } from "../templates/template-source-association.js";

const DECLARATION_WITNESS_REF_PREFIX = "declaration-witness";
const CLOSURE_REF_PREFIX = "closure";

export const enum ProducerAnalyzabilityTierKind {
  None = 0,
  DeclaredExplicit = 1,
  GeneratedExplicit = 2,
  SourceAnalyzable = 3,
  TypeAssisted = 4,
  CandidateOnly = 5,
  RuntimeOnly = 6
}

interface CurrentWorldSummaryStatusSnapshot {
  readonly recognitionStatus: SummaryStatusKind;
  readonly admissionStatus: SummaryStatusKind;
  readonly currentWorldActivityStatus: CurrentWorldActivityStatusKind;
  readonly declarationWitnessStatus: SummaryStatusKind;
  readonly searchedWorldCompletenessStatus: SummaryStatusKind;
  readonly openStateStatus: SummaryStatusKind;
}

class CurrentWorldProducerSignalAccumulator {
  public analyzabilityTier = ProducerAnalyzabilityTierKind.None;
  public closedPositiveCount = 0;
  public qualifiedPositiveCount = 0;
  public placeholderCount = 0;
  public terminalCount = 0;

  public addClosedPositive(
    analyzabilityTier: ProducerAnalyzabilityTierKind
  ): void {
    this.promoteTier(analyzabilityTier);
    this.closedPositiveCount += 1;
  }

  public addQualifiedPositive(
    analyzabilityTier: ProducerAnalyzabilityTierKind
  ): void {
    this.promoteTier(analyzabilityTier);
    this.qualifiedPositiveCount += 1;
  }

  public addPlaceholder(
    analyzabilityTier: ProducerAnalyzabilityTierKind
  ): void {
    this.promoteTier(analyzabilityTier);
    this.placeholderCount += 1;
  }

  public addTerminal(
    analyzabilityTier: ProducerAnalyzabilityTierKind
  ): void {
    this.promoteTier(analyzabilityTier);
    this.terminalCount += 1;
  }

  public hasPositivePressure(): boolean {
    return this.closedPositiveCount > 0 || this.qualifiedPositiveCount > 0;
  }

  public hasQualifiedPressure(): boolean {
    return this.qualifiedPositiveCount > 0 || this.placeholderCount > 0;
  }

  public hasTerminalPressure(): boolean {
    return this.terminalCount > 0;
  }

  public hasAnyPressure(): boolean {
    return this.hasPositivePressure() ||
      this.placeholderCount > 0 ||
      this.terminalCount > 0;
  }

  private promoteTier(
    analyzabilityTier: ProducerAnalyzabilityTierKind
  ): void {
    if (analyzabilityTier > this.analyzabilityTier) {
      this.analyzabilityTier = analyzabilityTier;
    }
  }
}

export class CurrentWorldProducerBasis {
  public constructor(
    public readonly analyzabilityTier: ProducerAnalyzabilityTierKind,
    public readonly frontier: WorldParticipationFrontierKind,
    public readonly recognitionStatus: SummaryStatusKind,
    public readonly admissionStatus: SummaryStatusKind,
    public readonly currentWorldActivityStatus: CurrentWorldActivityStatusKind,
    public readonly declarationWitnessStatus: SummaryStatusKind,
    public readonly searchedWorldCompletenessStatus: SummaryStatusKind,
    public readonly openStateStatus: SummaryStatusKind
  ) {}

  public createDeclarationWitnessRef(
    consultedWorld: ConsultedWorldHandle
  ): string {
    return [
      DECLARATION_WITNESS_REF_PREFIX,
      consultedWorld.worldRef,
      `${consultedWorld.worldRegime}`,
      `${consultedWorld.registrationPath}`,
      `${this.analyzabilityTier}`,
      `${this.declarationWitnessStatus}`
    ].join(":");
  }

  public createClosureRef(
    consultedWorld: ConsultedWorldHandle
  ): string {
    return [
      CLOSURE_REF_PREFIX,
      consultedWorld.worldRef,
      `${consultedWorld.worldRegime}`,
      `${consultedWorld.registrationPath}`,
      `${this.frontier}`,
      `${this.searchedWorldCompletenessStatus}`
    ].join(":");
  }
}

export class CurrentWorldProducerBasisAssembler {
  public assess(
    resourceScan: CustomElementScanResult,
    extensionScan: ExtensionConfigurationScanResult,
    registrationScan: RegistrationPatternScanResult,
    templateAssociations: TemplateSourceAssociationScanResult
  ): CurrentWorldProducerBasis {
    const signals = new CurrentWorldProducerSignalAccumulator();

    for (const resource of resourceScan.recognizedElements) {
      const analyzabilityTier = mapResourceTier(resource.declarationClosure);
      if (analyzabilityTier === ProducerAnalyzabilityTierKind.RuntimeOnly) {
        signals.addTerminal(analyzabilityTier);
        continue;
      }

      signals.addClosedPositive(analyzabilityTier);
    }

    for (const resource of resourceScan.underclosedResources) {
      const analyzabilityTier = mapResourceTier(resource.declarationClosure);
      if (analyzabilityTier === ProducerAnalyzabilityTierKind.RuntimeOnly) {
        signals.addTerminal(analyzabilityTier);
        continue;
      }

      signals.addPlaceholder(analyzabilityTier);
    }

    for (const extension of extensionScan.activeExtensions) {
      const analyzabilityTier = mapExtensionTier(extension.closureKind);
      if (analyzabilityTier === ProducerAnalyzabilityTierKind.RuntimeOnly) {
        signals.addTerminal(analyzabilityTier);
        continue;
      }

      signals.addClosedPositive(analyzabilityTier);
    }

    for (const extension of extensionScan.underclosedExtensions) {
      const analyzabilityTier = mapExtensionTier(extension.closureKind);
      if (analyzabilityTier === ProducerAnalyzabilityTierKind.RuntimeOnly) {
        signals.addTerminal(analyzabilityTier);
        continue;
      }

      signals.addPlaceholder(analyzabilityTier);
    }

    for (const pattern of registrationScan.activeRegistrationPatterns) {
      const analyzabilityTier = mapRegistrationTier(
        pattern.metadata.analyzabilityTierId
      );
      if (analyzabilityTier === ProducerAnalyzabilityTierKind.RuntimeOnly) {
        signals.addTerminal(analyzabilityTier);
        continue;
      }

      if (
        pattern.behavior === RegistrationSupportBehaviorKind.ClaimWithQualifiers ||
        pattern.metadata.completenessPostureId !== RegistrationCompletenessPostureId.Closed ||
        analyzabilityTier >= ProducerAnalyzabilityTierKind.TypeAssisted
      ) {
        signals.addQualifiedPositive(analyzabilityTier);
        continue;
      }

      signals.addClosedPositive(analyzabilityTier);
    }

    for (const pattern of registrationScan.underclosedRegistrationPatterns) {
      const analyzabilityTier = mapRegistrationTier(
        pattern.metadata.analyzabilityTierId
      );
      if (
        pattern.behavior === RegistrationSupportBehaviorKind.DetectAndDeclareUnsupported ||
        pattern.behavior === RegistrationSupportBehaviorKind.DetectRuntimeOnlyBoundary ||
        analyzabilityTier === ProducerAnalyzabilityTierKind.RuntimeOnly ||
        pattern.metadata.completenessPostureId === RegistrationCompletenessPostureId.TerminalOpen
      ) {
        signals.addTerminal(analyzabilityTier);
        continue;
      }

      signals.addPlaceholder(analyzabilityTier);
    }

    for (const association of templateAssociations.underclosedAssociations) {
      const analyzabilityTier = mapTemplateTier(association.closureKind);
      if (analyzabilityTier === ProducerAnalyzabilityTierKind.RuntimeOnly) {
        signals.addTerminal(analyzabilityTier);
        continue;
      }

      signals.addPlaceholder(analyzabilityTier);
    }

    const frontier = deriveProducerFrontier(signals);
    return new CurrentWorldProducerBasis(
      signals.analyzabilityTier,
      frontier,
      SummaryStatusKind.Closed,
      deriveAdmissionStatus(frontier),
      deriveCurrentWorldActivityStatus(frontier, signals),
      deriveWitnessStatus(frontier),
      deriveCompletenessStatus(frontier),
      deriveOpenStateStatus(frontier)
    );
  }
}

export function deriveClaimTruthStatusFromFrontier(
  frontier: WorldParticipationFrontierKind
): ClaimTruthStatusKind {
  switch (frontier) {
    case WorldParticipationFrontierKind.ClosedBaseline:
      return ClaimTruthStatusKind.ClosedBaseline;
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
      return ClaimTruthStatusKind.CurrentWorldSensitive;
    case WorldParticipationFrontierKind.WorldQualified:
      return ClaimTruthStatusKind.WorldQualified;
    case WorldParticipationFrontierKind.TerminalOpen:
      return ClaimTruthStatusKind.TerminalOpen;
    case WorldParticipationFrontierKind.OpenPlaceholder:
    default:
      return ClaimTruthStatusKind.OpenPlaceholder;
  }
}

export function deriveClaimOutcomeFromFrontier(
  frontier: WorldParticipationFrontierKind
): ClaimOutcomeKind {
  switch (frontier) {
    case WorldParticipationFrontierKind.ClosedBaseline:
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
      return ClaimOutcomeKind.ClosedPositive;
    case WorldParticipationFrontierKind.WorldQualified:
      return ClaimOutcomeKind.ClosedQualified;
    case WorldParticipationFrontierKind.TerminalOpen:
      return ClaimOutcomeKind.BlockedOpen;
    case WorldParticipationFrontierKind.OpenPlaceholder:
    default:
      return ClaimOutcomeKind.DeferredOrPlaceholderOpen;
  }
}

export function deriveClaimQualifierFromFrontier(
  frontier: WorldParticipationFrontierKind
): ClaimQualifierKind {
  switch (frontier) {
    case WorldParticipationFrontierKind.WorldQualified:
    case WorldParticipationFrontierKind.TerminalOpen:
    case WorldParticipationFrontierKind.OpenPlaceholder:
      return ClaimQualifierKind.WorldOpen;
    case WorldParticipationFrontierKind.ClosedBaseline:
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
    default:
      return ClaimQualifierKind.None;
  }
}

export function deriveClosureStatusFromFrontier(
  frontier: WorldParticipationFrontierKind
): ClosureStatusKind {
  switch (frontier) {
    case WorldParticipationFrontierKind.ClosedBaseline:
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
      return ClosureStatusKind.Closed;
    case WorldParticipationFrontierKind.WorldQualified:
      return ClosureStatusKind.Qualified;
    case WorldParticipationFrontierKind.TerminalOpen:
      return ClosureStatusKind.Open;
    case WorldParticipationFrontierKind.OpenPlaceholder:
    default:
      return ClosureStatusKind.Partial;
  }
}

export function deriveCurrentWorldSummaryFrontier(
  summary: CurrentWorldSummaryStatusSnapshot
): WorldParticipationFrontierKind {
  if (
    summary.currentWorldActivityStatus === CurrentWorldActivityStatusKind.TerminalOpen ||
    summary.openStateStatus === SummaryStatusKind.TerminalOpen
  ) {
    return WorldParticipationFrontierKind.TerminalOpen;
  }

  if (
    summary.openStateStatus === SummaryStatusKind.OpenPlaceholder ||
    summary.admissionStatus === SummaryStatusKind.OpenPlaceholder ||
    summary.declarationWitnessStatus === SummaryStatusKind.OpenPlaceholder ||
    summary.searchedWorldCompletenessStatus === SummaryStatusKind.OpenPlaceholder
  ) {
    return WorldParticipationFrontierKind.OpenPlaceholder;
  }

  if (
    summary.openStateStatus === SummaryStatusKind.ClosableOpen ||
    summary.admissionStatus === SummaryStatusKind.ClosableOpen ||
    summary.declarationWitnessStatus === SummaryStatusKind.ClosableOpen ||
    summary.searchedWorldCompletenessStatus === SummaryStatusKind.ClosableOpen
  ) {
    return WorldParticipationFrontierKind.WorldQualified;
  }

  return summary.currentWorldActivityStatus === CurrentWorldActivityStatusKind.CurrentWorldSensitive
    ? WorldParticipationFrontierKind.CurrentWorldSensitive
    : WorldParticipationFrontierKind.ClosedBaseline;
}

function deriveProducerFrontier(
  signals: CurrentWorldProducerSignalAccumulator
): WorldParticipationFrontierKind {
  if (!signals.hasPositivePressure()) {
    if (signals.hasTerminalPressure()) {
      return WorldParticipationFrontierKind.TerminalOpen;
    }

    if (signals.placeholderCount > 0) {
      return WorldParticipationFrontierKind.OpenPlaceholder;
    }

    return WorldParticipationFrontierKind.ClosedBaseline;
  }

  return signals.hasQualifiedPressure() || signals.hasTerminalPressure()
    ? WorldParticipationFrontierKind.WorldQualified
    : WorldParticipationFrontierKind.CurrentWorldSensitive;
}

function deriveAdmissionStatus(
  frontier: WorldParticipationFrontierKind
): SummaryStatusKind {
  switch (frontier) {
    case WorldParticipationFrontierKind.ClosedBaseline:
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
      return SummaryStatusKind.Closed;
    case WorldParticipationFrontierKind.WorldQualified:
      return SummaryStatusKind.ClosableOpen;
    case WorldParticipationFrontierKind.TerminalOpen:
      return SummaryStatusKind.TerminalOpen;
    case WorldParticipationFrontierKind.OpenPlaceholder:
    default:
      return SummaryStatusKind.OpenPlaceholder;
  }
}

function deriveCurrentWorldActivityStatus(
  frontier: WorldParticipationFrontierKind,
  signals: CurrentWorldProducerSignalAccumulator
): CurrentWorldActivityStatusKind {
  if (frontier === WorldParticipationFrontierKind.TerminalOpen) {
    return CurrentWorldActivityStatusKind.TerminalOpen;
  }

  return signals.hasPositivePressure()
    ? CurrentWorldActivityStatusKind.CurrentWorldSensitive
    : CurrentWorldActivityStatusKind.Closed;
}

function deriveWitnessStatus(
  frontier: WorldParticipationFrontierKind
): SummaryStatusKind {
  switch (frontier) {
    case WorldParticipationFrontierKind.ClosedBaseline:
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
      return SummaryStatusKind.Closed;
    case WorldParticipationFrontierKind.WorldQualified:
      return SummaryStatusKind.ClosableOpen;
    case WorldParticipationFrontierKind.TerminalOpen:
      return SummaryStatusKind.TerminalOpen;
    case WorldParticipationFrontierKind.OpenPlaceholder:
    default:
      return SummaryStatusKind.OpenPlaceholder;
  }
}

function deriveCompletenessStatus(
  frontier: WorldParticipationFrontierKind
): SummaryStatusKind {
  return deriveWitnessStatus(frontier);
}

function deriveOpenStateStatus(
  frontier: WorldParticipationFrontierKind
): SummaryStatusKind {
  return deriveWitnessStatus(frontier);
}

function mapResourceTier(
  closureKind: ResourceDeclarationClosureKind
): ProducerAnalyzabilityTierKind {
  switch (closureKind) {
    case ResourceDeclarationClosureKind.DeclaredExplicit:
      return ProducerAnalyzabilityTierKind.DeclaredExplicit;
    case ResourceDeclarationClosureKind.SourceAnalyzable:
      return ProducerAnalyzabilityTierKind.SourceAnalyzable;
    case ResourceDeclarationClosureKind.RuntimeOnly:
    default:
      return ProducerAnalyzabilityTierKind.RuntimeOnly;
  }
}

function mapExtensionTier(
  closureKind: ExtensionAdmissionClosureKind
): ProducerAnalyzabilityTierKind {
  switch (closureKind) {
    case ExtensionAdmissionClosureKind.GeneratedExplicit:
      return ProducerAnalyzabilityTierKind.GeneratedExplicit;
    case ExtensionAdmissionClosureKind.SourceAnalyzable:
      return ProducerAnalyzabilityTierKind.SourceAnalyzable;
    case ExtensionAdmissionClosureKind.RuntimeOnly:
    default:
      return ProducerAnalyzabilityTierKind.RuntimeOnly;
  }
}

function mapTemplateTier(
  closureKind: TemplateAssociationClosureKind
): ProducerAnalyzabilityTierKind {
  switch (closureKind) {
    case TemplateAssociationClosureKind.DeclaredExplicit:
      return ProducerAnalyzabilityTierKind.DeclaredExplicit;
    case TemplateAssociationClosureKind.ConventionMediated:
    case TemplateAssociationClosureKind.SourceAnalyzable:
      return ProducerAnalyzabilityTierKind.SourceAnalyzable;
    case TemplateAssociationClosureKind.RuntimeOnly:
    default:
      return ProducerAnalyzabilityTierKind.RuntimeOnly;
  }
}

function mapRegistrationTier(
  analyzabilityTierId: RegistrationAnalyzabilityTierId
): ProducerAnalyzabilityTierKind {
  switch (analyzabilityTierId) {
    case RegistrationAnalyzabilityTierId.DeclaredExplicit:
      return ProducerAnalyzabilityTierKind.DeclaredExplicit;
    case RegistrationAnalyzabilityTierId.GeneratedExplicit:
      return ProducerAnalyzabilityTierKind.GeneratedExplicit;
    case RegistrationAnalyzabilityTierId.SourceAnalyzable:
      return ProducerAnalyzabilityTierKind.SourceAnalyzable;
    case RegistrationAnalyzabilityTierId.TypeAssisted:
      return ProducerAnalyzabilityTierKind.TypeAssisted;
    case RegistrationAnalyzabilityTierId.CandidateOnly:
      return ProducerAnalyzabilityTierKind.CandidateOnly;
    case RegistrationAnalyzabilityTierId.RuntimeOnly:
    default:
      return ProducerAnalyzabilityTierKind.RuntimeOnly;
  }
}
