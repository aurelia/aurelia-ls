import ts from "typescript";

import {
  groupBy,
  uniqueValues,
} from "../../collections.js";
import {
  calleeNameForExpression,
  propertyNameText,
  requiredSourceFileIdentity,
  sourceReferenceForNode,
  stringLiteralArgument,
  type SourceProject,
} from "../../source/index.js";

export type ProductVocabularySlot =
  | "product-kind"
  | "claim-predicate"
  | "open-seam-kind"
  | "binding-kind"
  | "instruction-kind";

export type ProductVocabularyRootName =
  | "KernelProductKinds"
  | "KernelClaimPredicates"
  | "KernelOpenSeamKinds"
  | "KernelBindingKinds"
  | "KernelInstructionKinds"
  | "KernelVocabulary";

export type ProductClaimEndpointKind = "address" | "identity" | "product";

export interface ProductVocabularyAnalysis {
  readonly version: "product-vocabulary-analysis@2";
  readonly rollup: ProductVocabularyRollup;
  readonly definitions: readonly ProductVocabularyDefinitionRow[];
  readonly usages: readonly ProductVocabularyUsageRow[];
  readonly claimPredicates: readonly ProductClaimPredicateRow[];
  readonly claimGraphEdges: readonly ProductClaimGraphEdgeRow[];
  readonly claimSignatureIssues: readonly ProductClaimSignatureIssueRow[];
}

export interface ProductVocabularyRollup {
  readonly definitionCount: number;
  readonly usageCount: number;
  readonly productKindCount: number;
  readonly claimPredicateCount: number;
  readonly claimGraphEdgeCount: number;
  readonly claimSignatureIssueCount: number;
  readonly bySlot: Readonly<Record<ProductVocabularySlot, number>>;
  readonly byNamespace: Readonly<Record<string, number>>;
}

export interface ProductClaimEndpointSignatureRow {
  readonly endpointKinds: readonly ProductClaimEndpointKind[];
  readonly productKindRefs: readonly string[];
}

export interface ProductClaimPredicateSignatureRow {
  readonly subject: ProductClaimEndpointSignatureRow;
  readonly object: ProductClaimEndpointSignatureRow;
}

export interface ProductVocabularyDefinitionRow {
  readonly id: string;
  readonly rootName: ProductVocabularyRootName;
  readonly slot: ProductVocabularySlot;
  readonly namespace: string;
  readonly memberName: string;
  readonly localName: string;
  readonly key: string;
  readonly summary: string;
  readonly source: ProductSourceReference;
  readonly usageCount: number;
  readonly publicUsageCount: number;
  readonly directUsageCount: number;
  readonly keyReadCount: number;
  readonly claimSignatureUseCount: number;
  readonly claimSignature?: ProductClaimPredicateSignatureRow;
  readonly claimSignatureParseIssues: readonly ProductClaimSignatureParseIssue[];
}

export interface ProductVocabularyUsageRow {
  readonly id: string;
  readonly rootName: ProductVocabularyRootName;
  readonly namespace: string;
  readonly memberName: string;
  readonly entryId: string | null;
  readonly entryKey: string | null;
  readonly accessPath: string;
  readonly accessKind: ProductVocabularyUsageAccessKind;
  readonly syntacticRole: ProductVocabularyUsageRole;
  readonly source: ProductSourceReference;
}

export type ProductVocabularyUsageAccessKind = "definition-read" | "key-read";

export type ProductVocabularyUsageRole =
  | "property-access"
  | "call-argument"
  | "comparison"
  | "constructor-argument"
  | "object-property"
  | "return-expression";

export interface ProductClaimPredicateRow {
  readonly id: string;
  readonly key: string;
  readonly namespace: string;
  readonly memberName: string;
  readonly summary: string;
  readonly signature: ProductClaimPredicateSignatureRow | null;
  readonly issueCount: number;
  readonly source: ProductSourceReference;
}

export interface ProductClaimGraphEdgeRow {
  readonly id: string;
  readonly predicateId: string;
  readonly predicateKey: string;
  readonly subjectProductKindId: string;
  readonly subjectProductKindKey: string;
  readonly objectProductKindId: string;
  readonly objectProductKindKey: string;
  readonly source: ProductSourceReference;
}

export type ProductClaimSignatureIssueKind =
  | "missing-signature"
  | "unresolved-signature"
  | "missing-endpoint"
  | "unsupported-endpoint-helper"
  | "missing-product-kind"
  | "non-product-kind";

export interface ProductClaimSignatureIssueRow {
  readonly id: string;
  readonly kind: ProductClaimSignatureIssueKind;
  readonly predicateId: string;
  readonly predicateKey: string;
  readonly endpoint?: "subject" | "object";
  readonly productKindRef?: string;
  readonly summary: string;
  readonly source: ProductSourceReference;
}

export interface ProductClaimSignatureParseIssue {
  readonly kind: ProductClaimSignatureIssueKind;
  readonly endpoint?: "subject" | "object";
  readonly productKindRef?: string;
  readonly summary: string;
  readonly source: ProductSourceReference;
}

export interface ProductSourceReference {
  readonly filePath: string;
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;
}

interface VocabularyModuleSpec {
  readonly rootName: Exclude<ProductVocabularyRootName, "KernelVocabulary">;
  readonly filePath: string;
  readonly slot: ProductVocabularySlot;
}

interface ParsedClaimSignature {
  readonly signature: ProductClaimPredicateSignatureRow | null;
  readonly issues: readonly ProductClaimSignatureParseIssue[];
}

interface ParsedEndpointSignature {
  readonly signature: ProductClaimEndpointSignatureRow | null;
  readonly issues: readonly ProductClaimSignatureParseIssue[];
}

const vocabularyModules: readonly VocabularyModuleSpec[] = [
  {
    rootName: "KernelProductKinds",
    filePath: "packages/semantic-runtime/src/kernel/vocabulary/product-kinds.ts",
    slot: "product-kind",
  },
  {
    rootName: "KernelClaimPredicates",
    filePath: "packages/semantic-runtime/src/kernel/vocabulary/claim-predicates.ts",
    slot: "claim-predicate",
  },
  {
    rootName: "KernelOpenSeamKinds",
    filePath: "packages/semantic-runtime/src/kernel/vocabulary/open-seam-kinds.ts",
    slot: "open-seam-kind",
  },
  {
    rootName: "KernelBindingKinds",
    filePath: "packages/semantic-runtime/src/kernel/vocabulary/binding-kinds.ts",
    slot: "binding-kind",
  },
  {
    rootName: "KernelInstructionKinds",
    filePath: "packages/semantic-runtime/src/kernel/vocabulary/instruction-kinds.ts",
    slot: "instruction-kind",
  },
] as const;

const endpointKindByMemberName: Readonly<Record<string, ProductClaimEndpointKind>> = {
  Address: "address",
  Identity: "identity",
  Product: "product",
};

export function readProductVocabularyAnalysis(
  sourceProject: SourceProject,
): ProductVocabularyAnalysis {
  const rawDefinitions = readVocabularyDefinitions(sourceProject);
  const usages = readVocabularyUsages(sourceProject, rawDefinitions);
  const definitions = attachDerivedCounts(rawDefinitions, usages);
  const claimPredicates = readClaimPredicates(definitions);
  const claimSignatureIssues = readClaimSignatureIssues(definitions);
  const claimGraphEdges = readClaimGraphEdges(definitions);

  return {
    version: "product-vocabulary-analysis@2",
    rollup: productVocabularyRollup(definitions, usages, claimPredicates, claimGraphEdges, claimSignatureIssues),
    definitions,
    usages,
    claimPredicates,
    claimGraphEdges,
    claimSignatureIssues,
  };
}

function readVocabularyDefinitions(
  sourceProject: SourceProject,
): readonly ProductVocabularyDefinitionRow[] {
  const rows: ProductVocabularyDefinitionRow[] = [];

  for (const moduleSpec of vocabularyModules) {
    const sourceFile = requiredSourceFile(sourceProject, moduleSpec.filePath);
    const rootObject = readExportedObject(sourceFile, moduleSpec.rootName);
    const endpointHelpers = readEndpointHelpers(sourceFile);

    for (const namespaceProperty of rootObject.properties) {
      if (
        !ts.isPropertyAssignment(namespaceProperty) ||
        !ts.isObjectLiteralExpression(namespaceProperty.initializer)
      ) {
        continue;
      }
      const namespace = propertyNameText(namespaceProperty.name, sourceFile);
      if (namespace === null) {
        continue;
      }
      for (const entryProperty of namespaceProperty.initializer.properties) {
        if (!ts.isPropertyAssignment(entryProperty) || !ts.isCallExpression(entryProperty.initializer)) {
          continue;
        }
        const call = entryProperty.initializer;
        const memberName = propertyNameText(entryProperty.name, sourceFile);
        const localName = stringLiteralArgument(call, 1);
        const summary = stringLiteralArgument(call, moduleSpec.slot === "claim-predicate" ? 2 : 3);
        if (memberName === null || localName === null || summary === null) {
          continue;
        }

        const parsedSignature = moduleSpec.slot === "claim-predicate"
          ? claimPredicateSignatureFromExpression(
              call.arguments[3],
              sourceProject,
              sourceFile,
              endpointHelpers,
            )
          : null;

        rows.push({
          id: `${moduleSpec.rootName}.${namespace}.${memberName}`,
          rootName: moduleSpec.rootName,
          slot: moduleSpec.slot,
          namespace,
          memberName,
          localName,
          key: `${kebabNamespace(namespace)}.${localName}`,
          summary,
          source: sourceReferenceForNode(sourceProject, sourceFile, entryProperty.name),
          usageCount: 0,
          publicUsageCount: 0,
          directUsageCount: 0,
          keyReadCount: 0,
          claimSignatureUseCount: 0,
          ...(parsedSignature?.signature === undefined || parsedSignature.signature === null
            ? {}
            : { claimSignature: parsedSignature.signature }),
          claimSignatureParseIssues: parsedSignature?.issues ?? [],
        });
      }
    }
  }

  return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function readVocabularyUsages(
  sourceProject: SourceProject,
  definitions: readonly ProductVocabularyDefinitionRow[],
): readonly ProductVocabularyUsageRow[] {
  const definitionByPath = new Map<string, ProductVocabularyDefinitionRow>();
  for (const definition of definitions) {
    definitionByPath.set(definitionPath(definition), definition);
    definitionByPath.set(`KernelVocabulary.${definition.namespace}.${definition.memberName}`, definition);
  }

  const usages: ProductVocabularyUsageRow[] = [];
  for (const sourceFile of sourceProject.ownedSourceFiles()) {
    const identity = requiredSourceFileIdentity(sourceProject, sourceFile);
    if (identity.packageId !== "semantic-runtime") {
      continue;
    }
    if (identity.repoPath.includes("/kernel/vocabulary/")) {
      continue;
    }
    if (identity.repoPath === "packages/semantic-runtime/src/kernel/vocabulary.ts") {
      continue;
    }

    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node)) {
        const access = vocabularyAccess(node);
        if (access !== null) {
          const definition = definitionByPath.get(access.entryPath) ?? null;
          usages.push({
            id: `usage:${identity.repoPath}:${node.getStart(sourceFile)}:${access.accessPath}`,
            rootName: access.rootName,
            namespace: access.namespace,
            memberName: access.memberName,
            entryId: definition?.id ?? null,
            entryKey: definition?.key ?? null,
            accessPath: access.accessPath,
            accessKind: access.accessKind,
            syntacticRole: usageRole(node),
            source: sourceReferenceForNode(sourceProject, sourceFile, node),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return usages.sort((left, right) => left.id.localeCompare(right.id));
}

function attachDerivedCounts(
  definitions: readonly ProductVocabularyDefinitionRow[],
  usages: readonly ProductVocabularyUsageRow[],
): readonly ProductVocabularyDefinitionRow[] {
  const publicCounts = new Map<string, number>();
  const directCounts = new Map<string, number>();
  const keyReadCounts = new Map<string, number>();
  for (const usage of usages) {
    if (usage.entryId === null) {
      continue;
    }
    if (usage.rootName === "KernelVocabulary") {
      publicCounts.set(usage.entryId, (publicCounts.get(usage.entryId) ?? 0) + 1);
    } else {
      directCounts.set(usage.entryId, (directCounts.get(usage.entryId) ?? 0) + 1);
    }
    if (usage.accessKind === "key-read") {
      keyReadCounts.set(usage.entryId, (keyReadCounts.get(usage.entryId) ?? 0) + 1);
    }
  }

  const claimSignatureUseCounts = new Map<string, number>();
  for (const definition of definitions) {
    if (definition.slot !== "claim-predicate" || definition.claimSignature === undefined) {
      continue;
    }
    for (const productKindRef of productRefsForSignature(definition.claimSignature)) {
      claimSignatureUseCounts.set(
        productKindRef,
        (claimSignatureUseCounts.get(productKindRef) ?? 0) + 1,
      );
    }
  }

  return definitions.map((definition) => {
    const publicUsageCount = publicCounts.get(definition.id) ?? 0;
    const directUsageCount = directCounts.get(definition.id) ?? 0;
    return {
      ...definition,
      publicUsageCount,
      directUsageCount,
      keyReadCount: keyReadCounts.get(definition.id) ?? 0,
      usageCount: publicUsageCount + directUsageCount,
      claimSignatureUseCount: claimSignatureUseCounts.get(definition.id) ?? 0,
    };
  });
}

function readClaimPredicates(
  definitions: readonly ProductVocabularyDefinitionRow[],
): readonly ProductClaimPredicateRow[] {
  const issueCounts = new Map<string, number>();
  for (const issue of readClaimSignatureIssues(definitions)) {
    issueCounts.set(issue.predicateId, (issueCounts.get(issue.predicateId) ?? 0) + 1);
  }

  return definitions
    .filter((definition) => definition.slot === "claim-predicate")
    .map((definition) => ({
      id: definition.id,
      key: definition.key,
      namespace: definition.namespace,
      memberName: definition.memberName,
      summary: definition.summary,
      signature: definition.claimSignature ?? null,
      issueCount: issueCounts.get(definition.id) ?? 0,
      source: definition.source,
    }));
}

function readClaimGraphEdges(
  definitions: readonly ProductVocabularyDefinitionRow[],
): readonly ProductClaimGraphEdgeRow[] {
  const productById = new Map(
    definitions
      .filter((definition) => definition.slot === "product-kind")
      .map((definition) => [definition.id, definition] as const),
  );
  const rows: ProductClaimGraphEdgeRow[] = [];
  const seen = new Set<string>();

  for (const predicate of definitions) {
    const signature = predicate.claimSignature;
    if (
      predicate.slot !== "claim-predicate" ||
      signature === undefined ||
      !signature.subject.endpointKinds.includes("product") ||
      !signature.object.endpointKinds.includes("product")
    ) {
      continue;
    }

    for (const subjectProductRef of signature.subject.productKindRefs) {
      const subjectProduct = productById.get(subjectProductRef);
      if (subjectProduct === undefined) {
        continue;
      }
      for (const objectProductRef of signature.object.productKindRefs) {
        const objectProduct = productById.get(objectProductRef);
        if (objectProduct === undefined) {
          continue;
        }
        const id = `claim:${predicate.key}:${subjectProduct.key}->${objectProduct.key}`;
        if (seen.has(id)) {
          continue;
        }
        seen.add(id);
        rows.push({
          id,
          predicateId: predicate.id,
          predicateKey: predicate.key,
          subjectProductKindId: subjectProduct.id,
          subjectProductKindKey: subjectProduct.key,
          objectProductKindId: objectProduct.id,
          objectProductKindKey: objectProduct.key,
          source: predicate.source,
        });
      }
    }
  }

  return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function readClaimSignatureIssues(
  definitions: readonly ProductVocabularyDefinitionRow[],
): readonly ProductClaimSignatureIssueRow[] {
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition] as const));
  const rows: ProductClaimSignatureIssueRow[] = [];

  for (const definition of definitions) {
    if (definition.slot !== "claim-predicate") {
      continue;
    }
    const parsedIssues = claimPredicateSignatureFromDefinition(definition);
    for (const issue of parsedIssues) {
      rows.push(issue);
    }
    if (definition.claimSignature === undefined) {
      continue;
    }
    for (const [endpoint, signature] of [
      ["subject", definition.claimSignature.subject],
      ["object", definition.claimSignature.object],
    ] as const) {
      for (const productKindRef of signature.productKindRefs) {
        const productKind = definitionById.get(productKindRef);
        if (productKind === undefined) {
          rows.push({
            id: `claim-signature-issue:${definition.id}:${endpoint}:missing:${productKindRef}`,
            kind: "missing-product-kind",
            predicateId: definition.id,
            predicateKey: definition.key,
            endpoint,
            productKindRef,
            summary:
              `${definition.id} references missing product-kind ${productKindRef} on the ${endpoint} endpoint.`,
            source: definition.source,
          });
        } else if (productKind.slot !== "product-kind") {
          rows.push({
            id: `claim-signature-issue:${definition.id}:${endpoint}:non-product:${productKindRef}`,
            kind: "non-product-kind",
            predicateId: definition.id,
            predicateKey: definition.key,
            endpoint,
            productKindRef,
            summary:
              `${definition.id} references ${productKindRef} on the ${endpoint} endpoint, but that entry is ${productKind.slot}.`,
            source: definition.source,
          });
        }
      }
    }
  }

  return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function claimPredicateSignatureFromDefinition(
  definition: ProductVocabularyDefinitionRow,
): readonly ProductClaimSignatureIssueRow[] {
  if (definition.claimSignatureParseIssues.length > 0) {
    return definition.claimSignatureParseIssues.map((issue, index) => ({
      id: `claim-signature-issue:${definition.id}:parse:${index}`,
      kind: issue.kind,
      predicateId: definition.id,
      predicateKey: definition.key,
      endpoint: issue.endpoint,
      productKindRef: issue.productKindRef,
      summary: `${definition.id}: ${issue.summary}`,
      source: issue.source,
    }));
  }
  if (definition.claimSignature !== undefined) {
    return [];
  }
  return [
    {
      id: `claim-signature-issue:${definition.id}:missing`,
      kind: "missing-signature",
      predicateId: definition.id,
      predicateKey: definition.key,
      summary: `${definition.id} does not expose a statically readable claim signature.`,
      source: definition.source,
    },
  ];
}

function claimPredicateSignatureFromExpression(
  expression: ts.Expression | undefined,
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  endpointHelpers: ReadonlyMap<string, ts.Expression>,
): ParsedClaimSignature {
  if (expression === undefined) {
    return {
      signature: null,
      issues: [
        {
          kind: "missing-signature",
          summary: "Claim predicate definition has no claimSignature argument.",
          source: sourceReferenceForNode(sourceProject, sourceFile, sourceFile),
        },
      ],
    };
  }

  const call = unwrapInitializer(expression);
  if (
    call === undefined ||
    !ts.isCallExpression(call) ||
    calleeNameForExpression(call.expression) !== "claimSignature"
  ) {
    return {
      signature: null,
      issues: [
        {
          kind: "unresolved-signature",
          summary: "Claim predicate signature must use claimSignature(subject, object).",
          source: sourceReferenceForNode(sourceProject, sourceFile, expression),
        },
      ],
    };
  }

  const subject = endpointSignatureFromExpression(
    call.arguments[0],
    "subject",
    sourceProject,
    sourceFile,
    endpointHelpers,
    0,
  );
  const object = endpointSignatureFromExpression(
    call.arguments[1],
    "object",
    sourceProject,
    sourceFile,
    endpointHelpers,
    0,
  );
  return {
    signature: subject.signature === null || object.signature === null
      ? null
      : {
          subject: subject.signature,
          object: object.signature,
        },
    issues: [...subject.issues, ...object.issues],
  };
}

function endpointSignatureFromExpression(
  expression: ts.Expression | undefined,
  endpoint: "subject" | "object",
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  endpointHelpers: ReadonlyMap<string, ts.Expression>,
  depth: number,
): ParsedEndpointSignature {
  if (expression === undefined) {
    return endpointIssue(
      "missing-endpoint",
      endpoint,
      "Claim signature endpoint is missing.",
      sourceProject,
      sourceFile,
      sourceFile,
    );
  }
  if (depth > 8) {
    return endpointIssue(
      "unresolved-signature",
      endpoint,
      "Claim endpoint helper recursion exceeded the static parser depth.",
      sourceProject,
      sourceFile,
      expression,
    );
  }

  const call = unwrapInitializer(expression);
  if (call === undefined || !ts.isCallExpression(call)) {
    return endpointIssue(
      "unresolved-signature",
      endpoint,
      "Claim endpoint signature must be a supported endpoint helper call.",
      sourceProject,
      sourceFile,
      expression,
    );
  }

  const helperName = calleeNameForExpression(call.expression);
  switch (helperName) {
    case "identityEndpoint":
      return {
        signature: {
          endpointKinds: ["identity"],
          productKindRefs: [],
        },
        issues: [],
      };
    case "productEndpoint":
      return {
        signature: {
          endpointKinds: ["product"],
          productKindRefs: productKindRefsFromExpressions(call.arguments, sourceFile),
        },
        issues: [],
      };
    case "endpoint":
      return {
        signature: {
          endpointKinds: endpointKindsFromExpression(call.arguments[0], sourceFile),
          productKindRefs: productKindRefsFromArray(call.arguments[1], sourceFile),
        },
        issues: [],
      };
    default: {
      if (!ts.isIdentifier(call.expression) || call.arguments.length !== 0) {
        return endpointIssue(
          "unsupported-endpoint-helper",
          endpoint,
          `Unsupported claim endpoint helper '${helperName ?? "<unknown>"}'.`,
          sourceProject,
          sourceFile,
          expression,
        );
      }
      const helperReturn = endpointHelpers.get(call.expression.text);
      if (helperReturn === undefined) {
        return endpointIssue(
          "unsupported-endpoint-helper",
          endpoint,
          `Unsupported claim endpoint helper '${call.expression.text}'.`,
          sourceProject,
          sourceFile,
          expression,
        );
      }
      return endpointSignatureFromExpression(
        helperReturn,
        endpoint,
        sourceProject,
        sourceFile,
        endpointHelpers,
        depth + 1,
      );
    }
  }
}

function endpointIssue(
  kind: ProductClaimSignatureIssueKind,
  endpoint: "subject" | "object",
  summary: string,
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): ParsedEndpointSignature {
  return {
    signature: null,
    issues: [
      {
        kind,
        endpoint,
        summary,
        source: sourceReferenceForNode(sourceProject, sourceFile, node),
      },
    ],
  };
}

function readEndpointHelpers(sourceFile: ts.SourceFile): ReadonlyMap<string, ts.Expression> {
  const helpers = new Map<string, ts.Expression>();
  for (const statement of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(statement) || statement.name === undefined || statement.body === undefined) {
      continue;
    }
    if (statement.parameters.length !== 0) {
      continue;
    }
    for (const bodyStatement of statement.body.statements) {
      if (ts.isReturnStatement(bodyStatement) && bodyStatement.expression !== undefined) {
        helpers.set(statement.name.text, bodyStatement.expression);
        break;
      }
    }
  }
  return helpers;
}

function endpointKindsFromExpression(
  expression: ts.Expression | undefined,
  sourceFile: ts.SourceFile,
): readonly ProductClaimEndpointKind[] {
  const array = expression === undefined ? undefined : unwrapInitializer(expression);
  if (array === undefined || !ts.isArrayLiteralExpression(array)) {
    return [];
  }
  return uniqueValues(
    array.elements.flatMap((element) => {
      if (ts.isSpreadElement(element)) {
        return [];
      }
      return endpointKindFromExpression(element, sourceFile) ?? [];
    }),
  );
}

function endpointKindFromExpression(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): ProductClaimEndpointKind | null {
  if (ts.isStringLiteral(expression) && isProductClaimEndpointKind(expression.text)) {
    return expression.text;
  }
  const unwrapped = unwrapInitializer(expression);
  if (unwrapped === undefined || !ts.isPropertyAccessExpression(unwrapped)) {
    return null;
  }
  if (!ts.isIdentifier(unwrapped.expression) || unwrapped.expression.text !== "KernelClaimEndpointKind") {
    return null;
  }
  const memberName = propertyNameText(unwrapped.name, sourceFile);
  return memberName === null ? null : endpointKindByMemberName[memberName] ?? null;
}

function productKindRefsFromArray(
  expression: ts.Expression | undefined,
  sourceFile: ts.SourceFile,
): readonly string[] {
  const array = expression === undefined ? undefined : unwrapInitializer(expression);
  if (array === undefined || !ts.isArrayLiteralExpression(array)) {
    return [];
  }
  return productKindRefsFromExpressions(array.elements, sourceFile);
}

function productKindRefsFromExpressions(
  expressions: readonly ts.Expression[],
  sourceFile: ts.SourceFile,
): readonly string[] {
  return uniqueValues(
    expressions.flatMap((expression) => {
      if (ts.isSpreadElement(expression)) {
        return [];
      }
      return productKindAccess(expression, sourceFile) ?? [];
    }),
  );
}

function productKindAccess(expression: ts.Expression, sourceFile: ts.SourceFile): string | null {
  const unwrapped = unwrapInitializer(expression);
  if (unwrapped === undefined || !ts.isPropertyAccessExpression(unwrapped)) {
    return null;
  }
  const memberName = unwrapped.name.text;
  const namespaceAccess = unwrapped.expression;
  if (!ts.isPropertyAccessExpression(namespaceAccess) || !ts.isIdentifier(namespaceAccess.expression)) {
    return null;
  }
  if (namespaceAccess.expression.text !== "KernelProductKinds") {
    return null;
  }
  const namespace = propertyNameText(namespaceAccess.name, sourceFile);
  if (namespace === null) {
    return null;
  }
  return `KernelProductKinds.${namespace}.${memberName}`;
}

function productRefsForSignature(
  signature: ProductClaimPredicateSignatureRow,
): readonly string[] {
  return uniqueValues([...signature.subject.productKindRefs, ...signature.object.productKindRefs]);
}

function productVocabularyRollup(
  definitions: readonly ProductVocabularyDefinitionRow[],
  usages: readonly ProductVocabularyUsageRow[],
  claimPredicates: readonly ProductClaimPredicateRow[],
  claimGraphEdges: readonly ProductClaimGraphEdgeRow[],
  claimSignatureIssues: readonly ProductClaimSignatureIssueRow[],
): ProductVocabularyRollup {
  const bySlot = Object.fromEntries(
    [...groupBy(definitions, (definition) => definition.slot)].map(([slot, group]) => [
      slot,
      group.length,
    ]),
  ) as Record<ProductVocabularySlot, number>;
  const byNamespace = Object.fromEntries(
    [...groupBy(definitions, (definition) => definition.namespace)].map(([namespace, group]) => [
      namespace,
      group.length,
    ]),
  );

  return {
    definitionCount: definitions.length,
    usageCount: usages.length,
    productKindCount: bySlot["product-kind"] ?? 0,
    claimPredicateCount: claimPredicates.length,
    claimGraphEdgeCount: claimGraphEdges.length,
    claimSignatureIssueCount: claimSignatureIssues.length,
    bySlot: {
      "product-kind": bySlot["product-kind"] ?? 0,
      "claim-predicate": bySlot["claim-predicate"] ?? 0,
      "open-seam-kind": bySlot["open-seam-kind"] ?? 0,
      "binding-kind": bySlot["binding-kind"] ?? 0,
      "instruction-kind": bySlot["instruction-kind"] ?? 0,
    },
    byNamespace,
  };
}

function readExportedObject(
  sourceFile: ts.SourceFile,
  exportName: string,
): ts.ObjectLiteralExpression {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      const initializer = unwrapInitializer(declaration.initializer);
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === exportName &&
        initializer !== undefined &&
        ts.isObjectLiteralExpression(initializer)
      ) {
        return initializer;
      }
    }
  }
  throw new Error(`Could not find exported object ${exportName} in ${sourceFile.fileName}.`);
}

function requiredSourceFile(
  sourceProject: SourceProject,
  filePath: string,
): ts.SourceFile {
  const sourceFile = sourceProject.readSourceFile(filePath);
  if (sourceFile === null) {
    throw new Error(`Could not read source file ${filePath}.`);
  }
  return sourceFile;
}

function unwrapInitializer(node: ts.Expression | undefined): ts.Expression | undefined {
  if (node === undefined) {
    return undefined;
  }
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
    return unwrapInitializer(node.expression);
  }
  return node;
}

function vocabularyAccess(
  node: ts.PropertyAccessExpression,
): {
  readonly rootName: ProductVocabularyRootName;
  readonly namespace: string;
  readonly memberName: string;
  readonly accessPath: string;
  readonly entryPath: string;
  readonly accessKind: ProductVocabularyUsageAccessKind;
} | null {
  if (
    node.name.text !== "key" &&
    ts.isPropertyAccessExpression(node.parent) &&
    node.parent.expression === node &&
    node.parent.name.text === "key"
  ) {
    return null;
  }

  if (node.name.text === "key" && ts.isPropertyAccessExpression(node.expression)) {
    const definition = vocabularyDefinitionAccess(node.expression);
    return definition === null
      ? null
      : {
          ...definition,
          accessPath: `${definition.accessPath}.key`,
          accessKind: "key-read",
        };
  }

  const definition = vocabularyDefinitionAccess(node);
  return definition === null
    ? null
    : {
        ...definition,
        accessKind: "definition-read",
      };
}

function vocabularyDefinitionAccess(
  node: ts.PropertyAccessExpression,
): {
  readonly rootName: ProductVocabularyRootName;
  readonly namespace: string;
  readonly memberName: string;
  readonly accessPath: string;
  readonly entryPath: string;
} | null {
  const memberName = node.name.text;
  const namespaceAccess = node.expression;
  if (!ts.isPropertyAccessExpression(namespaceAccess) || !ts.isIdentifier(namespaceAccess.expression)) {
    return null;
  }
  const rootName = namespaceAccess.expression.text as ProductVocabularyRootName;
  if (!isVocabularyRootName(rootName)) {
    return null;
  }
  const namespace = namespaceAccess.name.text;
  const accessPath = `${rootName}.${namespace}.${memberName}`;
  return {
    rootName,
    namespace,
    memberName,
    accessPath,
    entryPath: rootName === "KernelVocabulary"
      ? `KernelVocabulary.${namespace}.${memberName}`
      : accessPath,
  };
}

function isVocabularyRootName(value: string): value is ProductVocabularyRootName {
  return (
    value === "KernelProductKinds" ||
    value === "KernelClaimPredicates" ||
    value === "KernelOpenSeamKinds" ||
    value === "KernelBindingKinds" ||
    value === "KernelInstructionKinds" ||
    value === "KernelVocabulary"
  );
}

function isProductClaimEndpointKind(value: string): value is ProductClaimEndpointKind {
  return value === "address" || value === "identity" || value === "product";
}

function definitionPath(definition: ProductVocabularyDefinitionRow): string {
  return `${definition.rootName}.${definition.namespace}.${definition.memberName}`;
}

function usageRole(node: ts.PropertyAccessExpression): ProductVocabularyUsageRole {
  const parent = node.parent;
  if (ts.isCallExpression(parent) && parent.expression !== node) {
    return "call-argument";
  }
  if (ts.isNewExpression(parent)) {
    return "constructor-argument";
  }
  if (
    ts.isBinaryExpression(parent) &&
    (parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
      parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)
  ) {
    return "comparison";
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    return "object-property";
  }
  if (ts.isReturnStatement(parent)) {
    return "return-expression";
  }
  return "property-access";
}

function kebabNamespace(namespace: string): string {
  return namespace.replace(/[A-Z]/gu, (part, offset) =>
    offset === 0 ? part.toLowerCase() : `-${part.toLowerCase()}`,
  );
}
