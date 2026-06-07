import type { ExpressionType } from '../expression/ast.js';
import {
  builtInBindingCommandExpressionType,
  findUniqueBuiltInBindingCommandByName,
} from '../template/built-in-syntax.js';
import type { AppBuilderPartDescriptor } from './part-catalog.js';
import {
  AppBuilderPartSlotKind,
  AppBuilderPartSlotValueLanguage,
  appBuilderPartSlotDescriptor,
  type AppBuilderPartSlotDescriptor,
} from './part-application.js';

/** Source-lowering slot contract after part-specific Aurelia syntax has selected the parser entry family. */
export interface AppBuilderPartSlotExpectation extends AppBuilderPartSlotDescriptor {
  /** The base catalog descriptor language was refined by this part's owning framework syntax. */
  readonly refinedByPartSyntax: boolean;
}

/** Resolve the source grammar expected for a slot in the context of one app-builder part. */
export function appBuilderPartSlotExpectation(
  part: AppBuilderPartDescriptor,
  slotKind: AppBuilderPartSlotKind,
): AppBuilderPartSlotExpectation {
  const base = appBuilderPartSlotDescriptor(slotKind);
  const syntaxLanguage = appBuilderCommandValueSlotLanguage(part, slotKind);
  if (syntaxLanguage == null || syntaxLanguage === base.valueLanguage) {
    return {
      ...base,
      refinedByPartSyntax: false,
    };
  }
  return {
    ...base,
    valueLanguage: syntaxLanguage,
    summary: `${base.summary} This part's '${part.syntaxCommandName}' binding command parses the value as ${syntaxLanguage}.`,
    refinedByPartSyntax: true,
  };
}

/** Resolve all required slot contracts for one app-builder part. */
export function appBuilderPartRequiredSlotExpectations(
  part: AppBuilderPartDescriptor,
): readonly AppBuilderPartSlotExpectation[] {
  return part.requiredSlotKinds.map((slotKind) => appBuilderPartSlotExpectation(part, slotKind));
}

/** Resolve all optional slot contracts for one app-builder part. */
export function appBuilderPartOptionalSlotExpectations(
  part: AppBuilderPartDescriptor,
): readonly AppBuilderPartSlotExpectation[] {
  return part.optionalSlotKinds.map((slotKind) => appBuilderPartSlotExpectation(part, slotKind));
}

function appBuilderCommandValueSlotLanguage(
  part: AppBuilderPartDescriptor,
  slotKind: AppBuilderPartSlotKind,
): AppBuilderPartSlotValueLanguage | null {
  if (!slotCanCarryBindingCommandValue(slotKind) || part.syntaxCommandName == null) {
    return null;
  }
  const command = findUniqueBuiltInBindingCommandByName(part.syntaxCommandName);
  const expressionType = command == null ? null : builtInBindingCommandExpressionType(command);
  return expressionType == null ? null : appBuilderExpressionTypeValueLanguage(expressionType);
}

function slotCanCarryBindingCommandValue(
  slotKind: AppBuilderPartSlotKind,
): boolean {
  switch (slotKind) {
    case AppBuilderPartSlotKind.BindingExpression:
    case AppBuilderPartSlotKind.HandlerExpression:
    case AppBuilderPartSlotKind.OptionValueExpression:
    case AppBuilderPartSlotKind.MatcherExpression:
    case AppBuilderPartSlotKind.RouteParamsExpression:
    case AppBuilderPartSlotKind.RouteContextExpression:
    case AppBuilderPartSlotKind.RouteActiveExpression:
    case AppBuilderPartSlotKind.CompositionComponentExpression:
    case AppBuilderPartSlotKind.CompositionTemplateExpression:
    case AppBuilderPartSlotKind.CompositionModelExpression:
    case AppBuilderPartSlotKind.ValidationErrorsExpression:
    case AppBuilderPartSlotKind.ValidationControllerExpression:
    case AppBuilderPartSlotKind.TranslationParametersExpression:
      return true;
    default:
      return false;
  }
}

function appBuilderExpressionTypeValueLanguage(
  expressionType: ExpressionType,
): AppBuilderPartSlotValueLanguage | null {
  switch (expressionType) {
    case 'IsProperty':
      return AppBuilderPartSlotValueLanguage.AureliaBindingExpression;
    case 'IsFunction':
      return AppBuilderPartSlotValueLanguage.AureliaFunctionExpression;
    case 'IsIterator':
      return AppBuilderPartSlotValueLanguage.AureliaIterableValueExpression;
    case 'Interpolation':
    case 'IsCustom':
      return null;
  }
}
