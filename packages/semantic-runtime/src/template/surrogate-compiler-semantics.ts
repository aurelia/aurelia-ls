import { AttributeSyntaxKind } from './attribute-syntax.js';

export const enum TemplateCompilerSurrogateValidationOutcome {
  Valid = 'valid',
  Open = 'open',
  Refused = 'refused',
}

/** Shared JIT root-surrogate target validation without object-prototype membership hazards. */
export function isInvalidTemplateCompilerSurrogateTarget(target: string): boolean {
  switch (target.toLowerCase()) {
    case 'id':
    case 'name':
    case 'au-slot':
    case 'as-element':
      return true;
    default:
      return false;
  }
}

/** Validation-first decision shared by the live cursor event and its retained coherence proof. */
export function decideTemplateCompilerSurrogateValidation(
  scalarExact: boolean,
  parserCurrent: boolean,
  parserClosureClosed: boolean,
  syntaxKind: AttributeSyntaxKind,
  target: string,
): TemplateCompilerSurrogateValidationOutcome {
  if (!scalarExact || !parserCurrent || !parserClosureClosed || syntaxKind === AttributeSyntaxKind.Open) {
    return TemplateCompilerSurrogateValidationOutcome.Open;
  }
  return isInvalidTemplateCompilerSurrogateTarget(target)
    ? TemplateCompilerSurrogateValidationOutcome.Refused
    : TemplateCompilerSurrogateValidationOutcome.Valid;
}
