import {
  StaticCallableTruthinessKind,
  type StaticCallableTruthinessResult,
} from '../evaluation/function-execution.js';
import {
  CustomElementCaptureKind,
  type CustomElementCaptureDefinition,
} from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { TemplateCompilableResourceDefinition } from '../resources/resource-definition.js';
import type { TemplateAttributeMapperNode } from './attribute-mapper.js';
import {
  AttributeClassificationKind,
  AttributeSyntaxKind,
} from './attribute-syntax.js';
import type { BindingCommandExecutableReference } from './binding-command-reference.js';
import {
  TemplateCompilerIssueKind,
} from './compiler-issue.js';
import { TemplateCompilerFrameworkErrorCode } from './framework-error-code.js';
import type {
  TemplateCompilerObservedValue,
  TemplateCompilerReadView,
} from './compiler-read-view.js';
import { TemplateCompilerScopeClosureState } from './compiler-read-view.js';
import type {
  TemplateBindablesInfo,
  TemplateResolvedResource,
} from './compiler-world.js';
import type {
  TemplateBindableReference,
  TemplateVisibleResource,
} from './compiler-world-reference.js';
import type { BindingCommandExecutable } from './binding-command-execution.js';
import { isTemplateSpecialAttributeName } from './special-attribute-source.js';

/** Product-free syntax facts consumed by the attribute-classification decision law. */
export interface AttributeClassificationDecisionSyntax {
  readonly syntaxKind: AttributeSyntaxKind;
  readonly rawName: string;
  readonly runtimeRawName: string;
  readonly target: string;
  readonly command: string | null;
}

/**
 * Reached element state consumed by attribute classification.
 *
 * `lookupName` is the already-resolved element lookup identity, including `as-element` when present. The remaining
 * shape is deliberately AttrMapper-compatible so one live attribute site can travel into later lowering without
 * being rebound to an authored HTML product.
 */
export interface AttributeClassificationDecisionOwner extends TemplateAttributeMapperNode {
  readonly lookupName: string;
  /** False for root surrogates, whose JIT classification explicitly suppresses custom-element features. */
  readonly elementDefinitionEligible?: boolean;
}

/** Invalid classification outcome retained for the publication layer to turn into a compiler issue. */
export class AttributeClassificationDecisionIssue {
  constructor(
    readonly issueKind: TemplateCompilerIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: string | null,
  ) {}
}

/** Exact compiler reads whose values authorized one classification decision. */
export class AttributeClassificationDecisionReadSet {
  constructor(
    readonly bindingCommand: TemplateCompilerObservedValue<BindingCommandExecutable | null> | null,
    readonly element: TemplateCompilerObservedValue<TemplateResolvedResource | null> | null,
    readonly attribute: TemplateCompilerObservedValue<TemplateResolvedResource | null> | null,
    readonly bindables: readonly TemplateCompilerObservedValue<TemplateBindablesInfo>[],
    readonly capturePredicate: TemplateCompilerObservedValue<StaticCallableTruthinessResult> | null,
  ) {}
}

/** Product-free result of applying Aurelia's attribute-classification priority ladder at one reached site. */
export class AttributeClassificationDecision {
  constructor(
    readonly classificationKind: AttributeClassificationKind,
    readonly resourceKind: ResourceDefinitionKind | null,
    readonly resource: TemplateVisibleResource | null,
    readonly bindingCommand: BindingCommandExecutableReference | null,
    readonly bindable: TemplateBindableReference | null,
    readonly issue: AttributeClassificationDecisionIssue | null = null,
    readonly openReason: string | null = null,
    readonly reads: AttributeClassificationDecisionReadSet = new AttributeClassificationDecisionReadSet(
      null,
      null,
      null,
      [],
      null,
    ),
  ) {}

  /** Full selected resource resolution retained from the exact read that authorized this decision. */
  get resolvedResource(): TemplateResolvedResource | null {
    switch (this.resourceKind) {
      case ResourceDefinitionKind.CustomElement:
        return this.reads.element?.value ?? null;
      case ResourceDefinitionKind.CustomAttribute:
      case ResourceDefinitionKind.TemplateController:
        return this.reads.attribute?.value ?? null;
      default:
        return null;
    }
  }

  /** Full selected definition, when compiler-world lookup closed over one. */
  get resolvedDefinition(): TemplateCompilableResourceDefinition | null {
    return this.resolvedResource?.definition ?? null;
  }
}

/** Apply Aurelia's exact attribute-classification priority ladder without materializing a kernel product. */
export function decideAttributeClassification(
  syntax: AttributeClassificationDecisionSyntax,
  owner: AttributeClassificationDecisionOwner,
  reads: TemplateCompilerReadView,
): AttributeClassificationDecision {
  return new AttributeClassificationDecisionExecution(syntax, owner, reads).execute();
}

class AttributeClassificationDecisionExecution {
  private bindingCommandRead: TemplateCompilerObservedValue<BindingCommandExecutable | null> | null = null;
  private elementRead: TemplateCompilerObservedValue<TemplateResolvedResource | null> | null = null;
  private attributeRead: TemplateCompilerObservedValue<TemplateResolvedResource | null> | null = null;
  private readonly bindableReads: TemplateCompilerObservedValue<TemplateBindablesInfo>[] = [];
  private capturePredicateRead: TemplateCompilerObservedValue<StaticCallableTruthinessResult> | null = null;

  constructor(
    private readonly syntax: AttributeClassificationDecisionSyntax,
    private readonly owner: AttributeClassificationDecisionOwner,
    private readonly reads: TemplateCompilerReadView,
  ) {}

  execute(): AttributeClassificationDecision {
    const rawName = this.syntax.runtimeRawName;
    const target = this.syntax.target;

    if (isTemplateSpecialAttributeName(rawName)) {
      return this.decision(AttributeClassificationKind.CompilerControl, null, null, null, null);
    }
    if (this.syntax.syntaxKind === AttributeSyntaxKind.Open) {
      return this.openDecision();
    }

    const commandName = this.syntax.command;
    this.bindingCommandRead = commandName == null ? null : this.reads.readBindingCommand(commandName);
    const bindingCommand = this.bindingCommandRead?.value?.toReference() ?? null;
    if (commandName != null && bindingCommand == null) {
      const commandObservation = this.bindingCommandRead?.observation;
      if (
        commandObservation?.closure.state === TemplateCompilerScopeClosureState.Closed
        && commandObservation.validate().isCurrent
      ) {
        const issue = unknownBindingCommandDecisionIssue(commandName);
        return this.invalidDecision(issue.issueKind, issue.message, issue.frameworkErrorCode);
      }
      return this.openDecision(
        null,
        `Binding command '${commandName}' is absent, but compiler-scope closure does not prove current absence.`,
      );
    }

    this.elementRead = this.owner.elementDefinitionEligible === false
      ? null
      : this.reads.readElement(this.owner.lookupName);
    const elementResolution = this.elementRead?.value ?? null;
    const elementDefinition = elementResolution?.definition?.type === ResourceDefinitionKind.CustomElement
      ? elementResolution.definition
      : null;

    const captureDecision = elementDefinition == null || elementResolution == null
      ? null
      : this.classifyCapture(elementDefinition.capture, elementResolution, bindingCommand != null);
    if (captureDecision != null) {
      return captureDecision;
    }

    if (target === '...$attrs') {
      return this.decision(AttributeClassificationKind.Spread, null, null, bindingCommand, null);
    }

    if (bindingCommand != null && this.bindingCommandRead?.value?.ignoreAttr === true) {
      return this.decision(AttributeClassificationKind.BindingCommand, null, null, bindingCommand, null);
    }

    if (target.startsWith('...')) {
      return elementDefinition != null && target.slice(3) !== '$element'
        ? this.decision(
          AttributeClassificationKind.Spread,
          ResourceDefinitionKind.CustomElement,
          elementResolution?.resource ?? null,
          bindingCommand,
          null,
        )
        : this.invalidDecision(
          TemplateCompilerIssueKind.ReservedSpreadSyntax,
          `Spreading syntax "...xxx" is reserved. Encountered "${this.syntax.target}".`,
          TemplateCompilerFrameworkErrorCode.CompilerNoReservedSpreadSyntax,
        );
    }

    if (elementDefinition != null) {
      const bindable = this.readBindables(elementDefinition).attr(target);
      if (bindable != null) {
        return this.decision(
          AttributeClassificationKind.Bindable,
          ResourceDefinitionKind.CustomElement,
          elementResolution?.resource ?? null,
          bindingCommand,
          bindable,
        );
      }
      if (target === '$bindables') {
        return bindingCommand == null
          ? this.openDecision()
          : this.decision(
            AttributeClassificationKind.Spread,
            ResourceDefinitionKind.CustomElement,
            elementResolution?.resource ?? null,
            bindingCommand,
            null,
          );
      }
    } else if (target === '$bindables') {
      return this.invalidDecision(
        TemplateCompilerIssueKind.ReservedBindableSyntax,
        `Usage of $bindables is only allowed on custom elements. Encountered "${this.syntax.rawName}".`,
        TemplateCompilerFrameworkErrorCode.CompilerNoReservedBindableSyntax,
      );
    }

    this.attributeRead = this.reads.readAttribute(target);
    const attributeResolution = this.attributeRead.value;
    if (attributeResolution?.resource != null) {
      const classificationKind = attributeResolution.resource.resourceKind === ResourceDefinitionKind.TemplateController
        ? AttributeClassificationKind.TemplateController
        : AttributeClassificationKind.CustomAttribute;
      const bindable = attributeResolution.definition?.type === ResourceDefinitionKind.CustomAttribute
        ? this.readBindables(attributeResolution.definition).primary
        : null;
      return this.decision(
        classificationKind,
        attributeResolution.resource.resourceKind,
        attributeResolution.resource,
        bindingCommand,
        bindable,
      );
    }

    return bindingCommand == null
      ? this.decision(AttributeClassificationKind.Plain, null, null, null, null)
      : this.decision(AttributeClassificationKind.BindingCommand, null, null, bindingCommand, null);
  }

  private classifyCapture(
    capture: CustomElementCaptureDefinition,
    elementResolution: TemplateResolvedResource,
    hasBindingCommand: boolean,
  ): AttributeClassificationDecision | null {
    if (capture.kind === CustomElementCaptureKind.None) {
      return null;
    }
    const elementDefinition = elementResolution.definition?.type === ResourceDefinitionKind.CustomElement
      ? elementResolution.definition
      : null;
    if (elementDefinition == null) {
      return null;
    }
    if (capture.kind === CustomElementCaptureKind.Predicate) {
      this.capturePredicateRead = this.reads.readCapturePredicate(elementDefinition, this.syntax.target);
      const result = this.capturePredicateRead.value;
      if (result.kind === StaticCallableTruthinessKind.False) {
        return null;
      }
      if (result.kind === StaticCallableTruthinessKind.Open) {
        return this.openDecision(
          null,
          `Custom-element capture predicate remained open. ${result.reason ?? ''}`.trim(),
        );
      }
    }
    const target = this.syntax.target;
    if (hasBindingCommand && this.bindingCommandRead?.value?.ignoreAttr === true) {
      return this.decision(
        AttributeClassificationKind.Captured,
        ResourceDefinitionKind.CustomElement,
        elementResolution.resource,
        null,
        null,
      );
    }
    const canCapture = target !== 'au-slot'
      && target !== 'slot'
      && (target.indexOf('...') === -1 || target === '...$attrs');
    if (!canCapture) {
      return null;
    }
    const bindable = this.readBindables(elementDefinition).attr(target);
    this.attributeRead = this.reads.readAttribute(target);
    const templateController = this.attributeRead.value;
    if (bindable != null || templateController?.resource?.resourceKind === ResourceDefinitionKind.TemplateController) {
      return null;
    }
    return this.decision(
      AttributeClassificationKind.Captured,
      ResourceDefinitionKind.CustomElement,
      elementResolution.resource,
      null,
      null,
    );
  }

  private readBindables(definition: TemplateCompilableResourceDefinition): TemplateBindablesInfo {
    const read = this.reads.readBindables(definition);
    this.bindableReads.push(read);
    return read.value;
  }

  private openDecision(
    bindingCommand: BindingCommandExecutableReference | null = null,
    openReason: string | null = null,
  ): AttributeClassificationDecision {
    return this.decision(
      AttributeClassificationKind.Open,
      null,
      null,
      bindingCommand,
      null,
      null,
      openReason,
    );
  }

  private invalidDecision(
    issueKind: TemplateCompilerIssueKind,
    message: string,
    frameworkErrorCode: string | null,
    bindingCommand: BindingCommandExecutableReference | null = null,
  ): AttributeClassificationDecision {
    return this.decision(
      AttributeClassificationKind.Open,
      null,
      null,
      bindingCommand,
      null,
      new AttributeClassificationDecisionIssue(issueKind, message, frameworkErrorCode),
    );
  }

  private decision(
    classificationKind: AttributeClassificationKind,
    resourceKind: ResourceDefinitionKind | null,
    resource: TemplateVisibleResource | null,
    bindingCommand: BindingCommandExecutableReference | null,
    bindable: TemplateBindableReference | null,
    issue: AttributeClassificationDecisionIssue | null = null,
    openReason: string | null = null,
  ): AttributeClassificationDecision {
    return new AttributeClassificationDecision(
      classificationKind,
      resourceKind,
      resource,
      bindingCommand,
      bindable,
      issue,
      openReason,
      new AttributeClassificationDecisionReadSet(
        this.bindingCommandRead,
        this.elementRead,
        this.attributeRead,
        this.bindableReads,
        this.capturePredicateRead,
      ),
    );
  }
}

/** Normalized compiler issue for a command name absent from a closed compiler world. */
export function unknownBindingCommandDecisionIssue(commandName: string): AttributeClassificationDecisionIssue {
  const help = removedV1BindingCommandHelp(commandName);
  return new AttributeClassificationDecisionIssue(
    TemplateCompilerIssueKind.UnknownBindingCommand,
    `Template compilation error: unknown binding command: "${commandName}".${help}`,
    TemplateCompilerFrameworkErrorCode.CompilerUnknownBindingCommand,
  );
}

function removedV1BindingCommandHelp(commandName: string): string {
  switch (commandName) {
    case 'delegate':
      return ' The ".delegate" binding command has been removed in v2.'
        + ' Binding command ".trigger" should be used instead.'
        + ' If you are migrating v1 application, install compat package'
        + ' to add back the ".delegate" binding command for ease of migration.';
    case 'call':
      return ' The ".call" binding command has been removed in v2.'
        + ' If you want to pass a callback that preserves the context of the function call,'
        + ' you can use lambda instead. Refer to lambda expression doc for more details.';
    default:
      return '';
  }
}
