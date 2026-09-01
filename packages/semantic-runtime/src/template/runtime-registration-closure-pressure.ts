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
  declarationMatchesFrameworkSource,
  frameworkDeclarationSourceSpec,
  symbolMatchesFrameworkDeclarationSource,
  typeMatchesFrameworkDeclarationSource,
  type FrameworkDeclarationSourceSpec,
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

type RuntimeCompilerPackageKind = 'expression-parser' | 'template-compiler';

interface RuntimeCompilerPackageValue {
  readonly packageKind: RuntimeCompilerPackageKind;
  readonly exportName: string;
}

interface RuntimeCompilerNamespaceBinding {
  readonly packageKind: RuntimeCompilerPackageKind | null;
  readonly canExposeRuntimeCompilerPackages: boolean;
}

/**
 * Values whose published behavior is part of the browser-final instruction ABI rather than the
 * general compiler implementation. Every other value export from these packages is conservative
 * by default: a whole-package compiler facade may not silently reinterpret an app-facing use.
 */
const runtimeCompilerIndependentValueExports: Readonly<Record<RuntimeCompilerPackageKind, ReadonlySet<string>>> = {
  'expression-parser': new Set([
    'CustomExpression',
    'createAccessScopeExpression',
    'createInterpolation',
  ]),
  'template-compiler': new Set([
    'AttrSyntax',
    'BindingMode',
    'itHydrateElement',
    'itHydrateAttribute',
    'itHydrateTemplateController',
    'itHydrateLetElement',
    'itSetProperty',
    'itInterpolation',
    'itPropertyBinding',
    'itLetBinding',
    'itRefBinding',
    'itIteratorBinding',
    'itMultiAttr',
    'itTextBinding',
    'itListenerBinding',
    'itAttributeBinding',
    'itStylePropertyBinding',
    'itSetAttribute',
    'itSetClassAttribute',
    'itSetStyleAttribute',
    'itSpreadTransferedBinding',
    'itSpreadElementProp',
    'itSpreadValueBinding',
  ]),
};

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
    'IExpressionParser',
    'ExpressionParser',
    'CustomExpression',
    'ITemplateCompiler',
    'TemplateCompiler',
    'RuntimeTemplateCompilerImplementation',
    'IAttrMapper',
    'IResourceResolver',
    'IAttributePattern',
    'IAttributeParser',
    'ITemplateElementFactory',
    'ITemplateCompilerHooks',
    'TemplateCompilerHooks',
    'AttributeParser',
    'SyntaxInterpreter',
    'AttributePattern',
    'BindingCommand',
    'DotSeparatedAttributePattern',
    'RefAttributePattern',
    'EventAttributePattern',
    'ColonPrefixedBindAttributePattern',
    'AtPrefixedTriggerAttributePattern',
    'DefaultBindingCommand',
    'OneTimeBindingCommand',
    'FromViewBindingCommand',
    'ToViewBindingCommand',
    'TwoWayBindingCommand',
    'ForBindingCommand',
    'RefBindingCommand',
    'TriggerBindingCommand',
    'CaptureBindingCommand',
    'ClassBindingCommand',
    'StyleBindingCommand',
    'AttrBindingCommand',
    'SpreadValueBindingCommand',
    'attributePattern',
    'bindingCommand',
    'templateCompilerHooks',
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
  const runtimeCompilerPolicyKnownNames = new Set([
    ...compilerApiNames,
    ...runtimeCompilerIndependentValueExports['expression-parser'],
    ...runtimeCompilerIndependentValueExports['template-compiler'],
  ]);
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
    [
      'aurelia',
      '@aurelia/runtime-html',
      '@aurelia/template-compiler',
      '@aurelia/expression-parser',
      '@aurelia/kernel',
    ],
    [
      '/packages/aurelia/',
      '/packages/runtime-html/',
      '/packages/template-compiler/',
      '/packages/expression-parser/',
      '/packages/kernel/',
    ],
  );
  const aureliaInstanceSources = frameworkDeclarationSourceSpec(
    new Set(['Aurelia']),
    ['aurelia', '@aurelia/runtime-html'],
    ['/packages/aurelia/', '/packages/runtime-html/'],
  );
  const sourcePathByFileName = typeSystemSourcePathIndex(app.project, app.emission.typeSystem);
  const runtimeCompilerPackageSources: Readonly<Record<RuntimeCompilerPackageKind, FrameworkDeclarationSourceSpec>> = {
    'expression-parser': frameworkDeclarationSourceSpec(
      new Set(),
      ['@aurelia/expression-parser'],
      ['/packages/expression-parser/'],
    ),
    'template-compiler': frameworkDeclarationSourceSpec(
      new Set(),
      ['@aurelia/template-compiler'],
      ['/packages/template-compiler/'],
    ),
  };
  const runtimeCompilerPackageForSymbol = (
    symbol: ts.Symbol | null | undefined,
  ): RuntimeCompilerPackageKind | null => {
    if (symbol == null) return null;
    const resolved = resolveAliasedSymbol(checker, symbol);
    for (const packageKind of ['expression-parser', 'template-compiler'] as const) {
      if ((resolved.declarations ?? []).some((declaration) =>
        declarationMatchesFrameworkSource(
          declaration,
          sourcePathByFileName,
          runtimeCompilerPackageSources[packageKind],
        )
      )) {
        return packageKind;
      }
    }
    return null;
  };
  interface FrameworkApiValue {
    readonly exportName: string;
    readonly runtimeCompilerPackageKind: RuntimeCompilerPackageKind | null;
  }
  const frameworkApiValueCache = new WeakMap<ts.Expression, FrameworkApiValue | null>();
  const frameworkApiValue = (
    expression: ts.Expression,
    seen: Set<ts.Symbol> = new Set(),
  ): FrameworkApiValue | null => {
    const current = unwrapExpression(expression);
    const cached = frameworkApiValueCache.get(current);
    if (cached !== undefined) return cached;
    const symbol = symbolForExpression(checker, current);
    const type = checker.getTypeAtLocation(current);
    const apparent = checker.getApparentType(type);
    for (const candidate of [symbol, type.symbol, type.aliasSymbol, apparent.symbol, apparent.aliasSymbol]) {
      if (symbolMatchesFrameworkDeclarationSource(candidate, checker, sourcePathByFileName, frameworkSources)) {
        const resolved = resolveAliasedSymbol(checker, candidate!);
        const result = {
          exportName: resolved.getName(),
          runtimeCompilerPackageKind: runtimeCompilerPolicyKnownNames.has(resolved.getName())
            ? runtimeCompilerPackageForSymbol(resolved)
            : null,
        };
        frameworkApiValueCache.set(current, result);
        return result;
      }
    }
    if (symbol != null && !seen.has(symbol)) {
      seen.add(symbol);
      const declaration = firstSymbolDeclaration(symbol);
      if (declaration != null && ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
        const result = frameworkApiValue(declaration.initializer, seen);
        frameworkApiValueCache.set(current, result);
        return result;
      }
    }
    frameworkApiValueCache.set(current, null);
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
    const runtimeCompilerImports = new Map<string, RuntimeCompilerPackageValue>();
    const runtimeCompilerNamespaces = new Map<string, RuntimeCompilerNamespaceBinding>();
    const runtimeCompilerReexports: RuntimeCompilerPackageValue[] = [];
    const runtimeCompilerOpenReexports: RuntimeCompilerPackageKind[] = [];
    for (const statement of sourceFile.statements) {
      if (
        ts.isExportDeclaration(statement)
        && statement.moduleSpecifier != null
        && ts.isStringLiteralLike(statement.moduleSpecifier)
      ) {
        const packageKind = runtimeCompilerPackageKindForModuleSpecifier(statement.moduleSpecifier.text);
        if (packageKind == null || statement.isTypeOnly) continue;
        if (statement.exportClause == null || ts.isNamespaceExport(statement.exportClause)) {
          runtimeCompilerOpenReexports.push(packageKind);
          continue;
        }
        for (const element of statement.exportClause.elements) {
          if (element.isTypeOnly) continue;
          runtimeCompilerReexports.push({
            packageKind,
            exportName: element.propertyName?.text ?? element.name.text,
          });
        }
        continue;
      }
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
      if (!isRuntimeRegistrationApiModule(statement.moduleSpecifier.text)) continue;
      const clause = statement.importClause;
      if (clause?.isTypeOnly === true) continue;
      const runtimeCompilerPackageKind = runtimeCompilerPackageKindForModuleSpecifier(
        statement.moduleSpecifier.text,
      );
      if (clause?.name != null) {
        imports.set(
          clause.name.text,
          statement.moduleSpecifier.text === 'aurelia' ? 'Aurelia' : 'default',
        );
        if (runtimeCompilerPackageKind != null) {
          runtimeCompilerImports.set(clause.name.text, {
            packageKind: runtimeCompilerPackageKind,
            exportName: 'default',
          });
        }
      }
      const bindings = clause?.namedBindings;
      if (bindings == null) continue;
      if (ts.isNamespaceImport(bindings)) {
        namespaces.add(bindings.name.text);
        if (runtimeCompilerPackageKind != null || statement.moduleSpecifier.text === 'aurelia') {
          runtimeCompilerNamespaces.set(bindings.name.text, {
            packageKind: runtimeCompilerPackageKind,
            canExposeRuntimeCompilerPackages: true,
          });
        }
        continue;
      }
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue;
        const exportName = element.propertyName?.text ?? element.name.text;
        imports.set(element.name.text, exportName);
        if (runtimeCompilerPackageKind != null) {
          runtimeCompilerImports.set(element.name.text, {
            packageKind: runtimeCompilerPackageKind,
            exportName,
          });
        }
      }
    }
    const importedExport = (expression: ts.Expression): string | null => {
      const canonical = frameworkApiValue(expression)?.exportName;
      if (canonical != null) return canonical;
      if (ts.isIdentifier(expression)) {
        return identifierRefersToImportBinding(checker, expression)
          ? imports.get(expression.text) ?? null
          : null;
      }
      return ts.isPropertyAccessExpression(expression)
        && ts.isIdentifier(expression.expression)
        && namespaces.has(expression.expression.text)
        && identifierRefersToImportBinding(checker, expression.expression)
        ? expression.name.text
        : null;
    };
    const runtimeCompilerPackageValue = (
      expression: ts.Expression,
    ): RuntimeCompilerPackageValue | null => {
      const current = unwrapExpression(expression);
      if (ts.isIdentifier(current)) {
        const imported = runtimeCompilerImports.get(current.text);
        if (imported != null && identifierRefersToImportBinding(checker, current)) return imported;
      }
      if (ts.isPropertyAccessExpression(current) && ts.isIdentifier(current.expression)) {
        const namespace = runtimeCompilerNamespaces.get(current.expression.text);
        if (
          namespace?.packageKind != null
          && identifierRefersToImportBinding(checker, current.expression)
        ) {
          return {
            packageKind: namespace.packageKind,
            exportName: current.name.text,
          };
        }
      }
      const canonical = frameworkApiValue(current);
      return canonical?.runtimeCompilerPackageKind == null
        ? null
        : {
            packageKind: canonical.runtimeCompilerPackageKind,
            exportName: canonical.exportName,
          };
    };
    const admitRuntimeCompilerPackageValue = (
      value: RuntimeCompilerPackageValue,
    ): void => {
      if (runtimeCompilerIndependentValueExports[value.packageKind].has(value.exportName)) return;
      addRuntimeCompilationPressure(
        sourceFile.fileName,
        value.exportName,
        resourceReasons,
        rendererReasons,
        eventReasons,
      );
    };
    for (const value of runtimeCompilerReexports) {
      admitRuntimeCompilerPackageValue(value);
    }
    for (const packageKind of runtimeCompilerOpenReexports) {
      addRuntimeCompilerNamespacePressure(
        sourceFile.fileName,
        packageKind,
        'namespace-escape',
        resourceReasons,
        rendererReasons,
        eventReasons,
      );
    }
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && !isImportBinding(node) && !isTypePosition(node)) {
        const runtimeCompilerValue = runtimeCompilerPackageValue(node);
        if (runtimeCompilerValue != null) {
          admitRuntimeCompilerPackageValue(runtimeCompilerValue);
        }
        const exportName = frameworkApiValue(node)?.exportName
          ?? (imports.has(node.text) && identifierRefersToImportBinding(checker, node)
            ? imports.get(node.text) ?? null
            : null);
        if (exportName != null && rendererApiNames.has(exportName)) {
          rendererReasons.push(programmaticReason(sourceFile.fileName, exportName, 'value-use'));
        }
        if (exportName != null && eventApiNames.has(exportName)) {
          eventReasons.push(programmaticReason(sourceFile.fileName, exportName, 'value-use'));
        }
        if (
          runtimeCompilerValue == null
          && exportName != null
          && compilerApiNames.has(exportName)
        ) {
          addRuntimeCompilationPressure(
            sourceFile.fileName,
            exportName,
            resourceReasons,
            rendererReasons,
            eventReasons,
          );
        }
        const namespace = runtimeCompilerNamespaces.get(node.text);
        if (
          namespace?.canExposeRuntimeCompilerPackages === true
          && identifierRefersToImportBinding(checker, node)
          && !isStaticOrComputedNamespaceReceiver(node)
        ) {
          addRuntimeCompilerNamespacePressure(
            sourceFile.fileName,
            namespace.packageKind,
            isNamespaceSpread(node) ? 'namespace-spread' : 'namespace-escape',
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
        && identifierRefersToImportBinding(checker, node.expression)
        && !isTypePosition(node)
      ) {
        const runtimeCompilerValue = runtimeCompilerPackageValue(node);
        if (runtimeCompilerValue != null) {
          admitRuntimeCompilerPackageValue(runtimeCompilerValue);
        }
        const exportName = frameworkApiValue(node.name)?.exportName ?? node.name.text;
        if (rendererApiNames.has(exportName)) {
          rendererReasons.push(programmaticReason(sourceFile.fileName, exportName, 'namespace-value-use'));
        }
        if (eventApiNames.has(exportName)) {
          eventReasons.push(programmaticReason(sourceFile.fileName, exportName, 'namespace-value-use'));
        }
        if (runtimeCompilerValue == null && compilerApiNames.has(exportName)) {
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
        ts.isElementAccessExpression(node)
        && ts.isIdentifier(node.expression)
        && !isTypePosition(node)
      ) {
        const namespace = runtimeCompilerNamespaces.get(node.expression.text);
        if (
          namespace?.canExposeRuntimeCompilerPackages === true
          && identifierRefersToImportBinding(checker, node.expression)
        ) {
          addRuntimeCompilerNamespacePressure(
            sourceFile.fileName,
            namespace.packageKind,
            'namespace-computed-access',
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
      if (
        ts.isCallExpression(node)
        && node.expression.kind === ts.SyntaxKind.ImportKeyword
        && node.arguments[0] != null
        && ts.isStringLiteralLike(node.arguments[0])
      ) {
        const packageKind = runtimeCompilerPackageKindForModuleSpecifier(node.arguments[0].text);
        if (packageKind != null) {
          addRuntimeCompilerNamespacePressure(
            sourceFile.fileName,
            packageKind,
            'dynamic-import',
            resourceReasons,
            rendererReasons,
            eventReasons,
          );
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

function identifierRefersToImportBinding(
  checker: ts.TypeChecker,
  node: ts.Identifier,
): boolean {
  return checker.getSymbolAtLocation(node)?.declarations?.some((declaration) =>
    ts.isImportSpecifier(declaration)
    || ts.isImportClause(declaration)
    || ts.isNamespaceImport(declaration)
  ) === true;
}

function isStaticOrComputedNamespaceReceiver(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent))
    && parent.expression === node;
}

function isNamespaceSpread(node: ts.Identifier): boolean {
  return ts.isSpreadAssignment(node.parent) || ts.isSpreadElement(node.parent);
}

function runtimeCompilerPackageKindForModuleSpecifier(
  moduleSpecifier: string,
): RuntimeCompilerPackageKind | null {
  switch (moduleSpecifier) {
    case '@aurelia/expression-parser': return 'expression-parser';
    case '@aurelia/template-compiler': return 'template-compiler';
    default: return null;
  }
}

function isRuntimeRegistrationApiModule(moduleSpecifier: string): boolean {
  return moduleSpecifier === 'aurelia'
    || moduleSpecifier === '@aurelia/runtime-html'
    || moduleSpecifier === '@aurelia/kernel'
    || moduleSpecifier === '@aurelia/template-compiler'
    || moduleSpecifier === '@aurelia/expression-parser';
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

function addRuntimeCompilerNamespacePressure(
  fileName: string,
  packageKind: RuntimeCompilerPackageKind | null,
  operation: 'dynamic-import' | 'namespace-computed-access' | 'namespace-escape' | 'namespace-spread',
  resourceReasons: RuntimeRegistrationRequirementReason[],
  rendererReasons: RuntimeRegistrationRequirementReason[],
  eventReasons: RuntimeRegistrationRequirementReason[],
): void {
  const packageName = packageKind == null ? 'aurelia-compiler-reexports' : `@aurelia/${packageKind}`;
  const entry = reason(
    RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
    `Programmatic ${operation} can expose '${packageName}' values outside the browser-final handoff.`,
    [fileName, packageName, operation],
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
