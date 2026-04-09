import * as ts from "typescript";
import type { TypeScriptProjectGeneration } from "../../typescript/programs/typescript-project-port.js";
import {
  consumeAnalysisDepth,
  createAnalysisContext,
  readReturnExpression,
  resolveCallable,
  resolveExpressionValue,
  type TypeScriptAnalysisContext
} from "../../typescript/analysis/resolved-value.js";
import {
  FrameworkConfigurationRootKind,
  FrameworkDirectRegistrationBuilderKind,
  FrameworkRootWrapperKind,
  FrameworkRegisterReceiverKind,
  isFrameworkAppTaskCall,
  resolveFrameworkRootWrapperKind,
  resolveFrameworkConfigurationRootKind,
  resolveFrameworkConfigurationRootKindFromSymbol,
  resolveFrameworkDirectRegistrationBuilderKind,
  resolveFrameworkRegisterReceiverKind
} from "../../typescript/analysis/framework-interpretation.js";
import {
  ActiveRegistrationPattern,
  RegistrationAnalyzabilityBandId,
  RegistrationAnalyzabilityTierId,
  RegistrationCompletenessPostureId,
  RegistrationOpenResidualId,
  RegistrationPatternFamilyKind,
  RegistrationPatternMetadata,
  RegistrationPatternScanResult,
  RegistrationReasonKind,
  RegistrationSupportBehaviorKind,
  RegistrationTopologyRuntimeHookId,
  RegistrationTransitionClassId,
  RegistrationWitnessBasisId,
  UnderclosedRegistrationPattern
} from "./registration-pattern.js";
import {
  ConstructorArchetypeKind,
  LookupRegimeKind,
  MaterializationTimingKind,
  RegistrationPathKind,
  WorldRegimeKind
} from "./consulted-world.js";

type RegisterReceiverContext = {
  readonly worldRegime: WorldRegimeKind;
  readonly registrationPath: RegistrationPathKind;
  readonly lookupRegime: LookupRegimeKind;
  readonly materializationTiming: MaterializationTimingKind;
};

type RegistrationPatternResolution = {
  readonly activePatterns: readonly ActiveRegistrationPattern[];
  readonly underclosedPatterns: readonly UnderclosedRegistrationPattern[];
};

type CustomizeProviderAnalysis =
  | {
      readonly kind: "explicit";
    }
  | {
      readonly kind: "open";
      readonly reasonIds: readonly RegistrationReasonKind[];
      readonly note: string;
    };

type CustomizeChainAnalysis = {
  readonly kind: CustomizeProviderAnalysis["kind"];
  readonly analyzabilityTierId: RegistrationAnalyzabilityTierId;
  readonly reasonIds: readonly RegistrationReasonKind[];
  readonly note?: string;
};

type CustomizeChain = {
  readonly baseName: string | undefined;
  readonly configurationRootKind: FrameworkConfigurationRootKind | undefined;
  readonly depth: number;
  readonly customizeCalls: readonly ts.CallExpression[];
};

type RootWrapperRegistration = {
  readonly kind: FrameworkRootWrapperKind;
  readonly registerCall: ts.CallExpression & {
    readonly expression: ts.PropertyAccessExpression;
  };
};

const EMPTY_RESOLUTION: RegistrationPatternResolution = {
  activePatterns: [],
  underclosedPatterns: []
};

export class RegistrationPatternScanner {
  public scan(
    generation: TypeScriptProjectGeneration
  ): RegistrationPatternScanResult {
    const activePatterns: ActiveRegistrationPattern[] = [];
    const underclosedPatterns: UnderclosedRegistrationPattern[] = [];

    for (const sourceFile of generation.listSemanticSourceFiles()) {
      this.scanSourceFile(
        sourceFile,
        generation,
        activePatterns,
        underclosedPatterns
      );
    }

    return new RegistrationPatternScanResult(
      activePatterns.sort(compareActivePatterns),
      underclosedPatterns.sort(compareUnderclosedPatterns)
    );
  }

  private scanSourceFile(
    sourceFile: ts.SourceFile,
    generation: TypeScriptProjectGeneration,
    activePatterns: ActiveRegistrationPattern[],
    underclosedPatterns: UnderclosedRegistrationPattern[]
  ): void {
    const context = createAnalysisContext(generation.checker);

    for (const statement of sourceFile.statements) {
      this.scanNode(
        statement,
        sourceFile.fileName,
        context,
        activePatterns,
        underclosedPatterns
      );
    }
  }

  private scanNode(
    node: ts.Node,
    registrationFileName: string,
    context: TypeScriptAnalysisContext,
    activePatterns: ActiveRegistrationPattern[],
    underclosedPatterns: UnderclosedRegistrationPattern[]
  ): void {
    if (context.depth <= 0) {
      return;
    }

    if (ts.isExpressionStatement(node)) {
      this.scanExpression(
        node.expression,
        registrationFileName,
        context,
        activePatterns,
        underclosedPatterns
      );
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (declaration.initializer === undefined) {
          continue;
        }

        this.scanExpression(
          declaration.initializer,
          registrationFileName,
          context,
          activePatterns,
          underclosedPatterns
        );
      }
    }
  }

  private scanExpression(
    expression: ts.Expression,
    registrationFileName: string,
    context: TypeScriptAnalysisContext,
    activePatterns: ActiveRegistrationPattern[],
    underclosedPatterns: UnderclosedRegistrationPattern[]
  ): void {
    if (context.depth <= 0) {
      return;
    }

    const unwrappedExpression = unwrapExpression(expression);
    if (!ts.isCallExpression(unwrappedExpression)) {
      return;
    }

    if (isRegisterCall(unwrappedExpression)) {
      const receiverContext = inferRegisterReceiverContext(
        unwrappedExpression.expression.expression,
        context
      );
      this.recordRegistrationPatterns(
        unwrappedExpression.arguments,
        registrationFileName,
        receiverContext,
        consumeAnalysisDepth(context),
        activePatterns,
        underclosedPatterns
      );
      return;
    }

    const rootWrapperResolution = resolveRootWrapperRegistration(
      unwrappedExpression,
      registrationFileName,
      context
    );
    if (rootWrapperResolution !== undefined) {
      activePatterns.push(...rootWrapperResolution.activePatterns);
      underclosedPatterns.push(...rootWrapperResolution.underclosedPatterns);
      return;
    }

    const callable = resolveCallable(unwrappedExpression.expression, context);
    if (callable === undefined) {
      return;
    }

    const callContext = bindCallArguments(callable, unwrappedExpression, context);
    if (callContext === undefined) {
      return;
    }

    this.scanCallableBody(
      callable,
      registrationFileName,
      callContext,
      activePatterns,
      underclosedPatterns
    );
  }

  private scanCallableBody(
    callable: ts.FunctionLikeDeclaration | ts.ArrowFunction | ts.FunctionExpression,
    registrationFileName: string,
    context: TypeScriptAnalysisContext,
    activePatterns: ActiveRegistrationPattern[],
    underclosedPatterns: UnderclosedRegistrationPattern[]
  ): void {
    if (callable.body === undefined) {
      return;
    }

    if (ts.isExpression(callable.body)) {
      this.scanExpression(
        callable.body,
        registrationFileName,
        context,
        activePatterns,
        underclosedPatterns
      );
      return;
    }

    for (const statement of callable.body.statements) {
      this.scanNode(
        statement,
        registrationFileName,
        context,
        activePatterns,
        underclosedPatterns
      );
    }
  }

  private recordRegistrationPatterns(
    expressions: readonly ts.Expression[],
    registrationFileName: string,
    receiverContext: RegisterReceiverContext,
    context: TypeScriptAnalysisContext,
    activePatterns: ActiveRegistrationPattern[],
    underclosedPatterns: UnderclosedRegistrationPattern[]
  ): void {
    const resolution = resolveRegistrationStack(
      expressions,
      registrationFileName,
      receiverContext,
      context
    );
    activePatterns.push(...resolution.activePatterns);
    underclosedPatterns.push(...resolution.underclosedPatterns);
  }
}

function resolveRegistrationStack(
  expressions: readonly ts.Expression[],
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  context: TypeScriptAnalysisContext
): RegistrationPatternResolution {
  return mergeResolutions(
    expressions.map((expression) => resolveRegistrationExpression(
      expression,
      registrationFileName,
      receiverContext,
      context
    ))
  );
}

function resolveRootWrapperRegistration(
  expression: ts.CallExpression,
  registrationFileName: string,
  context: TypeScriptAnalysisContext
): RegistrationPatternResolution | undefined {
  const rootWrapper = resolveRootWrapperRegistrationSource(expression, context);
  if (rootWrapper === undefined) {
    return undefined;
  }

  const receiverContext = inferRegisterReceiverContext(
    rootWrapper.registerCall.expression.expression,
    context
  );
  const stackResolution = resolveRegistrationStack(
    rootWrapper.registerCall.arguments,
    registrationFileName,
    receiverContext,
    consumeAnalysisDepth(context)
  );
  const synthesizedResolutions: RegistrationPatternResolution[] = [stackResolution];
  const mixedRootResolution = synthesizeMixedRootConstructorStack(
    stackResolution,
    registrationFileName
  );
  if (mixedRootResolution !== undefined) {
    synthesizedResolutions.push(mixedRootResolution);
  }

  const routedRootResolution = synthesizeRoutedRootWrapperAdmission(
    rootWrapper.kind,
    expression.arguments,
    stackResolution,
    registrationFileName
  );
  if (routedRootResolution !== undefined) {
    synthesizedResolutions.push(routedRootResolution);
  }

  return mergeResolutions(synthesizedResolutions);
}

function resolveRootWrapperRegistrationSource(
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): RootWrapperRegistration | undefined {
  const kind = resolveFrameworkRootWrapperKind(expression, context);
  if (kind === undefined || !ts.isPropertyAccessExpression(expression.expression)) {
    return undefined;
  }

  const registerCall = resolveRegisterCallSource(
    expression.expression.expression,
    consumeAnalysisDepth(context)
  );
  if (registerCall === undefined) {
    return undefined;
  }

  return {
    kind,
    registerCall
  };
}

function resolveRegisterCallSource(
  expression: ts.Expression,
  context: TypeScriptAnalysisContext
): (ts.CallExpression & {
  readonly expression: ts.PropertyAccessExpression;
}) | undefined {
  if (context.depth <= 0) {
    return undefined;
  }

  const unwrappedExpression = unwrapExpression(expression);
  if (ts.isCallExpression(unwrappedExpression)) {
    if (isRegisterCall(unwrappedExpression)) {
      return unwrappedExpression;
    }

    const callable = resolveCallable(unwrappedExpression.expression, context);
    const returnExpression = callable === undefined
      ? undefined
      : readReturnExpression(callable);
    return returnExpression === undefined
      ? undefined
      : resolveRegisterCallSource(returnExpression, consumeAnalysisDepth(context));
  }

  if (ts.isIdentifier(unwrappedExpression) || ts.isPropertyAccessExpression(unwrappedExpression)) {
    const symbol = resolveExpressionSymbol(unwrappedExpression, context);
    if (symbol === undefined) {
      return undefined;
    }

    return resolveRegisterCallSourceFromSymbol(symbol, consumeAnalysisDepth(context));
  }

  return undefined;
}

function resolveRegisterCallSourceFromSymbol(
  symbol: ts.Symbol,
  context: TypeScriptAnalysisContext
): (ts.CallExpression & {
  readonly expression: ts.PropertyAccessExpression;
}) | undefined {
  const resolvedSymbol = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? context.checker.getAliasedSymbol(symbol)
    : symbol;

  for (const declaration of resolvedSymbol.declarations ?? []) {
    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
      const registerCall = resolveRegisterCallSource(
        declaration.initializer,
        context
      );
      if (registerCall !== undefined) {
        return registerCall;
      }
    }

    if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) {
      const returnExpression = readReturnExpression(declaration);
      if (returnExpression !== undefined) {
        const registerCall = resolveRegisterCallSource(
          returnExpression,
          context
        );
        if (registerCall !== undefined) {
          return registerCall;
        }
      }
    }
  }

  return undefined;
}

function resolveRegistrationExpression(
  expression: ts.Expression,
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  context: TypeScriptAnalysisContext
): RegistrationPatternResolution {
  if (context.depth <= 0) {
    return EMPTY_RESOLUTION;
  }

  const unwrappedExpression = unwrapExpression(expression);

  if (ts.isArrayLiteralExpression(unwrappedExpression)) {
    return mergeResolutions(
      unwrappedExpression.elements
        .filter(ts.isExpression)
        .map((element) => resolveRegistrationExpression(
          element,
          registrationFileName,
          receiverContext,
          consumeAnalysisDepth(context)
        ))
    );
  }

  if (ts.isObjectLiteralExpression(unwrappedExpression)) {
    return hasRegisterMember(unwrappedExpression)
      ? {
          activePatterns: [
            createActivePattern(
              RegistrationPatternFamilyKind.AggregateBundle,
              RegistrationSupportBehaviorKind.ClaimAndClose,
              registrationFileName,
              receiverContext,
              [ConstructorArchetypeKind.AggregateBundle],
              createAggregateBundleMetadata()
            )
          ],
          underclosedPatterns: []
        }
      : EMPTY_RESOLUTION;
  }

  if (ts.isIdentifier(unwrappedExpression) || ts.isPropertyAccessExpression(unwrappedExpression)) {
    const symbol = resolveExpressionSymbol(unwrappedExpression, context);
    if (symbol === undefined) {
      return EMPTY_RESOLUTION;
    }

    return resolveRegistrationExpressionFromSymbol(
      symbol,
      registrationFileName,
      receiverContext,
      consumeAnalysisDepth(context)
    );
  }

  if (ts.isCallExpression(unwrappedExpression)) {
    if (isFrameworkAppTaskCall(unwrappedExpression, context)) {
      return resolveAppTaskRegistration(
        unwrappedExpression,
        registrationFileName,
        receiverContext,
        context
      );
    }

    if (isAuComposeBoundaryCall(unwrappedExpression)) {
      return {
        activePatterns: [],
        underclosedPatterns: [
          createUnderclosedPattern(
            RegistrationPatternFamilyKind.LateBoundDynamicCompositionLookup,
            RegistrationSupportBehaviorKind.DetectRuntimeOnlyBoundary,
            registrationFileName,
            {
              worldRegime: WorldRegimeKind.OwnerBoundedLocal,
              registrationPath: receiverContext.registrationPath,
              lookupRegime: LookupRegimeKind.OwnerBoundedLocal,
              materializationTiming: MaterializationTimingKind.RenderTimeBranch
            },
            [ConstructorArchetypeKind.ChildWorldBranch],
            createLateBoundDynamicCompositionMetadata(),
            [
              RegistrationReasonKind.DynamicLateBinding,
              RegistrationReasonKind.RuntimeTopologyDependent,
              RegistrationReasonKind.RenderBranchDependent
            ],
            "Dynamic composition lookup stays runtime-only inside the current registration-world ceiling."
          )
        ]
      };
    }

    const directRegistrationBuilderKind = resolveFrameworkDirectRegistrationBuilderKind(
      unwrappedExpression,
      context
    );
    if (directRegistrationBuilderKind === FrameworkDirectRegistrationBuilderKind.RegistrationBuilder) {
      return areRegistrationArgumentsExplicit(unwrappedExpression.arguments, context)
        ? {
            activePatterns: [
              createActivePattern(
                RegistrationPatternFamilyKind.DirectRegistrationBuilderAliasBundle,
                RegistrationSupportBehaviorKind.ClaimAndClose,
                registrationFileName,
                {
                  worldRegime: WorldRegimeKind.RegistryCarrier,
                  registrationPath: RegistrationPathKind.KernelRegistration,
                  lookupRegime: LookupRegimeKind.GenericDiAncestor,
                  materializationTiming: MaterializationTimingKind.Eager
                },
                [],
                createDirectDiAliasBundleMetadata()
              )
            ],
            underclosedPatterns: []
          }
        : {
            activePatterns: [],
            underclosedPatterns: [
              createUnderclosedPattern(
                RegistrationPatternFamilyKind.CallbackLocalDynamicRegistration,
                RegistrationSupportBehaviorKind.DetectAndDeclareUnsupported,
                registrationFileName,
                {
                  worldRegime: WorldRegimeKind.RegistryCarrier,
                  registrationPath: RegistrationPathKind.KernelRegistration,
                  lookupRegime: LookupRegimeKind.GenericDiAncestor,
                  materializationTiming: MaterializationTimingKind.Eager
                },
                [],
                createCallbackLocalDynamicMetadata(),
                [
                  RegistrationReasonKind.UserCodeExecutionDependent,
                  RegistrationReasonKind.DynamicLateBinding
                ],
                "Direct registration-builder payloads fell outside the current static closure ceiling."
              )
            ]
          };
    }
    if (directRegistrationBuilderKind === FrameworkDirectRegistrationBuilderKind.WrongDiHelper) {
      return EMPTY_RESOLUTION;
    }

    const customizeChain = inspectCustomizeChain(unwrappedExpression, context);
    if (customizeChain !== undefined) {
      return resolveCustomizeRegistration(
        customizeChain,
        registrationFileName,
        receiverContext,
        context
      );
    }

    const callable = resolveCallable(unwrappedExpression.expression, context);
    if (callable === undefined) {
      return EMPTY_RESOLUTION;
    }

    const returnExpression = readReturnExpression(callable);
    if (returnExpression === undefined) {
      return EMPTY_RESOLUTION;
    }

    const callContext = bindCallArguments(callable, unwrappedExpression, context);
    if (callContext === undefined) {
      return EMPTY_RESOLUTION;
    }

    return resolveRegistrationExpression(
      returnExpression,
      registrationFileName,
      receiverContext,
      callContext
    );
  }

  return EMPTY_RESOLUTION;
}

function resolveRegistrationExpressionFromSymbol(
  symbol: ts.Symbol,
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  context: TypeScriptAnalysisContext
): RegistrationPatternResolution {
  const resolvedSymbol = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? context.checker.getAliasedSymbol(symbol)
    : symbol;
  const symbolName = resolvedSymbol.name;

  if (looksLikeAggregateBundleSymbol(symbolName, resolvedSymbol, context)) {
    return {
      activePatterns: [
        createActivePattern(
          RegistrationPatternFamilyKind.AggregateBundle,
          RegistrationSupportBehaviorKind.ClaimAndClose,
          registrationFileName,
          receiverContext,
          [ConstructorArchetypeKind.AggregateBundle],
          createAggregateBundleMetadata()
        )
      ],
      underclosedPatterns: []
    };
  }

  for (const declaration of resolvedSymbol.declarations ?? []) {
    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
      return resolveRegistrationExpression(
        declaration.initializer,
        registrationFileName,
        receiverContext,
        context
      );
    }

    if (
      ts.isFunctionDeclaration(declaration) ||
      ts.isMethodDeclaration(declaration)
    ) {
      const returnExpression = readReturnExpression(declaration);
      if (returnExpression !== undefined) {
        return resolveRegistrationExpression(
          returnExpression,
          registrationFileName,
          receiverContext,
          context
        );
      }
    }

    if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
      if (looksLikeAggregateBundleSymbol(symbolName, resolvedSymbol, context)) {
        return {
          activePatterns: [
            createActivePattern(
              RegistrationPatternFamilyKind.AggregateBundle,
              RegistrationSupportBehaviorKind.ClaimAndClose,
              registrationFileName,
              receiverContext,
              [ConstructorArchetypeKind.AggregateBundle],
              createAggregateBundleMetadata()
            )
          ],
          underclosedPatterns: []
        };
      }
    }
  }

  return EMPTY_RESOLUTION;
}

function resolveCustomizeRegistration(
  customizeChain: CustomizeChain,
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  context: TypeScriptAnalysisContext
): RegistrationPatternResolution {
  const configuredReceiverContext: RegisterReceiverContext = {
    worldRegime: WorldRegimeKind.ConstructorEmission,
    registrationPath: RegistrationPathKind.ConfigurationEmission,
    lookupRegime: receiverContext.lookupRegime,
    materializationTiming: receiverContext.materializationTiming
  };
  const configuredArchetypes = determineConfiguredEmissionArchetypes(customizeChain);

  if (customizeChain.configurationRootKind === FrameworkConfigurationRootKind.Router) {
    return {
      activePatterns: [],
      underclosedPatterns: [
        createUnderclosedPattern(
          RegistrationPatternFamilyKind.RouteConfigAdmissionWorld,
          RegistrationSupportBehaviorKind.DetectAndDeclareOpen,
          registrationFileName,
          {
            worldRegime: WorldRegimeKind.ConstructorEmission,
            registrationPath: RegistrationPathKind.ConfigurationEmission,
            lookupRegime: LookupRegimeKind.OwnerBoundedLocal,
            materializationTiming: MaterializationTimingKind.RenderTimeBranch
          },
          [
            ConstructorArchetypeKind.CustomizedDefault,
            ConstructorArchetypeKind.ComposedLayer
          ],
          createRouteConfigMetadata(),
          [
            RegistrationReasonKind.ImportedModuleSelectionDependent,
            RegistrationReasonKind.ActiveWorldScopeDependent
          ],
          "Route configuration admission is visible, but the admitted route world stays open inside the current registration-world ceiling."
        )
      ]
    };
  }

  const chainAnalysis = analyzeCustomizeChain(customizeChain, context);
  const activePatterns: ActiveRegistrationPattern[] = [];
  const underclosedPatterns: UnderclosedRegistrationPattern[] = [];

  if (customizeChain.depth > 1) {
    activePatterns.push(
      createActivePattern(
        RegistrationPatternFamilyKind.StagedBuilderFinalization,
        chainAnalysis.kind === "explicit"
          ? RegistrationSupportBehaviorKind.ClaimAndClose
          : RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        configuredReceiverContext,
        [
          ConstructorArchetypeKind.StagedBuilder,
          ...configuredArchetypes
        ],
        createStagedBuilderMetadata(chainAnalysis)
      )
    );

    if (chainAnalysis.kind === "open") {
      underclosedPatterns.push(
        createUnderclosedPattern(
          RegistrationPatternFamilyKind.StagedBuilderFinalization,
          RegistrationSupportBehaviorKind.ClaimWithQualifiers,
          registrationFileName,
          configuredReceiverContext,
          [
            ConstructorArchetypeKind.StagedBuilder,
            ...configuredArchetypes
          ],
          createStagedBuilderMetadata(chainAnalysis),
          chainAnalysis.reasonIds,
          chainAnalysis.note ??
            "Staged builder finalization widened the registration world, but the layered builder history stays qualified inside the current analysis ceiling."
        )
      );
    }
  }

  activePatterns.push(
    createActivePattern(
      RegistrationPatternFamilyKind.ConfiguredEmissionRegistry,
      chainAnalysis.kind === "explicit"
        ? RegistrationSupportBehaviorKind.ClaimAndClose
        : RegistrationSupportBehaviorKind.ClaimWithQualifiers,
      registrationFileName,
      configuredReceiverContext,
      configuredArchetypes,
      createConfiguredEmissionMetadata(chainAnalysis)
    )
  );

  if (chainAnalysis.kind === "open") {
    underclosedPatterns.push(
      createUnderclosedPattern(
        RegistrationPatternFamilyKind.ConfiguredEmissionRegistry,
        RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        configuredReceiverContext,
        configuredArchetypes,
        createConfiguredEmissionMetadata(chainAnalysis),
        chainAnalysis.reasonIds,
        chainAnalysis.note ??
          "Configuration customization callback left registration-side consequence underclosed inside the current analysis ceiling."
      )
    );
  }

  return {
    activePatterns,
    underclosedPatterns
  };
}

function resolveAppTaskRegistration(
  expression: ts.CallExpression,
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  context: TypeScriptAnalysisContext
): RegistrationPatternResolution {
  const callbackExpression = expression.arguments[0];
  const lifecycleReceiverContext: RegisterReceiverContext = {
    worldRegime: WorldRegimeKind.ConstructorEmission,
    registrationPath: RegistrationPathKind.ConfigurationEmission,
    lookupRegime: receiverContext.lookupRegime,
    materializationTiming: MaterializationTimingKind.LifecycleSlotGated
  };

  if (callbackExpression === undefined || !ts.isExpression(callbackExpression)) {
    return {
      activePatterns: [],
      underclosedPatterns: [
        createUnderclosedPattern(
          RegistrationPatternFamilyKind.CallbackLocalDynamicRegistration,
          RegistrationSupportBehaviorKind.DetectAndDeclareUnsupported,
          registrationFileName,
          lifecycleReceiverContext,
          [ConstructorArchetypeKind.LifecycleAttached],
          createCallbackLocalDynamicMetadata(),
          [
            RegistrationReasonKind.UserCodeExecutionDependent,
            RegistrationReasonKind.DynamicLateBinding
          ],
          "Lifecycle-attached registration callback could not be resolved inside the current analysis ceiling."
        )
      ]
    };
  }

  const callback = (
    ts.isArrowFunction(callbackExpression) ||
    ts.isFunctionExpression(callbackExpression)
  )
    ? callbackExpression
    : resolveCallable(callbackExpression as ts.LeftHandSideExpression, context);

  if (callback === undefined || callback.body === undefined) {
    return {
      activePatterns: [],
      underclosedPatterns: [
        createUnderclosedPattern(
          RegistrationPatternFamilyKind.CallbackLocalDynamicRegistration,
          RegistrationSupportBehaviorKind.DetectAndDeclareUnsupported,
          registrationFileName,
          lifecycleReceiverContext,
          [ConstructorArchetypeKind.LifecycleAttached],
          createCallbackLocalDynamicMetadata(),
          [
            RegistrationReasonKind.UserCodeExecutionDependent,
            RegistrationReasonKind.DynamicLateBinding
          ],
          "Lifecycle-attached registration callback remained opaque inside the current analysis ceiling."
        )
      ]
    };
  }

  const nestedRegisterCalls = collectRegisterCalls(callback.body);
  if (nestedRegisterCalls.length === 0) {
    return {
      activePatterns: [],
      underclosedPatterns: [
        createUnderclosedPattern(
          RegistrationPatternFamilyKind.CallbackLocalDynamicRegistration,
          RegistrationSupportBehaviorKind.DetectAndDeclareUnsupported,
          registrationFileName,
          lifecycleReceiverContext,
          [ConstructorArchetypeKind.LifecycleAttached],
          createCallbackLocalDynamicMetadata(),
          [
            RegistrationReasonKind.UserCodeExecutionDependent,
            RegistrationReasonKind.DynamicLateBinding
          ],
          "Lifecycle-attached callback performs registration dynamically and cannot be closed from the current callsite shape."
        )
      ]
    };
  }

  let foundStaticRegistration = false;
  let foundDynamicRegistration = false;

  for (const registerCall of nestedRegisterCalls) {
    for (const argument of registerCall.arguments) {
      const nestedResolution = resolveRegistrationExpression(
        argument,
        registrationFileName,
        {
          worldRegime: WorldRegimeKind.ConstructorEmission,
          registrationPath: inferRegisterReceiverContext(
            (registerCall.expression as ts.PropertyAccessExpression).expression,
            context
          ).registrationPath,
          lookupRegime: receiverContext.lookupRegime,
          materializationTiming: MaterializationTimingKind.LifecycleSlotGated
        },
        consumeAnalysisDepth(context)
      );

      if (nestedResolution.activePatterns.length > 0) {
        foundStaticRegistration = true;
      } else {
        foundDynamicRegistration = true;
      }
    }
  }

  const activePatterns = foundStaticRegistration
    ? [
        createActivePattern(
          RegistrationPatternFamilyKind.LifecycleGatedRegistration,
          RegistrationSupportBehaviorKind.ClaimWithQualifiers,
          registrationFileName,
          lifecycleReceiverContext,
          [ConstructorArchetypeKind.LifecycleAttached],
          createLifecycleGatedMetadata()
        )
      ]
    : [];
  const underclosedPatterns: UnderclosedRegistrationPattern[] = [];

  if (foundStaticRegistration) {
    underclosedPatterns.push(
      createUnderclosedPattern(
        RegistrationPatternFamilyKind.LifecycleGatedRegistration,
        RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        lifecycleReceiverContext,
        [ConstructorArchetypeKind.LifecycleAttached],
        createLifecycleGatedMetadata(),
        [
          RegistrationReasonKind.LifecycleGateDependent,
          RegistrationReasonKind.RenderBranchDependent
        ],
        "Lifecycle-attached registration is admitted, but current-world activity stays qualified until the lifecycle gate runs."
      )
    );
  }

  if (foundDynamicRegistration) {
    underclosedPatterns.push(
      createUnderclosedPattern(
        RegistrationPatternFamilyKind.CallbackLocalDynamicRegistration,
        RegistrationSupportBehaviorKind.DetectAndDeclareUnsupported,
        registrationFileName,
        lifecycleReceiverContext,
        [ConstructorArchetypeKind.LifecycleAttached],
        createCallbackLocalDynamicMetadata(),
        [
          RegistrationReasonKind.UserCodeExecutionDependent,
          RegistrationReasonKind.DynamicLateBinding
        ],
        "Lifecycle callback includes dynamic registration payloads that stay unsupported inside the current static ceiling."
      )
    );
  }

  return {
    activePatterns,
    underclosedPatterns
  };
}

function synthesizeMixedRootConstructorStack(
  stackResolution: RegistrationPatternResolution,
  registrationFileName: string
): RegistrationPatternResolution | undefined {
  const constructorArchetypes = collectMixedRootConstructorArchetypes(stackResolution);
  if (constructorArchetypes.length < 2) {
    return undefined;
  }

  const reasonIds = collectMixedRootReasonIds(stackResolution);
  const receiverContext: RegisterReceiverContext = {
    worldRegime: WorldRegimeKind.ConstructorEmission,
    registrationPath: RegistrationPathKind.ConfigurationEmission,
    lookupRegime: selectMixedRootLookupRegime(stackResolution),
    materializationTiming: selectMixedRootMaterializationTiming(stackResolution)
  };
  const metadata = createMixedRootConstructorStackMetadata(reasonIds);
  return {
    activePatterns: [
      createActivePattern(
        RegistrationPatternFamilyKind.MixedRootConstructorStack,
        RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        receiverContext,
        constructorArchetypes,
        metadata
      )
    ],
    underclosedPatterns: [
      createUnderclosedPattern(
        RegistrationPatternFamilyKind.MixedRootConstructorStack,
        RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        receiverContext,
        constructorArchetypes,
        metadata,
        reasonIds,
        "The root startup path composes heterogeneous constructor surfaces, but lifecycle and current-world scope still keep the full stack qualified."
      )
    ]
  };
}

function synthesizeRoutedRootWrapperAdmission(
  rootWrapperKind: FrameworkRootWrapperKind,
  rootWrapperArguments: readonly ts.Expression[],
  stackResolution: RegistrationPatternResolution,
  registrationFileName: string
): RegistrationPatternResolution | undefined {
  if (
    rootWrapperArguments.length === 0 ||
    !hasRoutedRootShellPressure(stackResolution)
  ) {
    return undefined;
  }

  const reasonIds = [
    RegistrationReasonKind.ActiveWorldScopeDependent,
    RegistrationReasonKind.RenderBranchDependent
  ] as const;
  const receiverContext: RegisterReceiverContext = {
    worldRegime: WorldRegimeKind.ConstructorEmission,
    registrationPath: RegistrationPathKind.ConfigurationEmission,
    lookupRegime: LookupRegimeKind.OwnerBoundedLocal,
    materializationTiming: rootWrapperKind === FrameworkRootWrapperKind.Hydrate
      ? MaterializationTimingKind.LifecycleSlotGated
      : MaterializationTimingKind.RenderTimeBranch
  };
  const metadata = createRoutedRootWrapperMetadata(reasonIds);
  return {
    activePatterns: [
      createActivePattern(
        RegistrationPatternFamilyKind.RoutedRootWrapperAdmission,
        RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        receiverContext,
        [],
        metadata
      )
    ],
    underclosedPatterns: [
      createUnderclosedPattern(
        RegistrationPatternFamilyKind.RoutedRootWrapperAdmission,
        RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        receiverContext,
        [],
        metadata,
        [...reasonIds],
        "The routed root wrapper is visible, but route-shell admission still depends on active-world scope and render-time branching."
      )
    ]
  };
}

function determineConfiguredEmissionArchetypes(
  customizeChain: CustomizeChain
): readonly ConstructorArchetypeKind[] {
  return customizeChain.configurationRootKind === FrameworkConfigurationRootKind.I18n
    ? [
        ConstructorArchetypeKind.CustomizedDefault,
        ConstructorArchetypeKind.GeneratedSyntax
      ]
    : [ConstructorArchetypeKind.CustomizedDefault];
}

function analyzeCustomizeProvider(
  providerArgument: ts.Expression | undefined,
  context: TypeScriptAnalysisContext
): CustomizeProviderAnalysis {
  if (providerArgument === undefined) {
    return { kind: "explicit" };
  }

  const callable = (
    ts.isArrowFunction(providerArgument) ||
    ts.isFunctionExpression(providerArgument)
  )
    ? providerArgument
    : resolveCallable(providerArgument as ts.LeftHandSideExpression, context);

  if (callable === undefined || callable.body === undefined) {
    return {
      kind: "open",
      reasonIds: [RegistrationReasonKind.CallbackOpaquePayload],
      note: "Configuration customization callback could not be resolved inside the current builder-history ceiling."
    };
  }

  if (ts.isExpression(callable.body)) {
    const resolvedValue = resolveExpressionValue(callable.body, consumeAnalysisDepth(context));
    return resolvedValue === undefined
      ? {
          kind: "open",
          reasonIds: [RegistrationReasonKind.CallbackOpaquePayload],
          note: "Configuration customization callback returned an underclosed payload."
        }
      : { kind: "explicit" };
  }

  for (const statement of callable.body.statements) {
    if (!ts.isExpressionStatement(statement)) {
      return {
        kind: "open",
        reasonIds: [RegistrationReasonKind.CallbackOpaquePayload],
        note: "Configuration customization callback uses non-expression control flow that stays underclosed."
      };
    }

    const expression = unwrapExpression(statement.expression);
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const resolvedValue = resolveExpressionValue(
        expression.right,
        consumeAnalysisDepth(context)
      );
      if (resolvedValue === undefined) {
        return {
          kind: "open",
          reasonIds: [RegistrationReasonKind.CallbackOpaquePayload],
          note: "Configuration customization callback assigned a payload that stayed underclosed."
        };
      }

      continue;
    }

    const resolvedValue = resolveExpressionValue(expression, consumeAnalysisDepth(context));
    if (resolvedValue === undefined) {
      return {
        kind: "open",
        reasonIds: [RegistrationReasonKind.CallbackOpaquePayload],
        note: "Configuration customization callback used an unresolvable payload."
      };
    }
  }

  return { kind: "explicit" };
}

function analyzeCustomizeChain(
  customizeChain: CustomizeChain,
  context: TypeScriptAnalysisContext
): CustomizeChainAnalysis {
  let hasSourceAnalyzableProvider = false;

  for (const customizeCall of customizeChain.customizeCalls) {
    const providerAnalysis = analyzeCustomizeProvider(
      customizeCall.arguments[0],
      context
    );

    if (providerAnalysis.kind === "open") {
      return {
        kind: "open",
        analyzabilityTierId: RegistrationAnalyzabilityTierId.SourceAnalyzable,
        reasonIds: providerAnalysis.reasonIds,
        note: providerAnalysis.note
      };
    }

    if (customizeCall.arguments[0] !== undefined) {
      hasSourceAnalyzableProvider = true;
    }
  }

  return {
    kind: "explicit",
    analyzabilityTierId: hasSourceAnalyzableProvider
      ? RegistrationAnalyzabilityTierId.SourceAnalyzable
      : RegistrationAnalyzabilityTierId.GeneratedExplicit,
    reasonIds: []
  };
}

function inspectCustomizeChain(
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): CustomizeChain | undefined {
  const customizeCalls: ts.CallExpression[] = [];
  let currentExpression: ts.Expression = expression;

  while (ts.isCallExpression(currentExpression)) {
    const currentCall = currentExpression;
    if (
      !ts.isPropertyAccessExpression(currentCall.expression) ||
      currentCall.expression.name.text !== "customize"
    ) {
      break;
    }

    customizeCalls.push(currentCall);
    currentExpression = unwrapExpression(currentCall.expression.expression);
  }

  if (customizeCalls.length === 0) {
    return undefined;
  }

  const baseName = readBaseExpressionName(currentExpression, context);
  return {
    baseName,
    configurationRootKind: resolveFrameworkConfigurationRootKind(
      currentExpression,
      consumeAnalysisDepth(context)
    ),
    depth: customizeCalls.length,
    customizeCalls
  };
}

function bindCallArguments(
  callable: ts.FunctionLikeDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): TypeScriptAnalysisContext | undefined {
  const bindings = new Map(context.bindings);
  for (let index = 0; index < callable.parameters.length; index += 1) {
    const parameter = callable.parameters[index];
    if (parameter === undefined || !ts.isIdentifier(parameter.name)) {
      return undefined;
    }

    const argument = expression.arguments[index];
    if (argument !== undefined) {
      bindings.set(parameter.name.text, argument);
    }
  }

  return createAnalysisContext(
    context.checker,
    bindings,
    context.depth - 1,
    context.seenDeclarations
  );
}

function mergeResolutions(
  resolutions: readonly RegistrationPatternResolution[]
): RegistrationPatternResolution {
  return {
    activePatterns: resolutions.flatMap((resolution) => resolution.activePatterns),
    underclosedPatterns: resolutions.flatMap((resolution) => resolution.underclosedPatterns)
  };
}

function collectRegisterCalls(
  node: ts.Node
): readonly ts.CallExpression[] {
  const registerCalls: ts.CallExpression[] = [];

  const visit = (child: ts.Node): void => {
    if (ts.isCallExpression(child) && isRegisterCall(child)) {
      registerCalls.push(child);
    }

    ts.forEachChild(child, visit);
  };

  ts.forEachChild(node, visit);
  return registerCalls;
}

function inferRegisterReceiverContext(
  receiverExpression: ts.Expression,
  context: TypeScriptAnalysisContext
): RegisterReceiverContext {
  const receiverKind = resolveFrameworkRegisterReceiverKind(
    receiverExpression,
    context
  );
  if (receiverKind === FrameworkRegisterReceiverKind.KernelRegistration) {
    return {
      worldRegime: WorldRegimeKind.RegistryCarrier,
      registrationPath: RegistrationPathKind.KernelRegistration,
      lookupRegime: LookupRegimeKind.GenericDiAncestor,
      materializationTiming: MaterializationTimingKind.Eager
    };
  }

  if (receiverKind === FrameworkRegisterReceiverKind.RegistryInsertion) {
    return {
      worldRegime: WorldRegimeKind.RegistryCarrier,
      registrationPath: RegistrationPathKind.RegistryInsertion,
      lookupRegime: LookupRegimeKind.RegistryLocalOnly,
      materializationTiming: MaterializationTimingKind.Eager
    };
  }

  return {
    worldRegime: WorldRegimeKind.ConstructorEmission,
    registrationPath: RegistrationPathKind.ConfigurationEmission,
    lookupRegime: LookupRegimeKind.CurrentPlusRootResource,
    materializationTiming: MaterializationTimingKind.Eager
  };
}

function readBaseExpressionName(
  expression: ts.Expression,
  context: TypeScriptAnalysisContext
): string | undefined {
  const unwrappedExpression = unwrapExpression(expression);

  if (ts.isIdentifier(unwrappedExpression)) {
    return unwrappedExpression.text;
  }

  if (ts.isPropertyAccessExpression(unwrappedExpression)) {
    return unwrappedExpression.name.text;
  }

  if (ts.isCallExpression(unwrappedExpression)) {
    const callable = resolveCallable(unwrappedExpression.expression, context);
    const returnExpression = callable === undefined
      ? undefined
      : readReturnExpression(callable);
    return returnExpression === undefined
      ? undefined
      : readBaseExpressionName(returnExpression, consumeAnalysisDepth(context));
  }

  return undefined;
}

function resolveExpressionSymbol(
  expression: ts.Identifier | ts.PropertyAccessExpression,
  context: TypeScriptAnalysisContext
): ts.Symbol | undefined {
  return ts.isIdentifier(expression)
    ? context.checker.getSymbolAtLocation(expression)
    : (
        context.checker.getSymbolAtLocation(expression.name) ??
        context.checker.getSymbolAtLocation(expression)
      );
}

function looksLikeAggregateBundleSymbol(
  symbolName: string,
  symbol: ts.Symbol,
  context: TypeScriptAnalysisContext
): boolean {
  if (resolveFrameworkConfigurationRootKindFromSymbol(symbol, context) !== undefined) {
    return false;
  }

  if (symbolName.endsWith("Configuration")) {
    return true;
  }

  return (symbol.declarations ?? []).some((declaration) =>
    (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) &&
    declaration.members.some((member) =>
      ts.isMethodDeclaration(member) &&
      hasStaticModifier(member) &&
      ts.isIdentifier(member.name) &&
      member.name.text === "register"
    )
  );
}

function hasRegisterMember(
  expression: ts.ObjectLiteralExpression
): boolean {
  return expression.properties.some((property) =>
    (ts.isMethodDeclaration(property) || ts.isPropertyAssignment(property)) &&
    getPropertyName(property.name) === "register"
  );
}

function hasStaticModifier(
  declaration: ts.HasModifiers
): boolean {
  return declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ??
    false;
}

function getPropertyName(
  name: ts.PropertyName
): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)
    ? name.text
    : undefined;
}

function areRegistrationArgumentsExplicit(
  expressions: readonly ts.Expression[],
  context: TypeScriptAnalysisContext
): boolean {
  return expressions.every((expression) =>
    resolveExpressionValue(expression, consumeAnalysisDepth(context)) !== undefined ||
    ts.isIdentifier(unwrapExpression(expression))
  );
}

function isRegisterCall(
  expression: ts.CallExpression
): expression is ts.CallExpression & {
  readonly expression: ts.PropertyAccessExpression;
} {
  return ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "register";
}

function isAuComposeBoundaryCall(
  expression: ts.CallExpression
): boolean {
  if (!ts.isPropertyAccessExpression(expression.expression)) {
    return false;
  }

  const receiverName = ts.isIdentifier(expression.expression.expression)
    ? expression.expression.expression.text
    : ts.isPropertyAccessExpression(expression.expression.expression)
      ? expression.expression.expression.name.text
      : "boundary";
  return receiverName.includes("AuCompose") ||
    receiverName.includes("ComposeBoundary") ||
    expression.expression.name.text === "boundary";
}

function createActivePattern(
  family: RegistrationPatternFamilyKind,
  behavior: RegistrationSupportBehaviorKind.ClaimAndClose |
    RegistrationSupportBehaviorKind.ClaimWithQualifiers,
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  constructorArchetypes: readonly ConstructorArchetypeKind[],
  metadata: RegistrationPatternMetadata
): ActiveRegistrationPattern {
  return new ActiveRegistrationPattern(
    family,
    behavior,
    registrationFileName,
    receiverContext.worldRegime,
    receiverContext.registrationPath,
    constructorArchetypes,
    receiverContext.lookupRegime,
    receiverContext.materializationTiming,
    metadata
  );
}

function createUnderclosedPattern(
  family: RegistrationPatternFamilyKind,
  behavior: RegistrationSupportBehaviorKind,
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  constructorArchetypes: readonly ConstructorArchetypeKind[],
  metadata: RegistrationPatternMetadata,
  reasonIds: readonly RegistrationReasonKind[],
  note: string
): UnderclosedRegistrationPattern {
  return new UnderclosedRegistrationPattern(
    family,
    behavior,
    registrationFileName,
    receiverContext.worldRegime,
    receiverContext.registrationPath,
    constructorArchetypes,
    receiverContext.lookupRegime,
    receiverContext.materializationTiming,
    metadata,
    reasonIds,
    note
  );
}

function createAggregateBundleMetadata(): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.MultiRegistrationAggregation,
    RegistrationAnalyzabilityBandId.StaticallyClosable,
    RegistrationAnalyzabilityTierId.DeclaredExplicit,
    [
      RegistrationWitnessBasisId.PositivePresenceSupported,
      RegistrationWitnessBasisId.SearchedSpaceWitnessed,
      RegistrationWitnessBasisId.CompletenessLicensed,
      RegistrationWitnessBasisId.AbsenceLicensable
    ],
    RegistrationCompletenessPostureId.Closed
  );
}

function createDirectDiAliasBundleMetadata(): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.AliasLinkage,
    RegistrationAnalyzabilityBandId.StaticallyClosable,
    RegistrationAnalyzabilityTierId.DeclaredExplicit,
    [
      RegistrationWitnessBasisId.PositivePresenceSupported,
      RegistrationWitnessBasisId.SearchedSpaceWitnessed,
      RegistrationWitnessBasisId.CompletenessLicensed,
      RegistrationWitnessBasisId.AbsenceLicensable
    ],
    RegistrationCompletenessPostureId.Closed
  );
}

function createConfiguredEmissionMetadata(
  analysis: CustomizeChainAnalysis
): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.GeneratedSyntaxOrSettingsEmission,
    RegistrationAnalyzabilityBandId.BoundedDeeperInterpretation,
    analysis.analyzabilityTierId,
    analysis.kind === "explicit"
      ? [
          RegistrationWitnessBasisId.PositivePresenceSupported,
          RegistrationWitnessBasisId.SearchedSpaceWitnessed,
          RegistrationWitnessBasisId.CompletenessLicensed,
          RegistrationWitnessBasisId.AbsenceLicensable
        ]
      : [
          RegistrationWitnessBasisId.PositivePresenceSupported,
          RegistrationWitnessBasisId.CompletenessBlocked
        ],
    analysis.kind === "explicit"
      ? RegistrationCompletenessPostureId.Closed
      : RegistrationCompletenessPostureId.ClosableOpen,
    [],
    analysis.kind === "explicit"
      ? []
      : mapReasonIdsToOpenResidualIds(
          analysis.reasonIds,
          [RegistrationOpenResidualId.CompletenessOpen]
        )
  );
}

function createStagedBuilderMetadata(
  analysis: CustomizeChainAnalysis
): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.BuilderHistoryAccumulation,
    RegistrationAnalyzabilityBandId.BoundedDeeperInterpretation,
    analysis.analyzabilityTierId,
    analysis.kind === "explicit"
      ? [
          RegistrationWitnessBasisId.PositivePresenceSupported,
          RegistrationWitnessBasisId.SearchedSpaceWitnessed,
          RegistrationWitnessBasisId.CompletenessLicensed,
          RegistrationWitnessBasisId.AbsenceLicensable
        ]
      : [
          RegistrationWitnessBasisId.PositivePresenceSupported,
          RegistrationWitnessBasisId.CompletenessBlocked
        ],
    analysis.kind === "explicit"
      ? RegistrationCompletenessPostureId.Closed
      : RegistrationCompletenessPostureId.ClosableOpen,
    [],
    analysis.kind === "explicit"
      ? []
      : mapReasonIdsToOpenResidualIds(
          analysis.reasonIds,
          [
            RegistrationOpenResidualId.CallbackBodyOpaque,
            RegistrationOpenResidualId.CompletenessOpen
          ]
        )
  );
}

function createLifecycleGatedMetadata(
  openResidualIds: readonly RegistrationOpenResidualId[] = [
    RegistrationOpenResidualId.LifecycleGatedActivity
  ]
): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.LifecycleSlotAttachment,
    RegistrationAnalyzabilityBandId.BoundedDeeperInterpretation,
    RegistrationAnalyzabilityTierId.SourceAnalyzable,
    [
      RegistrationWitnessBasisId.PositivePresenceSupported,
      RegistrationWitnessBasisId.CompletenessBlocked
    ],
    RegistrationCompletenessPostureId.ClosableOpen,
    [RegistrationTopologyRuntimeHookId.CurrentWorldActivity],
    [...openResidualIds]
  );
}

function createRouteConfigMetadata(): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.ChildWorldFork,
    RegistrationAnalyzabilityBandId.BoundedDeeperInterpretation,
    RegistrationAnalyzabilityTierId.SourceAnalyzable,
    [RegistrationWitnessBasisId.CompletenessBlocked],
    RegistrationCompletenessPostureId.OpenPlaceholder,
    [RegistrationTopologyRuntimeHookId.ChildWorldVisibility],
    [
      RegistrationOpenResidualId.ChildWorldVisibilityQualified,
      RegistrationOpenResidualId.CompletenessOpen
      ]
  );
}

function createMixedRootConstructorStackMetadata(
  reasonIds: readonly RegistrationReasonKind[]
): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.RootStackComposition,
    RegistrationAnalyzabilityBandId.BoundedDeeperInterpretation,
    RegistrationAnalyzabilityTierId.SourceAnalyzable,
    [
      RegistrationWitnessBasisId.PositivePresenceSupported,
      RegistrationWitnessBasisId.SearchedSpaceWitnessed,
      RegistrationWitnessBasisId.CompletenessBlocked
    ],
    RegistrationCompletenessPostureId.ClosableOpen,
    [RegistrationTopologyRuntimeHookId.CurrentWorldActivity],
    mapReasonIdsToOpenResidualIds(
      reasonIds,
      [RegistrationOpenResidualId.CompletenessOpen]
    )
  );
}

function createRoutedRootWrapperMetadata(
  reasonIds: readonly RegistrationReasonKind[]
): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.RouteShellAdmission,
    RegistrationAnalyzabilityBandId.BoundedDeeperInterpretation,
    RegistrationAnalyzabilityTierId.SourceAnalyzable,
    [
      RegistrationWitnessBasisId.PositivePresenceSupported,
      RegistrationWitnessBasisId.SearchedSpaceWitnessed,
      RegistrationWitnessBasisId.CompletenessBlocked
    ],
    RegistrationCompletenessPostureId.ClosableOpen,
    [
      RegistrationTopologyRuntimeHookId.CurrentWorldActivity,
      RegistrationTopologyRuntimeHookId.ChildWorldVisibility
    ],
    mapReasonIdsToOpenResidualIds(
      reasonIds,
      [RegistrationOpenResidualId.CompletenessOpen]
    )
  );
}

function createCallbackLocalDynamicMetadata(): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.LifecycleSlotAttachment,
    RegistrationAnalyzabilityBandId.RuntimeOnly,
    RegistrationAnalyzabilityTierId.RuntimeOnly,
    [RegistrationWitnessBasisId.CompletenessBlocked],
    RegistrationCompletenessPostureId.OpenPlaceholder,
    [RegistrationTopologyRuntimeHookId.CurrentWorldActivity],
    [
      RegistrationOpenResidualId.CallbackBodyOpaque,
      RegistrationOpenResidualId.RuntimeOnlyExpansion
    ]
  );
}

function createLateBoundDynamicCompositionMetadata(): RegistrationPatternMetadata {
  return new RegistrationPatternMetadata(
    RegistrationTransitionClassId.ChildWorldFork,
    RegistrationAnalyzabilityBandId.RuntimeOnly,
    RegistrationAnalyzabilityTierId.RuntimeOnly,
    [RegistrationWitnessBasisId.CompletenessBlocked],
    RegistrationCompletenessPostureId.TerminalOpen,
    [RegistrationTopologyRuntimeHookId.ChildWorldVisibility],
    [
      RegistrationOpenResidualId.ChildWorldVisibilityQualified,
      RegistrationOpenResidualId.RuntimeOnlyExpansion
      ]
  );
}

function collectMixedRootConstructorArchetypes(
  stackResolution: RegistrationPatternResolution
): readonly ConstructorArchetypeKind[] {
  const supportedArchetypes = new Set<ConstructorArchetypeKind>([
    ConstructorArchetypeKind.AggregateBundle,
    ConstructorArchetypeKind.CustomizedDefault,
    ConstructorArchetypeKind.StagedBuilder,
    ConstructorArchetypeKind.LifecycleAttached
  ]);
  const constructorArchetypes = new Set<ConstructorArchetypeKind>();

  for (const pattern of [
    ...stackResolution.activePatterns,
    ...stackResolution.underclosedPatterns
  ]) {
    for (const constructorArchetype of pattern.constructorArchetypes) {
      if (supportedArchetypes.has(constructorArchetype)) {
        constructorArchetypes.add(constructorArchetype);
      }
    }
  }

  return [...constructorArchetypes].sort((left, right) => left - right);
}

function collectMixedRootReasonIds(
  stackResolution: RegistrationPatternResolution
): readonly RegistrationReasonKind[] {
  const reasonIds = new Set<RegistrationReasonKind>([
    RegistrationReasonKind.ActiveWorldScopeDependent
  ]);
  const hasLifecyclePressure = [
    ...stackResolution.activePatterns,
    ...stackResolution.underclosedPatterns
  ].some((pattern) =>
    pattern.family === RegistrationPatternFamilyKind.LifecycleGatedRegistration
  );

  if (hasLifecyclePressure) {
    reasonIds.add(RegistrationReasonKind.LifecycleGateDependent);
  }

  return [...reasonIds].sort((left, right) => left - right);
}

function selectMixedRootLookupRegime(
  stackResolution: RegistrationPatternResolution
): LookupRegimeKind {
  const lookupRegimes = [
    ...stackResolution.underclosedPatterns,
    ...stackResolution.activePatterns
  ].map((pattern) => pattern.lookupRegime);

  if (lookupRegimes.includes(LookupRegimeKind.OwnerBoundedLocal)) {
    return LookupRegimeKind.OwnerBoundedLocal;
  }

  return lookupRegimes.includes(LookupRegimeKind.GenericDiAncestor)
    ? LookupRegimeKind.GenericDiAncestor
    : LookupRegimeKind.CurrentPlusRootResource;
}

function selectMixedRootMaterializationTiming(
  stackResolution: RegistrationPatternResolution
): MaterializationTimingKind {
  const timings = [
    ...stackResolution.underclosedPatterns,
    ...stackResolution.activePatterns
  ].map((pattern) => pattern.materializationTiming);

  return timings.includes(MaterializationTimingKind.LifecycleSlotGated)
    ? MaterializationTimingKind.LifecycleSlotGated
    : MaterializationTimingKind.Eager;
}

function hasRoutedRootShellPressure(
  stackResolution: RegistrationPatternResolution
): boolean {
  return stackResolution.underclosedPatterns.some((pattern) =>
    pattern.family === RegistrationPatternFamilyKind.RouteConfigAdmissionWorld
  );
}

function mapReasonIdsToOpenResidualIds(
  reasonIds: readonly RegistrationReasonKind[],
  fallback: readonly RegistrationOpenResidualId[] = []
): readonly RegistrationOpenResidualId[] {
  const openResidualIds = new Set<RegistrationOpenResidualId>(fallback);

  for (const reasonId of reasonIds) {
    switch (reasonId) {
      case RegistrationReasonKind.CallbackOpaquePayload:
      case RegistrationReasonKind.UserCodeExecutionDependent:
        openResidualIds.add(RegistrationOpenResidualId.CallbackBodyOpaque);
        break;
      case RegistrationReasonKind.DynamicLateBinding:
        openResidualIds.add(RegistrationOpenResidualId.RuntimeOnlyExpansion);
        break;
      case RegistrationReasonKind.LifecycleGateDependent:
        openResidualIds.add(RegistrationOpenResidualId.LifecycleGatedActivity);
        break;
      case RegistrationReasonKind.RuntimeTopologyDependent:
      case RegistrationReasonKind.RenderBranchDependent:
      case RegistrationReasonKind.ActiveWorldScopeDependent:
        openResidualIds.add(RegistrationOpenResidualId.ChildWorldVisibilityQualified);
        break;
      default:
        openResidualIds.add(RegistrationOpenResidualId.CompletenessOpen);
        break;
    }
  }

  return [...openResidualIds];
}

function unwrapExpression(
  expression: ts.Expression
): ts.Expression {
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }

  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

function compareActivePatterns(
  left: ActiveRegistrationPattern,
  right: ActiveRegistrationPattern
): number {
  return left.registrationFileName.localeCompare(right.registrationFileName) ||
    left.family - right.family ||
    left.behavior - right.behavior;
}

function compareUnderclosedPatterns(
  left: UnderclosedRegistrationPattern,
  right: UnderclosedRegistrationPattern
): number {
  return left.registrationFileName.localeCompare(right.registrationFileName) ||
    left.family - right.family ||
    left.behavior - right.behavior;
}
