import ts from "typescript";

import {
  deepestNodeContainingText,
  requiredSourceRangeForNode,
  type SourceProject,
} from "../../source/index.js";
import { EvidenceKind, EvidenceRole, OpenSeamKind, type OpenSeam } from "../evidence.js";
import type { SourceRange } from "../locus.js";
import { FRAMEWORK_JIT_COMPILER_PACKAGE_ID } from "./framework-jit-compiler-corridor.js";
import { admittedFrameworkSourceFile } from "./framework-support.js";
import { propertyNameText } from "./framework-ts-utils.js";
import type {
  FrameworkAttributeClassificationBranchKind,
  FrameworkCompileFlowStage,
  FrameworkCompilerFilters,
} from "./framework-compiler-model.js";

/** High-level source-backed stage row for TemplateCompiler compilation. */
export interface FrameworkCompileFlowRow {
  /** Stable row id. */
  readonly id: string;
  /** Coarse stage in the compile flow. */
  readonly stage: FrameworkCompileFlowStage;
  /** Owning class. */
  readonly ownerName: "TemplateCompiler";
  /** Method that owns this stage. */
  readonly methodName: string;
  /** Optional next method or substrate this stage hands off to. */
  readonly targetName?: string;
  /** Exact source range for this stage. */
  readonly source: SourceRange;
  /** Human-facing stage summary. */
  readonly summary: string;
}

/** Detailed source-backed branch row for TemplateCompiler._classifyAttributes. */
export interface FrameworkAttributeClassificationRow {
  /** Stable row id. */
  readonly id: string;
  /** Branch classifier inside _classifyAttributes. */
  readonly branchKind: FrameworkAttributeClassificationBranchKind;
  /** Stable order in the classification decision tree. */
  readonly order: number;
  /** Owning class. */
  readonly ownerName: "TemplateCompiler";
  /** Method that owns this branch. */
  readonly methodName: "_classifyAttributes";
  /** Container/resource operation surfaced by this branch, when applicable. */
  readonly operation?: "parse" | "find" | "get" | "build" | "emit" | "error";
  /** Resource or instruction family touched by this branch. */
  readonly targetKind?: string;
  /** Instruction names emitted by this branch, when statically visible. */
  readonly instructionNames: readonly string[];
  /** Exact source range for this branch. */
  readonly source: SourceRange;
  /** Human-facing branch summary. */
  readonly summary: string;
}

const TEMPLATE_COMPILER_FILE = "aurelia/packages/template-compiler/src/template-compiler.ts";
const TEMPLATE_COMPILER_OWNER = "TemplateCompiler" as const;
const ATTRIBUTE_CLASSIFICATION_METHOD = "_classifyAttributes" as const;

/** Read high-level TemplateCompiler compile-flow stage rows. */
export function readFrameworkCompileFlowRows(
  sourceProject: SourceProject,
  filters: FrameworkCompilerFilters,
  missing?: OpenSeam[],
): readonly FrameworkCompileFlowRow[] {
  const rows = readAllFrameworkCompileFlowRows(sourceProject, filters, missing);
  const visibleRows = shouldUseCompileFlowOverview(filters)
    ? rows.filter(isCompileFlowOverviewRow)
    : rows;
  return visibleRows;
}

/** Read every TemplateCompiler compile-flow row, including detail rows hidden from overview answers. */
export function readAllFrameworkCompileFlowRows(
  sourceProject: SourceProject,
  filters: FrameworkCompilerFilters,
  missing?: OpenSeam[],
): readonly FrameworkCompileFlowRow[] {
  const basis = templateCompilerBasis(sourceProject, filters, missing);
  if (basis === null) {
    return [];
  }
  return [
    ...compileMethodRows(basis),
    ...compileSpreadRows(basis),
    ...compileNodeRows(basis),
    ...compileElementRows(basis),
    ...compileSurrogateRows(basis),
    ...compileLeafRows(basis),
    ...compileCustomAttributeBindablesRows(basis),
    ...compileProjectionRows(basis),
    ...compileLocalElementRows(basis),
    ...compileAttributeReorderRows(basis),
  ].filter((row): row is FrameworkCompileFlowRow => row !== null && compileFlowRowMatches(row, filters));
}

/** Read detailed TemplateCompiler._classifyAttributes branch rows. */
export function readFrameworkAttributeClassificationRows(
  sourceProject: SourceProject,
  filters: FrameworkCompilerFilters,
  missing?: OpenSeam[],
): readonly FrameworkAttributeClassificationRow[] {
  const basis = templateCompilerBasis(sourceProject, filters, missing);
  if (basis === null) {
    return [];
  }
  const method = methodDeclaration(basis, ATTRIBUTE_CLASSIFICATION_METHOD);
  if (method?.body === undefined) {
    return [];
  }
  return attributeClassificationRows(basis, method).filter((row): row is FrameworkAttributeClassificationRow =>
    row !== null && attributeClassificationRowMatches(row, filters),
  );
}

interface TemplateCompilerBasis {
  readonly filters: FrameworkCompilerFilters;
  readonly missing?: OpenSeam[];
  readonly sourceProject: SourceProject;
  readonly sourceFile: ts.SourceFile;
  readonly classDeclaration: ts.ClassDeclaration;
}

function templateCompilerBasis(
  sourceProject: SourceProject,
  filters: FrameworkCompilerFilters,
  missing?: OpenSeam[],
): TemplateCompilerBasis | null {
  if (filters.packageId !== undefined && filters.packageId !== FRAMEWORK_JIT_COMPILER_PACKAGE_ID) {
    return null;
  }
  const sourceFile = admittedFrameworkSourceFile(sourceProject, FRAMEWORK_JIT_COMPILER_PACKAGE_ID, TEMPLATE_COMPILER_FILE);
  if (sourceFile === null) {
    missing?.push({ kind: OpenSeamKind.InsufficientBasis, summary: `Missing compiler landmark source ${TEMPLATE_COMPILER_FILE}.` });
    return null;
  }
  const classDeclaration = sourceFile.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) &&
      statement.name?.text === TEMPLATE_COMPILER_OWNER,
  );
  if (classDeclaration === undefined) {
    missing?.push({ kind: OpenSeamKind.InsufficientBasis, summary: `Missing class TemplateCompiler in ${TEMPLATE_COMPILER_FILE}.` });
    return null;
  }
  return { sourceProject, sourceFile, classDeclaration, filters, missing };
}

function compileMethodRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const method = methodDeclaration(basis, "compile");
  if (method?.body === undefined) {
    return [];
  }
  return [
    compileFlowRow(basis, method, "compile-entry", "compile", compilerFlowNodeContaining(method.body, "needsCompile === false"), "Return the input definition unchanged when it has no template or no longer needs compilation."),
    compileFlowRow(basis, method, "compile-context", "compile", compilerFlowNodeContaining(method.body, "new CompilationContext"), "Create the CompilationContext that owns resource lookup, template factory, dependency collection, and instruction rows.", "CompilationContext"),
    compileFlowRow(basis, method, "template-materialization", "compile", compilerFlowNodeContaining(method.body, "_templateFactory.createTemplate"), "Materialize string or HTMLElement templates into a compileable template/content root.", "ITemplateElementFactory"),
    compileFlowRow(basis, method, "compile-hooks", "compile", compilerFlowNodeContaining(method.body, "TemplateCompilerHooks.findAll"), "Run TemplateCompilerHooks.compiling before local element and node compilation.", "TemplateCompilerHooks"),
    compileFlowRow(basis, method, "local-elements", "compile", compilerFlowNodeContaining(method.body, "_compileLocalElement"), "Extract and register local template elements before walking the root content.", "_compileLocalElement"),
    compileFlowRow(basis, method, "node-dispatch", "compile", compilerFlowNodeContaining(method.body, "_compileNode(content"), "Dispatch the root content through the node compiler.", "_compileNode"),
    compileFlowRow(basis, method, "compiled-definition", "compile", compilerFlowNodeContaining(method.body, "const compiledDef"), "Assemble the compiled definition from context rows, collected dependencies, surrogates, and template metadata.", "ICompiledElementComponentDefinition"),
  ];
}

function compileSpreadRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const method = methodDeclaration(basis, "compileSpread");
  if (method?.body === undefined) {
    return [];
  }
  return [
    compileFlowRow(basis, method, "compile-spread", "compileSpread", method, "Compile spread attributes for an existing target element without walking child content."),
    compileFlowRow(basis, method, "compile-context", "compileSpread", compilerFlowNodeContaining(method.body, "new CompilationContext"), "Create a CompilationContext for spread attribute compilation.", "CompilationContext"),
    compileFlowRow(basis, method, "spread-element-definition-lookup", "compileSpread", compilerFlowNodeContaining(method.body, "context._findElement"), "Resolve the target custom element definition when no target definition was supplied.", "CustomElementDefinition"),
    compileFlowRow(basis, method, "spread-attribute-compilation", "compileSpread", compilerFlowNodeContaining(method.body, "for (; ii > i; ++i)"), "Classify spread attributes into element bindables, custom attributes, template-controller errors, plain attributes, and binding-command products.", "_compileCustomAttributeBindables"),
    compileFlowRow(basis, method, "instruction-merge", "compileSpread", compilerFlowNodeContaining(method.body, "attrInstructions != null"), "Merge custom-attribute spread instructions before plain spread instructions."),
  ];
}

function compileNodeRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const method = methodDeclaration(basis, "_compileNode");
  if (method?.body === undefined) {
    return [];
  }
  const switchStatement = nodeKindIn(method.body, ts.SyntaxKind.SwitchStatement);
  return [
    compileFlowRow(basis, method, "node-dispatch", "_compileNode", switchStatement, "Route DOM node kinds to let-element, element, text, or fragment compilation.", "_compileElement/_compileLet/_compileText"),
  ];
}

function compileElementRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const method = methodDeclaration(basis, "_compileElement");
  if (method?.body === undefined) {
    return [];
  }
  return [
    compileFlowRow(basis, method, "element-compilation", "_compileElement", method, "Compile one element by resolving its element definition, classifying attributes, creating instructions, and compiling children."),
    compileFlowRow(basis, method, "element-definition-lookup", "_compileElement", compilerFlowNodeContaining(method.body, "context._findElement"), "Resolve a custom element definition for the element name or as-element alias.", "CustomElementDefinition"),
    compileFlowRow(basis, method, "content-processing", "_compileElement", compilerFlowNodeContaining(method.body, "processContent"), "Allow a custom element definition to preprocess content before child compilation.", "processContent"),
    compileFlowRow(basis, method, "attribute-classification", "_compileElement", compilerFlowNodeContaining(method.body, "this._classifyAttributes"), "Classify attributes into template-controller, custom-attribute, element-bindable, and plain-attribute instruction groups.", ATTRIBUTE_CLASSIFICATION_METHOD),
    compileFlowRow(basis, method, "attribute-reordering", "_compileElement", compilerFlowNodeContaining(method.body, "this._shouldReorderAttrs"), "Reorder order-sensitive input/select attribute instructions after classification.", "_shouldReorderAttrs/_reorder"),
    compileFlowRow(basis, method, "element-instruction", "_compileElement", compilerFlowNodeContaining(method.body, "elementInstruction ="), "Create HydrateElementInstruction when the element resolved to a custom element.", "HydrateElementInstruction"),
    compileFlowRow(basis, method, "instruction-merge", "_compileElement", compilerFlowNodeContaining(method.body, "emptyArray.concat"), "Merge element, custom-attribute, and plain-attribute instructions into the row attached to the hydration target."),
    compileFlowRow(basis, method, "template-controller-wrapping", "_compileElement", compilerFlowNodeContaining(method.body, "if (tcInstructions != null)"), "Wrap the element and nested controllers into generated templates when template controllers are present.", "HydrateTemplateController"),
    compileFlowRow(basis, method, "direct-child-compilation", "_compileElement", compilerFlowNodeContaining(method.body, "this._compileNode(child, context)"), "Without template controllers, push element instructions to the current context and recursively compile child nodes.", "_compileNode"),
    compileFlowRow(basis, method, "slot-projection-extraction", "_compileElement", compilerFlowNodeContaining(method.body, "this._extractProjections"), "Extract and attach au-slot projection definitions around child compilation.", "_extractProjections"),
  ];
}

function compileSurrogateRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const method = methodDeclaration(basis, "_compileSurrogate");
  if (method?.body === undefined) {
    return [];
  }
  return [
    compileFlowRow(basis, method, "surrogate-compilation", "_compileSurrogate", method, "Compile restricted root template surrogate attributes through the same attribute classifier with static-attribute instruction generation.", ATTRIBUTE_CLASSIFICATION_METHOD),
  ];
}

function compileLeafRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const rows: (FrameworkCompileFlowRow | null)[] = [];
  const letMethod = methodDeclaration(basis, "_compileLet");
  if (letMethod?.body !== undefined) {
    rows.push(
      compileFlowRow(basis, letMethod, "let-element", "_compileLet", compilerFlowNodeContaining(letMethod.body, "itHydrateLetElement"), "Compile <let> attributes into HydrateLetElementInstruction rows.", "HydrateLetElementInstruction"),
    );
  }
  const textMethod = methodDeclaration(basis, "_compileText");
  if (textMethod?.body !== undefined) {
    rows.push(
      compileFlowRow(basis, textMethod, "text-binding", "_compileText", compilerFlowNodeContaining(textMethod.body, "itTextBinding"), "Compile text interpolation into TextBindingInstruction rows.", "TextBindingInstruction"),
    );
  }
  return rows;
}

function compileCustomAttributeBindablesRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const method = methodDeclaration(basis, "_compileCustomAttributeBindables");
  if (method?.body === undefined) {
    return [];
  }
  const multiBindingsMethod = methodDeclaration(basis, "_compileMultiBindings");
  const rows = [
    compileFlowRow(basis, method, "custom-attribute-bindables", "_compileCustomAttributeBindables", method, "Compile bindable instructions for custom attributes and template controllers from literal, interpolation, command, or multi-binding syntax."),
    compileFlowRow(basis, method, "multi-binding", "_compileCustomAttributeBindables", compilerFlowNodeContaining(method.body, "_compileMultiBindings"), "Delegate inline multi-binding syntax to the multi-binding compiler.", "_compileMultiBindings"),
    compileFlowRow(basis, method, "element-instruction", "_compileCustomAttributeBindables", compilerFlowNodeContaining(method.body, "itSetProperty"), "Emit SetPropertyInstruction for literal primary-bindable custom attribute values.", "SetPropertyInstruction"),
    compileFlowRow(basis, method, "element-instruction", "_compileCustomAttributeBindables", compilerFlowNodeContaining(method.body, "itInterpolation"), "Emit InterpolationInstruction for interpolated primary-bindable custom attribute values.", "InterpolationInstruction"),
    compileFlowRow(basis, method, "spread-attribute-compilation", "_compileCustomAttributeBindables", lastNodeContaining(method.body, "bindingCommand.build"), "Let binding commands build custom-attribute primary-bindable instructions."),
  ];
  if (multiBindingsMethod?.body === undefined) {
    return rows;
  }
  return [
    ...rows,
    compileFlowRow(basis, multiBindingsMethod, "multi-binding", "_compileMultiBindings", multiBindingsMethod, "Parse semicolon-delimited custom-attribute multi-binding syntax into per-bindable instructions."),
    compileFlowRow(basis, multiBindingsMethod, "element-instruction", "_compileMultiBindings", compilerFlowNodeContaining(multiBindingsMethod.body, "itSetProperty"), "Emit SetPropertyInstruction for literal multi-binding values.", "SetPropertyInstruction"),
    compileFlowRow(basis, multiBindingsMethod, "element-instruction", "_compileMultiBindings", compilerFlowNodeContaining(multiBindingsMethod.body, "itInterpolation"), "Emit InterpolationInstruction for interpolated multi-binding values.", "InterpolationInstruction"),
    compileFlowRow(basis, multiBindingsMethod, "spread-attribute-compilation", "_compileMultiBindings", compilerFlowNodeContaining(multiBindingsMethod.body, "command.build"), "Let binding commands build per-bindable multi-binding instructions."),
  ];
}

function compileProjectionRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const method = methodDeclaration(basis, "_extractProjections");
  if (method?.body === undefined) {
    return [];
  }
  return [
    compileFlowRow(basis, method, "slot-projection-extraction", "_extractProjections", method, "Extract au-slot children into per-slot templates and compile each projection definition."),
    compileFlowRow(basis, method, "node-dispatch", "_extractProjections", compilerFlowNodeContaining(method.body, "this._compileNode(template.content"), "Compile each projection template content through the normal node compiler.", "_compileNode"),
    compileFlowRow(basis, method, "compiled-definition", "_extractProjections", compilerFlowNodeContaining(method.body, "projections[targetSlot]"), "Store each compiled projection as an element definition keyed by slot name.", "IElementComponentDefinition"),
  ];
}

function compileLocalElementRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const method = methodDeclaration(basis, "_compileLocalElement");
  if (method?.body === undefined) {
    return [];
  }
  return [
    compileFlowRow(basis, method, "local-elements", "_compileLocalElement", method, "Extract local custom-element templates and add them as local compilation dependencies."),
    compileFlowRow(basis, method, "local-element-registration", "_compileLocalElement", compilerFlowNodeContaining(method.body, "class LocalDepType"), "Create a local custom-element definition carrier for each local template.", "LocalDepType"),
    compileFlowRow(basis, method, "local-element-registration", "_compileLocalElement", compilerFlowNodeContaining(method.body, "context._addLocalDep"), "Register each local template dependency with the compilation context.", "CompilationContext._addLocalDep"),
  ];
}

function compileAttributeReorderRows(
  basis: TemplateCompilerBasis,
): readonly (FrameworkCompileFlowRow | null)[] {
  const shouldReorderMethod = methodDeclaration(basis, "_shouldReorderAttrs");
  const reorderMethod = methodDeclaration(basis, "_reorder");
  const rows: (FrameworkCompileFlowRow | null)[] = [];
  if (shouldReorderMethod?.body !== undefined) {
    rows.push(
      compileFlowRow(basis, shouldReorderMethod, "attribute-reordering", "_shouldReorderAttrs", shouldReorderMethod, "Detect INPUT/SELECT attribute instruction orders that must be stabilized before runtime hydration."),
    );
  }
  if (reorderMethod?.body !== undefined) {
    rows.push(
      compileFlowRow(basis, reorderMethod, "attribute-reordering", "_reorder", reorderMethod, "Reorder order-sensitive property/class/style/attribute instructions for input and select elements."),
    );
  }
  return rows;
}

function attributeClassificationRows(
  basis: TemplateCompilerBasis,
  method: ts.MethodDeclaration,
): readonly (FrameworkAttributeClassificationRow | null)[] {
  const body = method.body!;
  return [
    attributeRow(basis, method, 1, "special-attribute", compilerFlowNodeContaining(body, "case 'as-element'"), "Remove as-element/containerless from the DOM-facing attribute list and remember containerless state.", {
      operation: "emit",
      targetKind: "compiler-control",
    }),
    attributeRow(basis, method, 2, "parse-attribute", compilerFlowNodeContaining(body, "context._attrParser.parse"), "Parse raw attribute name/value into AttrSyntax.", {
      operation: "parse",
      targetKind: "AttrSyntax",
    }),
    attributeRow(basis, method, 3, "binding-command-resolution", compilerFlowNodeContaining(body, "context._getCommand"), "Resolve a binding command instance for the parsed attribute syntax.", {
      operation: "get",
      targetKind: "BindingCommand",
    }),
    attributeRow(basis, method, 4, "capture-forwarding", compilerFlowNodeContaining(body, "capture &&"), "Forward capturable attributes to custom element captures unless they are bindables or template controllers.", {
      operation: "find",
      targetKind: "custom-element-capture",
    }),
    attributeRow(basis, method, 5, "spread-transferred-attrs", compilerFlowNodeContaining(body, "itSpreadTransferedBinding"), "Emit SpreadTransferedBindingInstruction for ...$attrs.", {
      operation: "emit",
      targetKind: "plain-attribute",
      instructionNames: ["SpreadTransferedBindingInstruction"],
    }),
    attributeRow(basis, method, 6, "ignored-binding-command", compilerFlowNodeContaining(body, "bindingCommand?.ignoreAttr"), "Let ignoreAttr binding commands such as class/style/attr build the complete plain-attribute instruction.", {
      operation: "build",
      targetKind: "BindingCommand",
    }),
    attributeRow(basis, method, 7, "spread-bindables", compilerFlowNodeContaining(body, "itSpreadValueBinding"), "Emit SpreadValueBindingInstruction for custom-element bindable spread syntax.", {
      operation: "emit",
      targetKind: "custom-element-bindables",
      instructionNames: ["SpreadValueBindingInstruction"],
    }),
    attributeRow(basis, method, 8, "element-bindable", compilerFlowNodeContaining(body, "bindable !== void 0"), "Bind a matched custom-element bindable before considering custom attributes.", {
      operation: "emit",
      targetKind: "custom-element-bindable",
      instructionNames: ["SetPropertyInstruction", "InterpolationInstruction"],
    }),
    attributeRow(basis, method, 9, "element-bindables-command", compilerFlowNodeContaining(body, "const instruction = bindingCommand.build"), "Allow binding commands to build custom-element $bindables instructions.", {
      operation: "build",
      targetKind: "custom-element-bindables",
    }),
    attributeRow(basis, method, 10, "reserved-bindables-error", compilerFlowNodeContaining(body, "compiler_no_reserved_$bindable"), "Reject $bindables on non-custom elements.", {
      operation: "error",
      targetKind: "reserved-syntax",
    }),
    attributeRow(basis, method, 11, "attribute-resource-lookup", lastNodeContaining(body, "attrDef = context._findAttr(realAttrTarget)"), "Find a custom attribute or template controller definition by target name.", {
      operation: "find",
      targetKind: "custom-attribute-or-template-controller",
    }),
    attributeRow(basis, method, 12, "attribute-bindables", compilerFlowNodeContaining(body, "_compileCustomAttributeBindables"), "Compile bindable instructions for a matched custom attribute or template controller.", {
      operation: "build",
      targetKind: "attribute-bindables",
    }),
    attributeRow(basis, method, 13, "template-controller-instruction", compilerFlowNodeContaining(body, "itHydrateTemplateController"), "Emit HydrateTemplateController and defer nested template definition construction to _compileElement.", {
      operation: "emit",
      targetKind: "template-controller",
      instructionNames: ["HydrateTemplateController"],
    }),
    attributeRow(basis, method, 14, "custom-attribute-instruction", compilerFlowNodeContaining(body, "itHydrateAttribute"), "Emit HydrateAttributeInstruction for non-template-controller custom attributes.", {
      operation: "emit",
      targetKind: "custom-attribute",
      instructionNames: ["HydrateAttributeInstruction"],
    }),
    attributeRow(basis, method, 15, "plain-interpolation", compilerFlowNodeContaining(body, "context._attrMapper.map(el, realAttrTarget)"), "Compile plain attribute interpolation through the attribute mapper into InterpolationInstruction.", {
      operation: "emit",
      targetKind: "plain-attribute",
      instructionNames: ["InterpolationInstruction"],
    }),
    attributeRow(basis, method, 16, "plain-static-attribute", compilerFlowNodeContaining(body, "generateStaticAttrInstructions"), "For surrogates, turn static class/style/attribute values into Set*AttributeInstruction rows.", {
      operation: "emit",
      targetKind: "surrogate-attribute",
      instructionNames: [
        "SetClassAttributeInstruction",
        "SetStyleAttributeInstruction",
        "SetAttributeInstruction",
      ],
    }),
    attributeRow(basis, method, 17, "plain-binding-command", lastNodeContaining(body, "bindingCommand.build"), "Let ordinary binding commands build plain DOM attribute/property instructions.", {
      operation: "build",
      targetKind: "plain-attribute",
    }),
  ];
}

function compileFlowRow(
  basis: TemplateCompilerBasis,
  method: ts.MethodDeclaration,
  stage: FrameworkCompileFlowStage,
  methodName: string,
  sourceNode: ts.Node | null,
  summary: string,
  targetName?: string,
): FrameworkCompileFlowRow | null {
  const anchor = sourceNode ?? method.name;
  const row: FrameworkCompileFlowRow = {
    id: `framework-compile-flow:${methodName}:${stage}:${anchor.getStart(basis.sourceFile)}`,
    stage,
    ownerName: TEMPLATE_COMPILER_OWNER,
    methodName,
    targetName,
    source: requiredSourceRangeForNode(basis.sourceProject, anchor),
    summary,
  };
  if (sourceNode === null && compileFlowRowMatches(row, basis.filters)) {
    missingCompilerLandmark(basis, `${row.id}:${targetName ?? ""}`, methodName, stage, row.source);
  }
  return sourceNode === null ? null : row;
}

function attributeRow(
  basis: TemplateCompilerBasis,
  method: ts.MethodDeclaration,
  order: number,
  branchKind: FrameworkAttributeClassificationBranchKind,
  sourceNode: ts.Node | null,
  summary: string,
  extras: {
    readonly operation?: FrameworkAttributeClassificationRow["operation"];
    readonly targetKind?: string;
    readonly instructionNames?: readonly string[];
  } = {},
): FrameworkAttributeClassificationRow | null {
  const anchor = sourceNode ?? method.name;
  const row: FrameworkAttributeClassificationRow = {
    id: `framework-attribute-classification:${order}:${branchKind}:${anchor.getStart(basis.sourceFile)}`,
    branchKind,
    order,
    ownerName: TEMPLATE_COMPILER_OWNER,
    methodName: ATTRIBUTE_CLASSIFICATION_METHOD,
    operation: extras.operation,
    targetKind: extras.targetKind,
    instructionNames: extras.instructionNames ?? [],
    source: requiredSourceRangeForNode(basis.sourceProject, anchor),
    summary,
  };
  if (sourceNode === null && attributeClassificationRowMatches(row, basis.filters)) {
    missingCompilerLandmark(basis, row.id, row.methodName, branchKind, row.source);
  }
  return sourceNode === null ? null : row;
}

function missingCompilerLandmark(
  basis: TemplateCompilerBasis,
  id: string,
  methodName: string,
  landmark: string,
  source: SourceRange,
): void {
  basis.missing?.push({
    id,
    kind: OpenSeamKind.InsufficientBasis,
    summary: `Atlas could not locate the ${landmark} source landmark in TemplateCompiler.${methodName}.`,
    evidence: {
      kind: EvidenceKind.SourceSpan,
      role: EvidenceRole.Boundary,
      source,
      summary: `Containing method TemplateCompiler.${methodName}.`,
    },
  });
}

function methodDeclaration(
  basis: TemplateCompilerBasis,
  methodName: string,
): ts.MethodDeclaration | undefined {
  const method = basis.classDeclaration.members.find(
    (member): member is ts.MethodDeclaration =>
      ts.isMethodDeclaration(member) && propertyNameText(member.name) === methodName,
  );
  if (method?.body === undefined && basis.missing !== undefined &&
      (basis.filters.methodName === undefined || basis.filters.methodName === methodName)) {
    basis.missing.push({
      id: `framework-compiler:missing-method:${methodName}`,
      kind: OpenSeamKind.InsufficientBasis,
      summary: `Missing TemplateCompiler.${methodName} implementation in ${TEMPLATE_COMPILER_FILE}.`,
    });
  }
  return method;
}

function compilerFlowNodeContaining(root: ts.Node, text: string): ts.Node | null {
  return deepestNodeContainingText(root, text, isCompilerFlowSourceCandidate);
}

function lastNodeContaining(root: ts.Node, text: string): ts.Node | null {
  let match: ts.Node | null = null;
  const sourceFile = root.getSourceFile();
  const visit = (node: ts.Node): void => {
    if (!node.getFullText(sourceFile).includes(text)) {
      return;
    }
    if (isCompilerFlowSourceCandidate(node)) {
      match = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return match;
}

function isCompilerFlowSourceCandidate(node: ts.Node): boolean {
  return (
    ts.isBlock(node) ||
    ts.isCallExpression(node) ||
    ts.isCaseClause(node) ||
    ts.isClassDeclaration(node) ||
    ts.isExpressionStatement(node) ||
    ts.isForStatement(node) ||
    ts.isIfStatement(node) ||
    ts.isObjectLiteralExpression(node) ||
    ts.isPropertyAssignment(node) ||
    ts.isReturnStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isThrowStatement(node) ||
    ts.isVariableDeclaration(node) ||
    ts.isVariableStatement(node)
  );
}

function nodeKindIn(root: ts.Node, kind: ts.SyntaxKind): ts.Node | null {
  let match: ts.Node | null = null;
  const visit = (node: ts.Node): void => {
    if (match !== null) {
      return;
    }
    if (node.kind === kind) {
      match = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return match;
}

function compileFlowRowMatches(
  row: FrameworkCompileFlowRow,
  filters: FrameworkCompilerFilters,
): boolean {
  return (
    (filters.compileStage === undefined || row.stage === filters.compileStage) &&
    (filters.methodName === undefined || row.methodName === filters.methodName) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.methodName.includes(filters.query) ||
      row.stage.includes(filters.query) ||
      row.targetName?.includes(filters.query) === true)
  );
}

function shouldUseCompileFlowOverview(filters: FrameworkCompilerFilters): boolean {
  return (
    filters.compileStage === undefined &&
    filters.methodName === undefined &&
    filters.query === undefined &&
    filters.instructionName === undefined
  );
}

function isCompileFlowOverviewRow(row: FrameworkCompileFlowRow): boolean {
  if (
    row.methodName === "_compileCustomAttributeBindables" ||
    row.methodName === "_compileMultiBindings" ||
    row.methodName === "_extractProjections" ||
    row.methodName === "_compileLocalElement"
  ) {
    return row.targetName === undefined;
  }
  return true;
}

function attributeClassificationRowMatches(
  row: FrameworkAttributeClassificationRow,
  filters: FrameworkCompilerFilters,
): boolean {
  return (
    (filters.branchKind === undefined || row.branchKind === filters.branchKind) &&
    (filters.methodName === undefined || row.methodName === filters.methodName) &&
    (filters.instructionName === undefined ||
      row.instructionNames.includes(filters.instructionName)) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.branchKind.includes(filters.query) ||
      row.targetKind?.includes(filters.query) === true ||
      row.instructionNames.some((name) => name.includes(filters.query!)))
  );
}
