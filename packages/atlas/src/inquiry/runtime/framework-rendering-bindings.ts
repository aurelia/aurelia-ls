import ts from "typescript";

import {
  readTypeScriptCallSiteEntry,
  readTypeScriptExpressionFact,
  requiredSourceFileIdentity,
  sourceRangeForSourceFileNode,
  SourceProjectKeyedMemo,
  SourceDeclarationKind,
  type SourceProject,
  type TypeScriptCallSiteEntry,
} from "../../source/index.js";
import { FrameworkSyntaxProductKind } from "../../framework/index.js";
import {
  FrameworkBindingConstructionKind,
  FrameworkBindingEffectKind,
  FrameworkBindingSetupKind,
  type FrameworkBindingAdmissionRow,
  type FrameworkBindingConstructorParameterRow,
  type FrameworkBindingEffectRow,
  type FrameworkBindingProductRow,
  type FrameworkBindingSetupRow,
  type FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  frameworkPackageIdsForFilters,
  readFrameworkPackageNames,
} from "./framework-package-exports.js";
import {
  bindingNameFromBindingExpression,
  bindingNameFromCreationExpression,
  collectionFactoryExpressionForCallbackParameter,
  functionExpressionProducerName,
  sourceFileProducerName,
} from "./framework-rendering-inspection.js";
import { readFrameworkSyntaxProducts } from "./framework-rendering-syntax.js";
import { uniqueById } from "./framework-symbols.js";
import {
  callExpressionsIn,
  localVariableInitializerForIdentifier,
  propertyNameText,
  unwrapExpression,
} from "./framework-ts-utils.js";

interface BindingAdmissionExpression {
  readonly bindingName: string;
  readonly constructionKind: FrameworkBindingConstructionKind;
  readonly expression: ts.Expression;
}

const bindingProductRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkBindingProductRow[]
>();
const bindingAdmissionRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkBindingAdmissionRow[]
>();
const bindingEffectRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkBindingEffectRow[]
>();
const bindingSetupRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkBindingSetupRow[]
>();

export function readFrameworkBindingProducts(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkBindingProductRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const constructionProducts = readFrameworkSyntaxProducts(sourceProject, {
    productKind: FrameworkSyntaxProductKind.CreatesBinding,
  });
  const bindingAdmissions = readFrameworkBindingAdmissions(sourceProject, {});
  const rows = packageIds.flatMap((packageId) =>
    readFrameworkBindingProductPackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
      constructionProducts,
      bindingAdmissions,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.bindingName === undefined ||
        row.bindingName === filters.bindingName,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.bindingName.includes(filters.query) ||
        row.methodNames.some((methodName) =>
          methodName.includes(filters.query!),
        ) ||
        row.constructorParameters.some(
          (parameter) =>
            parameter.name.includes(filters.query!) ||
            parameter.typeText?.includes(filters.query!) === true,
        ) ||
        row.observerLocatorCallSites.some((callSite) =>
          callSite.calleeName.includes(filters.query!),
        ) ||
        row.constructionProducts.some((product) =>
          product.producerName.includes(filters.query!),
        ) ||
        row.admissions.some(
          (admission) =>
            admission.producerName.includes(filters.query!) ||
            admission.controllerExpression.includes(filters.query!),
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.bindingName.localeCompare(right.bindingName),
    );
}

export function readFrameworkBindingAdmissions(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkBindingAdmissionRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const constructionProducts = readFrameworkSyntaxProducts(sourceProject, {
    productKind: FrameworkSyntaxProductKind.CreatesBinding,
  });
  const rows = packageIds.flatMap((packageId) =>
    readFrameworkBindingAdmissionPackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
      constructionProducts,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.bindingName === undefined ||
        row.bindingName === filters.bindingName,
    )
    .filter(
      (row) =>
        filters.constructionKind === undefined ||
        row.constructionKind === filters.constructionKind,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.bindingName.includes(filters.query) ||
        row.producerName.includes(filters.query) ||
        row.controllerExpression.includes(filters.query) ||
        row.constructionKind.includes(filters.query) ||
        row.bindingExpression.text.includes(filters.query) ||
        row.constructionProducts.some((product) =>
          product.producerName.includes(filters.query!),
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.bindingName.localeCompare(right.bindingName) ||
        left.producerName.localeCompare(right.producerName) ||
        left.source.start.line - right.source.start.line ||
        left.source.start.character - right.source.start.character,
    );
}

export function readFrameworkBindingEffects(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkBindingEffectRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const bindingProducts = readFrameworkBindingProducts(sourceProject, {});
  const rows = packageIds.flatMap((packageId) =>
    readFrameworkBindingEffectPackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
      bindingProducts,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.bindingName === undefined ||
        row.bindingName === filters.bindingName,
    )
    .filter(
      (row) =>
        filters.effectKind === undefined ||
        row.effectKind === filters.effectKind,
    )
    .filter(
      (row) =>
        filters.memberName === undefined ||
        row.methodName === filters.memberName,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.bindingName.includes(filters.query) ||
        row.methodName.includes(filters.query) ||
        row.effectKind.includes(filters.query) ||
        row.effectName.includes(filters.query) ||
        row.expression.text.includes(filters.query),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.bindingName.localeCompare(right.bindingName) ||
        left.methodName.localeCompare(right.methodName) ||
        left.effectKind.localeCompare(right.effectKind) ||
        left.source.start.line - right.source.start.line ||
        left.source.start.character - right.source.start.character,
    );
}

export function readFrameworkBindingSetups(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkBindingSetupRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = packageIds.flatMap((packageId) =>
    readFrameworkBindingSetupPackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.bindingName === undefined ||
        row.bindingName === filters.bindingName,
    )
    .filter(
      (row) =>
        filters.setupKind === undefined || row.setupKind === filters.setupKind,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.bindingName.includes(filters.query) ||
        row.producerName.includes(filters.query) ||
        row.setupKind.includes(filters.query) ||
        row.setupMethodName.includes(filters.query) ||
        row.receiverExpression.includes(filters.query) ||
        row.bindingExpression.text.includes(filters.query) ||
        row.setupArgument?.text.includes(filters.query) === true,
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.bindingName.localeCompare(right.bindingName) ||
        left.setupKind.localeCompare(right.setupKind) ||
        left.producerName.localeCompare(right.producerName) ||
        left.source.start.line - right.source.start.line ||
        left.source.start.character - right.source.start.character,
    );
}

export function readFrameworkBindingProductPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
  bindingAdmissions: readonly FrameworkBindingAdmissionRow[],
): readonly FrameworkBindingProductRow[] {
  return bindingProductRowsByPackage.read(sourceProject, packageId, () => {
    const bindingNames = new Set(
      constructionProducts
        .map((product) => product.bindingName)
        .filter((bindingName): bindingName is string => bindingName !== null),
    );
    for (const bindingName of bindingAdmissions.map(
      (admission) => admission.bindingName,
    )) {
      bindingNames.add(bindingName);
    }
    return uniqueById(
      sourceProject
        .ownedSourceFiles()
        .filter(
          (sourceFile) =>
            !sourceFile.isDeclarationFile &&
            sourceProject.packageForFileName(sourceFile.fileName)?.id ===
              packageId,
        )
        .flatMap((sourceFile) =>
          bindingProductsForSourceFile(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            bindingNames,
            constructionProducts,
            bindingAdmissions,
          ),
        ),
    );
  });
}

export function readFrameworkBindingAdmissionPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
): readonly FrameworkBindingAdmissionRow[] {
  return bindingAdmissionRowsByPackage.read(sourceProject, packageId, () =>
    uniqueById(
      sourceProject
        .ownedSourceFiles()
        .filter(
          (sourceFile) =>
            !sourceFile.isDeclarationFile &&
            sourceProject.packageForFileName(sourceFile.fileName)?.id ===
              packageId,
        )
        .flatMap((sourceFile) =>
          bindingAdmissionsForSourceFile(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            constructionProducts,
          ),
        ),
    ),
  );
}

export function readFrameworkBindingEffectPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  bindingProducts: readonly FrameworkBindingProductRow[],
): readonly FrameworkBindingEffectRow[] {
  return bindingEffectRowsByPackage.read(sourceProject, packageId, () => {
    const bindingNames = new Set(
      bindingProducts
        .filter((row) => row.packageId === packageId)
        .map((row) => row.bindingName),
    );
    return uniqueById(
      sourceProject
        .ownedSourceFiles()
        .filter(
          (sourceFile) =>
            !sourceFile.isDeclarationFile &&
            sourceProject.packageForFileName(sourceFile.fileName)?.id ===
              packageId,
        )
        .flatMap((sourceFile) =>
          bindingEffectsForSourceFile(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            bindingNames,
          ),
        ),
    );
  });
}

export function readFrameworkBindingSetupPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkBindingSetupRow[] {
  return bindingSetupRowsByPackage.read(sourceProject, packageId, () =>
    uniqueById(
      sourceProject
        .ownedSourceFiles()
        .filter(
          (sourceFile) =>
            !sourceFile.isDeclarationFile &&
            sourceProject.packageForFileName(sourceFile.fileName)?.id ===
              packageId,
        )
        .flatMap((sourceFile) =>
          bindingSetupsForSourceFile(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
          ),
        ),
    ),
  );
}

export function bindingProductsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  bindingNames: ReadonlySet<string>,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
  bindingAdmissions: readonly FrameworkBindingAdmissionRow[],
): readonly FrameworkBindingProductRow[] {
  const rows: FrameworkBindingProductRow[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isClassDeclaration(node) &&
      node.name !== undefined &&
      bindingNames.has(node.name.text)
    ) {
      rows.push(
        bindingProductRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          node as ts.ClassDeclaration & { readonly name: ts.Identifier },
          constructionProducts,
          bindingAdmissions,
        ),
      );
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

export function bindingEffectsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  bindingNames: ReadonlySet<string>,
): readonly FrameworkBindingEffectRow[] {
  const rows: FrameworkBindingEffectRow[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isClassDeclaration(node) &&
      node.name !== undefined &&
      bindingNames.has(node.name.text)
    ) {
      rows.push(
        ...bindingEffectsForClass(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          node as ts.ClassDeclaration & { readonly name: ts.Identifier },
        ),
      );
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

export function bindingSetupsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
): readonly FrameworkBindingSetupRow[] {
  const rows: FrameworkBindingSetupRow[] = [];
  const visit = (node: ts.Node, producerName: string): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      for (const member of node.members) {
        visit(member, node.name.text);
      }
      return;
    }
    if (ts.isClassExpression(node)) {
      const nextProducerName = node.name?.text ?? producerName;
      for (const member of node.members) {
        visit(member, nextProducerName);
      }
      return;
    }
    if (ts.isMethodDeclaration(node) && node.body !== undefined) {
      const methodName = propertyNameText(node.name);
      visit(
        node.body,
        methodName === null ? producerName : `${producerName}.${methodName}`,
      );
      return;
    }
    if (ts.isFunctionDeclaration(node) && node.body !== undefined) {
      visit(node.body, node.name?.text ?? producerName);
      return;
    }
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      const nextProducerName =
        functionExpressionProducerName(node) ?? producerName;
      visit(node.body, nextProducerName);
      return;
    }
    if (ts.isCallExpression(node)) {
      const row = bindingSetupRow(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        producerName,
        node,
      );
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, (child) => visit(child, producerName));
  };

  visit(sourceFile, sourceFileProducerName(sourceFile));
  return rows;
}

export function bindingEffectsForClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  declaration: ts.ClassDeclaration & { readonly name: ts.Identifier },
): readonly FrameworkBindingEffectRow[] {
  const rows: FrameworkBindingEffectRow[] = [];
  for (const member of declaration.members) {
    if (!ts.isMethodDeclaration(member) || member.body === undefined) {
      continue;
    }
    const methodName = propertyNameText(member.name);
    if (methodName === null) {
      continue;
    }
    if (
      isBindingLifecycleMethodName(methodName) &&
      ts.isIdentifier(member.name)
    ) {
      rows.push(
        bindingEffectRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          declaration.name.text,
          methodName,
          FrameworkBindingEffectKind.LifecycleMethod,
          methodName,
          member.name,
        ),
      );
    }
    for (const call of callExpressionsIn(member.body)) {
      const effectKind = bindingEffectKindForCall(call);
      if (effectKind === null) {
        continue;
      }
      const callSite = readTypeScriptCallSiteEntry(
        sourceProject,
        sourceFile,
        call,
      );
      if (callSite === null) {
        continue;
      }
      rows.push(
        bindingEffectRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          declaration.name.text,
          methodName,
          effectKind,
          callSite.calleeName,
          call,
          callSite,
        ),
      );
    }
  }
  return rows;
}

export function bindingSetupRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  producerName: string,
  call: ts.CallExpression,
): FrameworkBindingSetupRow | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const setupKind = bindingSetupKindForMethod(expression.name.text);
  if (setupKind === null) {
    return null;
  }
  const receiver = unwrapExpression(expression.expression);
  const bindingName = bindingNameFromSetupReceiver(sourceProject, receiver);
  if (bindingName === null) {
    return null;
  }
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  const firstArgument = call.arguments[0];
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const span = call.getStart(sourceFile);
  return {
    id: `framework-binding-setup:${packageId}:${bindingName}:${setupKind}:${span}`,
    packageId,
    packageName,
    producerName,
    bindingName,
    setupKind,
    setupMethodName: expression.name.text,
    receiverExpression: receiver.getText(sourceFile),
    bindingExpression: readTypeScriptExpressionFact(
      sourceProject,
      sourceFile,
      receiver,
    ),
    ...(firstArgument === undefined || ts.isSpreadElement(firstArgument)
      ? {}
      : {
          setupArgument: readTypeScriptExpressionFact(
            sourceProject,
            sourceFile,
            unwrapExpression(firstArgument),
          ),
        }),
    callSite,
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, call),
  };
}

export function bindingSetupKindForMethod(
  methodName: string,
): FrameworkBindingSetupKind | null {
  if (methodName === "useTargetObserver") {
    return FrameworkBindingSetupKind.TargetObserver;
  }
  if (methodName === "useAccessor") {
    return FrameworkBindingSetupKind.Accessor;
  }
  if (methodName === "useTargetSubscriber") {
    return FrameworkBindingSetupKind.TargetSubscriber;
  }
  return null;
}

export function bindingNameFromSetupReceiver(
  sourceProject: SourceProject,
  receiver: ts.Expression,
): string | null {
  const directName = bindingNameFromBindingExpression(sourceProject, receiver);
  if (directName !== null) {
    return directName;
  }
  if (ts.isIdentifier(receiver)) {
    const initializer = localVariableInitializerForIdentifier(receiver);
    return initializer === null
      ? null
      : bindingNameFromBindingExpression(sourceProject, initializer);
  }
  return null;
}

export function bindingEffectRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  bindingName: string,
  methodName: string,
  effectKind: FrameworkBindingEffectKind,
  effectName: string,
  expression: ts.Expression,
  callSite?: TypeScriptCallSiteEntry,
): FrameworkBindingEffectRow {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const span = expression.getStart(sourceFile);
  return {
    id: `framework-binding-effect:${packageId}:${bindingName}:${methodName}:${effectKind}:${span}`,
    packageId,
    packageName,
    bindingName,
    methodName,
    effectKind,
    effectName,
    expression: readTypeScriptExpressionFact(
      sourceProject,
      sourceFile,
      expression,
    ),
    ...(callSite === undefined ? {} : { callSite }),
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, expression),
  };
}

export function bindingEffectKindForCall(
  call: ts.CallExpression,
): FrameworkBindingEffectKind | null {
  if (isObserverLocatorUseCall(call)) {
    return FrameworkBindingEffectKind.ObserverLookup;
  }
  const calleeName = propertyAccessCalleeName(call);
  if (calleeName === null) {
    return null;
  }
  if (
    calleeName === "addEventListener" ||
    calleeName === "removeEventListener"
  ) {
    return FrameworkBindingEffectKind.EventListener;
  }
  if (calleeName === "subscribe" || calleeName === "unsubscribe") {
    return FrameworkBindingEffectKind.Subscription;
  }
  return null;
}

export function bindingProductRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  declaration: ts.ClassDeclaration & { readonly name: ts.Identifier },
  constructionProducts: readonly FrameworkSyntaxProductRow[],
  bindingAdmissions: readonly FrameworkBindingAdmissionRow[],
): FrameworkBindingProductRow {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const span = declaration.getStart(sourceFile);
  const bindingName = declaration.name.text;
  const constructorParameters = bindingConstructorParameters(declaration);
  const methodNames = bindingMethodNames(declaration);
  return {
    id: `framework-binding-product:${packageId}:${bindingName}:${span}`,
    packageId,
    packageName,
    bindingName,
    declarationKind: SourceDeclarationKind.Class,
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, declaration),
    constructionProducts: constructionProducts.filter(
      (product) => product.bindingName === bindingName,
    ),
    admissions: bindingAdmissions.filter(
      (admission) => admission.bindingName === bindingName,
    ),
    constructorParameters,
    methodNames,
    lifecycleMethods: methodNames.filter(isBindingLifecycleMethodName),
    observerLocatorParameters: constructorParameters.filter(
      isObserverLocatorParameter,
    ),
    observerLocatorCallSites: observerLocatorCallSitesForBindingClass(
      sourceProject,
      sourceFile,
      declaration,
    ),
    targetObserverMethods: methodNames.filter((methodName) =>
      ["useTargetObserver", "useAccessor", "useTargetSubscriber"].includes(
        methodName,
      ),
    ),
  };
}

export function bindingAdmissionsForSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
): readonly FrameworkBindingAdmissionRow[] {
  const rows: FrameworkBindingAdmissionRow[] = [];
  const visit = (node: ts.Node, producerName: string): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      for (const member of node.members) {
        visit(member, node.name.text);
      }
      return;
    }
    if (ts.isClassExpression(node)) {
      const nextProducerName = node.name?.text ?? producerName;
      for (const member of node.members) {
        visit(member, nextProducerName);
      }
      return;
    }
    if (ts.isMethodDeclaration(node) && node.body !== undefined) {
      const methodName = propertyNameText(node.name);
      visit(
        node.body,
        methodName === null ? producerName : `${producerName}.${methodName}`,
      );
      return;
    }
    if (ts.isFunctionDeclaration(node) && node.body !== undefined) {
      visit(node.body, node.name?.text ?? producerName);
      return;
    }
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      const nextProducerName =
        functionExpressionProducerName(node) ?? producerName;
      if (ts.isBlock(node.body)) {
        visit(node.body, nextProducerName);
      } else {
        visit(node.body, nextProducerName);
      }
      return;
    }
    if (ts.isCallExpression(node) && isAddBindingCall(node)) {
      const row = bindingAdmissionRow(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        producerName,
        node,
        constructionProducts,
      );
      if (row !== null) {
        rows.push(row);
      }
    }
    ts.forEachChild(node, (child) => visit(child, producerName));
  };

  visit(sourceFile, sourceFileProducerName(sourceFile));
  return rows;
}

export function bindingAdmissionRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  producerName: string,
  call: ts.CallExpression,
  constructionProducts: readonly FrameworkSyntaxProductRow[],
): FrameworkBindingAdmissionRow | null {
  const firstArgument = call.arguments[0];
  if (firstArgument === undefined || ts.isSpreadElement(firstArgument)) {
    return null;
  }
  const admission = bindingAdmissionExpressionForArgument(
    sourceProject,
    firstArgument,
  );
  if (admission === null) {
    return null;
  }
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const span = call.getStart(sourceFile);
  const controllerExpression =
    addBindingControllerExpression(sourceFile, call) ?? "unknown";
  return {
    id: `framework-binding-admission:${packageId}:${admission.bindingName}:${span}`,
    packageId,
    packageName,
    producerName,
    controllerExpression,
    bindingName: admission.bindingName,
    constructionKind: admission.constructionKind,
    admissionCall: callSite,
    bindingExpression: readTypeScriptExpressionFact(
      sourceProject,
      admission.expression.getSourceFile(),
      unwrapExpression(admission.expression),
    ),
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, call),
    constructionProducts: constructionProducts.filter(
      (product) => product.bindingName === admission.bindingName,
    ),
  };
}

export function isAddBindingCall(call: ts.CallExpression): boolean {
  const expression = unwrapExpression(call.expression);
  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "addBinding"
  );
}

export function addBindingControllerExpression(
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): string | null {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    ? expression.expression.getText(sourceFile)
    : null;
}

export function bindingAdmissionExpressionForArgument(
  sourceProject: SourceProject,
  argument: ts.Expression,
): BindingAdmissionExpression | null {
  const current = unwrapExpression(argument);
  if (ts.isNewExpression(current)) {
    const bindingName = bindingNameFromCreationExpression(current);
    return bindingName === null
      ? null
      : {
          bindingName,
          constructionKind: FrameworkBindingConstructionKind.InlineNew,
          expression: current,
        };
  }
  if (ts.isCallExpression(current)) {
    const bindingName = bindingNameFromCreationExpression(current);
    return bindingName === null
      ? null
      : {
          bindingName,
          constructionKind: FrameworkBindingConstructionKind.InlineFactoryCall,
          expression: current,
        };
  }
  if (!ts.isIdentifier(current)) {
    return null;
  }
  const localInitializer = localVariableInitializerForIdentifier(current);
  if (localInitializer !== null) {
    const bindingName = bindingNameFromBindingExpression(
      sourceProject,
      localInitializer,
    );
    if (bindingName !== null) {
      return {
        bindingName,
        constructionKind: FrameworkBindingConstructionKind.LocalVariable,
        expression: localInitializer,
      };
    }
  }
  const collectionSource = collectionFactoryExpressionForCallbackParameter(
    sourceProject,
    current,
  );
  if (collectionSource !== null) {
    return {
      bindingName: collectionSource.bindingName,
      constructionKind:
        FrameworkBindingConstructionKind.FactoryCollectionElement,
      expression: collectionSource.expression,
    };
  }
  return null;
}

export function bindingConstructorParameters(
  declaration: ts.ClassDeclaration,
): readonly FrameworkBindingConstructorParameterRow[] {
  const constructorDeclaration = declaration.members.find(
    (member): member is ts.ConstructorDeclaration =>
      ts.isConstructorDeclaration(member),
  );
  return (
    constructorDeclaration?.parameters.map((parameter) => ({
      name: parameter.name.getText(parameter.getSourceFile()),
      typeText: parameter.type?.getText(parameter.getSourceFile()) ?? null,
    })) ?? []
  );
}

export function bindingMethodNames(
  declaration: ts.ClassDeclaration,
): readonly string[] {
  return declaration.members
    .filter((member): member is ts.MethodDeclaration =>
      ts.isMethodDeclaration(member),
    )
    .map((member) => propertyNameText(member.name))
    .filter((methodName): methodName is string => methodName !== null);
}

export function isBindingLifecycleMethodName(methodName: string): boolean {
  return [
    "bind",
    "unbind",
    "attach",
    "detach",
    "handleChange",
    "handleCollectionChange",
    "handleEvent",
    "handleStateChange",
    "handleLocaleChange",
    "updateTarget",
    "updateSource",
    "callSource",
  ].includes(methodName);
}

export function isObserverLocatorParameter(
  parameter: FrameworkBindingConstructorParameterRow,
): boolean {
  return (
    parameter.name.toLowerCase().includes("observerlocator") ||
    parameter.name === "oL" ||
    parameter.typeText?.includes("IObserverLocator") === true
  );
}

export function observerLocatorCallSitesForBindingClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.ClassDeclaration,
): readonly TypeScriptCallSiteEntry[] {
  return callExpressionsIn(declaration)
    .filter(isObserverLocatorUseCall)
    .map((call) => readTypeScriptCallSiteEntry(sourceProject, sourceFile, call))
    .filter(
      (callSite): callSite is TypeScriptCallSiteEntry => callSite !== null,
    );
}

export function isObserverLocatorUseCall(call: ts.CallExpression): boolean {
  const expression = unwrapExpression(call.expression);
  return (
    ts.isPropertyAccessExpression(expression) &&
    [
      "getObserver",
      "getAccessor",
      "getArrayObserver",
      "getMapObserver",
      "getSetObserver",
    ].includes(expression.name.text)
  );
}

export function propertyAccessCalleeName(
  call: ts.CallExpression,
): string | null {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    ? expression.name.text
    : null;
}
