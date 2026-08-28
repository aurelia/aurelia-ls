import { normalizeLetBindingTarget } from './attribute-mapper.js';

export const enum TemplateCompilerLetAttributeKind {
  ToBindingContext = 'to-binding-context',
  PropertyBinding = 'property-binding',
  InterpolationOrLiteral = 'interpolation-or-literal',
  InvalidCommand = 'invalid-command',
}

/** Representation-neutral decision for one reached `<let>` attribute in JIT order. */
export class TemplateCompilerLetAttributeDecision {
  constructor(
    readonly decisionKind: TemplateCompilerLetAttributeKind,
    readonly rawName: string,
    readonly rawValue: string,
    readonly target: string | null,
    readonly command: string | null,
  ) {
    const emitsBinding = decisionKind === TemplateCompilerLetAttributeKind.PropertyBinding
      || decisionKind === TemplateCompilerLetAttributeKind.InterpolationOrLiteral;
    if (emitsBinding !== (target != null)) {
      throw new Error('Let attribute decision lost binding target ownership.');
    }
  }
}

export function decideTemplateCompilerLetAttribute(
  rawName: string,
  rawValue: string,
  parsedTarget: string,
  command: string | null,
): TemplateCompilerLetAttributeDecision {
  if (rawName === 'to-binding-context') {
    return new TemplateCompilerLetAttributeDecision(
      TemplateCompilerLetAttributeKind.ToBindingContext,
      rawName,
      rawValue,
      null,
      command,
    );
  }
  if (command != null && command !== 'bind') {
    return new TemplateCompilerLetAttributeDecision(
      TemplateCompilerLetAttributeKind.InvalidCommand,
      rawName,
      rawValue,
      null,
      command,
    );
  }
  return new TemplateCompilerLetAttributeDecision(
    command === 'bind'
      ? TemplateCompilerLetAttributeKind.PropertyBinding
      : TemplateCompilerLetAttributeKind.InterpolationOrLiteral,
    rawName,
    rawValue,
    normalizeLetBindingTarget(parsedTarget),
    command,
  );
}
