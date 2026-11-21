import ts from "typescript";

import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/index.js";
import {
  requiredSourceFileIdentity,
  sourceRangeForSourceFileNode,
  type SourceProject,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import { admittedFrameworkSourceFile } from "./framework-support.js";
import { FRAMEWORK_JIT_COMPILER_PACKAGE_ID } from "./framework-jit-compiler-corridor.js";
import type { FrameworkCompilerFilters } from "./framework-compiler-model.js";
import type { FrameworkCompilerRelationshipRow } from "./framework-compiler-products.js";

const TEMPLATE_COMPILER_PACKAGE_NAME = "@aurelia/template-compiler";
const TEMPLATE_COMPILER_FILE =
  "aurelia/packages/template-compiler/src/template-compiler.ts";
const BINDING_COMMAND_FILE =
  "aurelia/packages/template-compiler/src/binding-command.ts";
const ATTRIBUTE_PATTERN_FILE =
  "aurelia/packages/template-compiler/src/attribute-pattern.ts";

/** Exact compiler contract rows for framework concepts that do not emerge from instruction products alone. */
export function readFrameworkCompilerContractRelationships(
  sourceProject: SourceProject,
  filters: FrameworkCompilerFilters,
): readonly FrameworkCompilerRelationshipRow[] {
  if (filters.packageId !== undefined && filters.packageId !== FRAMEWORK_JIT_COMPILER_PACKAGE_ID) {
    return [];
  }
  return [
    ...bindingCommandContractRows(sourceProject),
    ...attributePatternContractRows(sourceProject),
    ...templateCompilerContractRows(sourceProject),
  ].filter((row) => compilerContractRelationshipMatches(row, filters));
}

function bindingCommandContractRows(
  sourceProject: SourceProject,
): readonly FrameworkCompilerRelationshipRow[] {
  const sourceFile = admittedFrameworkSourceFile(sourceProject, FRAMEWORK_JIT_COMPILER_PACKAGE_ID, BINDING_COMMAND_FILE);
  if (sourceFile === null) {
    return [];
  }
  return [
    contractRow(sourceProject, sourceFile, {
      sourceNode:
        nodeContaining(sourceFile, "new BindingCommandDefinition"),
      idSegment: "binding-command-definition",
      from: compilerContractMethodEndpoint("BindingCommandDefinition.create"),
      to: compilerSymbolEndpoint("BindingCommandDefinition"),
      relation: FrameworkRelationshipRelation.ConstructsInstance,
      mechanism: FrameworkRelationshipMechanism.BindingCommandResolver,
      summary:
        "BindingCommandDefinition.create constructs the resource definition used by binding-command resources.",
    }),
    contractRow(sourceProject, sourceFile, {
      sourceNode:
        nodeContaining(sourceFile, "container.get<BindingCommandInstance>"),
      idSegment: "binding-command-instance",
      from: compilerContractMethodEndpoint("BindingCommand.get"),
      to: compilerSymbolEndpoint("BindingCommandInstance"),
      relation: FrameworkRelationshipRelation.LooksUpResource,
      mechanism: FrameworkRelationshipMechanism.BindingCommandResolver,
      summary:
        "BindingCommand.get resolves a BindingCommandInstance from the resource container.",
    }),
    contractRow(sourceProject, sourceFile, {
      sourceNode:
        nodeContaining(sourceFile, "build(info: ICommandBuildInfo"),
      idSegment: "command-build-info",
      from: compilerContractMethodEndpoint("BindingCommandInstance.build"),
      to: compilerSymbolEndpoint("ICommandBuildInfo"),
      relation: FrameworkRelationshipRelation.CollectsDependency,
      mechanism: FrameworkRelationshipMechanism.BindingCommandBuild,
      summary:
        "BindingCommandInstance.build receives ICommandBuildInfo as the compiler-owned build input.",
    }),
  ].filter((row): row is FrameworkCompilerRelationshipRow => row !== null);
}

function attributePatternContractRows(
  sourceProject: SourceProject,
): readonly FrameworkCompilerRelationshipRow[] {
  const sourceFile = admittedFrameworkSourceFile(sourceProject, FRAMEWORK_JIT_COMPILER_PACKAGE_ID, ATTRIBUTE_PATTERN_FILE);
  if (sourceFile === null) {
    return [];
  }
  return [
    contractRow(sourceProject, sourceFile, {
      sourceNode:
        nodeContaining(sourceFile, "this._pendingDefs.push(...patterns)"),
      idSegment: "attribute-pattern-definition",
      from: compilerContractMethodEndpoint("AttributeParser.registerPattern"),
      to: compilerSymbolEndpoint("AttributePatternDefinition"),
      relation: FrameworkRelationshipRelation.RegistersResource,
      mechanism: FrameworkRelationshipMechanism.ResourceRegister,
      summary:
        "AttributeParser.registerPattern admits AttributePatternDefinition rows into the parser pattern catalog.",
    }),
    contractRow(sourceProject, sourceFile, {
      sourceNode:
        nodeContaining(sourceFile, "new CompiledPattern(def)"),
      idSegment: "compiled-pattern",
      from: compilerContractMethodEndpoint("SyntaxInterpreter.add"),
      to: compilerSymbolEndpoint("CompiledPattern"),
      relation: FrameworkRelationshipRelation.ConstructsInstance,
      mechanism: FrameworkRelationshipMechanism.SyntaxProduct,
      summary:
        "SyntaxInterpreter.add compiles AttributePatternDefinition rows into CompiledPattern matchers.",
    }),
  ].filter((row): row is FrameworkCompilerRelationshipRow => row !== null);
}

function templateCompilerContractRows(
  sourceProject: SourceProject,
): readonly FrameworkCompilerRelationshipRow[] {
  const sourceFile = admittedFrameworkSourceFile(sourceProject, FRAMEWORK_JIT_COMPILER_PACKAGE_ID, TEMPLATE_COMPILER_FILE);
  if (sourceFile === null) {
    return [];
  }
  return [
    contractRow(sourceProject, sourceFile, {
      sourceNode:
        nodeContaining(sourceFile, "_getBindables(def: IAttributeComponentDefinition): IAttributeBindablesInfo"),
      idSegment: "attribute-bindables-info",
      from: compilerContractMethodEndpoint("CompilationContext._getBindables"),
      to: compilerSymbolEndpoint("IAttributeBindablesInfo"),
      relation: FrameworkRelationshipRelation.LooksUpResource,
      mechanism: FrameworkRelationshipMechanism.ResourceFind,
      summary:
        "CompilationContext._getBindables returns IAttributeBindablesInfo for custom-attribute and template-controller definitions.",
    }),
    contractRow(sourceProject, sourceFile, {
      sourceNode:
        nodeContaining(sourceFile, "_getBindables(def: IElementComponentDefinition): IElementBindablesInfo"),
      idSegment: "element-bindables-info",
      from: compilerContractMethodEndpoint("CompilationContext._getBindables"),
      to: compilerSymbolEndpoint("IElementBindablesInfo"),
      relation: FrameworkRelationshipRelation.LooksUpResource,
      mechanism: FrameworkRelationshipMechanism.ResourceFind,
      summary:
        "CompilationContext._getBindables returns IElementBindablesInfo for custom-element definitions.",
    }),
  ].filter((row): row is FrameworkCompilerRelationshipRow => row !== null);
}

function contractRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  input: {
    readonly sourceNode: ts.Node | null;
    readonly idSegment: string;
    readonly from: FrameworkRelationshipEndpoint;
    readonly to: FrameworkRelationshipEndpoint;
    readonly relation: FrameworkRelationshipRelation;
    readonly mechanism: FrameworkRelationshipMechanism;
    readonly summary: string;
  },
): FrameworkCompilerRelationshipRow | null {
  if (input.sourceNode === null) {
    return null;
  }
  const source = sourceRange(sourceProject, sourceFile, input.sourceNode);
  return {
    id: [
      "framework-compiler-contract",
      input.idSegment,
      source.filePath,
      source.start.line,
      source.start.character,
    ].join(":"),
    family: FrameworkRelationshipFamily.Compiler,
    relation: input.relation,
    mechanism: input.mechanism,
    phase: FrameworkRelationshipPhase.Compilation,
    packageId: FRAMEWORK_JIT_COMPILER_PACKAGE_ID,
    packageName: TEMPLATE_COMPILER_PACKAGE_NAME,
    from: { ...input.from, source },
    to: { ...input.to, source },
    source,
    sourceRowId: `framework-compiler-contract:${input.idSegment}`,
    summary: input.summary,
  };
}

function nodeContaining(sourceFile: ts.SourceFile, text: string): ts.Node | null {
  let match: ts.Node | null = null;
  const visit = (node: ts.Node): void => {
    if (!node.getFullText(sourceFile).includes(text)) {
      return;
    }
    if (
      isContractSourceCandidate(node) &&
      (match === null || node.getWidth(sourceFile) < match.getWidth(sourceFile))
    ) {
      match = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return match;
}

function isContractSourceCandidate(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isNewExpression(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isVariableDeclaration(node)
  );
}

function compilerContractMethodEndpoint(name: string): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Method,
    name,
    packageId: FRAMEWORK_JIT_COMPILER_PACKAGE_ID,
    packageName: TEMPLATE_COMPILER_PACKAGE_NAME,
  };
}

function compilerSymbolEndpoint(name: string): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Symbol,
    name,
    packageId: FRAMEWORK_JIT_COMPILER_PACKAGE_ID,
    packageName: TEMPLATE_COMPILER_PACKAGE_NAME,
  };
}

function sourceRange(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceRange {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  return sourceRangeForSourceFileNode(file.repoPath, sourceFile, sourceNode(node));
}

function sourceNode(node: ts.Node): ts.Node {
  if (
    (ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isMethodSignature(node) ||
      ts.isTypeAliasDeclaration(node)) &&
    node.name !== undefined
  ) {
    return node.name;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name;
  }
  return node;
}

function compilerContractRelationshipMatches(
  row: FrameworkCompilerRelationshipRow,
  filters: FrameworkCompilerFilters,
): boolean {
  return (
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined ||
      row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.query === undefined ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}
