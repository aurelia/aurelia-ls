import ts from 'typescript';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  readReferenceName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  RegistrationAdmissionKind,
} from './registration-admission.js';
import {
  REGISTRATION_FACTORY_SHAPES,
  type RegistrationFactoryShape,
} from './registration-factory-shapes.js';
import {
  readDeferredRegistryParameters,
  readRegistrationFactoryNameFromCall,
  readRequiredRegistrationFactoryArgument,
  type RegistrationFactoryImportedBindings,
} from './registration-factory-arguments.js';
import type { RegistrationEmissionContext } from './registration-kernel-emitter.js';
import {
  RegistrationAdmissionObservation,
  RegistrationCarrierKind,
  RegistrationKeyObservation,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from './registration-observation.js';

const AURELIA_REGISTRATION_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

type RegistrationFactoryBindings = RegistrationFactoryImportedBindings;

interface RegistrationFactoryCallShape {
  readonly factoryName: string;
  readonly shape: RegistrationFactoryShape;
}

interface RegistrationFactoryArgumentRead {
  readonly keyArgument: ts.Expression | null;
  readonly valueArgument: ts.Expression | null;
  readonly openSeams: RegistrationRecognitionOpen[];
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
  const callShape = readRegistrationFactoryCallShape(call, bindings);
  if (callShape == null) {
    return null;
  }
  const { factoryName, shape } = callShape;
  const argumentsRead = readRegistrationFactoryArguments(call, factoryName, shape);

  const registryParameters = factoryName === 'defer'
    ? readDeferredRegistryParameters(call, isClassDeclarationExpression)
    : [];

  return new RegistrationAdmissionObservation(
    RegistrationCarrierKind.RegistrationFactoryCall,
    RegistrationAdmissionKind.RegistrationFactory,
    shape.strategy,
    shape.keyRole,
    call,
    registrationKeyObservation(argumentsRead.keyArgument),
    registrationValueObservation(argumentsRead.valueArgument, shape),
    registryParameters,
    argumentsRead.openSeams,
  );
}

function readRegistrationFactoryCallShape(
  call: ts.CallExpression,
  bindings: RegistrationFactoryBindings,
): RegistrationFactoryCallShape | null {
  const factoryName = readRegistrationFactoryNameFromCall(call, bindings);
  if (factoryName == null) {
    return null;
  }
  const shape = REGISTRATION_FACTORY_SHAPES.get(factoryName);
  return shape == null ? null : { factoryName, shape };
}

function readRegistrationFactoryArguments(
  call: ts.CallExpression,
  factoryName: string,
  shape: RegistrationFactoryShape,
): RegistrationFactoryArgumentRead {
  const openSeams: RegistrationRecognitionOpen[] = [];
  const keyArgument = readRequiredRegistrationFactoryArgument(
    call,
    shape.keyArgumentIndex,
    KernelVocabulary.Registration.OpenKeyExpression.key,
    'Registration factory call did not expose a target key.',
    openSeams,
  );
  const valueArgument = shape.value == null
    ? null
    : readRequiredRegistrationFactoryArgument(call, shape.value.argumentIndex, shape.value.missingOpenKind, `Registration.${factoryName}(...) did not expose a registered value.`, openSeams);
  openSeams.push(...spreadArgumentOpenSeams(call, factoryName));
  return { keyArgument, valueArgument, openSeams };
}

function spreadArgumentOpenSeams(
  call: ts.CallExpression,
  factoryName: string,
): readonly RegistrationRecognitionOpen[] {
  return call.arguments.flatMap((argument) =>
    ts.isSpreadElement(argument)
      ? [new RegistrationRecognitionOpen(
        KernelVocabulary.Registration.OpenSpread.key,
        `Registration.${factoryName}(...) contains a spread argument that registration recognition cannot close.`,
        argument,
      )]
      : []
  );
}

function registrationKeyObservation(argument: ts.Expression | null): RegistrationKeyObservation | null {
  return argument == null
    ? null
    : new RegistrationKeyObservation(readReferenceName(argument), argument);
}

function registrationValueObservation(
  argument: ts.Expression | null,
  shape: RegistrationFactoryShape,
): RegistrationValueObservation | null {
  return argument == null || shape.value == null
    ? null
    : new RegistrationValueObservation(
      shape.value.valueKind,
      readReferenceName(argument),
      argument,
      isClassDeclarationExpression(argument),
    );
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

function isClassDeclarationExpression(
  expression: ts.Expression,
): boolean {
  return ts.isClassExpression(unwrapExpression(expression));
}
