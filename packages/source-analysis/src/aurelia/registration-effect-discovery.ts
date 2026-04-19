import * as ts from 'typescript';

import type { PackageExportsSummary } from '../exports-contract.js';
import {
  detectApiCall,
  detectApiExpression,
} from './api-detection.js';
import type {
  ApiDetection,
} from './api-detection-contract.js';
import {
  collectDiInterfaceExportsFromContext,
} from './di-interface-discovery.js';
import type { PackageRef, SymbolLocation } from './surface-types.js';
import {
  buildRegistrationFromCall,
  getRegistrationPrimaryExpression,
} from './registration-shape.js';
import type {
  RegistrationEffectRecord,
  RegistrationEffectLocality,
  RegistrationSurfaceOwner,
} from './registration-effect-contract.js';
import {
  collectPackageSourceFiles,
  createPackageProgram,
  getModuleSymbol,
  getSourceFile,
  hasExportModifier,
  identifierText,
  isStaticNamedMember,
  lineOfNode,
  toRepoRelative,
  unwrapExpression,
} from './ts-analysis-utils.js';
import {
  createLensContext,
} from './lens-context.js';

export interface CollectRegistrationEffectsOptions {
  readonly repoPath: string;
  readonly packageNames?: readonly string[] | null;
}

type Session =
  ReturnType<typeof createLensContext>['session'];

export function collectRegistrationEffects(
  options: CollectRegistrationEffectsOptions,
): readonly RegistrationEffectRecord[] {
  const context = createLensContext(options);
  const { repoPath, session, selectedPackages } = context;

  const records: RegistrationEffectRecord[] = [];

  for (const diRecord of collectDiInterfaceExportsFromContext(context)) {
    if (!diRecord.registration) {
      continue;
    }

    records.push({
      package: diRecord.package,
      owner: {
        kind: 'interface-export',
        location: diRecord.export,
      },
      locality: 'interface-default-builder',
      site: diRecord.export,
      effectKind: 'registration-call',
      sourceExpressionText: getRegistrationPrimaryExpression(diRecord.registration) ?? diRecord.export.name ?? '(anonymous)',
      api: normalizeApiDetection(diRecord.api, session),
      registration: diRecord.registration,
      emitterInterfaceKeyExpressionText: null,
      containerRegisterArgumentTexts: [],
    });
  }

  for (const pkg of selectedPackages) {
    const program = createPackageProgram(session, repoPath, pkg);
    const checker = program.getTypeChecker();
    const entrypointSourceFile = getSourceFile(program, repoPath, pkg.analysis_entrypoint);
    const entrypointModuleSymbol = entrypointSourceFile
      ? getModuleSymbol(checker, entrypointSourceFile)
      : null;

    if (!entrypointSourceFile || !entrypointModuleSymbol) {
      continue;
    }

    const sourceFiles = collectPackageSourceFiles(program, session, pkg.package_dir);
    for (const sourceFile of sourceFiles) {
      scanSourceFile(session, checker, pkg, sourceFile, records);
    }
  }

  return records.sort(compareRecords);
}

function scanSourceFile(
  session: Session,
  checker: ts.TypeChecker,
  pkg: PackageExportsSummary,
  sourceFile: ts.SourceFile,
  records: RegistrationEffectRecord[],
): void {
  for (const statement of sourceFile.statements) {
    if (ts.isClassDeclaration(statement) && hasExportModifier(statement)) {
      scanExportedClass(session, checker, pkg, statement, records);
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
          continue;
        }

        const owner: RegistrationSurfaceOwner = {
          kind: 'exported-object',
          location: {
            name: declaration.name.text,
            file: toRepoRelative(session, sourceFile.fileName),
            line: lineOfNode(sourceFile, declaration),
          },
        };

        if (ts.isObjectLiteralExpression(unwrapExpression(declaration.initializer))) {
          scanExportedObjectLiteral(
            session,
            checker,
            pkg,
            owner,
            unwrapExpression(declaration.initializer) as ts.ObjectLiteralExpression,
            records,
          );
        }
      }
    }
  }
}

function scanExportedClass(
  session: Session,
  checker: ts.TypeChecker,
  pkg: PackageExportsSummary,
  declaration: ts.ClassDeclaration,
  records: RegistrationEffectRecord[],
): void {
  const owner: RegistrationSurfaceOwner = {
    kind: 'exported-class',
    location: {
      name: declaration.name?.text ?? null,
      file: toRepoRelative(session, declaration.getSourceFile().fileName),
      line: lineOfNode(declaration.getSourceFile(), declaration),
    },
  };

  for (const member of declaration.members) {
    if (ts.isPropertyDeclaration(member) && isStaticNamedMember(member, 'register') && member.initializer) {
      const detection = detectCallLikeInitializer(checker, member.initializer);
      if (detection?.apiId === 'createImplementationRegister' && ts.isCallExpression(unwrapExpression(member.initializer))) {
        const callExpression = unwrapExpression(member.initializer) as ts.CallExpression;
        records.push({
          package: packageRef(pkg),
          owner,
          locality: 'static-register-field',
          site: locationForNode(session, member),
          effectKind: 'register-emitter',
          sourceExpressionText: callExpression.getText(callExpression.getSourceFile()),
          api: normalizeApiDetection(detection, session),
          registration: null,
          emitterInterfaceKeyExpressionText: callExpression.arguments[0]
            ? callExpression.arguments[0].getText(callExpression.getSourceFile())
            : null,
          containerRegisterArgumentTexts: [],
        });
      }
      continue;
    }

    if (ts.isMethodDeclaration(member) && isStaticNamedMember(member, 'register') && member.body) {
      const containerNames = collectIdentifierParameters(member.parameters);
      scanRegisterBody(
        session,
        checker,
        pkg,
        owner,
        'static-register-method',
        member.body,
        containerNames,
        records,
      );
      continue;
    }

    if (ts.isMethodDeclaration(member)
      && member.body
      && (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static) !== 0
      && !isNamedMember(member, 'register')) {
      scanRegistryConstructorBody(
        session,
        checker,
        pkg,
        owner,
        'static-registry-constructor-method',
        member.body,
        records,
      );
      continue;
    }

    if (!ts.isMethodDeclaration(member)) {
      continue;
    }

    if (isNamedMember(member, 'register') && member.body) {
      const containerNames = collectIdentifierParameters(member.parameters);
      scanRegisterBody(
        session,
        checker,
        pkg,
        owner,
        'resource-register-method',
        member.body,
        containerNames,
        records,
      );
    }
  }
}

function scanExportedObjectLiteral(
  session: Session,
  checker: ts.TypeChecker,
  pkg: PackageExportsSummary,
  owner: RegistrationSurfaceOwner,
  objectLiteral: ts.ObjectLiteralExpression,
  records: RegistrationEffectRecord[],
): void {
  for (const property of objectLiteral.properties) {
    if (ts.isMethodDeclaration(property) && property.name && ts.isIdentifier(property.name) && property.name.text === 'register' && property.body) {
      scanRegisterBody(
        session,
        checker,
        pkg,
        owner,
        'exported-object-register-method',
        property.body,
        collectIdentifierParameters(property.parameters),
        records,
      );
      continue;
    }

    if (ts.isMethodDeclaration(property) && property.body) {
      scanRegistryConstructorBody(
        session,
        checker,
        pkg,
        owner,
        'exported-object-registry-constructor',
        property.body,
        records,
      );
      continue;
    }

    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === 'register') {
      const initializer = unwrapExpression(property.initializer);
      if ((ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) && ts.isBlock(initializer.body)) {
        scanRegisterBody(
          session,
          checker,
          pkg,
          owner,
          'exported-object-register-method',
          initializer.body,
          collectIdentifierParameters(initializer.parameters),
          records,
        );
      }
      continue;
    }

    if (ts.isPropertyAssignment(property)) {
      const initializer = unwrapExpression(property.initializer);
      if ((ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) && ts.isBlock(initializer.body)) {
        scanRegistryConstructorBody(
          session,
          checker,
          pkg,
          owner,
          'exported-object-registry-constructor',
          initializer.body,
          records,
        );
      }
    }
  }
}

function scanRegisterBody(
  session: Session,
  checker: ts.TypeChecker,
  pkg: PackageExportsSummary,
  owner: RegistrationSurfaceOwner,
  locality: RegistrationEffectLocality,
  body: ts.Block,
  containerNames: readonly string[],
  records: RegistrationEffectRecord[],
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const detection = detectApiCall(checker, node);
      if (detection && detection.apiId.startsWith('registration.')) {
        records.push({
          package: packageRef(pkg),
          owner,
          locality,
          site: locationForNode(session, node),
          effectKind: 'registration-call',
          sourceExpressionText: node.getText(node.getSourceFile()),
          api: normalizeApiDetection(detection, session),
          registration: buildRegistrationFromCall(node, detection.apiId, 'explicit-first-arg'),
          emitterInterfaceKeyExpressionText: null,
          containerRegisterArgumentTexts: [],
        });
      }

      if (isContainerRegisterCall(node, containerNames)) {
        records.push({
          package: packageRef(pkg),
          owner,
          locality,
          site: locationForNode(session, node),
          effectKind: 'container-register-call',
          sourceExpressionText: node.getText(node.getSourceFile()),
          api: null,
          registration: null,
          emitterInterfaceKeyExpressionText: null,
          containerRegisterArgumentTexts: node.arguments.map((argument) => argument.getText(node.getSourceFile())),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(body);
}

function scanRegistryConstructorBody(
  session: ReturnType<typeof createLensContext>['session'],
  checker: ts.TypeChecker,
  pkg: PackageExportsSummary,
  owner: RegistrationSurfaceOwner,
  locality: Extract<RegistrationEffectLocality, 'static-registry-constructor-method' | 'exported-object-registry-constructor'>,
  body: ts.Block,
  records: RegistrationEffectRecord[],
): void {
  for (const returned of collectReturnExpressions(body)) {
    const emitter = classifyRegistryEmitterReturn(checker, returned);
    if (!emitter) {
      continue;
    }

    records.push({
      package: packageRef(pkg),
      owner,
      locality,
      site: locationForNode(session, returned),
      effectKind: 'register-emitter',
      sourceExpressionText: emitter.sourceExpressionText,
      api: emitter.api ? normalizeApiDetection(emitter.api, session) : null,
      registration: null,
      emitterInterfaceKeyExpressionText: emitter.emitterInterfaceKeyExpressionText,
      containerRegisterArgumentTexts: [],
    });

    for (const nested of emitter.nestedBodies) {
      scanRegisterBody(
        session,
        checker,
        pkg,
        owner,
        'local-runtime-call',
        nested.body,
        nested.containerNames,
        records,
      );
    }
  }
}

function detectCallLikeInitializer(
  checker: ts.TypeChecker,
  initializer: ts.Expression,
): ApiDetection | null {
  const unwrapped = unwrapExpression(initializer);
  return ts.isCallExpression(unwrapped)
    ? detectApiCall(checker, unwrapped)
    : detectApiExpression(checker, unwrapped);
}

function collectIdentifierParameters(
  parameters: readonly ts.ParameterDeclaration[],
): readonly string[] {
  return parameters
    .map((parameter) => identifierText(parameter.name))
    .filter((name): name is string => name != null);
}

function collectReturnExpressions(
  body: ts.Block,
): readonly ts.Expression[] {
  const expressions: ts.Expression[] = [];
  const ownerFunction = body.parent;

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node) && node !== ownerFunction) {
      return;
    }
    if (ts.isReturnStatement(node) && node.expression) {
      expressions.push(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(body);
  return expressions;
}

function classifyRegistryEmitterReturn(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): {
  readonly api: ApiDetection | null;
  readonly sourceExpressionText: string;
  readonly emitterInterfaceKeyExpressionText: string | null;
  readonly nestedBodies: readonly {
    body: ts.Block;
    containerNames: readonly string[];
  }[];
} | null {
  const unwrapped = unwrapExpression(expression);

  if (ts.isObjectLiteralExpression(unwrapped)) {
    const nestedBodies = collectReturnedRegisterBodies(unwrapped);
    if (nestedBodies.length === 0) {
      return null;
    }
    return {
      api: null,
      sourceExpressionText: unwrapped.getText(unwrapped.getSourceFile()),
      emitterInterfaceKeyExpressionText: null,
      nestedBodies,
    };
  }

  if (!ts.isCallExpression(unwrapped)) {
    return null;
  }

  const api = detectApiCall(checker, unwrapped);
  if (!api) {
    return null;
  }

  if (api.apiId === 'createImplementationRegister') {
    return {
      api,
      sourceExpressionText: unwrapped.getText(unwrapped.getSourceFile()),
      emitterInterfaceKeyExpressionText: unwrapped.arguments[0]
        ? unwrapped.arguments[0].getText(unwrapped.getSourceFile())
        : null,
      nestedBodies: [],
    };
  }

  if (api.apiId.startsWith('app-task.')) {
    const callbackExpression = unwrapped.arguments[1];
    const callback = callbackExpression && (ts.isArrowFunction(callbackExpression) || ts.isFunctionExpression(callbackExpression))
      ? callbackExpression
      : null;
    const nestedBodies = callback && ts.isBlock(callback.body)
      ? [{
        body: callback.body,
        containerNames: collectIdentifierParameters(callback.parameters),
      }]
      : [];

    return {
      api,
      sourceExpressionText: unwrapped.getText(unwrapped.getSourceFile()),
      emitterInterfaceKeyExpressionText: unwrapped.arguments[0]
        ? unwrapped.arguments[0].getText(unwrapped.getSourceFile())
        : null,
      nestedBodies,
    };
  }

  return null;
}

function collectReturnedRegisterBodies(
  objectLiteral: ts.ObjectLiteralExpression,
): readonly {
  body: ts.Block;
  containerNames: readonly string[];
}[] {
  const bodies: {
    body: ts.Block;
    containerNames: readonly string[];
  }[] = [];

  for (const property of objectLiteral.properties) {
    if (ts.isMethodDeclaration(property)
      && property.name
      && ts.isIdentifier(property.name)
      && property.name.text === 'register'
      && property.body) {
      bodies.push({
        body: property.body,
        containerNames: collectIdentifierParameters(property.parameters),
      });
      continue;
    }

    if (!ts.isPropertyAssignment(property)
      || !ts.isIdentifier(property.name)
      || property.name.text !== 'register') {
      continue;
    }

    const initializer = unwrapExpression(property.initializer);
    if ((ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
      && ts.isBlock(initializer.body)) {
      bodies.push({
        body: initializer.body,
        containerNames: collectIdentifierParameters(initializer.parameters),
      });
    }
  }

  return bodies;
}

function isNamedMember(
  member: ts.ClassElement,
  name: string,
): boolean {
  return ('name' in member)
    && member.name != null
    && ts.isIdentifier(member.name)
    && member.name.text === name;
}

function isContainerRegisterCall(
  callExpression: ts.CallExpression,
  containerNames: readonly string[],
): boolean {
  const callee = unwrapExpression(callExpression.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'register') {
    return false;
  }

  const owner = unwrapExpression(callee.expression);
  return ts.isIdentifier(owner) && containerNames.includes(owner.text);
}

function locationForNode(
  session: Session,
  node: ts.Node,
): SymbolLocation {
  const sourceFile = node.getSourceFile();
  return {
    name: null,
    file: toRepoRelative(session, sourceFile.fileName),
    line: lineOfNode(sourceFile, node),
  };
}

function packageRef(
  pkg: PackageExportsSummary,
): PackageRef {
  return {
    name: pkg.package_name,
    dir: pkg.package_dir,
    analysisEntrypoint: pkg.analysis_entrypoint,
  };
}

function compareRecords(
  left: RegistrationEffectRecord,
  right: RegistrationEffectRecord,
): number {
  return left.package.name.localeCompare(right.package.name)
    || (left.owner.location.name ?? '').localeCompare(right.owner.location.name ?? '')
    || (left.site.file ?? '').localeCompare(right.site.file ?? '')
    || (left.site.line ?? 0) - (right.site.line ?? 0)
    || left.effectKind.localeCompare(right.effectKind);
}

function normalizeApiDetection(
  api: ApiDetection,
  session: Session,
): ApiDetection {
  return {
    ...api,
    resolvedAt: api.resolvedAt == null || api.resolvedAt.file == null
      ? api.resolvedAt
      : {
        ...api.resolvedAt,
        file: toRepoRelative(session, api.resolvedAt.file),
      },
  };
}
