import type { SemanticApp } from '../api/runtime.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import { BuiltInResourcePackage } from '../resources/built-in-resources.js';
import { AU_COMPOSE_TARGET_NAME } from './au-compose-source.js';
import { readBuiltInVisibleTemplateResource } from './compiler-resource-lookup.js';
import { HydrateElementInstruction, InterpolationInstruction, PropertyBindingInstruction, SetPropertyInstruction } from './instruction-ir.js';
import {
  CompositionComponentResolutionKind, CompositionInputValueStateKind, CompositionLoadStateKind,
  type CompositionContext, type CompositionController,
} from './runtime-composition.js';
import { sameHydrateElementOwnership } from './runtime-hydrate-element-ownership.js';
import { RuntimeSpreadCompilationHandoffState } from './runtime-spread-compilation-handoff.js';
import {
  RuntimeRegistrationRequirementReasonKind, runtimeRegistrationRequirementReason,
  type RuntimeRegistrationRequirementCompilerInput, type RuntimeRegistrationRequirementReason,
} from './runtime-registration-requirement-model.js';
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';

/** Demand discovery uses selected built-in definition identities, never an authored resource name. */
export function semanticAppNeedsRuntimeCompositionAnalysis(app: SemanticApp): boolean {
  app.requireCurrent();
  return app.emission.templates.resources.some((resource) => resource.compilation.compiledTemplate.instructions.some(
    (instruction) => instruction instanceof HydrateElementInstruction
      && isRuntimeAuComposeInstruction(app.runtime.workspace.store, instruction),
  ));
}

/** Native runtime-html composition semantics apply only to the selected framework resource identity. */
export function isRuntimeAuComposeInstruction(store: ProductDetailReadView, instruction: HydrateElementInstruction): boolean {
  const resource = readBuiltInVisibleTemplateResource(store, instruction.resource);
  return resource?.packageId === BuiltInResourcePackage.RuntimeHtml && resource.targetName === AU_COMPOSE_TARGET_NAME;
}

interface CompositionOccurrence {
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  readonly context: CompositionContext;
  readonly controller: CompositionController;
}

/** Compiler demand for the bounded authored literal composition envelope, over one current app generation. */
export class RuntimeCompositionCompilerDemand {
  private readonly occurrences = new Map<ProductHandle, CompositionOccurrence[]>();
  private readonly compiledTemplates = new Map<ProductHandle, Set<ProductHandle>>();

  constructor(app: SemanticApp, inputs: readonly RuntimeRegistrationRequirementCompilerInput[]) {
    for (const input of inputs) {
      const definition = input.resource.compilation.definition.productHandle;
      if (definition == null || input.family == null || input.instructions == null || input.unavailableReasons.length > 0
        || !input.family.isCurrent() || !input.instructions.isCurrent()) continue;
      let templates = this.compiledTemplates.get(definition);
      if (templates == null) this.compiledTemplates.set(definition, templates = new Set());
      templates.add(input.resource.compilation.compiledTemplate.compiledTemplate.productHandle);
    }
    for (const resource of app.emission.templates.resources) {
      const composition = resource.runtimeAnalysis.runtimeComposition;
      const controllers = new Map(composition.controllers.map((controller) => [controller.context.productHandle, controller]));
      for (const context of composition.contexts) {
        const controller = controllers.get(context.productHandle);
        if (context.instructionProductHandle == null || controller == null) continue;
        let occurrences = this.occurrences.get(context.instructionProductHandle);
        if (occurrences == null) this.occurrences.set(context.instructionProductHandle, occurrences = []);
        occurrences.push({ resource, context, controller });
      }
    }
  }

  reasonFor(input: RuntimeRegistrationRequirementCompilerInput, instruction: HydrateElementInstruction): RuntimeRegistrationRequirementReason | null {
    const refuse = (summary: string, keys: readonly string[] = []) => runtimeRegistrationRequirementReason(
      RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
      summary, [instruction.productHandle, AU_COMPOSE_TARGET_NAME, ...keys],
    );
    if (instruction.captureSyntaxProductHandles.length > 0
      && (input.spreadHandoff?.state !== RuntimeSpreadCompilationHandoffState.Exact
        || !input.spreadHandoff.plansByInstruction.has(instruction))) {
      return refuse('AuCompose captured attributes require an exact composition-host spread compilation handoff.');
    }
    const literals = compositionLiteralInputs(input, instruction);
    if (literals == null) return refuse('AuCompose component/template inputs are not confined to authored literal instructions.');
    const authored = input.resource.compilation.compiledTemplate.instructions.filter(
      (candidate): candidate is HydrateElementInstruction => candidate instanceof HydrateElementInstruction
        && sameHydrateElementOwnership(instruction, candidate),
    );
    if (authored.length !== 1) return refuse('AuCompose browser-final instruction has no unique authored composition occurrence.');
    const occurrences = this.occurrences.get(authored[0]!.productHandle) ?? [];
    if (occurrences.length === 0) return refuse('AuCompose compiler demand requires the shared runtime composition inquiry.');
    for (const { context, controller, resource } of occurrences) {
      if (context.componentBinding != null || context.templateBinding != null
        || context.staticComponent !== literals.component || context.staticTemplate !== literals.template) {
        return refuse('AuCompose authored and compiler-final component/template inputs do not share literal authority.', [context.productHandle]);
      }
      if (resource.runtimeAnalysis.controllerBind.sourceOperations.some((operation) =>
        operation.targetControllerProductHandle === context.hostControllerProductHandle,
      )) return refuse('AuCompose controller or component escapes through a runtime reference binding.', [context.productHandle]);
      if (context.loadState !== CompositionLoadStateKind.Ready) {
        return refuse('AuCompose input loading is not closed for this composition occurrence.', [context.productHandle]);
      }
      if (literals.component == null) {
        if (literals.template != null || controller.componentResolutionKind !== CompositionComponentResolutionKind.TemplateOnly) {
          return refuse('AuCompose template-only markup still requires runtime template compilation.', [context.productHandle]);
        }
        continue; // The existing compiler interface already closes null-template synthetic definitions.
      }
      if (context.componentInputValueStateKind !== CompositionInputValueStateKind.Closed
        || controller.componentResolutionKind !== CompositionComponentResolutionKind.StaticValue
        || controller.resolvedComponents.length !== 1) {
        return refuse('AuCompose literal resource name did not resolve to one closed custom-element definition.', [context.productHandle]);
      }
      const candidate = controller.resolvedComponents[0]!;
      if (candidate.compiledTemplateProductHandle == null
        || !this.compiledTemplates.get(candidate.definitionProductHandle)?.has(candidate.compiledTemplateProductHandle)) {
        return refuse('AuCompose selected a definition outside the exact emitted compiler cohort.', [context.productHandle, candidate.definitionProductHandle]);
      }
    }
    return null;
  }
}

function compositionLiteralInputs(
  input: RuntimeRegistrationRequirementCompilerInput,
  instruction: HydrateElementInstruction,
): { component: string | null; template: string | null } | null {
  const instructions = new Map(input.family?.instructions.map((entry) => [entry.productHandle, entry]));
  const literals: { component: string | null; template: string | null } = { component: null, template: null };
  for (const handle of instruction.bindableInstructionProductHandles) {
    const child = instructions.get(handle);
    if (child instanceof SetPropertyInstruction) {
      if (child.targetProperty === 'component' || child.targetProperty === 'template') literals[child.targetProperty] = child.value;
    } else if (child instanceof PropertyBindingInstruction) {
      if (child.targetProperty === 'component' || child.targetProperty === 'template') return null;
    } else if (child instanceof InterpolationInstruction) {
      if (child.target === 'component' || child.target === 'template') return null;
    } else return null;
  }
  return literals;
}
