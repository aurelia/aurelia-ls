import type { ExpressionType } from '../expression/ast.js';
import { hasInterpolationStart } from '../expression/expression-boundary-scanner.js';
import type { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { AttributeClassificationKind } from './attribute-syntax.js';
import { TemplateValueSiteKind } from './value-site.js';

/**
 * Downstream binding policy for an empty custom-attribute or template-controller primary value.
 *
 * Aurelia's compiler currently selects this per compilation path: ordinary element compilation emits no primary
 * binding, while spread compilation preserves the empty literal. Value-site selection records that distinction but
 * does not execute a binding command or publish an instruction.
 */
export const enum TemplateAttributeEmptyValueBindingPolicy {
  BindPrimary = 'bind-primary',
  NoBinding = 'no-binding',
}

/** Product-free facts needed to select an attribute value site. */
export interface TemplateAttributeValueSiteSelectionInput {
  readonly classificationKind: AttributeClassificationKind;
  readonly resourceKind: ResourceDefinitionKind | null;
  /** Full reached definition retained by classification; null outside a resolved custom-attribute lane. */
  readonly definition: CustomAttributeDefinition | null;
  readonly rawValue: string;
  readonly target: string;
  readonly hasBindingCommand: boolean;
  readonly emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy;
}

/** Product-free value-site shape selected before authored or live ownership is attached. */
export class TemplateAttributeValueSiteSelection {
  constructor(
    readonly siteKind: TemplateValueSiteKind,
    readonly rawValue: string,
    readonly entryFamily: ExpressionType | null,
    /** Explicit only for an empty command-free custom-attribute or template-controller primary value. */
    readonly emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy | null,
  ) {}
}

/** Selects Aurelia's attribute value-site shape without requiring materialized syntax or classification products. */
export function selectTemplateAttributeValueSite(
  input: TemplateAttributeValueSiteSelectionInput,
): TemplateAttributeValueSiteSelection | null {
  if (input.hasBindingCommand) {
    return new TemplateAttributeValueSiteSelection(
      TemplateValueSiteKind.BindingCommandValue,
      input.rawValue,
      null,
      null,
    );
  }

  switch (input.classificationKind) {
    case AttributeClassificationKind.Plain:
      return hasInterpolationStart(input.rawValue)
        ? interpolationSelection(TemplateValueSiteKind.PlainAttributeInterpolation, input.rawValue)
        : null;
    case AttributeClassificationKind.Bindable:
      return interpolationSelection(TemplateValueSiteKind.BindableValue, input.rawValue);
    case AttributeClassificationKind.CustomAttribute:
    case AttributeClassificationKind.TemplateController: {
      if (input.definition != null && !input.definition.noMultiBindings && hasInlineBindings(input.rawValue)) {
        return new TemplateAttributeValueSiteSelection(
          TemplateValueSiteKind.MultiBindingValue,
          input.rawValue,
          null,
          null,
        );
      }
      return new TemplateAttributeValueSiteSelection(
        input.resourceKind === ResourceDefinitionKind.TemplateController
          ? TemplateValueSiteKind.TemplateControllerValue
          : TemplateValueSiteKind.CustomAttributeValue,
        input.rawValue,
        'Interpolation',
        input.rawValue.length === 0 ? input.emptyValueBindingPolicy : null,
      );
    }
    case AttributeClassificationKind.Captured:
      return interpolationSelection(TemplateValueSiteKind.CapturedValue, input.rawValue);
    case AttributeClassificationKind.Spread:
      return input.target === '...$attrs'
        ? null
        : new TemplateAttributeValueSiteSelection(
          TemplateValueSiteKind.SpreadValue,
          input.target === '...$bindables' ? input.rawValue : input.target.slice(3),
          'IsProperty',
          null,
        );
    case AttributeClassificationKind.BindingCommand:
    case AttributeClassificationKind.CompilerControl:
    case AttributeClassificationKind.Ref:
    case AttributeClassificationKind.Open:
      return null;
  }
}

/**
 * Select the secondary value lane owned by one command-free inline custom-attribute segment.
 * This deliberately does not recurse through primary custom-attribute multi-binding selection.
 */
export function selectTemplateMultiBindingSegmentValueSite(
  rawValue: string,
): TemplateAttributeValueSiteSelection {
  return new TemplateAttributeValueSiteSelection(
    TemplateValueSiteKind.CustomAttributeValue,
    rawValue,
    'Interpolation',
    null,
  );
}

function interpolationSelection(
  siteKind: TemplateValueSiteKind,
  rawValue: string,
): TemplateAttributeValueSiteSelection {
  return new TemplateAttributeValueSiteSelection(siteKind, rawValue, 'Interpolation', null);
}

function hasInlineBindings(rawValue: string): boolean {
  const len = rawValue.length;
  let i = 0;
  while (i < len) {
    const ch = rawValue.charCodeAt(i);
    if (ch === 92) {
      ++i;
    } else if (ch === 58) {
      return true;
    } else if (ch === 36 && rawValue.charCodeAt(i + 1) === 123) {
      return false;
    }
    ++i;
  }
  return false;
}
