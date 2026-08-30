import path from 'node:path';

import ts from 'typescript';

import type { SemanticApp } from '../api/runtime.js';
import {
  frameworkRegistrationKindForOperation,
  type ContainerRegistrationOperation,
} from '../di/container-registration.js';
import {
  DiContainerApiMethodKind,
  isAureliaContainerReceiver,
} from '../di/container-api-recognition.js';
import { ContainerLookupKeyKind } from '../di/container-key.js';
import {
  registrationOpenPressureFacts,
  registrationOpenSeamCanHideFrameworkCapability,
  registrationOpenSeamCanHideResource,
} from '../di/registration-open-pressure.js';
import { containerLookupKeyKindForExpression } from '../di/source-key-expression.js';
import { ResolvedEvaluationModuleSourceScope } from '../evaluation/package-origin.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import type { ProductHandle, IdentityHandle } from '../kernel/handles.js';
import {
  OpenRegistrationAdmission,
  ResolverRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  FrameworkRegistrationCapability,
} from '../registration/framework-registration-manifest.js';
import type {
  RouteConfigModel,
  RouteConfigReference,
  RouteableComponentReference,
} from '../router/model.js';
import {
  frameworkDeclarationSourceSpec,
  symbolMatchesFrameworkDeclarationSource,
  typeMatchesFrameworkDeclarationSource,
} from '../type-system/framework-declaration-source.js';
import {
  firstSymbolDeclaration,
  resolveAliasedSymbol,
  symbolForExpression,
} from '../type-system/checker-node-helpers.js';
import { typeSystemSourcePathIndex } from '../type-system/source-path-index.js';
import {
  dedupeRuntimeRegistrationRequirementReasons as dedupeReasons,
  RuntimeRegistrationRequirementReasonKind,
  runtimeRegistrationRequirementReason as reason,
  type RuntimeRegistrationRequirementCompilerInput,
  type RuntimeRegistrationRequirementReason,
} from './runtime-registration-requirement-model.js';

export interface RuntimeRegistrationClosurePressure {
  readonly resources: readonly RuntimeRegistrationRequirementReason[];
  readonly renderers: readonly RuntimeRegistrationRequirementReason[];
  readonly eventModifier: readonly RuntimeRegistrationRequirementReason[];
}

/** Collect every negative-knowledge boundary that prevents exact selective registration. */
export function collectRuntimeRegistrationClosurePressure(
  app: SemanticApp,
  inputs: readonly RuntimeRegistrationRequirementCompilerInput[],
): RuntimeRegistrationClosurePressure {
  const templateUniverseReasons = runtimeTemplateUniversePressure(app);
  const programmatic = programmaticUsePressure(app);
  const resources = [...templateUniverseReasons, ...programmatic.resources];
  const renderers = [...templateUniverseReasons, ...programmatic.renderers];
  const eventModifier = [...templateUniverseReasons, ...programmatic.eventModifier];
  collectRegistrationPressure(app, inputs, resources, renderers, eventModifier);
  return { resources, renderers, eventModifier };
}

function collectRegistrationPressure(
  app: SemanticApp,
  inputs: readonly RuntimeRegistrationRequirementCompilerInput[],
  resourceReasons: RuntimeRegistrationRequirementReason[],
  rendererReasons: RuntimeRegistrationRequirementReason[],
  eventReasons: RuntimeRegistrationRequirementReason[],
): void {
  const relevantContainers = relevantContainerIdentityHandles(app, inputs);
  for (const fact of registrationOpenPressureFacts(
    app.emission.appWorld.diWorld,
    app.emission.appWorld.configuration.openSeamScopes,
  )) {
    if (
      fact.containerIdentityHandles != null
      && !fact.containerIdentityHandles.some((identity) => relevantContainers.has(identity))
    ) continue;
    const operation = fact.operation;
    const openReason = reason(
      RuntimeRegistrationRequirementReasonKind.RegistrationPressureOpen,
      'Open DI registration spending can change selectively registered runtime membership.',
      [fact.seam.handle, operation?.productHandle ?? '(unscoped)'],
    );
    // Known framework-group operations already have exact catalog selection products. Their internal registry-body
    // opacity must not re-open those catalog effects; only genuinely unclassified operations can hide new members.
    if (registrationOpenSeamCanHideResource(operation)) resourceReasons.push(openReason);
    if (
      frameworkRegistrationKindForOperationOrNull(operation) == null
      && registrationOpenSeamCanHideFrameworkCapability(
        operation,
        FrameworkRegistrationCapability.RuntimeHtmlDefaultRenderers,
      )
    ) rendererReasons.push(openReason);
    if (
      frameworkRegistrationKindForOperationOrNull(operation) == null
      && registrationOpenSeamCanHideFrameworkCapability(
        operation,
        FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
      )
    ) eventReasons.push(openReason);
  }
  for (const operation of app.emission.appWorld.diWorld.registrationOperations) {
    const containerIdentity = operation.container.identityHandle;
    if (containerIdentity == null || !relevantContainers.has(containerIdentity)) continue;
    if (frameworkRegistrationKindForOperation(operation) != null) continue;
    if (registrationKeyLocalName(operation.admission) === 'IRenderer') {
      rendererReasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.CustomRendererRegistration,
        'A custom IRenderer registration can change first-registration-wins renderer selection.',
        [operation.productHandle, operation.admission.productHandle],
      ));
    }
    if (
      registrationKeyLocalName(operation.admission) === 'IEventModifier'
      || registrationKeyLocalName(operation.admission) === 'IModifiedEventHandlerCreator'
    ) {
      eventReasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.RegistrationPressureOpen,
        'A custom event-modifier registration can change EventModifierRegistration requirements.',
        [operation.productHandle, operation.admission.productHandle],
      ));
    }
  }
}

function frameworkRegistrationKindForOperationOrNull(
  operation: ContainerRegistrationOperation | null,
): ReturnType<typeof frameworkRegistrationKindForOperation> {
  return operation == null ? null : frameworkRegistrationKindForOperation(operation);
}

function runtimeTemplateUniversePressure(app: SemanticApp): readonly RuntimeRegistrationRequirementReason[] {
  const routeContexts = app.emission.routeContexts;
  const routeConfigs = routeContexts.readRouteConfigs();
  const byProduct = new Map(routeConfigs.map((config) => [config.productHandle, config]));
  const byIdentity = new Map(routeConfigs.map((config) => [config.identityHandle, config]));
  const reasons: RuntimeRegistrationRequirementReason[] = [];
  for (const context of routeContexts.readRouteConfigContexts()) {
    const config = routeConfigForReference(context.config, byProduct, byIdentity);
    if (config == null) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
        'An app-root-reachable route context has no effective route configuration in the compiler cohort.',
        [context.productHandle, context.config.productHandle ?? context.config.identityHandle ?? context.friendlyPath],
      ));
      continue;
    }
    const executableOpenFields = config.openFields.filter((field) =>
      field === 'component' || field === 'fallback' || field === 'children'
    );
    if (executableOpenFields.length > 0) {
      reasons.push(reason(
        RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
        'An app-root-reachable route can add a component, fallback, or child route outside the static compiler cohort.',
        [config.productHandle, ...executableOpenFields],
      ));
    }
    for (const [role, routeable] of [
      ['component', config.component],
      ['fallback', config.fallback],
    ] as const) {
      if (routeable != null && routeable.resolvedProductHandle == null) {
        reasons.push(unresolvedRouteableReason(config, routeable, role));
      }
    }
    for (const child of [...config.childRoutes, ...context.childRoutes]) {
      if (routeConfigForReference(child, byProduct, byIdentity) == null) {
        reasons.push(reason(
          RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
          'An app-root-reachable child route reference does not resolve into the static compiler cohort.',
          [
            config.productHandle,
            child.productHandle ?? child.identityHandle ?? child.localName ?? '(anonymous-child-route)',
          ],
        ));
      }
    }
  }
  return dedupeReasons(reasons);
}

function routeConfigForReference(
  reference: RouteConfigReference,
  byProduct: ReadonlyMap<ProductHandle, RouteConfigModel>,
  byIdentity: ReadonlyMap<IdentityHandle, RouteConfigModel>,
): RouteConfigModel | null {
  return reference.identityHandle == null
    ? reference.productHandle == null ? null : byProduct.get(reference.productHandle) ?? null
    : byIdentity.get(reference.identityHandle) ?? null;
}

function unresolvedRouteableReason(
  config: RouteConfigModel,
  routeable: RouteableComponentReference,
  role: 'component' | 'fallback',
): RuntimeRegistrationRequirementReason {
  return reason(
    RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
    `An app-root-reachable route ${role} does not resolve into the static compiler cohort.`,
    [
      config.productHandle,
      routeable.productHandle ?? routeable.identityHandle ?? routeable.localName ?? `(anonymous-${role})`,
    ],
  );
}

function programmaticUsePressure(app: SemanticApp): RuntimeRegistrationClosurePressure {
  const resourceReasons: RuntimeRegistrationRequirementReason[] = [];
  const rendererReasons: RuntimeRegistrationRequirementReason[] = [];
  const eventReasons: RuntimeRegistrationRequirementReason[] = [];
  const rendererApiNames = new Set(['IRenderer', 'Rendering', 'IRendering', 'renderer']);
  const compilerApiNames = new Set([
    'ITemplateCompiler',
    'TemplateCompiler',
    'RuntimeTemplateCompilerImplementation',
    'IRendering',
    'Rendering',
  ]);
  const eventApiNames = new Set(['IEventModifier', 'IModifiedEventHandlerCreator']);
  const bindingConstructorNames = new Set([
    'AttributeBinding',
    'ContentBinding',
    'InterpolationBinding',
    'LetBinding',
    'ListenerBinding',
    'PropertyBinding',
    'RefBinding',
    'SpreadBinding',
    'SpreadValueBinding',
  ]);
  const resourceApiNames = new Set(['CustomElement', 'CustomAttribute', 'BindingBehavior', 'ValueConverter']);
  const frameworkApiNames = new Set([
    'Aurelia',
    'resolve',
    ...rendererApiNames,
    ...compilerApiNames,
    ...eventApiNames,
    ...bindingConstructorNames,
    ...resourceApiNames,
  ]);
  const checker = app.emission.typeSystem.checker;
  const frameworkSources = frameworkDeclarationSourceSpec(
    frameworkApiNames,
    ['aurelia', '@aurelia/runtime-html', '@aurelia/template-compiler', '@aurelia/kernel'],
    ['/packages/aurelia/', '/packages/runtime-html/', '/packages/template-compiler/', '/packages/kernel/'],
  );
  const aureliaInstanceSources = frameworkDeclarationSourceSpec(
    new Set(['Aurelia']),
    ['aurelia', '@aurelia/runtime-html'],
    ['/packages/aurelia/', '/packages/runtime-html/'],
  );
  const sourcePathByFileName = typeSystemSourcePathIndex(app.project, app.emission.typeSystem);
  const frameworkExportName = (
    expression: ts.Expression,
    seen: Set<ts.Symbol> = new Set(),
  ): string | null => {
    const current = unwrapExpression(expression);
    const symbol = symbolForExpression(checker, current);
    const type = checker.getTypeAtLocation(current);
    const apparent = checker.getApparentType(type);
    for (const candidate of [symbol, type.symbol, type.aliasSymbol, apparent.symbol, apparent.aliasSymbol]) {
      if (symbolMatchesFrameworkDeclarationSource(candidate, checker, sourcePathByFileName, frameworkSources)) {
        return resolveAliasedSymbol(checker, candidate!).getName();
      }
    }
    if (symbol != null && !seen.has(symbol)) {
      seen.add(symbol);
      const declaration = firstSymbolDeclaration(symbol);
      if (declaration != null && ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
        return frameworkExportName(declaration.initializer, seen);
      }
    }
    return null;
  };
  const isAureliaInstance = (expression: ts.Expression): boolean =>
    typeMatchesFrameworkDeclarationSource(
      checker.getTypeAtLocation(unwrapExpression(expression)),
      checker,
      sourcePathByFileName,
      aureliaInstanceSources,
    );
  const sourceFiles = new Map<string, ts.SourceFile>();
  for (const source of app.emission.evaluation.sources) {
    const packageOrigin = source.packageOrigin;
    if (
      packageOrigin?.sourceScope === ResolvedEvaluationModuleSourceScope.ExternalDependency
      && isModeledFrameworkPackage(packageOrigin.packageInstance.name)
    ) {
      continue;
    }
    if (!isRuntimeCodeSource(source.moduleKey)) continue;
    const evaluatedSourceFile = source.sourceFile;
    if (evaluatedSourceFile == null || source.evaluation == null) {
      const open = reason(
        RuntimeRegistrationRequirementReasonKind.ProgrammaticUseOpen,
        'A reachable runtime-code source could not be evaluated and inspected for programmatic runtime API use.',
        [source.moduleKey, source.admission.path],
      );
      resourceReasons.push(open);
      rendererReasons.push(open);
      eventReasons.push(open);
      continue;
    }
    const sourceFile = app.emission.typeSystem.readProgramSourceFileByModuleKey(source.moduleKey)
      ?? app.emission.typeSystem.readProgramSourceFileByHostPath(evaluatedSourceFile.fileName);
    if (sourceFile == null) {
      const open = reason(
        RuntimeRegistrationRequirementReasonKind.ProgrammaticUseOpen,
        'A reachable evaluator source has no checker-owned syntax tree for programmatic runtime API use.',
        [source.moduleKey, evaluatedSourceFile.fileName],
      );
      resourceReasons.push(open);
      rendererReasons.push(open);
      eventReasons.push(open);
      continue;
    }
    if (packageOrigin == null) {
      const relative = path.relative(app.project.rootDir, sourceFile.fileName);
      if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
    }
    const resolvedFileName = path.resolve(sourceFile.fileName);
    sourceFiles.set(process.platform === 'win32' ? resolvedFileName.toLowerCase() : resolvedFileName, sourceFile);
  }
  const unresolvedModules = app.emission.evaluation.readUnresolvedModules();
  if (unresolvedModules.length > 0) {
    const open = reason(
      RuntimeRegistrationRequirementReasonKind.ProgrammaticUseOpen,
      'A reachable relative runtime module edge is unresolved, so its programmatic runtime API use is unknown.',
      unresolvedModules.flatMap((entry) => [entry.fromModuleKey, entry.moduleSpecifier]),
    );
    resourceReasons.push(open);
    rendererReasons.push(open);
    eventReasons.push(open);
  }
  const moduleResolutions = app.emission.evaluation.profile.sourceHost.moduleResolutions;
  const unclassifiedBareBoundaries = Math.max(
    0,
    moduleResolutions.unresolvedBare
      - moduleResolutions.frameworkExternalBoundaries
      - moduleResolutions.packageExternalBoundaries,
  );
  if (moduleResolutions.packageExternalBoundaries > 0 || unclassifiedBareBoundaries > 0) {
    const open = reason(
      RuntimeRegistrationRequirementReasonKind.ProgrammaticUseOpen,
      'A reachable non-framework package stopped at an external evaluation boundary.',
      [
        `package-external-boundaries:${moduleResolutions.packageExternalBoundaries}`,
        `unclassified-bare-boundaries:${unclassifiedBareBoundaries}`,
      ],
    );
    resourceReasons.push(open);
    rendererReasons.push(open);
    eventReasons.push(open);
  }
  for (const sourceFile of sourceFiles.values()) {
    const imports = new Map<string, string>();
    const namespaces = new Set<string>();
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
      if (!isRuntimeRegistrationApiModule(statement.moduleSpecifier.text)) continue;
      const clause = statement.importClause;
      if (clause?.name != null) {
        imports.set(
          clause.name.text,
          statement.moduleSpecifier.text === 'aurelia' ? 'Aurelia' : 'default',
        );
      }
      const bindings = clause?.namedBindings;
      if (bindings == null) continue;
      if (ts.isNamespaceImport(bindings)) {
        namespaces.add(bindings.name.text);
        continue;
      }
      for (const element of bindings.elements) {
        const exportName = element.propertyName?.text ?? element.name.text;
        imports.set(element.name.text, exportName);
      }
    }
    const importedExport = (expression: ts.Expression): string | null => {
      const canonical = frameworkExportName(expression);
      if (canonical != null) return canonical;
      if (ts.isIdentifier(expression)) return imports.get(expression.text) ?? null;
      return ts.isPropertyAccessExpression(expression)
        && ts.isIdentifier(expression.expression)
        && namespaces.has(expression.expression.text)
        ? expression.name.text
        : null;
    };
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && !isImportBinding(node) && !isTypePosition(node)) {
        const exportName = frameworkExportName(node) ?? imports.get(node.text) ?? null;
        if (exportName != null && rendererApiNames.has(exportName)) {
          rendererReasons.push(programmaticReason(sourceFile.fileName, exportName, 'value-use'));
        }
        if (exportName != null && eventApiNames.has(exportName)) {
          eventReasons.push(programmaticReason(sourceFile.fileName, exportName, 'value-use'));
        }
        if (exportName != null && compilerApiNames.has(exportName)) {
          addRuntimeCompilationPressure(
            sourceFile.fileName,
            exportName,
            resourceReasons,
            rendererReasons,
            eventReasons,
          );
        }
      }
      if (
        ts.isPropertyAccessExpression(node)
        && ts.isIdentifier(node.expression)
        && namespaces.has(node.expression.text)
        && !isTypePosition(node)
      ) {
        const exportName = frameworkExportName(node.name) ?? node.name.text;
        if (rendererApiNames.has(exportName)) {
          rendererReasons.push(programmaticReason(sourceFile.fileName, exportName, 'namespace-value-use'));
        }
        if (eventApiNames.has(exportName)) {
          eventReasons.push(programmaticReason(sourceFile.fileName, exportName, 'namespace-value-use'));
        }
        if (compilerApiNames.has(exportName)) {
          addRuntimeCompilationPressure(
            sourceFile.fileName,
            exportName,
            resourceReasons,
            rendererReasons,
            eventReasons,
          );
        }
      }
      if (ts.isNewExpression(node)) {
        const exportName = importedExport(node.expression);
        if (exportName != null && bindingConstructorNames.has(exportName)) {
          rendererReasons.push(programmaticReason(sourceFile.fileName, exportName, 'binding-construction'));
        }
      }
      if (ts.isCallExpression(node) && importedExport(node.expression) === 'resolve') {
        if (resourceKeyMayAddressRuntimeResource(app, node.arguments[0] ?? null)) {
          resourceReasons.push(programmaticReason(
            sourceFile.fileName,
            'resolve',
            'resolve-resource-key-use',
          ));
        }
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const receiverExport = importedExport(node.expression.expression);
        const method = node.expression.name.text;
        const containerMethodKind = diContainerApiMethodKind(method);
        if (
          containerMethodKind != null
          && isAureliaContainerReceiver(
            app.emission.typeSystem,
            node.expression.expression,
            containerMethodKind,
            sourcePathByFileName,
          )
          && resourceKeyMayAddressRuntimeResource(app, node.arguments[0] ?? null)
        ) {
          resourceReasons.push(programmaticReason(
            sourceFile.fileName,
            method,
            'container-resource-key-use',
          ));
        }
        if (
          receiverExport != null
          && resourceApiNames.has(receiverExport)
          && (method === 'find' || method === 'keyFrom')
        ) {
          resourceReasons.push(programmaticReason(
            sourceFile.fileName,
            receiverExport,
            method === 'find' ? 'resource-find' : 'resource-key-construction',
          ));
        }
        if (receiverExport != null && bindingConstructorNames.has(receiverExport) && method === 'mix') {
          rendererReasons.push(programmaticReason(sourceFile.fileName, receiverExport, 'binding-mixin'));
        }
        if (method === 'enhance' && (receiverExport === 'Aurelia' || isAureliaInstance(node.expression.expression))) {
          addRuntimeCompilationPressure(
            sourceFile.fileName,
            'Aurelia.enhance',
            resourceReasons,
            rendererReasons,
            eventReasons,
          );
        }
        if (method === 'find') {
          const resourceKindExport = node.arguments[0] == null ? null : importedExport(node.arguments[0]);
          if (resourceKindExport != null && resourceApiNames.has(resourceKindExport)) {
            resourceReasons.push(programmaticReason(sourceFile.fileName, resourceKindExport, 'container-resource-find'));
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }
  return {
    resources: dedupeReasons(resourceReasons),
    renderers: dedupeReasons(rendererReasons),
    eventModifier: dedupeReasons(eventReasons),
  };
}

function isTypePosition(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current?.parent != null) {
    current = current.parent;
    if (ts.isTypeNode(current) || ts.isImportTypeNode(current)) return true;
    if (ts.isExpressionStatement(current) || ts.isCallExpression(current) || ts.isDecorator(current)) return false;
  }
  return false;
}

function isImportBinding(node: ts.Identifier): boolean {
  return ts.isImportSpecifier(node.parent)
    || ts.isImportClause(node.parent)
    || ts.isNamespaceImport(node.parent);
}

function isRuntimeRegistrationApiModule(moduleSpecifier: string): boolean {
  return moduleSpecifier === 'aurelia'
    || moduleSpecifier === '@aurelia/runtime-html'
    || moduleSpecifier === '@aurelia/kernel'
    || moduleSpecifier === '@aurelia/template-compiler';
}

function isModeledFrameworkPackage(packageName: string): boolean {
  return packageName === 'aurelia' || packageName.startsWith('@aurelia/');
}

function isRuntimeCodeSource(moduleKey: string): boolean {
  const normalized = moduleKey.split(/[?#]/u, 1)[0]!.toLowerCase();
  if (normalized.endsWith('.d.ts') || normalized.endsWith('.d.mts') || normalized.endsWith('.d.cts')) return false;
  switch (path.extname(normalized)) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return true;
    default:
      return false;
  }
}

function diContainerApiMethodKind(method: string): DiContainerApiMethodKind | null {
  switch (method) {
    case 'get': return DiContainerApiMethodKind.Get;
    case 'getResolver': return DiContainerApiMethodKind.GetResolver;
    case 'getAll': return DiContainerApiMethodKind.GetAll;
    case 'has': return DiContainerApiMethodKind.Has;
    case 'getFactory': return DiContainerApiMethodKind.GetFactory;
    case 'invoke': return DiContainerApiMethodKind.Invoke;
    default: return null;
  }
}

function resourceKeyMayAddressRuntimeResource(
  app: SemanticApp,
  expression: ts.Expression | null,
): boolean {
  if (expression == null) return false;
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) return current.text.startsWith('au:resource:');
  const keyKind = containerLookupKeyKindForExpression(app.emission.typeSystem, current);
  if (keyKind === ContainerLookupKeyKind.Resource) return true;
  if (keyKind !== ContainerLookupKeyKind.Unknown) return false;
  return typeMayBeString(app.emission.typeSystem.checker.getTypeAtLocation(current));
}

function typeMayBeString(type: ts.Type): boolean {
  if ((type.flags & (
    ts.TypeFlags.StringLike
    | ts.TypeFlags.Any
    | ts.TypeFlags.Unknown
    | ts.TypeFlags.TypeParameter
  )) !== 0) {
    return true;
  }
  return type.isUnionOrIntersection() && type.types.some(typeMayBeString);
}

function addRuntimeCompilationPressure(
  fileName: string,
  exportName: string,
  resourceReasons: RuntimeRegistrationRequirementReason[],
  rendererReasons: RuntimeRegistrationRequirementReason[],
  eventReasons: RuntimeRegistrationRequirementReason[],
): void {
  const entry = reason(
    RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
    `Programmatic runtime compiler API '${exportName}' is used outside the browser-final handoff.`,
    [fileName, exportName],
  );
  resourceReasons.push(entry);
  rendererReasons.push(entry);
  eventReasons.push(entry);
}

function programmaticReason(
  fileName: string,
  exportName: string,
  operation: string,
): RuntimeRegistrationRequirementReason {
  return reason(
    RuntimeRegistrationRequirementReasonKind.ProgrammaticRuntimeRegistrationUse,
    `Programmatic runtime API '${exportName}' is used outside the template compiler corridor (${operation}).`,
    [fileName, exportName, operation],
  );
}

function relevantContainerIdentityHandles(
  app: SemanticApp,
  inputs: readonly RuntimeRegistrationRequirementCompilerInput[],
): ReadonlySet<IdentityHandle> {
  const identities = new Set<IdentityHandle>();
  for (const input of inputs) {
    const containerIdentity = input.resource.compilation.compilerWorld.container.identityHandle;
    if (containerIdentity == null) continue;
    for (const identity of app.emission.appWorld.containerChainFacts.containerChainIdentityHandles(containerIdentity)) {
      identities.add(identity);
    }
  }
  return identities;
}

function registrationKeyLocalName(admission: RegistrationAdmissionProduct): string | null {
  return admission instanceof OpenRegistrationAdmission || admission instanceof ResolverRegistrationAdmission
    ? admission.targetKey?.localName ?? null
    : null;
}
