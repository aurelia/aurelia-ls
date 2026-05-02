import ts from "typescript";

import {
  type EvaluationInvocationArgumentEffect,
  type EvaluationInvocationEffect,
} from "../../evaluation/index.js";
import {
  readTypeScriptCallSiteEntry,
  readTypeScriptExpressionFact,
  type SourceProject,
  type TypeScriptExpressionFact,
} from "../../source/index.js";
import { FrameworkBundleAssociationKind } from "../../framework/admission.js";
import {
  declarationsForExpressionSymbolCached,
  diInterfacesForExpression,
  registryExportForMemberCallReceiver,
  registryExportsForExpression,
  resourceCarriersForExpression,
  type FrameworkBundleClassificationContext,
} from "./framework-bundle-classification.js";
import {
  type FrameworkBundleAssociationRow,
  type FrameworkDiInterfaceExportRow,
  type FrameworkRegistryExportRow,
  type FrameworkResourceCarrierRow,
} from "./framework-entities.js";
import {
  resourceKindFromDefinitionCall,
  targetNameFromResourceDefinitionCall,
} from "./framework-resources.js";
import {
  externalFileIdentity,
  sourceRangeFromFileSpan,
} from "./framework-support.js";
import {
  appTaskHelperName,
  appTaskKeyExpression,
  arrayLiteralForExpression,
  callExpressionsIn,
  expressionForFact,
  isFunctionExpressionLike,
  localFunctionDeclarationForCall,
  propertyNameText,
  registrationHelperName,
  returnExpressions,
  unwrapExpression,
  variableInitializerForExpression,
  visibleExpressionName,
  visibleExpressionNameText,
} from "./framework-ts-utils.js";

export function associationsForBundleEffect(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
): readonly FrameworkBundleAssociationRow[] {
  if (effect.memberName === "registerFactory") {
    return associationsForRegisterFactoryEffect(
      sourceProject,
      classification,
      row,
      effect,
    );
  }
  if (effect.memberName !== "register") {
    return [];
  }
  const sourceFile =
    sourceProject.readSourceFile(effect.callSite.file.repoPath) ??
    sourceProject.readSourceFile(effect.callSite.file.absolutePath);
  if (sourceFile === null) {
    return effect.arguments.map((argument) =>
      associationRow(
        sourceProject,
        row,
        effect,
        argument,
        FrameworkBundleAssociationKind.UnknownRegistrationArgument,
        {
          targetName: visibleExpressionNameText(argument.expression.text),
          expression: argument.expression,
          sourceFile: null,
        },
      ),
    );
  }
  return effect.arguments.flatMap((argument) => {
    const expression = expressionForFact(sourceFile, argument.expression);
    return expression === null
      ? [
          associationRow(
            sourceProject,
            row,
            effect,
            argument,
            FrameworkBundleAssociationKind.UnknownRegistrationArgument,
            {
              targetName: visibleExpressionNameText(argument.expression.text),
              expression: argument.expression,
              sourceFile,
            },
          ),
        ]
      : associationsForRegistrationExpression(
          sourceProject,
          classification,
          row,
          effect,
          argument,
          sourceFile,
          expression,
          {
            path: [`arg${argument.index}`],
            catalogName: null,
            helperName: null,
          },
        );
  });
}

function associationsForRegisterFactoryEffect(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
): readonly FrameworkBundleAssociationRow[] {
  const keyArgument = effect.arguments[0];
  if (keyArgument === undefined) {
    return [];
  }
  const sourceFile =
    sourceProject.readSourceFile(effect.callSite.file.repoPath) ??
    sourceProject.readSourceFile(effect.callSite.file.absolutePath);
  if (sourceFile === null) {
    return [
      associationRow(
        sourceProject,
        row,
        effect,
        keyArgument,
        FrameworkBundleAssociationKind.FactoryRegistration,
        {
          targetName: visibleExpressionNameText(keyArgument.expression.text),
          expression: keyArgument.expression,
          sourceFile: null,
          helperName: "registerFactory",
        },
      ),
    ];
  }
  const expression = expressionForFact(sourceFile, keyArgument.expression);
  if (expression === null) {
    return [
      associationRow(
        sourceProject,
        row,
        effect,
        keyArgument,
        FrameworkBundleAssociationKind.FactoryRegistration,
        {
          targetName: visibleExpressionNameText(keyArgument.expression.text),
          expression: keyArgument.expression,
          sourceFile,
          helperName: "registerFactory",
        },
      ),
    ];
  }
  const diStartedAt = performance.now();
  const diInterface = diInterfacesForExpression(
    sourceProject,
    classification,
    sourceFile,
    expression,
  )[0];
  classification.metrics.diMs += performance.now() - diStartedAt;
  return [
    associationRow(
      sourceProject,
      row,
      effect,
      keyArgument,
      FrameworkBundleAssociationKind.FactoryRegistration,
      {
        targetName:
          diInterface?.exportEntry.exportName ??
          visibleExpressionName(expression),
        expression: readTypeScriptExpressionFact(
          sourceProject,
          sourceFile,
          unwrapExpression(expression),
        ),
        sourceFile,
        path: [`arg${keyArgument.index}`],
        catalogName: null,
        helperName: "registerFactory",
        ...(diInterface === undefined ? {} : { diInterface }),
      },
    ),
  ];
}

function associationsForRegistrationExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
  argument: EvaluationInvocationArgumentEffect,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  context: {
    readonly path: readonly string[];
    readonly catalogName: string | null;
    readonly helperName: string | null;
  },
): readonly FrameworkBundleAssociationRow[] {
  const current = unwrapExpression(expression);
  classification.metrics.expressions += 1;
  const expressionFactStartedAt = performance.now();
  const expressionFact = readTypeScriptExpressionFact(
    sourceProject,
    sourceFile,
    current,
  );
  classification.metrics.expressionFactMs +=
    performance.now() - expressionFactStartedAt;
  const declarations = declarationsForExpressionSymbolCached(
    sourceProject,
    classification,
    current,
  );
  const helperName = registrationHelperName(current);
  if (helperName !== null && ts.isCallExpression(current)) {
    const keyExpression =
      current.arguments[0] === undefined ||
      ts.isSpreadElement(current.arguments[0])
        ? null
        : unwrapExpression(current.arguments[0]);
    const diStartedAt = performance.now();
    const diInterface =
      keyExpression === null
        ? undefined
        : diInterfacesForExpression(
            sourceProject,
            classification,
            sourceFile,
            keyExpression,
          )[0];
    classification.metrics.diMs += performance.now() - diStartedAt;
    return [
      associationRow(
        sourceProject,
        row,
        effect,
        argument,
        diInterface === undefined
          ? FrameworkBundleAssociationKind.RegistrationHelper
          : FrameworkBundleAssociationKind.DiInterfaceRegistration,
        {
          targetName:
            keyExpression === null
              ? visibleExpressionName(current)
              : visibleExpressionName(keyExpression),
          expression: expressionFact,
          sourceFile,
          path: context.path,
          catalogName: context.catalogName,
          helperName,
          ...(diInterface === undefined ? {} : { diInterface }),
        },
      ),
    ];
  }
  const appTaskName = appTaskHelperName(current);
  if (appTaskName !== null && ts.isCallExpression(current)) {
    const keyExpression = appTaskKeyExpression(current);
    const diStartedAt = performance.now();
    const diInterface =
      keyExpression === null
        ? undefined
        : diInterfacesForExpression(
            sourceProject,
            classification,
            sourceFile,
            keyExpression,
          )[0];
    classification.metrics.diMs += performance.now() - diStartedAt;
    return [
      associationRow(
        sourceProject,
        row,
        effect,
        argument,
        FrameworkBundleAssociationKind.AppTaskRegistration,
        {
          targetName:
            diInterface?.exportEntry.exportName ??
            (keyExpression === null
              ? appTaskName
              : visibleExpressionName(keyExpression)),
          expression: expressionFact,
          sourceFile,
          path: context.path,
          catalogName: context.catalogName,
          helperName: appTaskName,
          ...(diInterface === undefined ? {} : { diInterface }),
        },
      ),
    ];
  }

  const inlineResourceKind = ts.isCallExpression(current)
    ? resourceKindFromDefinitionCall(current)
    : null;
  if (inlineResourceKind !== null && ts.isCallExpression(current)) {
    return [
      associationRow(
        sourceProject,
        row,
        effect,
        argument,
        FrameworkBundleAssociationKind.ResourceRegistration,
        {
          targetName:
            targetNameFromResourceDefinitionCall(sourceProject, current) ??
            visibleExpressionName(current),
          expression: expressionFact,
          sourceFile,
          path: context.path,
          catalogName: context.catalogName,
          helperName: context.helperName,
        },
      ),
    ];
  }

  const registryExportFromCall = registryExportForMemberCallReceiver(
    sourceProject,
    classification,
    sourceFile,
    current,
    row,
  );
  if (registryExportFromCall !== undefined) {
    return [
      associationRow(
        sourceProject,
        row,
        effect,
        argument,
        FrameworkBundleAssociationKind.RegistryExportRegistration,
        {
          targetName: registryExportFromCall.exportEntry.exportName,
          expression: expressionFact,
          sourceFile,
          path: context.path,
          catalogName: context.catalogName,
          helperName: context.helperName,
          registryExport: registryExportFromCall,
        },
      ),
    ];
  }

  const arrayStartedAt = performance.now();
  const arrayBinding = arrayLiteralForExpression(
    sourceProject,
    sourceFile,
    current,
    declarations,
  );
  classification.metrics.arrayBindingMs += performance.now() - arrayStartedAt;
  if (arrayBinding !== null) {
    const catalogName = arrayBinding.name ?? visibleExpressionName(current);
    const catalogRow = associationRow(
      sourceProject,
      row,
      effect,
      argument,
      FrameworkBundleAssociationKind.RegistrationCatalog,
      {
        targetName: catalogName,
        expression: expressionFact,
        sourceFile,
        path: context.path,
        catalogName,
        helperName: context.helperName,
      },
    );
    const elementRows = arrayBinding.expression.elements.flatMap(
      (element, index) => {
        if (ts.isOmittedExpression(element)) {
          return [];
        }
        const elementExpression = ts.isSpreadElement(element)
          ? element.expression
          : element;
        const elementPath = [
          ...context.path,
          `${catalogName ?? "array"}[${index}]${
            ts.isSpreadElement(element) ? ":spread" : ""
          }`,
        ];
        return associationsForRegistrationExpression(
          sourceProject,
          classification,
          row,
          effect,
          {
            ...argument,
            spread: argument.spread || ts.isSpreadElement(element),
            expression: readTypeScriptExpressionFact(
              sourceProject,
              arrayBinding.sourceFile,
              unwrapExpression(elementExpression),
            ),
          },
          arrayBinding.sourceFile,
          elementExpression,
          {
            path: elementPath,
            catalogName,
            helperName: context.helperName,
          },
        );
      },
    );
    return [catalogRow, ...elementRows];
  }

  const inlineRegistryRows = associationsForInlineRegistryExpression(
    sourceProject,
    classification,
    row,
    effect,
    argument,
    sourceFile,
    current,
    context,
  );
  if (inlineRegistryRows.length > 0) {
    return inlineRegistryRows;
  }

  const resourceStartedAt = performance.now();
  const resourceCarriers = resourceCarriersForExpression(
    sourceProject,
    classification,
    sourceFile,
    current,
    declarations,
  );
  classification.metrics.resourceMs += performance.now() - resourceStartedAt;
  if (resourceCarriers.length > 0) {
    return resourceCarriers.map((resourceCarrier) =>
      associationRow(
        sourceProject,
        row,
        effect,
        argument,
        FrameworkBundleAssociationKind.ResourceRegistration,
        {
          targetName:
            resourceCarrier.targetName ?? resourceCarrier.sourceExportName,
          expression: expressionFact,
          sourceFile,
          path: context.path,
          catalogName: context.catalogName,
          helperName: context.helperName,
          resourceCarrier,
        },
      ),
    );
  }

  const diStartedAt = performance.now();
  const diInterface = diInterfacesForExpression(
    sourceProject,
    classification,
    sourceFile,
    current,
    declarations,
  )[0];
  classification.metrics.diMs += performance.now() - diStartedAt;
  if (diInterface !== undefined) {
    return [
      associationRow(
        sourceProject,
        row,
        effect,
        argument,
        FrameworkBundleAssociationKind.DiInterfaceRegistration,
        {
          targetName: diInterface.exportEntry.exportName,
          expression: expressionFact,
          sourceFile,
          path: context.path,
          catalogName: context.catalogName,
          helperName: context.helperName,
          diInterface,
        },
      ),
    ];
  }

  const registryStartedAt = performance.now();
  const registryExport = registryExportsForExpression(
    sourceProject,
    classification,
    sourceFile,
    current,
    declarations,
  ).find((candidate) => candidate.id !== row.id);
  classification.metrics.registryMs += performance.now() - registryStartedAt;
  if (registryExport !== undefined) {
    return [
      associationRow(
        sourceProject,
        row,
        effect,
        argument,
        FrameworkBundleAssociationKind.RegistryExportRegistration,
        {
          targetName: registryExport.exportEntry.exportName,
          expression: expressionFact,
          sourceFile,
          path: context.path,
          catalogName: context.catalogName,
          helperName: context.helperName,
          registryExport,
        },
      ),
    ];
  }

  const aliasExpression = variableInitializerForExpression(
    current,
    declarations,
  );
  if (aliasExpression !== null) {
    return associationsForRegistrationExpression(
      sourceProject,
      classification,
      row,
      effect,
      {
        ...argument,
        expression: readTypeScriptExpressionFact(
          sourceProject,
          aliasExpression.getSourceFile(),
          unwrapExpression(aliasExpression),
        ),
      },
      aliasExpression.getSourceFile(),
      aliasExpression,
      {
        path: [
          ...context.path,
          `${visibleExpressionName(current) ?? "alias"}:initializer`,
        ],
        catalogName: context.catalogName,
        helperName: context.helperName,
      },
    );
  }

  if (ts.isConditionalExpression(current)) {
    return [
      ...associationsForRegistrationExpression(
        sourceProject,
        classification,
        row,
        effect,
        {
          ...argument,
          expression: readTypeScriptExpressionFact(
            sourceProject,
            sourceFile,
            unwrapExpression(current.whenTrue),
          ),
        },
        sourceFile,
        current.whenTrue,
        {
          path: [...context.path, "conditional:true"],
          catalogName: context.catalogName,
          helperName: context.helperName,
        },
      ),
      ...associationsForRegistrationExpression(
        sourceProject,
        classification,
        row,
        effect,
        {
          ...argument,
          expression: readTypeScriptExpressionFact(
            sourceProject,
            sourceFile,
            unwrapExpression(current.whenFalse),
          ),
        },
        sourceFile,
        current.whenFalse,
        {
          path: [...context.path, "conditional:false"],
          catalogName: context.catalogName,
          helperName: context.helperName,
        },
      ),
    ];
  }

  const targetName = visibleExpressionName(current);
  return [
    associationRow(
      sourceProject,
      row,
      effect,
      argument,
      targetName === null
        ? FrameworkBundleAssociationKind.UnknownRegistrationArgument
        : FrameworkBundleAssociationKind.RegistrationArgument,
      {
        targetName,
        expression: expressionFact,
        sourceFile,
        path: context.path,
        catalogName: context.catalogName,
        helperName: context.helperName,
      },
    ),
  ];
}

function associationsForInlineRegistryExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  outerEffect: EvaluationInvocationEffect,
  outerArgument: EvaluationInvocationArgumentEffect,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  context: {
    readonly path: readonly string[];
    readonly catalogName: string | null;
    readonly helperName: string | null;
  },
): readonly FrameworkBundleAssociationRow[] {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return [];
  }
  const factory = localFunctionDeclarationForCall(
    sourceProject,
    sourceFile,
    current,
  );
  if (factory?.body === undefined) {
    return [];
  }
  const factoryName =
    factory.name?.text ?? visibleExpressionName(current) ?? "factory";
  const rows: FrameworkBundleAssociationRow[] = [];
  for (const [returnIndex, returned] of returnExpressions(
    factory.body,
  ).entries()) {
    const registerCalls = registerCallsForReturnedRegistry(returned);
    for (const [callIndex, registerCall] of registerCalls.entries()) {
      const nestedEffect = syntheticEffectForRegisterCall(
        sourceProject,
        outerEffect,
        sourceFile,
        registerCall,
        `${factoryName}:${returnIndex}:${callIndex}`,
      );
      if (nestedEffect === null) {
        continue;
      }
      if (nestedEffect.memberName === "registerFactory") {
        rows.push(
          ...associationsForRegisterFactoryEffect(
            sourceProject,
            classification,
            row,
            nestedEffect,
          ),
        );
        continue;
      }
      for (const nestedArgument of nestedEffect.arguments) {
        const nestedExpression = expressionForFact(
          sourceFile,
          nestedArgument.expression,
        );
        if (nestedExpression === null) {
          rows.push(
            associationRow(
              sourceProject,
              row,
              nestedEffect,
              nestedArgument,
              FrameworkBundleAssociationKind.UnknownRegistrationArgument,
              {
                targetName: visibleExpressionNameText(
                  nestedArgument.expression.text,
                ),
                expression: nestedArgument.expression,
                sourceFile,
                path: [
                  ...context.path,
                  `${factoryName}.register`,
                  `arg${nestedArgument.index}`,
                ],
                catalogName: context.catalogName,
                helperName: context.helperName,
              },
            ),
          );
          continue;
        }
        rows.push(
          ...associationsForRegistrationExpression(
            sourceProject,
            classification,
            row,
            nestedEffect,
            {
              ...nestedArgument,
              spread: outerArgument.spread || nestedArgument.spread,
            },
            sourceFile,
            nestedExpression,
            {
              path: [
                ...context.path,
                `${factoryName}.register`,
                `arg${nestedArgument.index}`,
              ],
              catalogName: context.catalogName,
              helperName: context.helperName,
            },
          ),
        );
      }
    }
  }
  if (rows.length === 0) {
    return [];
  }
  const catalogName = visibleExpressionName(current) ?? factoryName;
  return [
    associationRow(
      sourceProject,
      row,
      outerEffect,
      outerArgument,
      FrameworkBundleAssociationKind.RegistrationCatalog,
      {
        targetName: catalogName,
        expression: readTypeScriptExpressionFact(
          sourceProject,
          sourceFile,
          current,
        ),
        sourceFile,
        path: context.path,
        catalogName,
        helperName: context.helperName,
      },
    ),
    ...rows,
  ];
}

function syntheticEffectForRegisterCall(
  sourceProject: SourceProject,
  outerEffect: EvaluationInvocationEffect,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  key: string,
): EvaluationInvocationEffect | null {
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  const callee = unwrapExpression(call.expression);
  const receiverExpression =
    ts.isPropertyAccessExpression(callee) ||
    ts.isElementAccessExpression(callee)
      ? callee.expression
      : null;
  const receiver =
    receiverExpression === null
      ? null
      : readTypeScriptExpressionFact(
          sourceProject,
          sourceFile,
          receiverExpression,
        );
  const memberName = ts.isPropertyAccessExpression(callee)
    ? callee.name.text
    : ts.isElementAccessExpression(callee)
    ? callee.argumentExpression?.getText(sourceFile) ?? null
    : null;
  return {
    id: `${outerEffect.id}:inline-registry:${key}:${callSite.span.start}`,
    sequence: outerEffect.sequence,
    root: outerEffect.root,
    certainty: outerEffect.certainty,
    controlPath: [...outerEffect.controlPath, `inline-registry:${key}`],
    callSite,
    memberName,
    receiver,
    receiverBinding: null,
    arguments: callSite.arguments.map((argument) => ({
      ...argument,
      binding: null,
    })),
  };
}

function registerCallsForReturnedRegistry(
  expression: ts.Expression,
): readonly ts.CallExpression[] {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return [];
  }
  return current.properties.flatMap((property) => {
    if (ts.isSpreadAssignment(property)) {
      return [];
    }
    const name = propertyNameText(property.name);
    if (name !== "register") {
      return [];
    }
    let body: ts.ConciseBody | undefined;
    if (ts.isMethodDeclaration(property)) {
      body = property.body;
    } else if (ts.isPropertyAssignment(property)) {
      const initializer = unwrapExpression(property.initializer);
      body = isFunctionExpressionLike(initializer)
        ? initializer.body
        : undefined;
    }
    return body === undefined
      ? []
      : callExpressionsIn(body).filter((call) => {
          const callee = unwrapExpression(call.expression);
          return (
            ts.isPropertyAccessExpression(callee) &&
            (callee.name.text === "register" ||
              callee.name.text === "registerFactory")
          );
        });
  });
}

function associationRow(
  sourceProject: SourceProject,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
  argument: EvaluationInvocationArgumentEffect,
  associationKind: FrameworkBundleAssociationKind,
  values: {
    readonly targetName: string | null;
    readonly expression: TypeScriptExpressionFact;
    readonly sourceFile: ts.SourceFile | null;
    readonly path?: readonly string[];
    readonly catalogName?: string | null;
    readonly helperName?: string | null;
    readonly diInterface?: FrameworkDiInterfaceExportRow;
    readonly resourceCarrier?: FrameworkResourceCarrierRow;
    readonly registryExport?: FrameworkRegistryExportRow;
  },
): FrameworkBundleAssociationRow {
  const source = sourceRangeFromFileSpan(
    values.sourceFile === null
      ? effect.callSite.file.repoPath
      : (
          sourceProject.sourceFileIdentity(values.sourceFile) ??
          externalFileIdentity(sourceProject, values.sourceFile)
        ).repoPath,
    values.expression.span,
  );
  return {
    id: `framework-bundle-association:${row.packageId}:${
      row.exportEntry.exportName
    }:${effect.sequence}:${argument.index}:${(
      values.path ?? [`arg${argument.index}`]
    ).join("/")}:${associationKind}:${
      values.targetName ?? values.expression.span.start
    }`,
    packageId: row.packageId,
    packageName: row.packageName,
    exportName: row.exportEntry.exportName,
    associationKind,
    effectId: effect.id,
    effectSequence: effect.sequence,
    certainty: effect.certainty,
    argumentIndex: argument.index,
    spread: argument.spread,
    path: values.path ?? [`arg${argument.index}`],
    catalogName: values.catalogName ?? null,
    helperName: values.helperName ?? null,
    targetName: values.targetName,
    expression: values.expression,
    source,
    ...(values.diInterface === undefined
      ? {}
      : { diInterface: values.diInterface }),
    ...(values.resourceCarrier === undefined
      ? {}
      : { resourceCarrier: values.resourceCarrier }),
    ...(values.registryExport === undefined
      ? {}
      : { registryExport: values.registryExport }),
  };
}
