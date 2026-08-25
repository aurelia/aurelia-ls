import ts from "typescript";

import { KernelVocabulary } from "../kernel/vocabulary.js";
import {
  RegistrationKeyRole,
  RegistrationStrategy,
} from "../registration/registration-admission.js";
import {
  RegistrationValueObservation,
  type RegistrationAdmissionObservation,
} from "../registration/registration-observation.js";
import { RegistrationValueKind } from "../registration/registration-reference.js";
import type { TypeSystemProject } from "../type-system/project.js";
import type { FullResourceDefinition } from "./resource-definition.js";
import type { ResourceDefinitionIndex } from "./resource-definition-index.js";
import { runtimeResourceKeyForKind } from "./resource-kind.js";

/** Inputs needed to join a registration carrier to converged resource identity. */
export interface ResourceRegistrationRefinementContext {
  readonly typeSystem: TypeSystemProject | null;
}

/**
 * Refine one registration observation through the shared resource-definition index.
 *
 * Source recognition and candidate-local DI replay both use this join. The latter can carry stronger evaluator
 * evidence than the source admission without publishing a second admission event.
 */
export function enrichResourceRegistration(
  observation: RegistrationAdmissionObservation,
  context: ResourceRegistrationRefinementContext,
  resources: ResourceDefinitionIndex | null,
): RegistrationAdmissionObservation {
  const definition = resourceDefinitionForRegistrationValue(
    observation,
    context,
    resources,
  );
  const effectConstraint =
    definition == null
      ? resourceEffectConstraintForRegistrationValue(
          observation,
          context,
          resources,
        )
      : null;
  let registeredValue = observation.registeredValue;
  if (registeredValue == null && effectConstraint != null) {
    registeredValue = new RegistrationValueObservation(
      RegistrationValueKind.ResourceDefinitionConstraint,
      effectConstraint.localName,
      effectConstraint.sourceNode,
      effectConstraint.localName != null,
      effectConstraint.productHandle,
      null,
      null,
      effectConstraint.moduleKey,
      null,
      null,
      null,
      effectConstraint.runtimeLookupKeys,
      effectConstraint.resourceKind,
    );
  }
  if (
    registeredValue == null ||
    (definition == null && effectConstraint == null)
  ) {
    return observation;
  }

  return observation.withRegisteredValueAndShape(
    RegistrationStrategy.Resource,
    RegistrationKeyRole.Unknown,
    null,
    registeredValue.withProductProjection(
      definition == null
        ? RegistrationValueKind.ResourceDefinitionConstraint
        : RegistrationValueKind.ResourceDefinition,
      definition?.target.localName ?? registeredValue.localName,
      definition?.productHandle ?? effectConstraint?.productHandle ?? null,
      registeredValue.frameworkKind,
      definition == null
        ? effectConstraint?.runtimeLookupKeys ??
            registeredValue.resourceLookupKeys
        : resourceDefinitionRuntimeLookupKeys(
            definition,
            observation.resourceLookupNameOverride,
          ),
      definition?.type ??
        effectConstraint?.resourceKind ??
        registeredValue.resourceKind,
    ),
    observation.openSeams.filter(
      (seam) =>
        seam.openKind !== KernelVocabulary.Registration.OpenStrategy.key,
    ),
  );
}

function resourceDefinitionRuntimeLookupKeys(
  definition: FullResourceDefinition,
  lookupNameOverride: string | null,
): readonly string[] {
  if (!("name" in definition)) return [];
  return [
    lookupNameOverride ?? definition.name,
    ...definition.aliases.map((alias) => alias.name),
  ].flatMap((name) => {
    const key = runtimeResourceKeyForKind(definition.type, name);
    return key == null ? [] : [key];
  });
}

function resourceEffectConstraintForRegistrationValue(
  observation: RegistrationAdmissionObservation,
  context: ResourceRegistrationRefinementContext,
  resources: ResourceDefinitionIndex | null,
) {
  const registeredValue = observation.registeredValue;
  if (resources == null) return null;
  const carrierConstraint = resources.lookupEffectConstraintByCarrierNode(
    observation.sourceNode,
  );
  if (carrierConstraint != null) return carrierConstraint;
  if (registeredValue == null) return null;
  if (
    registeredValue.isDeclaration &&
    registeredValue.moduleKey != null &&
    registeredValue.localName != null
  ) {
    const constraint = resources.lookupEffectConstraintByModuleLocal(
      registeredValue.moduleKey,
      registeredValue.localName,
    );
    if (constraint != null) return constraint;
  }
  if (context.typeSystem != null && ts.isExpression(registeredValue.node)) {
    const constraint = resources.lookupEffectConstraintByTypeScriptExpression(
      context.typeSystem,
      registeredValue.node,
    );
    if (constraint != null) return constraint;
  }
  return resources.lookupEffectConstraintByCarrierNode(registeredValue.node);
}

function resourceDefinitionForRegistrationValue(
  observation: RegistrationAdmissionObservation,
  context: ResourceRegistrationRefinementContext,
  resources: ResourceDefinitionIndex | null,
): FullResourceDefinition | null {
  if (resources == null || observation.registeredValue == null) {
    return null;
  }
  if (
    observation.registeredValue.isDeclaration &&
    observation.registeredValue.moduleKey != null &&
    observation.registeredValue.localName != null
  ) {
    const definition = resources.lookupByModuleLocal(
      observation.registeredValue.moduleKey,
      observation.registeredValue.localName,
    );
    if (definition?.productHandle != null) {
      return definition;
    }
  }
  if (context.typeSystem != null && ts.isExpression(observation.sourceNode)) {
    const definition = resources.lookupByTypeScriptExpression(
      context.typeSystem,
      observation.sourceNode,
    );
    if (definition?.productHandle != null) {
      return definition;
    }
  }
  const carrierDefinition = resources.lookupByCarrierNode(
    observation.registeredValue.node,
  );
  if (carrierDefinition?.productHandle != null) {
    return carrierDefinition;
  }
  const definition = resources.lookupValue(
    observation.registeredValue.evaluatedValue,
  );
  return definition?.productHandle == null ? null : definition;
}
