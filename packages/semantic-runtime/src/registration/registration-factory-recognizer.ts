import ts from 'typescript';
import { KernelVocabulary, type OpenSeamKindKey } from '../kernel/vocabulary.js';
import {
  readReferenceName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  RegistrationAdmissionKind,
} from './registration-admission.js';
import {
  REGISTRATION_FACTORY_SHAPES,
} from './registration-factory-shapes.js';
import type { RegistrationEmissionContext } from './registration-kernel-emitter.js';
import {
  RegistrationAdmissionObservation,
  RegistrationCarrierKind,
  RegistrationKeyObservation,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from './registration-observation.js';
import { RegistrationValueKind } from './registration-reference.js';

const AURELIA_REGISTRATION_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

interface RegistrationFactoryBindings {
  readonly identifiers: ReadonlySet<string>;
  readonly namespaces: ReadonlySet<string>;
}

/** Recognizes Aurelia `Registration.*(...)` factory call source shapes. */
export class RegistrationFactoryRecognizer {
  recognize(context: RegistrationEmissionContext): readonly RegistrationAdmissionObservation[] {
    const bindings = readRegistrationFactoryBindings(context.sourceFile);
    if (bindings.identifiers.size === 0 && bindings.namespaces.size === 0) {
      return [];
    }

    const observations: RegistrationAdmissionObservation[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const observation = recognizeRegistrationFactoryCall(node, bindings);
        if (observation != null) {
          observations.push(observation);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(context.sourceFile);
    return observations;
  }
}

function recognizeRegistrationFactoryCall(
  call: ts.CallExpression,
  bindings: RegistrationFactoryBindings,
): RegistrationAdmissionObservation | null {
  const factoryName = readRegistrationFactoryName(call, bindings);
  if (factoryName == null) {
    return null;
  }
  const shape = REGISTRATION_FACTORY_SHAPES.get(factoryName);
  if (shape == null) {
    return null;
  }

  const openSeams: RegistrationRecognitionOpen[] = [];
  const keyArgument = readRequiredArgument(
    call,
    shape.keyArgumentIndex,
    KernelVocabulary.Registration.OpenKeyExpression.key,
    'Registration factory call did not expose a target key.',
    openSeams,
  );
  const valueArgument = shape.value == null
    ? null
    : readRequiredArgument(call, shape.value.argumentIndex, shape.value.missingOpenKind, `Registration.${factoryName}(...) did not expose a registered value.`, openSeams);

  for (const argument of call.arguments) {
    if (ts.isSpreadElement(argument)) {
      openSeams.push(new RegistrationRecognitionOpen(
        KernelVocabulary.Registration.OpenSpread.key,
        `Registration.${factoryName}(...) contains a spread argument that registration recognition cannot close.`,
        argument,
      ));
    }
  }

  const targetKey = keyArgument == null
    ? null
    : new RegistrationKeyObservation(readReferenceName(keyArgument), keyArgument);
  const registeredValue = valueArgument == null || shape.value == null
    ? null
    : new RegistrationValueObservation(
      shape.value.valueKind,
      readReferenceName(valueArgument),
      valueArgument,
      isDeclarationExpression(valueArgument),
    );
  const registryParameters = factoryName === 'defer'
    ? readDeferredRegistryParameters(call)
    : [];

  return new RegistrationAdmissionObservation(
    RegistrationCarrierKind.RegistrationFactoryCall,
    RegistrationAdmissionKind.RegistrationFactory,
    shape.strategy,
    shape.keyRole,
    call,
    targetKey,
    registeredValue,
    registryParameters,
    openSeams,
  );
}

function readRequiredArgument(
  call: ts.CallExpression,
  index: number,
  openKind: OpenSeamKindKey,
  missingSummary: string,
  openSeams: RegistrationRecognitionOpen[],
): ts.Expression | null {
  const argument = call.arguments[index] ?? null;
  if (argument == null || ts.isSpreadElement(argument)) {
    openSeams.push(new RegistrationRecognitionOpen(openKind, missingSummary, argument ?? call));
    return null;
  }
  return argument;
}

function readDeferredRegistryParameters(
  call: ts.CallExpression,
): readonly RegistrationValueObservation[] {
  return call.arguments.slice(1).map((argument) => new RegistrationValueObservation(
    RegistrationValueKind.Unknown,
    readReferenceName(argument),
    argument,
    isDeclarationExpression(argument),
  ));
}

function readRegistrationFactoryName(
  call: ts.CallExpression,
  bindings: RegistrationFactoryBindings,
): string | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const receiver = unwrapExpression(expression.expression);
  if (ts.isIdentifier(receiver) && bindings.identifiers.has(receiver.text)) {
    return expression.name.text;
  }
  if (
    ts.isPropertyAccessExpression(receiver)
    && receiver.name.text === 'Registration'
    && ts.isIdentifier(unwrapExpression(receiver.expression))
    && bindings.namespaces.has((unwrapExpression(receiver.expression) as ts.Identifier).text)
  ) {
    return expression.name.text;
  }
  return null;
}

function readRegistrationFactoryBindings(
  sourceFile: ts.SourceFile,
): RegistrationFactoryBindings {
  const identifiers = new Set<string>();
  const namespaces = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (!AURELIA_REGISTRATION_MODULES.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      namespaces.add(namedBindings.name.text);
      continue;
    }
    for (const element of namedBindings.elements) {
      if ((element.propertyName ?? element.name).text === 'Registration') {
        identifiers.add(element.name.text);
      }
    }
  }

  return { identifiers, namespaces };
}

function isDeclarationExpression(
  expression: ts.Expression,
): boolean {
  return ts.isClassExpression(unwrapExpression(expression));
}
