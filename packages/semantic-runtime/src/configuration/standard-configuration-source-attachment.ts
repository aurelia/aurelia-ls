import path from 'node:path';

import type ts from 'typescript';

import type { SemanticApp } from '../api/runtime.js';
import {
  FrameworkRegistrationEffectKind,
  standardConfigurationRegistrationEffectsForAppWorld,
  type FrameworkDiEffectCoverageState,
  type FrameworkOrderedRegistrationEffect,
  type StandardConfigurationRegistrationEffects,
} from '../di/framework-registration-effects.js';
import { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  RegistrationAdmissionKind,
} from '../registration/registration-admission.js';
import type {
  StandardConfigurationCoercionConfiguration,
} from './framework-capability-configuration.js';

/** Authored carrier classes understood by the StandardConfiguration replacement attachment. */
export const enum StandardConfigurationSourceCarrierKind {
  /** Direct value argument supplied to an authored `container.register(...)` or `aurelia.register(...)` call. */
  ExplicitRegistrationValue = 'explicit-registration-value',
  /** StandardConfiguration installed implicitly by the browser `aurelia` facade. */
  BrowserFacadeDefault = 'browser-facade-default',
  /** A spent occurrence whose source carrier is outside the current direct-registration contract. */
  Unavailable = 'unavailable',
}

/** Causal reason why one spent StandardConfiguration occurrence has no replaceable value expression. */
export const enum StandardConfigurationSourceNonReplaceableReasonKind {
  BrowserFacadeDefault = 'browser-facade-default',
  UnsupportedAdmissionKind = 'unsupported-admission-kind',
  RuntimeValueSourceUnavailable = 'runtime-value-source-unavailable',
  SourceOwnershipUnavailable = 'source-ownership-unavailable',
  InvalidSourceRange = 'invalid-source-range',
}

export class StandardConfigurationSourceNonReplaceableReason {
  constructor(
    readonly reasonKind: StandardConfigurationSourceNonReplaceableReasonKind,
    readonly summary: string,
  ) {}
}

/** Exact source slice copied out of the active evaluator generation for old-text-validated replacement. */
export class StandardConfigurationAuthoredSourceSlice {
  constructor(
    readonly moduleKey: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly sourcePath: string,
    readonly sourceFilePath: string,
    readonly start: number,
    readonly end: number,
    readonly oldText: string,
  ) {}
}

/** A direct StandardConfiguration value expression that a build consumer may replace in place. */
export class StandardConfigurationExplicitSourceCarrier {
  readonly carrierKind = StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue;
  readonly replaceable = true;

  constructor(
    readonly valueExpression: StandardConfigurationAuthoredSourceSlice,
  ) {}
}

/** Implicit browser-facade installation: the source locus is explanatory, not a replacement range. */
export class StandardConfigurationBrowserFacadeDefaultSourceCarrier {
  readonly carrierKind = StandardConfigurationSourceCarrierKind.BrowserFacadeDefault;
  readonly replaceable = false;

  constructor(
    /** Constructor/static-facade source that caused the default registration, when source ownership remains exact. */
    readonly source: StandardConfigurationAuthoredSourceSlice | null,
    readonly reason: StandardConfigurationSourceNonReplaceableReason,
  ) {}
}

/** Honest non-replaceable result for a StandardConfiguration source lane not yet covered by this attachment. */
export class StandardConfigurationUnavailableSourceCarrier {
  readonly carrierKind = StandardConfigurationSourceCarrierKind.Unavailable;
  readonly replaceable = false;

  constructor(
    readonly source: StandardConfigurationAuthoredSourceSlice | null,
    readonly reason: StandardConfigurationSourceNonReplaceableReason,
  ) {}
}

export type StandardConfigurationSourceCarrier =
  | StandardConfigurationExplicitSourceCarrier
  | StandardConfigurationBrowserFacadeDefaultSourceCarrier
  | StandardConfigurationUnavailableSourceCarrier;

/**
 * Detached source and effect facts for one StandardConfiguration occurrence spent into the current app DI world.
 *
 * The effect array retains the exact order from `standardConfigurationRegistrationEffectsForAppWorld`. No evaluator
 * nodes, containers, or generation authorities cross this boundary; handles and copied source text preserve identity.
 */
export class StandardConfigurationSourceAttachment {
  constructor(
    readonly projectKey: string,
    readonly projectInputRevision: string,
    readonly operationProductHandle: ProductHandle,
    readonly operationIdentityHandle: IdentityHandle,
    readonly operationOrdinal: number,
    readonly receivingContainerProductHandle: ProductHandle | null,
    readonly receivingContainerIdentityHandle: IdentityHandle | null,
    readonly operationSourceAddressHandle: AddressHandle | null,
    readonly admissionProductHandle: ProductHandle,
    readonly admissionIdentityHandle: IdentityHandle,
    readonly admissionKind: RegistrationAdmissionKind,
    readonly admissionSourceAddressHandle: AddressHandle | null,
    readonly coverageState: FrameworkDiEffectCoverageState,
    readonly openSummary: string | null,
    /** Consumer-neutral effects in exact registration order; array position is the effect ordinal. */
    readonly effects: readonly FrameworkOrderedRegistrationEffect[],
    readonly coercion: StandardConfigurationCoercionConfiguration,
    readonly carrier: StandardConfigurationSourceCarrier,
  ) {}
}

/**
 * Project source attachments for every StandardConfiguration occurrence spent by one active SemanticApp generation.
 *
 * This is deliberately StandardConfiguration-specific. It does not claim that arbitrary plugin registry bodies can be
 * rewritten safely, and it does not publish evaluator nodes into the kernel or the returned value.
 */
export function materializeSemanticAppStandardConfigurationSourceAttachments(
  app: SemanticApp,
): readonly StandardConfigurationSourceAttachment[] {
  app.requireCurrent();
  const appWorld = app.emission.appWorld;
  const configuration = appWorld.configuration;
  const sourceIndex = new StaticProjectEvaluationSourceIndex(app.emission.configuration.evaluation);
  const attachments = standardConfigurationRegistrationEffectsForAppWorld(
    app.runtime.workspace.store,
    appWorld,
  ).map((effects) => sourceAttachmentForEffects(
    app,
    sourceIndex,
    configuration.evaluationBindings.runtimeValueSourceNodeForProduct(
      effects.operation.admission.productHandle,
    ),
    effects,
  ));
  app.requireCurrent();
  return attachments;
}

function sourceAttachmentForEffects(
  app: SemanticApp,
  sourceIndex: StaticProjectEvaluationSourceIndex,
  runtimeValueSourceNode: ts.Node | null,
  registrationEffects: StandardConfigurationRegistrationEffects,
): StandardConfigurationSourceAttachment {
  const operation = registrationEffects.operation;
  const admission = operation.admission;
  return new StandardConfigurationSourceAttachment(
    app.project.projectKey,
    app.project.inputGeneration.revision,
    operation.productHandle,
    operation.identityHandle,
    operation.ordinal,
    operation.container.productHandle,
    operation.container.identityHandle,
    operation.sourceAddressHandle,
    admission.productHandle,
    admission.identityHandle,
    admission.admissionKind,
    admission.sourceAddressHandle,
    registrationEffects.coverageState,
    registrationEffects.openSummary,
    registrationEffects.effects,
    standardConfigurationCoercion(registrationEffects),
    sourceCarrierForAdmission(sourceIndex, admission.admissionKind, runtimeValueSourceNode),
  );
}

function standardConfigurationCoercion(
  effects: StandardConfigurationRegistrationEffects,
): StandardConfigurationCoercionConfiguration {
  const configuration = effects.effects.find((effect) =>
    effect.effectKind === FrameworkRegistrationEffectKind.Configuration
  );
  if (configuration?.effectKind !== FrameworkRegistrationEffectKind.Configuration) {
    throw new Error(
      `StandardConfiguration operation '${effects.operation.productHandle}' has no coercion configuration effect.`,
    );
  }
  return configuration.configuration;
}

function sourceCarrierForAdmission(
  sourceIndex: StaticProjectEvaluationSourceIndex,
  admissionKind: RegistrationAdmissionKind,
  node: ts.Node | null,
): StandardConfigurationSourceCarrier {
  const source = sourceSliceForNode(sourceIndex, node);
  if (admissionKind === RegistrationAdmissionKind.AureliaFacadeDefault) {
    return new StandardConfigurationBrowserFacadeDefaultSourceCarrier(
      source.slice,
      new StandardConfigurationSourceNonReplaceableReason(
        StandardConfigurationSourceNonReplaceableReasonKind.BrowserFacadeDefault,
        'The browser Aurelia facade installs StandardConfiguration implicitly; no authored configuration value expression exists to replace.',
      ),
    );
  }
  if (!isDirectRegistrationArgument(admissionKind)) {
    return new StandardConfigurationUnavailableSourceCarrier(
      source.slice,
      new StandardConfigurationSourceNonReplaceableReason(
        StandardConfigurationSourceNonReplaceableReasonKind.UnsupportedAdmissionKind,
        `StandardConfiguration admission '${admissionKind}' is not a direct authored register-call argument.`,
      ),
    );
  }
  if (source.slice != null) {
    return new StandardConfigurationExplicitSourceCarrier(source.slice);
  }
  return new StandardConfigurationUnavailableSourceCarrier(
    null,
    source.reason ?? new StandardConfigurationSourceNonReplaceableReason(
      StandardConfigurationSourceNonReplaceableReasonKind.RuntimeValueSourceUnavailable,
      'The direct StandardConfiguration admission has no retained runtime value source expression.',
    ),
  );
}

function isDirectRegistrationArgument(admissionKind: RegistrationAdmissionKind): boolean {
  return admissionKind === RegistrationAdmissionKind.AureliaRegisterArgument
    || admissionKind === RegistrationAdmissionKind.ContainerRegisterArgument;
}

function sourceSliceForNode(
  sourceIndex: StaticProjectEvaluationSourceIndex,
  node: ts.Node | null,
): {
  readonly slice: StandardConfigurationAuthoredSourceSlice | null;
  readonly reason: StandardConfigurationSourceNonReplaceableReason | null;
} {
  if (node == null) {
    return {
      slice: null,
      reason: new StandardConfigurationSourceNonReplaceableReason(
        StandardConfigurationSourceNonReplaceableReasonKind.RuntimeValueSourceUnavailable,
        'The spent StandardConfiguration admission has no retained runtime value source expression.',
      ),
    };
  }
  const owner = sourceIndex.readEvaluatedForNode(node);
  if (owner == null) {
    return {
      slice: null,
      reason: new StandardConfigurationSourceNonReplaceableReason(
        StandardConfigurationSourceNonReplaceableReasonKind.SourceOwnershipUnavailable,
        'The retained StandardConfiguration source expression is not owned by an admitted evaluated module.',
      ),
    };
  }
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  if (start < 0 || end < start || end > sourceFile.text.length) {
    return {
      slice: null,
      reason: new StandardConfigurationSourceNonReplaceableReason(
        StandardConfigurationSourceNonReplaceableReasonKind.InvalidSourceRange,
        'The retained StandardConfiguration source expression does not have a valid range in its admitted source.',
      ),
    };
  }
  return {
    slice: new StandardConfigurationAuthoredSourceSlice(
      owner.moduleKey,
      owner.admission.addressHandle,
      owner.admission.path,
      path.resolve(sourceFile.fileName),
      start,
      end,
      sourceFile.text.slice(start, end),
    ),
    reason: null,
  };
}
