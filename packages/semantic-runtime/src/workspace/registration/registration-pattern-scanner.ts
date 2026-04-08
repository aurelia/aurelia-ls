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
  FrameworkRegisterReceiverKind,
  isFrameworkAppTaskCall,
  resolveFrameworkConfigurationRootKind,
  resolveFrameworkConfigurationRootKindFromSymbol,
  resolveFrameworkDirectRegistrationBuilderKind,
  resolveFrameworkRegisterReceiverKind
} from "../../typescript/analysis/framework-interpretation.js";
import {
  ActiveRegistrationPattern,
  RegistrationPatternFamilyKind,
  RegistrationPatternScanResult,
  RegistrationSupportBehaviorKind,
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
      readonly reasonIds: readonly string[];
      readonly note: string;
    };

type CustomizeChain = {
  readonly baseName: string | undefined;
  readonly configurationRootKind: FrameworkConfigurationRootKind | undefined;
  readonly depth: number;
  readonly customizeCalls: readonly ts.CallExpression[];
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
    for (const expression of expressions) {
      const resolution = resolveRegistrationExpression(
        expression,
        registrationFileName,
        receiverContext,
        context
      );
      activePatterns.push(...resolution.activePatterns);
      underclosedPatterns.push(...resolution.underclosedPatterns);
    }
  }
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
              [ConstructorArchetypeKind.AggregateBundle]
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
            [
              "dynamic-late-binding",
              "runtime-topology-dependent",
              "render-branch-dependent"
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
                []
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
                [
                  "user-code-execution-dependent",
                  "dynamic-late-binding"
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
          [ConstructorArchetypeKind.AggregateBundle]
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
              [ConstructorArchetypeKind.AggregateBundle]
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
  const baseName = customizeChain.baseName ?? "Configuration";
  const providerArgument = customizeChain.customizeCalls[0]?.arguments[0];

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
          [
            "imported-module-selection-dependent",
            "active-world-scope-dependent"
          ],
          "Route configuration admission is visible, but the admitted route world stays open inside the current registration-world ceiling."
        )
      ]
    };
  }

  if (customizeChain.depth > 1) {
    return {
      activePatterns: [
        createActivePattern(
          RegistrationPatternFamilyKind.StagedBuilderFinalization,
          RegistrationSupportBehaviorKind.ClaimWithQualifiers,
          registrationFileName,
          {
            worldRegime: WorldRegimeKind.ConstructorEmission,
            registrationPath: RegistrationPathKind.ConfigurationEmission,
            lookupRegime: receiverContext.lookupRegime,
            materializationTiming: receiverContext.materializationTiming
          },
          [
            ConstructorArchetypeKind.StagedBuilder,
            ConstructorArchetypeKind.CustomizedDefault
          ]
        )
      ],
      underclosedPatterns: [
        createUnderclosedPattern(
          RegistrationPatternFamilyKind.StagedBuilderFinalization,
          RegistrationSupportBehaviorKind.ClaimWithQualifiers,
          registrationFileName,
          {
            worldRegime: WorldRegimeKind.ConstructorEmission,
            registrationPath: RegistrationPathKind.ConfigurationEmission,
            lookupRegime: receiverContext.lookupRegime,
            materializationTiming: receiverContext.materializationTiming
          },
          [
            ConstructorArchetypeKind.StagedBuilder,
            ConstructorArchetypeKind.CustomizedDefault
          ],
          [
            "callback-opaque-payload",
            "runtime-topology-dependent"
          ],
          "Staged builder finalization widened the registration world, but the layered builder history stays qualified inside the current analysis ceiling."
        )
      ]
    };
  }

  const providerAnalysis = analyzeCustomizeProvider(providerArgument, context);
  if (providerAnalysis.kind === "explicit") {
    return {
      activePatterns: [
        createActivePattern(
          RegistrationPatternFamilyKind.ConfiguredEmissionRegistry,
          RegistrationSupportBehaviorKind.ClaimAndClose,
          registrationFileName,
          {
            worldRegime: WorldRegimeKind.ConstructorEmission,
            registrationPath: RegistrationPathKind.ConfigurationEmission,
            lookupRegime: receiverContext.lookupRegime,
            materializationTiming: receiverContext.materializationTiming
          },
          determineConfiguredEmissionArchetypes(customizeChain)
        )
      ],
      underclosedPatterns: []
    };
  }

  return {
    activePatterns: [
      createActivePattern(
        RegistrationPatternFamilyKind.ConfiguredEmissionRegistry,
        RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        {
          worldRegime: WorldRegimeKind.ConstructorEmission,
          registrationPath: RegistrationPathKind.ConfigurationEmission,
          lookupRegime: receiverContext.lookupRegime,
          materializationTiming: receiverContext.materializationTiming
        },
          determineConfiguredEmissionArchetypes(customizeChain)
        )
      ],
      underclosedPatterns: [
      createUnderclosedPattern(
        RegistrationPatternFamilyKind.ConfiguredEmissionRegistry,
        RegistrationSupportBehaviorKind.ClaimWithQualifiers,
        registrationFileName,
        {
          worldRegime: WorldRegimeKind.ConstructorEmission,
          registrationPath: RegistrationPathKind.ConfigurationEmission,
          lookupRegime: receiverContext.lookupRegime,
          materializationTiming: receiverContext.materializationTiming
        },
          determineConfiguredEmissionArchetypes(customizeChain),
          providerAnalysis.reasonIds,
          providerAnalysis.note
        )
    ]
  };
}

function resolveAppTaskRegistration(
  expression: ts.CallExpression,
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  context: TypeScriptAnalysisContext
): RegistrationPatternResolution {
  const callbackExpression = expression.arguments[0];
  if (callbackExpression === undefined || !ts.isExpression(callbackExpression)) {
    return {
      activePatterns: [],
      underclosedPatterns: [
        createUnderclosedPattern(
          RegistrationPatternFamilyKind.CallbackLocalDynamicRegistration,
          RegistrationSupportBehaviorKind.DetectAndDeclareUnsupported,
          registrationFileName,
          {
            worldRegime: WorldRegimeKind.ConstructorEmission,
            registrationPath: RegistrationPathKind.ConfigurationEmission,
            lookupRegime: receiverContext.lookupRegime,
            materializationTiming: MaterializationTimingKind.LifecycleSlotGated
          },
          [ConstructorArchetypeKind.LifecycleAttached],
          [
            "user-code-execution-dependent",
            "dynamic-late-binding"
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
          {
            worldRegime: WorldRegimeKind.ConstructorEmission,
            registrationPath: RegistrationPathKind.ConfigurationEmission,
            lookupRegime: receiverContext.lookupRegime,
            materializationTiming: MaterializationTimingKind.LifecycleSlotGated
          },
          [ConstructorArchetypeKind.LifecycleAttached],
          [
            "user-code-execution-dependent",
            "dynamic-late-binding"
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
          {
            worldRegime: WorldRegimeKind.ConstructorEmission,
            registrationPath: RegistrationPathKind.ConfigurationEmission,
            lookupRegime: receiverContext.lookupRegime,
            materializationTiming: MaterializationTimingKind.LifecycleSlotGated
          },
          [ConstructorArchetypeKind.LifecycleAttached],
          [
            "user-code-execution-dependent",
            "dynamic-late-binding"
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
          {
            worldRegime: WorldRegimeKind.ConstructorEmission,
            registrationPath: RegistrationPathKind.ConfigurationEmission,
            lookupRegime: receiverContext.lookupRegime,
            materializationTiming: MaterializationTimingKind.LifecycleSlotGated
          },
          [ConstructorArchetypeKind.LifecycleAttached]
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
        {
          worldRegime: WorldRegimeKind.ConstructorEmission,
          registrationPath: RegistrationPathKind.ConfigurationEmission,
          lookupRegime: receiverContext.lookupRegime,
          materializationTiming: MaterializationTimingKind.LifecycleSlotGated
        },
        [ConstructorArchetypeKind.LifecycleAttached],
        [
          "lifecycle-gate-dependent",
          "render-branch-dependent"
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
        {
          worldRegime: WorldRegimeKind.ConstructorEmission,
          registrationPath: RegistrationPathKind.ConfigurationEmission,
          lookupRegime: receiverContext.lookupRegime,
          materializationTiming: MaterializationTimingKind.LifecycleSlotGated
        },
        [ConstructorArchetypeKind.LifecycleAttached],
        [
          "user-code-execution-dependent",
          "dynamic-late-binding"
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
      reasonIds: ["callback-opaque-payload"],
      note: "Configuration customization callback could not be resolved inside the current builder-history ceiling."
    };
  }

  if (ts.isExpression(callable.body)) {
    const resolvedValue = resolveExpressionValue(callable.body, consumeAnalysisDepth(context));
    return resolvedValue === undefined
      ? {
          kind: "open",
          reasonIds: ["callback-opaque-payload"],
          note: "Configuration customization callback returned an underclosed payload."
        }
      : { kind: "explicit" };
  }

  for (const statement of callable.body.statements) {
    if (!ts.isExpressionStatement(statement)) {
      return {
        kind: "open",
        reasonIds: ["callback-opaque-payload"],
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
          reasonIds: ["callback-opaque-payload"],
          note: "Configuration customization callback assigned a payload that stayed underclosed."
        };
      }

      continue;
    }

    const resolvedValue = resolveExpressionValue(expression, consumeAnalysisDepth(context));
    if (resolvedValue === undefined) {
      return {
        kind: "open",
        reasonIds: ["callback-opaque-payload"],
        note: "Configuration customization callback used an unresolvable payload."
      };
    }
  }

  return { kind: "explicit" };
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
  constructorArchetypes: readonly ConstructorArchetypeKind[]
): ActiveRegistrationPattern {
  return new ActiveRegistrationPattern(
    family,
    behavior,
    registrationFileName,
    receiverContext.worldRegime,
    receiverContext.registrationPath,
    constructorArchetypes,
    receiverContext.lookupRegime,
    receiverContext.materializationTiming
  );
}

function createUnderclosedPattern(
  family: RegistrationPatternFamilyKind,
  behavior: RegistrationSupportBehaviorKind,
  registrationFileName: string,
  receiverContext: RegisterReceiverContext,
  constructorArchetypes: readonly ConstructorArchetypeKind[],
  reasonIds: readonly string[],
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
    reasonIds,
    note
  );
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
