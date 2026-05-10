import ts from "typescript";

import {
  EvaluationEffectCertainty,
  type EvaluationInvocationArgumentEffect,
  type EvaluationInvocationEffect,
} from "../../evaluation/index.js";
import {
  readTypeScriptCallSiteEntry,
  readTypeScriptExpressionFact,
  requiredSourceFileIdentity,
  sourceSpanForNode,
  type SourceProject,
  type TypeScriptCallSiteArgument,
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
  concreteExportTarget,
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

interface RegistrationExpressionFrame {
  readonly path: readonly string[];
  readonly catalogName: string | null;
  readonly helperName: string | null;
}

interface RegistrationAssociationContext {
  readonly sourceProject: SourceProject;
  readonly classification: FrameworkBundleClassificationContext;
  readonly row: FrameworkRegistryExportRow;
  readonly effect: EvaluationInvocationEffect;
}

interface RegistrationExpressionVisit {
  readonly context: RegistrationAssociationContext;
  readonly argument: EvaluationInvocationArgumentEffect;
  readonly sourceFile: ts.SourceFile;
  readonly expression: ts.Expression;
  readonly current: ts.Expression;
  readonly expressionFact: TypeScriptExpressionFact;
  readonly declarations: readonly ts.Declaration[];
  readonly frame: RegistrationExpressionFrame;
}

interface ConfigurationFactoryMember {
  readonly name: string;
  readonly node: ts.Node;
  readonly body: ts.Block;
  readonly sourceFile: ts.SourceFile;
}

function registrationExpressionFrame(
  ...path: readonly string[]
): RegistrationExpressionFrame {
  return {
    path,
    catalogName: null,
    helperName: null,
  };
}

function registrationAssociationContext(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
): RegistrationAssociationContext {
  return { sourceProject, classification, row, effect };
}

function childRegistrationExpressionFrame(
  frame: RegistrationExpressionFrame,
  ...segments: readonly string[]
): RegistrationExpressionFrame {
  return {
    path: [...frame.path, ...segments],
    catalogName: frame.catalogName,
    helperName: frame.helperName,
  };
}

function catalogChildRegistrationExpressionFrame(
  frame: RegistrationExpressionFrame,
  catalogName: string | null,
  ...segments: readonly string[]
): RegistrationExpressionFrame {
  return {
    path: [...frame.path, ...segments],
    catalogName,
    helperName: frame.helperName,
  };
}

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
  const sourceFile = sourceProject.requiredSourceFileForIdentity(
    effect.callSite.file,
  );
  const context = registrationAssociationContext(
    sourceProject,
    classification,
    row,
    effect,
  );
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
          context,
          argument,
          sourceFile,
          expression,
          registrationExpressionFrame(`arg${argument.index}`),
        );
  });
}

export function associationsForConfigurationFactoryMembers(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
): readonly FrameworkBundleAssociationRow[] {
  return configurationFactoryMembersForRow(sourceProject, row).flatMap((member) =>
    associationsForConfigurationFactoryMember(
      sourceProject,
      classification,
      row,
      member,
    ),
  );
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
  const sourceFile = sourceProject.requiredSourceFileForIdentity(
    effect.callSite.file,
  );
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
        diInterface,
      },
    ),
  ];
}

function associationsForRegistrationExpression(
  context: RegistrationAssociationContext,
  argument: EvaluationInvocationArgumentEffect,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  frame: RegistrationExpressionFrame,
): readonly FrameworkBundleAssociationRow[] {
  const current = unwrapExpression(expression);
  context.classification.metrics.expressions += 1;
  const expressionFactStartedAt = performance.now();
  const expressionFact = expressionFactForArgument(
    context.sourceProject,
    sourceFile,
    current,
    argument,
  );
  if (expressionFact !== argument.expression) {
    context.classification.metrics.expressionFactMs +=
      performance.now() - expressionFactStartedAt;
  }
  const declarations = declarationsForExpressionSymbolCached(
    context.sourceProject,
    context.classification,
    current,
  );
  const visit: RegistrationExpressionVisit = {
    context,
    argument,
    sourceFile,
    expression,
    current,
    expressionFact,
    declarations,
    frame,
  };
  const { sourceProject, classification, row, effect } = context;
  const inlineRegistryRows = associationsForInlineRegistryExpression(
    sourceProject,
    classification,
    row,
    effect,
    argument,
    sourceFile,
    current,
    frame,
  );
  if (inlineRegistryRows.length > 0) {
    return inlineRegistryRows;
  }

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
      associationRowForVisit(
        visit,
        diInterface === undefined
          ? FrameworkBundleAssociationKind.RegistrationHelper
          : FrameworkBundleAssociationKind.DiInterfaceRegistration,
        {
          targetName:
            keyExpression === null
              ? visibleExpressionName(current)
              : visibleExpressionName(keyExpression),
          helperName,
          diInterface,
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
      associationRowForVisit(
        visit,
        FrameworkBundleAssociationKind.AppTaskRegistration,
        {
          targetName:
            diInterface?.exportEntry.exportName ??
            (keyExpression === null
              ? appTaskName
              : visibleExpressionName(keyExpression)),
          helperName: appTaskName,
          diInterface,
        },
      ),
    ];
  }

  const inlineResourceKind = ts.isCallExpression(current)
    ? resourceKindFromDefinitionCall(current)
    : null;
  if (inlineResourceKind !== null && ts.isCallExpression(current)) {
    return [
      associationRowForVisit(
        visit,
        FrameworkBundleAssociationKind.ResourceRegistration,
        {
          targetName:
            targetNameFromResourceDefinitionCall(sourceProject, current) ??
            visibleExpressionName(current),
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
      associationRowForVisit(
        visit,
        FrameworkBundleAssociationKind.RegistryExportRegistration,
        {
          targetName: registryExportFromCall.exportEntry.exportName,
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
    const catalogRow = associationRowForVisit(
      visit,
      FrameworkBundleAssociationKind.RegistrationCatalog,
      {
        targetName: catalogName,
        catalogName,
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
        const elementPath = `${catalogName ?? "array"}[${index}]${
          ts.isSpreadElement(element) ? ":spread" : ""
        }`;
        return associationsForRegistrationExpression(
          context,
          registrationArgumentForExpression(
            sourceProject,
            arrayBinding.sourceFile,
            argument,
            unwrapExpression(elementExpression),
            argument.spread || ts.isSpreadElement(element),
          ),
          arrayBinding.sourceFile,
          elementExpression,
          catalogChildRegistrationExpressionFrame(frame, catalogName, elementPath),
        );
      },
    );
    return [catalogRow, ...elementRows];
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
      associationRowForVisit(
        visit,
        FrameworkBundleAssociationKind.ResourceRegistration,
        {
          targetName:
            resourceCarrier.targetName ?? resourceCarrier.sourceExportName,
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
      associationRowForVisit(
        visit,
        FrameworkBundleAssociationKind.DiInterfaceRegistration,
        {
          targetName: diInterface.exportEntry.exportName,
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
      associationRowForVisit(
        visit,
        FrameworkBundleAssociationKind.RegistryExportRegistration,
        {
          targetName: registryExport.exportEntry.exportName,
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
      context,
      registrationArgumentForExpression(
        sourceProject,
        aliasExpression.getSourceFile(),
        argument,
        unwrapExpression(aliasExpression),
      ),
      aliasExpression.getSourceFile(),
      aliasExpression,
      childRegistrationExpressionFrame(
        frame,
        `${visibleExpressionName(current) ?? "alias"}:initializer`,
      ),
    );
  }

  if (ts.isConditionalExpression(current)) {
    return [
      ...associationsForRegistrationExpression(
        context,
        registrationArgumentForExpression(
          sourceProject,
          sourceFile,
          argument,
          unwrapExpression(current.whenTrue),
        ),
        sourceFile,
        current.whenTrue,
        childRegistrationExpressionFrame(frame, "conditional:true"),
      ),
      ...associationsForRegistrationExpression(
        context,
        registrationArgumentForExpression(
          sourceProject,
          sourceFile,
          argument,
          unwrapExpression(current.whenFalse),
        ),
        sourceFile,
        current.whenFalse,
        childRegistrationExpressionFrame(frame, "conditional:false"),
      ),
    ];
  }

  const targetName = visibleExpressionName(current);
  return [
    associationRowForVisit(
      visit,
      targetName === null
        ? FrameworkBundleAssociationKind.UnknownRegistrationArgument
        : FrameworkBundleAssociationKind.RegistrationArgument,
      {
        targetName,
      },
    ),
  ];
}

function expressionFactForArgument(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  argument: EvaluationInvocationArgumentEffect,
): TypeScriptExpressionFact {
  const span = argument.expression.span;
  if (
    span.start === expression.getStart(sourceFile) &&
    span.end === expression.getEnd()
  ) {
    return argument.expression;
  }
  return readTypeScriptExpressionFact(sourceProject, sourceFile, expression);
}

function associationRowForVisit(
  visit: RegistrationExpressionVisit,
  associationKind: FrameworkBundleAssociationKind,
  values: {
    readonly targetName: string | null;
    readonly expression?: TypeScriptExpressionFact;
    readonly sourceFile?: ts.SourceFile | null;
    readonly path?: readonly string[];
    readonly catalogName?: string | null;
    readonly helperName?: string | null;
    readonly diInterface?: FrameworkDiInterfaceExportRow;
    readonly resourceCarrier?: FrameworkResourceCarrierRow;
    readonly registryExport?: FrameworkRegistryExportRow;
  },
): FrameworkBundleAssociationRow {
  const sourceFile = Object.prototype.hasOwnProperty.call(values, "sourceFile")
    ? values.sourceFile ?? null
    : visit.sourceFile;
  return associationRow(
    visit.context.sourceProject,
    visit.context.row,
    visit.context.effect,
    visit.argument,
    associationKind,
    {
      targetName: values.targetName,
      expression: values.expression ?? visit.expressionFact,
      sourceFile,
      path: values.path ?? visit.frame.path,
      catalogName: "catalogName" in values
        ? values.catalogName
        : visit.frame.catalogName,
      helperName: "helperName" in values
        ? values.helperName
        : visit.frame.helperName,
      diInterface: values.diInterface,
      resourceCarrier: values.resourceCarrier,
      registryExport: values.registryExport,
    },
  );
}

function associationsForInlineRegistryExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  outerEffect: EvaluationInvocationEffect,
  outerArgument: EvaluationInvocationArgumentEffect,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  frame: RegistrationExpressionFrame,
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
  if (factory?.body === undefined || !ts.isBlock(factory.body)) {
    return [];
  }
  const factoryName =
    factory.name?.text ?? visibleExpressionName(current) ?? "factory";
  const context = registrationAssociationContext(
    sourceProject,
    classification,
    row,
    outerEffect,
  );
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
      rows.push(
        ...associationsForSyntheticRegisterCall(
          sourceProject,
          classification,
          row,
          nestedEffect,
          sourceFile,
          registerCall,
          childRegistrationExpressionFrame(frame, `${factoryName}.register`),
          outerArgument.spread,
        ),
      );
    }
    if (registerCalls.length === 0) {
      const returnedExpression = unwrapExpression(returned);
      rows.push(
        ...associationsForRegistrationExpression(
          context,
          registrationArgumentForExpression(
            sourceProject,
            sourceFile,
            outerArgument,
            returnedExpression,
            outerArgument.spread,
          ),
          sourceFile,
          returnedExpression,
          childRegistrationExpressionFrame(
            frame,
            `${factoryName}:return${returnIndex}`,
          ),
        ),
      );
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
        path: frame.path,
        catalogName,
        helperName: frame.helperName,
      },
    ),
    ...rows,
  ];
}

function associationsForConfigurationFactoryMember(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  member: ConfigurationFactoryMember,
): readonly FrameworkBundleAssociationRow[] {
  const rows: FrameworkBundleAssociationRow[] = [];
  for (const [returnIndex, returned] of returnExpressions(member.body).entries()) {
    const registerCalls = registerCallsForReturnedRegistry(returned);
    for (const [callIndex, registerCall] of registerCalls.entries()) {
      const effect = syntheticEffectForConfigurationFactoryRegisterCall(
        sourceProject,
        row,
        member,
        registerCall,
        `${returnIndex}:${callIndex}`,
      );
      if (effect === null) {
        continue;
      }
      rows.push(
        ...associationsForSyntheticRegisterCall(
          sourceProject,
          classification,
          row,
          effect,
          member.sourceFile,
          registerCall,
          registrationExpressionFrame(
            `${member.name}:return${returnIndex}`,
            `register${callIndex}`,
          ),
          false,
        ),
      );
    }
  }
  return rows;
}

function associationsForSyntheticRegisterCall(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  row: FrameworkRegistryExportRow,
  effect: EvaluationInvocationEffect,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  frame: RegistrationExpressionFrame,
  inheritedSpread: boolean,
): readonly FrameworkBundleAssociationRow[] {
  if (effect.memberName === "registerFactory") {
    return associationsForRegisterFactoryEffect(
      sourceProject,
      classification,
      row,
      effect,
    );
  }

  const context = registrationAssociationContext(
    sourceProject,
    classification,
    row,
    effect,
  );
  const receiverRegistration = registerReceiverRegistrationExpression(call);
  if (receiverRegistration !== null) {
    return associationsForRegistrationExpression(
      context,
      syntheticArgumentForExpression(
        sourceProject,
        sourceFile,
        receiverRegistration,
        -1,
        false,
      ),
      sourceFile,
      receiverRegistration,
      childRegistrationExpressionFrame(frame, "receiver"),
    );
  }

  const rows: FrameworkBundleAssociationRow[] = [];
  for (const nestedArgument of effect.arguments) {
    const nestedExpression = expressionForFact(
      sourceFile,
      nestedArgument.expression,
    );
    if (nestedExpression === null) {
      rows.push(
        associationRow(
          sourceProject,
          row,
          effect,
          nestedArgument,
          FrameworkBundleAssociationKind.UnknownRegistrationArgument,
          {
            targetName: visibleExpressionNameText(nestedArgument.expression.text),
            expression: nestedArgument.expression,
            sourceFile,
            path: childRegistrationExpressionFrame(
              frame,
              `arg${nestedArgument.index}`,
            ).path,
            catalogName: frame.catalogName,
            helperName: frame.helperName,
          },
        ),
      );
      continue;
    }
    rows.push(
      ...associationsForRegistrationExpression(
        context,
        registrationArgumentWithSpread(
          nestedArgument,
          inheritedSpread || nestedArgument.spread,
        ),
        sourceFile,
        nestedExpression,
        childRegistrationExpressionFrame(
          frame,
          `arg${nestedArgument.index}`,
        ),
      ),
    );
  }
  return rows;
}

function registrationArgumentForExpression(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  argument: EvaluationInvocationArgumentEffect,
  expression: ts.Expression,
  spread: boolean = argument.spread,
): EvaluationInvocationArgumentEffect {
  return {
    ...argument,
    spread,
    expression: readTypeScriptExpressionFact(
      sourceProject,
      sourceFile,
      expression,
    ),
  };
}

function registrationArgumentWithSpread(
  argument: EvaluationInvocationArgumentEffect,
  spread: boolean,
): EvaluationInvocationArgumentEffect {
  return spread === argument.spread ? argument : { ...argument, spread };
}

function syntheticInvocationArgument(
  argument: TypeScriptCallSiteArgument,
): EvaluationInvocationArgumentEffect {
  return {
    ...argument,
    binding: null,
  };
}

function syntheticArgumentForExpression(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  index: number,
  spread: boolean,
): EvaluationInvocationArgumentEffect {
  return {
    index,
    spread,
    expression: readTypeScriptExpressionFact(sourceProject, sourceFile, expression),
    binding: null,
  };
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
    arguments: callSite.arguments.map(syntheticInvocationArgument),
  };
}

function syntheticEffectForConfigurationFactoryRegisterCall(
  sourceProject: SourceProject,
  row: FrameworkRegistryExportRow,
  member: ConfigurationFactoryMember,
  call: ts.CallExpression,
  key: string,
): EvaluationInvocationEffect | null {
  const callSite = readTypeScriptCallSiteEntry(
    sourceProject,
    member.sourceFile,
    call,
  );
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
          member.sourceFile,
          receiverExpression,
        );
  const memberName = ts.isPropertyAccessExpression(callee)
    ? callee.name.text
    : ts.isElementAccessExpression(callee)
    ? callee.argumentExpression?.getText(member.sourceFile) ?? null
    : null;
  const file = requiredSourceFileIdentity(sourceProject, member.sourceFile);
  return {
    id: `${row.id}:configuration-factory:${member.name}:${key}:${callSite.span.start}`,
    sequence: callSite.span.start,
    root: {
      id: `${row.id}:configuration-factory:${member.name}`,
      label: `${row.exportEntry.exportName}.${member.name}`,
      memberName: member.name,
      file,
      span: sourceSpanForNode(member.sourceFile, member.node),
      parameters: [],
      captures: [],
    },
    certainty: EvaluationEffectCertainty.Potential,
    controlPath: [`configuration-factory:${member.name}`, key],
    callSite,
    memberName,
    receiver,
    receiverBinding: null,
    arguments: callSite.arguments.map(syntheticInvocationArgument),
  };
}

function registerReceiverRegistrationExpression(
  call: ts.CallExpression,
): ts.Expression | null {
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "register") {
    return null;
  }
  const receiver = unwrapExpression(callee.expression);
  if (!ts.isCallExpression(receiver)) {
    return null;
  }
  return registrationHelperName(receiver) !== null ||
    appTaskHelperName(receiver) !== null ||
    resourceKindFromDefinitionCall(receiver) !== null
    ? receiver
    : null;
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

function configurationFactoryMembersForRow(
  sourceProject: SourceProject,
  row: FrameworkRegistryExportRow,
): readonly ConfigurationFactoryMember[] {
  const target = concreteExportTarget(row.exportEntry.targets);
  if (target?.file === undefined || target.span === undefined) {
    return [];
  }
  const sourceFile = sourceProject.requiredSourceFileForIdentity(target.file);
  const declaration = declarationNodeForSpan(sourceFile, target.span);
  if (declaration === null) {
    return [];
  }
  if (ts.isVariableDeclaration(declaration)) {
    const initializer =
      declaration.initializer === undefined
        ? null
        : unwrapExpression(declaration.initializer);
    return initializer !== null && ts.isObjectLiteralExpression(initializer)
      ? configurationFactoryMembersForObjectLiteral(sourceFile, initializer)
      : [];
  }
  if (ts.isClassDeclaration(declaration)) {
    return configurationFactoryMembersForClass(sourceFile, declaration);
  }
  return [];
}

function declarationNodeForSpan(
  sourceFile: ts.SourceFile,
  span: { readonly start: number; readonly end: number },
): ts.Node | null {
  let match: ts.Node | null = null;
  const visit = (node: ts.Node): void => {
    if (match !== null) {
      return;
    }
    if (
      node.getStart(sourceFile) === span.start &&
      node.getEnd() === span.end
    ) {
      match = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return match;
}

const configurationFactoryMemberNames = new Set([
  "init",
  "customize",
  "withStore",
  "withChild",
  "optionsProvider",
]);

function configurationFactoryMembersForObjectLiteral(
  sourceFile: ts.SourceFile,
  literal: ts.ObjectLiteralExpression,
): readonly ConfigurationFactoryMember[] {
  return literal.properties.flatMap((property) => {
    const name = propertyNameText(property.name);
    if (name === null || !configurationFactoryMemberNames.has(name)) {
      return [];
    }
    if (ts.isMethodDeclaration(property) && property.body !== undefined) {
      const member: ConfigurationFactoryMember = {
        name,
        node: property,
        body: property.body,
        sourceFile,
      };
      return [member];
    }
    if (ts.isPropertyAssignment(property)) {
      const initializer = unwrapExpression(property.initializer);
      if (
        (ts.isFunctionExpression(initializer) || ts.isArrowFunction(initializer)) &&
        ts.isBlock(initializer.body)
      ) {
        const member: ConfigurationFactoryMember = {
          name,
          node: property,
          body: initializer.body,
          sourceFile,
        };
        return [member];
      }
    }
    return [];
  });
}

function configurationFactoryMembersForClass(
  sourceFile: ts.SourceFile,
  declaration: ts.ClassDeclaration,
): readonly ConfigurationFactoryMember[] {
  return declaration.members.flatMap((member) => {
    if (
      !ts.canHaveModifiers(member) ||
      ts
        .getModifiers(member)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) !== true ||
      !("name" in member)
    ) {
      return [];
    }
    const name = propertyNameText(member.name);
    if (name === null || !configurationFactoryMemberNames.has(name)) {
      return [];
    }
    if (ts.isMethodDeclaration(member) && member.body !== undefined) {
      const factoryMember: ConfigurationFactoryMember = {
        name,
        node: member,
        body: member.body,
        sourceFile,
      };
      return [factoryMember];
    }
    if (ts.isPropertyDeclaration(member) && member.initializer !== undefined) {
      const initializer = unwrapExpression(member.initializer);
      if (
        (ts.isFunctionExpression(initializer) || ts.isArrowFunction(initializer)) &&
        ts.isBlock(initializer.body)
      ) {
        const factoryMember: ConfigurationFactoryMember = {
          name,
          node: member,
          body: initializer.body,
          sourceFile,
        };
        return [factoryMember];
      }
    }
    return [];
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
      : requiredSourceFileIdentity(sourceProject, values.sourceFile).repoPath,
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
    diInterface: values.diInterface,
    resourceCarrier: values.resourceCarrier,
    registryExport: values.registryExport,
  };
}
