import ts from "typescript";

import {
  calleeNameForExpression,
  propertyNameText,
  unwrapExpression,
} from "../../source/index.js";
import {
  productArchitectureContextForNode,
  sourceReferenceForEntryNode,
  type ProductArchitectureSourceReference,
} from "./product-architecture-source.js";

/** Source file shape needed by the product kernel-record flow scanner. */
export interface ProductArchitectureKernelRecordSourceFile {
  readonly sourceFile: ts.SourceFile;
  readonly filePath: string;
  readonly area: string;
}

/** Source-level construction of one record admissible to KernelStore. */
export interface ProductArchitectureKernelRecordConstructionRow {
  /** Stable row id. */
  readonly id: string;
  /** Syntax that constructed the record. */
  readonly constructionKind: "new-expression" | "object-literal";
  /** Constructor class when known. */
  readonly className: string | null;
  /** Store record discriminator carried by the constructed class/object. */
  readonly recordKind: string;
  /** Product vocabulary expression passed to product-shaped records, when syntactically visible. */
  readonly productKindExpression: string | null;
  /** Claim predicate expression passed to claim records, when syntactically visible. */
  readonly predicateKeyExpression: string | null;
  /** Open-seam vocabulary expression passed to seam records, when syntactically visible. */
  readonly seamKindExpression: string | null;
  /** Evidence kind expression passed to evidence records, when syntactically visible. */
  readonly evidenceKindExpression: string | null;
  /** Repository-relative source file path. */
  readonly filePath: string;
  /** Top-level semantic-runtime source area containing the construction site. */
  readonly area: string;
  /** Owning class name when the construction sits inside a class body. */
  readonly ownerClassName: string | null;
  /** Owning function/method/accessor surface when Atlas can infer one. */
  readonly ownerFunctionName: string | null;
  /** Number of constructor arguments or object literal properties. */
  readonly arity: number;
  /** Exact source range for the construction site. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source-level KernelStoreBatch construction or direct commit handoff. */
export interface ProductArchitectureKernelRecordBatchRow {
  /** Stable row id. */
  readonly id: string;
  /** True when the batch construction is immediately passed to a KernelStore.commit call. */
  readonly committed: boolean;
  /** Commit receiver expression, such as this.store or store, when committed at the construction site. */
  readonly commitReceiverExpression: string | null;
  /** Expression supplying the records argument to KernelStoreBatch. */
  readonly recordsExpression: string | null;
  /** Expression supplying the optional batch label. */
  readonly labelExpression: string | null;
  /** Literal batch label when statically present. */
  readonly labelLiteral: string | null;
  /** Repository-relative source file path. */
  readonly filePath: string;
  /** Top-level semantic-runtime source area containing the batch site. */
  readonly area: string;
  /** Owning class name when the batch sits inside a class body. */
  readonly ownerClassName: string | null;
  /** Owning function/method/accessor surface when Atlas can infer one. */
  readonly ownerFunctionName: string | null;
  /** Exact source range for the batch construction or enclosing commit call. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Source-level construction of one field-level provenance link. */
export interface ProductArchitectureFieldProvenanceConstructionRow {
  /** Stable row id. */
  readonly id: string;
  /** Syntax form that produced the field provenance row. */
  readonly constructionKind: "new-expression" | "fieldProvenanceEntries-call";
  /** Field source inside the construction form, used to separate exact fields from helper fan-out. */
  readonly fieldNameOrigin:
    | "constructor-argument"
    | "array-literal-element"
    | "array-conditional-element"
    | "array-spread-element"
    | "array-dynamic-element"
    | "dynamic-field-collection";
  /** Expression supplying the product field name. */
  readonly fieldNameExpression: string | null;
  /** Literal product field name when statically present. */
  readonly fieldNameLiteral: string | null;
  /** Expression supplying the provenance handle. */
  readonly provenanceExpression: string | null;
  /** Repository-relative source file path. */
  readonly filePath: string;
  /** Top-level semantic-runtime source area containing the construction site. */
  readonly area: string;
  /** Owning class name when the construction sits inside a class body. */
  readonly ownerClassName: string | null;
  /** Owning function/method/accessor surface when Atlas can infer one. */
  readonly ownerFunctionName: string | null;
  /** Exact source range for the construction site. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

export interface ProductArchitectureKernelRecordRows {
  readonly constructorClassCount: number;
  readonly constructions: readonly ProductArchitectureKernelRecordConstructionRow[];
  readonly batches: readonly ProductArchitectureKernelRecordBatchRow[];
  readonly fieldProvenanceConstructions: readonly ProductArchitectureFieldProvenanceConstructionRow[];
}

interface KernelRecordClassDefinition {
  readonly className: string;
  readonly recordKind: string;
  readonly constructorParameters: readonly string[];
}

interface SourceVisitContext {
  readonly className: string | null;
  readonly functionName: string | null;
}

/** Read source-level KernelStoreRecord and KernelStoreBatch flow rows in one AST pass. */
export function readProductArchitectureKernelRecordRows(
  sourceFiles: readonly ProductArchitectureKernelRecordSourceFile[],
): ProductArchitectureKernelRecordRows {
  const definitionsByClassName = kernelRecordClassDefinitions(sourceFiles);
  const rows = kernelRecordSourceRows(sourceFiles, definitionsByClassName);
  return {
    constructorClassCount: definitionsByClassName.size,
    constructions: rows.constructions,
    batches: rows.batches,
    fieldProvenanceConstructions: rows.fieldProvenanceConstructions,
  };
}

function kernelRecordClassDefinitions(
  sourceFiles: readonly ProductArchitectureKernelRecordSourceFile[],
): ReadonlyMap<string, KernelRecordClassDefinition> {
  const typeAliases = new Map<string, ts.TypeNode>();
  const definitionsByClassName = new Map<string, KernelRecordClassDefinition>();

  for (const entry of sourceFiles) {
    for (const statement of entry.sourceFile.statements) {
      if (ts.isTypeAliasDeclaration(statement)) {
        typeAliases.set(statement.name.text, statement.type);
        continue;
      }
      if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
        const recordKind = classKindLiteral(statement, entry.sourceFile);
        if (recordKind === null) {
          continue;
        }
        definitionsByClassName.set(statement.name.text, {
          className: statement.name.text,
          recordKind,
          constructorParameters: constructorParameterNames(statement, entry.sourceFile),
        });
      }
    }
  }

  const kernelRecordType = typeAliases.get("KernelStoreRecord");
  if (kernelRecordType === undefined) {
    return new Map();
  }

  const classNames = new Set<string>();
  const visitedAliases = new Set<string>();
  const expand = (type: ts.TypeNode): void => {
    if (ts.isUnionTypeNode(type)) {
      for (const child of type.types) {
        expand(child);
      }
      return;
    }
    if (!ts.isTypeReferenceNode(type)) {
      return;
    }
    const typeName = entityNameText(type.typeName);
    if (typeName === null) {
      return;
    }
    if (definitionsByClassName.has(typeName)) {
      classNames.add(typeName);
      return;
    }
    if (visitedAliases.has(typeName)) {
      return;
    }
    const aliasType = typeAliases.get(typeName);
    if (aliasType === undefined) {
      return;
    }
    visitedAliases.add(typeName);
    expand(aliasType);
  };

  expand(kernelRecordType);

  return new Map(
    [...classNames]
      .flatMap((className) => {
        const definition = definitionsByClassName.get(className);
        return definition === undefined ? [] : [[className, definition] as const];
      })
      .sort((left, right) => left[0].localeCompare(right[0])),
  );
}

function classKindLiteral(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
): string | null {
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) {
      continue;
    }
    if (propertyNameText(member.name, sourceFile) !== "kind") {
      continue;
    }
    const initializer = member.initializer === undefined
      ? null
      : unwrapExpression(member.initializer);
    return initializer !== null && ts.isStringLiteralLike(initializer)
      ? initializer.text
      : null;
  }
  return null;
}

function constructorParameterNames(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
): readonly string[] {
  const constructor = node.members.find(ts.isConstructorDeclaration);
  if (constructor === undefined) {
    return [];
  }
  return constructor.parameters.map((parameter) =>
    ts.isIdentifier(parameter.name)
      ? parameter.name.text
      : parameter.name.getText(sourceFile),
  );
}

function entityNameText(name: ts.EntityName): string | null {
  return ts.isIdentifier(name) ? name.text : null;
}

function kernelRecordSourceRows(
  sourceFiles: readonly ProductArchitectureKernelRecordSourceFile[],
  definitionsByClassName: ReadonlyMap<string, KernelRecordClassDefinition>,
): Omit<ProductArchitectureKernelRecordRows, "constructorClassCount"> {
  const constructions: ProductArchitectureKernelRecordConstructionRow[] = [];
  const batches: ProductArchitectureKernelRecordBatchRow[] = [];
  const fieldProvenanceConstructions: ProductArchitectureFieldProvenanceConstructionRow[] = [];
  const recordKinds = new Set(
    [...definitionsByClassName.values()].map((definition) => definition.recordKind),
  );
  for (const entry of sourceFiles) {
    const rootContext: SourceVisitContext = {
      className: null,
      functionName: null,
    };
    const visit = (node: ts.Node, context: SourceVisitContext): void => {
      const nodeContext = productArchitectureContextForNode(node, context, entry.sourceFile);
      if (ts.isNewExpression(node)) {
        const constructorName = visibleInvocationName(node, entry.sourceFile);
        const row = kernelRecordConstructionRowForNewExpression(
          entry,
          node,
          nodeContext,
          constructorName,
          definitionsByClassName,
        );
        if (row !== null) {
          constructions.push(row);
        }
        if (constructorName === "KernelStoreBatch") {
          batches.push(kernelRecordBatchRow(entry, node, nodeContext));
        }
        if (constructorName === "FieldProvenance") {
          fieldProvenanceConstructions.push(fieldProvenanceConstructionRow(entry, node, nodeContext));
        }
      } else if (
        ts.isCallExpression(node) &&
        visibleInvocationName(node, entry.sourceFile) === "fieldProvenanceEntries"
      ) {
        fieldProvenanceConstructions.push(...fieldProvenanceRowsForHelperCall(entry, node, nodeContext));
      } else if (ts.isObjectLiteralExpression(node)) {
        const row = kernelRecordConstructionRowForObjectLiteral(
          entry,
          node,
          nodeContext,
          recordKinds,
        );
        if (row !== null) {
          constructions.push(row);
        }
      }
      ts.forEachChild(node, (child) => visit(child, nodeContext));
    };
    visit(entry.sourceFile, rootContext);
  }
  return {
    constructions: constructions.sort((left, right) =>
      left.filePath.localeCompare(right.filePath) ||
      left.source.startLine - right.source.startLine ||
      left.source.startCharacter - right.source.startCharacter ||
      left.recordKind.localeCompare(right.recordKind),
    ),
    batches: batches.sort((left, right) =>
      left.filePath.localeCompare(right.filePath) ||
      left.source.startLine - right.source.startLine ||
      left.source.startCharacter - right.source.startCharacter,
    ),
    fieldProvenanceConstructions: fieldProvenanceConstructions.sort((left, right) =>
      left.filePath.localeCompare(right.filePath) ||
      left.source.startLine - right.source.startLine ||
      left.source.startCharacter - right.source.startCharacter,
    ),
  };
}

function fieldProvenanceConstructionRow(
  entry: ProductArchitectureKernelRecordSourceFile,
  node: ts.NewExpression,
  context: SourceVisitContext,
): ProductArchitectureFieldProvenanceConstructionRow {
  const source = sourceReferenceForEntryNode(entry, node);
  const fieldArgument = node.arguments?.[0];
  const provenanceArgument = node.arguments?.[1];
  const fieldNameExpression = fieldArgument === undefined
    ? null
    : compactSourceExpressionText(fieldArgument, entry.sourceFile);
  const fieldNameLiteral = fieldArgument === undefined
    ? null
    : literalStringExpressionText(fieldArgument);
  const provenanceExpression = provenanceArgument === undefined
    ? null
    : compactSourceExpressionText(provenanceArgument, entry.sourceFile);
  return {
    id: `product.arch:field-provenance:${entry.filePath}:${node.getStart(entry.sourceFile)}`,
    constructionKind: "new-expression",
    fieldNameOrigin: "constructor-argument",
    fieldNameExpression,
    fieldNameLiteral,
    provenanceExpression,
    filePath: entry.filePath,
    area: entry.area,
    ownerClassName: context.className,
    ownerFunctionName: context.functionName,
    source,
    summary: fieldProvenanceConstructionSummary(entry.area, context, fieldNameExpression),
  };
}

interface FieldProvenanceFieldCandidate {
  readonly node: ts.Node;
  readonly fieldNameExpression: string | null;
  readonly fieldNameLiteral: string | null;
  readonly fieldNameOrigin: ProductArchitectureFieldProvenanceConstructionRow["fieldNameOrigin"];
}

function fieldProvenanceRowsForHelperCall(
  entry: ProductArchitectureKernelRecordSourceFile,
  node: ts.CallExpression,
  context: SourceVisitContext,
): readonly ProductArchitectureFieldProvenanceConstructionRow[] {
  const fieldArgument = node.arguments[0];
  const provenanceArgument = node.arguments[1];
  const provenanceExpression = provenanceArgument === undefined
    ? null
    : compactSourceExpressionText(provenanceArgument, entry.sourceFile);
  const candidates = fieldProvenanceFieldCandidatesForArgument(
    entry,
    fieldArgument,
  );
  return candidates.map((candidate, index) => {
    const source = sourceReferenceForEntryNode(entry, candidate.node);
    return {
      id: `product.arch:field-provenance:${entry.filePath}:${node.getStart(entry.sourceFile)}:${index}`,
      constructionKind: "fieldProvenanceEntries-call",
      fieldNameOrigin: candidate.fieldNameOrigin,
      fieldNameExpression: candidate.fieldNameExpression,
      fieldNameLiteral: candidate.fieldNameLiteral,
      provenanceExpression,
      filePath: entry.filePath,
      area: entry.area,
      ownerClassName: context.className,
      ownerFunctionName: context.functionName,
      source,
      summary: fieldProvenanceConstructionSummary(
        entry.area,
        context,
        candidate.fieldNameExpression,
      ),
    };
  });
}

function fieldProvenanceFieldCandidatesForArgument(
  entry: ProductArchitectureKernelRecordSourceFile,
  fieldArgument: ts.Expression | undefined,
): readonly FieldProvenanceFieldCandidate[] {
  if (fieldArgument === undefined) {
    return [{
      node: entry.sourceFile,
      fieldNameExpression: null,
      fieldNameLiteral: null,
      fieldNameOrigin: "dynamic-field-collection",
    }];
  }
  const current = unwrapExpression(fieldArgument);
  if (!ts.isArrayLiteralExpression(current)) {
    return [{
      node: current,
      fieldNameExpression: compactSourceExpressionText(current, entry.sourceFile),
      fieldNameLiteral: literalStringExpressionText(current),
      fieldNameOrigin: "dynamic-field-collection",
    }];
  }

  return current.elements.flatMap((element) =>
    fieldProvenanceFieldCandidatesForArrayElement(entry, element)
  );
}

function fieldProvenanceFieldCandidatesForArrayElement(
  entry: ProductArchitectureKernelRecordSourceFile,
  element: ts.Expression | ts.SpreadElement,
): readonly FieldProvenanceFieldCandidate[] {
  if (ts.isSpreadElement(element)) {
    return [{
      node: element,
      fieldNameExpression: compactSourceExpressionText(element, entry.sourceFile),
      fieldNameLiteral: null,
      fieldNameOrigin: "array-spread-element",
    }];
  }
  return fieldProvenanceFieldCandidatesForExpression(
    entry,
    element,
    "array-literal-element",
  );
}

function fieldProvenanceFieldCandidatesForExpression(
  entry: ProductArchitectureKernelRecordSourceFile,
  expression: ts.Expression,
  origin: ProductArchitectureFieldProvenanceConstructionRow["fieldNameOrigin"],
): readonly FieldProvenanceFieldCandidate[] {
  const current = unwrapExpression(expression);
  if (isNullishExpression(current)) {
    return [];
  }
  if (ts.isConditionalExpression(current)) {
    return [
      ...fieldProvenanceFieldCandidatesForExpression(
        entry,
        current.whenTrue,
        "array-conditional-element",
      ),
      ...fieldProvenanceFieldCandidatesForExpression(
        entry,
        current.whenFalse,
        "array-conditional-element",
      ),
    ];
  }

  const literal = literalStringExpressionText(current);
  return [{
    node: current,
    fieldNameExpression: compactSourceExpressionText(current, entry.sourceFile),
    fieldNameLiteral: literal,
    fieldNameOrigin: literal === null && origin === "array-literal-element"
      ? "array-dynamic-element"
      : origin,
  }];
}

function kernelRecordBatchRow(
  entry: ProductArchitectureKernelRecordSourceFile,
  node: ts.NewExpression,
  context: SourceVisitContext,
): ProductArchitectureKernelRecordBatchRow {
  const commitCall = enclosingKernelStoreCommitCall(node);
  const sourceNode = commitCall ?? node;
  const source = sourceReferenceForEntryNode(entry, sourceNode);
  const recordsExpression = node.arguments?.[0] === undefined
    ? null
    : compactSourceExpressionText(node.arguments[0], entry.sourceFile);
  const labelArgument = node.arguments?.[1];
  const labelExpression = labelArgument === undefined
    ? null
    : compactSourceExpressionText(labelArgument, entry.sourceFile);
  const labelLiteral = labelArgument === undefined
    ? null
    : literalStringExpressionText(labelArgument);
  const commitReceiverExpression = commitCall === null
    ? null
    : commitReceiverText(commitCall, entry.sourceFile);
  return {
    id: `product.arch:kernel-batch:${entry.filePath}:${sourceNode.getStart(entry.sourceFile)}`,
    committed: commitCall !== null,
    commitReceiverExpression,
    recordsExpression,
    labelExpression,
    labelLiteral,
    filePath: entry.filePath,
    area: entry.area,
    ownerClassName: context.className,
    ownerFunctionName: context.functionName,
    source,
    summary: kernelRecordBatchSummary(
      entry.area,
      context,
      commitReceiverExpression,
      labelExpression,
    ),
  };
}

function enclosingKernelStoreCommitCall(
  node: ts.NewExpression,
): ts.CallExpression | null {
  const parent = node.parent;
  if (
    parent !== undefined &&
    ts.isCallExpression(parent) &&
    parent.arguments.some((argument) => argument === node) &&
    ts.isPropertyAccessExpression(parent.expression) &&
    parent.expression.name.text === "commit"
  ) {
    return parent;
  }
  return null;
}

function commitReceiverText(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
): string | null {
  return ts.isPropertyAccessExpression(node.expression)
    ? compactSourceExpressionText(node.expression.expression, sourceFile)
    : null;
}

function literalStringExpressionText(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  return null;
}

function isNullishExpression(expression: ts.Expression): boolean {
  const current = unwrapExpression(expression);
  return current.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(current) && current.text === "undefined") ||
    (
      ts.isVoidExpression(current) &&
      ts.isNumericLiteral(current.expression) &&
      current.expression.text === "0"
    );
}

function kernelRecordBatchSummary(
  area: string,
  context: SourceVisitContext,
  commitReceiverExpression: string | null,
  labelExpression: string | null,
): string {
  const owner = context.functionName ?? context.className ?? "module top level";
  const label = labelExpression === null ? "without a label" : `with label ${labelExpression}`;
  return commitReceiverExpression === null
    ? `${area} constructs a KernelStoreBatch ${label} in ${owner}.`
    : `${area} commits a KernelStoreBatch ${label} through ${commitReceiverExpression} in ${owner}.`;
}

function fieldProvenanceConstructionSummary(
  area: string,
  context: SourceVisitContext,
  fieldNameExpression: string | null,
): string {
  const owner = context.functionName ?? context.className ?? "module top level";
  const field = fieldNameExpression === null ? "an unknown field" : fieldNameExpression;
  return `${area} attaches field provenance for ${field} in ${owner}.`;
}

function kernelRecordConstructionRowForNewExpression(
  entry: ProductArchitectureKernelRecordSourceFile,
  node: ts.NewExpression,
  context: SourceVisitContext,
  className: string | null,
  definitionsByClassName: ReadonlyMap<string, KernelRecordClassDefinition>,
): ProductArchitectureKernelRecordConstructionRow | null {
  if (className === null) {
    return null;
  }
  const definition = definitionsByClassName.get(className);
  if (definition === undefined) {
    return null;
  }
  const source = sourceReferenceForEntryNode(entry, node);
  const argumentText = (parameterName: string): string | null => {
    const index = definition.constructorParameters.indexOf(parameterName);
    const argument = index === -1 ? undefined : node.arguments?.[index];
    return argument === undefined
      ? null
      : compactSourceExpressionText(argument, entry.sourceFile);
  };
  return {
    id: `product.arch:kernel-record:${entry.filePath}:${node.getStart(entry.sourceFile)}:${className}`,
    constructionKind: "new-expression",
    className,
    recordKind: definition.recordKind,
    productKindExpression: argumentText("productKindKey"),
    predicateKeyExpression: argumentText("predicateKey"),
    seamKindExpression: argumentText("seamKindKey"),
    evidenceKindExpression: argumentText("evidenceKind"),
    filePath: entry.filePath,
    area: entry.area,
    ownerClassName: context.className,
    ownerFunctionName: context.functionName,
    arity: node.arguments?.length ?? 0,
    source,
    summary: kernelRecordConstructionSummary(
      entry.area,
      className,
      definition.recordKind,
      context,
    ),
  };
}

function kernelRecordConstructionRowForObjectLiteral(
  entry: ProductArchitectureKernelRecordSourceFile,
  node: ts.ObjectLiteralExpression,
  context: SourceVisitContext,
  recordKinds: ReadonlySet<string>,
): ProductArchitectureKernelRecordConstructionRow | null {
  const recordKind = objectLiteralStringValue(node, "kind", entry.sourceFile);
  if (recordKind === null || !recordKinds.has(recordKind)) {
    return null;
  }
  if (objectLiteralExpressionText(node, "handle", entry.sourceFile) === null) {
    return null;
  }
  const source = sourceReferenceForEntryNode(entry, node);
  return {
    id: `product.arch:kernel-record:${entry.filePath}:${node.getStart(entry.sourceFile)}:${recordKind}`,
    constructionKind: "object-literal",
    className: null,
    recordKind,
    productKindExpression: objectLiteralExpressionText(
      node,
      "productKindKey",
      entry.sourceFile,
    ),
    predicateKeyExpression: objectLiteralExpressionText(
      node,
      "predicateKey",
      entry.sourceFile,
    ),
    seamKindExpression: objectLiteralExpressionText(
      node,
      "seamKindKey",
      entry.sourceFile,
    ),
    evidenceKindExpression: objectLiteralExpressionText(
      node,
      "evidenceKind",
      entry.sourceFile,
    ),
    filePath: entry.filePath,
    area: entry.area,
    ownerClassName: context.className,
    ownerFunctionName: context.functionName,
    arity: node.properties.length,
    source,
    summary: kernelRecordConstructionSummary(entry.area, null, recordKind, context),
  };
}

function visibleInvocationName(
  node: ts.CallExpression | ts.NewExpression,
  sourceFile: ts.SourceFile,
): string | null {
  return calleeNameForExpression(
    node.expression,
    sourceFile,
    node.expression.getText(sourceFile),
  );
}

function objectLiteralStringValue(
  node: ts.ObjectLiteralExpression,
  propertyName: string,
  sourceFile: ts.SourceFile,
): string | null {
  for (const property of node.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      propertyNameText(property.name, sourceFile) === propertyName
    ) {
      const initializer = unwrapExpression(property.initializer);
      return ts.isStringLiteralLike(initializer) ? initializer.text : null;
    }
  }
  return null;
}

function objectLiteralExpressionText(
  node: ts.ObjectLiteralExpression,
  propertyName: string,
  sourceFile: ts.SourceFile,
): string | null {
  for (const property of node.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      propertyNameText(property.name, sourceFile) === propertyName
    ) {
      return compactSourceExpressionText(property.initializer, sourceFile);
    }
  }
  return null;
}

function compactSourceExpressionText(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): string {
  const text = expression.getText(sourceFile).replace(/\s+/gu, " ").trim();
  return text.length <= 160 ? text : `${text.slice(0, 157)}...`;
}

function kernelRecordConstructionSummary(
  area: string,
  className: string | null,
  recordKind: string,
  context: SourceVisitContext,
): string {
  const owner = context.functionName ?? context.className ?? "module top level";
  return `${area} constructs ${className ?? recordKind} (${recordKind}) in ${owner}.`;
}
