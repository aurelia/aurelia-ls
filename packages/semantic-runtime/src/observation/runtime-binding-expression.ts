import type { BindingScope } from '../configuration/scope.js';
import type { ProductHandle } from '../kernel/handles.js';
import {
  AttributeBinding,
  ContentBinding,
  InterpolationBinding,
  LetBinding,
  ListenerBinding,
  PropertyBinding,
  RefBinding,
  SpreadValueBinding,
  StateBinding,
  StateDispatchBinding,
  TranslationBinding,
  RuntimeBindingKind,
  type RuntimeBinding,
} from '../template/runtime-binding.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type {
  TemplateInstructionScopeApplication,
} from '../template/template-controller-scope-materializer.js';

export type RuntimeExpressionBinding =
  | PropertyBinding
  | AttributeBinding
  | LetBinding
  | ListenerBinding
  | InterpolationBinding
  | ContentBinding
  | RefBinding
  | SpreadValueBinding
  | TranslationBinding
  | StateBinding
  | StateDispatchBinding;

export type RuntimeValueChannelBinding = Exclude<RuntimeExpressionBinding, TranslationBinding>;

export type RuntimeDataFlowBinding = RuntimeValueChannelBinding | TranslationBinding;

export function isRuntimeExpressionBinding(
  binding: RuntimeBinding,
): binding is RuntimeExpressionBinding {
  return binding instanceof PropertyBinding
    || binding instanceof AttributeBinding
    || binding instanceof LetBinding
    || binding instanceof ListenerBinding
    || binding instanceof InterpolationBinding
    || binding instanceof ContentBinding
    || binding instanceof RefBinding
    || binding instanceof SpreadValueBinding
    || binding instanceof TranslationBinding
    || binding instanceof StateBinding
    || binding instanceof StateDispatchBinding;
}

/** Narrows expression bindings to generic binding value-channel owners; i18n TranslationBinding has its own lifecycle lane. */
export function isRuntimeValueChannelBinding(
  binding: RuntimeBinding,
): binding is RuntimeValueChannelBinding {
  return isRuntimeExpressionBinding(binding) && !(binding instanceof TranslationBinding);
}

/** Narrows expression bindings to data-flow owners; i18n parameter bindings are source-only flow while keys stay lifecycle-owned. */
export function isRuntimeDataFlowBinding(
  binding: RuntimeBinding,
): binding is RuntimeDataFlowBinding {
  return isRuntimeValueChannelBinding(binding)
    || (binding instanceof TranslationBinding && binding.bindingKind === RuntimeBindingKind.TranslationParameters);
}

/** Identifies binding data-flow rows that expose source expression reads without generic accessor/observer targets. */
export function isRuntimeSourceOnlyDataFlowBinding(binding: RuntimeDataFlowBinding): boolean {
  return binding instanceof TranslationBinding && binding.bindingKind === RuntimeBindingKind.TranslationParameters;
}

export function expressionProductHandleForBinding(
  binding: RuntimeExpressionBinding,
): ProductHandle | null {
  // Interpolation lowering currently stores the interpolation parse product, not one product per hole.
  if (binding instanceof InterpolationBinding) {
    return binding.expressionProductHandles[0] ?? null;
  }
  return binding.expressionProductHandle;
}

/**
 * Resolves the runtime Scope for a binding expression without collapsing recursive render contexts.
 *
 * Instruction products are definition-level identities. Recursive rendering can spend the same instruction under
 * several runtime controllers, so downstream observation/data-flow phases must use the binding's render context before
 * falling back to a definition-level unambiguous scope.
 */
export class RuntimeInstructionScopeLookup {
  private readonly applicationsByInstruction = new Map<ProductHandle, TemplateInstructionScopeApplication[]>();

  constructor(
    applications: readonly TemplateInstructionScopeApplication[],
  ) {
    for (const application of applications) {
      const instructionApplications = this.applicationsByInstruction.get(application.instructionProductHandle) ?? [];
      instructionApplications.push(application);
      this.applicationsByInstruction.set(application.instructionProductHandle, instructionApplications);
    }
  }

  scopeForBinding(
    runtimeBindings: RuntimeRenderingEmission,
    binding: RuntimeBinding,
  ): BindingScope | null {
    const renderContext = runtimeBindings.readRenderContextForBinding(binding.productHandle);
    return this.scopeForInstruction(
      binding.instructionProductHandle,
      renderContext?.renderingController.productHandle ?? null,
    );
  }

  scopeForInstruction(
    instructionProductHandle: ProductHandle,
    controllerProductHandle: ProductHandle | null,
  ): BindingScope | null {
    const applications = this.applicationsByInstruction.get(instructionProductHandle) ?? [];
    if (controllerProductHandle != null) {
      for (let index = applications.length - 1; index >= 0; index--) {
        const application = applications[index]!;
        if (application.controllerProductHandle === controllerProductHandle) {
          return application.scope;
        }
      }
    }
    return unambiguousApplicationScope(applications);
  }
}

export function instructionScopeLookup(
  applications: readonly TemplateInstructionScopeApplication[],
): RuntimeInstructionScopeLookup {
  return new RuntimeInstructionScopeLookup(applications);
}

function unambiguousApplicationScope(
  applications: readonly TemplateInstructionScopeApplication[],
): BindingScope | null {
  let scope: BindingScope | null = null;
  for (const application of applications) {
    if (scope == null) {
      scope = application.scope;
      continue;
    }
    if (scope.productHandle !== application.scope.productHandle) {
      return null;
    }
  }
  return scope;
}
