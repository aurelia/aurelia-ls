import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  AttributeClassificationKind,
  type AttributeClassification,
  type AttributeSyntax,
} from '../template/attribute-syntax.js';
import type {
  HtmlAttribute,
  HtmlAttributeReference,
  HtmlElement,
  HtmlNodeReference,
} from '../template/html-ir.js';
import { HtmlIrNodeKind } from '../template/html-ir.js';
import type {
  SourceSpan,
} from '../expression/source-span.js';
import type {
  ExpressionAstNode,
} from '../expression/ast.js';
import type {
  ExpressionParseResult,
} from '../expression/parse-result-algebra.js';
import { ExpressionParseResultInspector } from '../expression/parse-result-inspection.js';
import {
  NamedResourceDefinitionContributionKind,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import {
  BindingScopeCreatorKind,
  BindingScopeOwnerKind,
  type BindingScope,
} from '../configuration/scope.js';
import {
  bindingScopeForTemplateExpressionParse,
} from '../template/template-expression-selection.js';
import {
  capturedAttributeSyntaxForDynamicInstruction,
  resourceLocalBindingSourceOperations,
  resourceLocalDynamicTemplateInstructions,
  resourceLocalAuthoredTemplateExpressionParses,
  resourceLocalCompilerReachableHtmlAttributeProductHandles,
  resourceLocalTemplateInstructions,
} from '../template/runtime-resource-ownership.js';
import {
  HydrateAttributeInstruction,
  ListenerBindingInstruction,
  RefBindingInstruction,
  TemplateInstructionKind,
} from '../template/instruction-ir.js';
import { RuntimeControllerCreationKind } from '../template/runtime-controller.js';
import { namedRefTargetController } from '../template/runtime-ref-target.js';
import {
  describeAddress,
  semanticExactSourceReference,
  semanticSourceReferenceMatchesFilePath,
  sourceReferenceForParserSpan,
  type SemanticSourceReference,
} from './source-reference.js';
import {
  SemanticRuntimeDetail,
  type SemanticTemplateSemanticTokenModifier,
  type SemanticTemplateSemanticTokenRow,
  type SemanticTemplateSemanticTokenType,
} from './contracts.js';

type TemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];

export function readTemplateSemanticTokenRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  sourceFile: string | null,
  detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
): readonly SemanticTemplateSemanticTokenRow[] {
  const handles = detail === SemanticRuntimeDetail.Handles;
  return uniqueSemanticTokenRows([
    ...emission.templates.resources,
    ...emission.templates.authoringResources,
  ].flatMap((resource) => templateResourceSemanticTokenRows(store, resource, handles)))
    .filter((row) =>
      sourceFile == null || semanticSourceReferenceMatchesFilePath(row.source, sourceFile)
    )
    .sort(compareSemanticTokenRows);
}

function templateResourceSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const rows: SemanticTemplateSemanticTokenRow[] = [];
  const attributesByProduct = new Map(resource.compilation.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
  const elementsByProduct = new Map(resource.compilation.html.nodes
    .filter((node): node is HtmlElement => node.nodeKind === HtmlIrNodeKind.Element)
    .map((element) => [element.productHandle, element]));
  const syntaxByAttributeProduct = new Map(resource.compilation.attributeSyntax.syntaxes
    .filter((syntax) => syntax.attribute.productHandle != null)
    .map((syntax) => [syntax.attribute.productHandle as ProductHandle, syntax]));
  const syntaxByProduct = new Map(resource.compilation.authoredAttributeSyntaxes.map((syntax) => [syntax.productHandle, syntax]));
  const compilerReachableAttributes = resourceLocalCompilerReachableHtmlAttributeProductHandles(resource);

  rows.push(...instructionSemanticTokenRows(store, resource, elementsByProduct, attributesByProduct, syntaxByAttributeProduct, handles));
  rows.push(...dynamicInstructionSyntaxSemanticTokenRows(store, resource, handles));
  rows.push(...classificationSemanticTokenRows(store, resource, attributesByProduct, syntaxByProduct, compilerReachableAttributes, handles));
  rows.push(...multiBindingSegmentSemanticTokenRows(store, resource, syntaxByProduct, compilerReachableAttributes, handles));
  rows.push(...expressionSemanticTokenRows(store, resource, handles));
  rows.push(...localTemplateDefinitionSemanticTokenRows(store, resource, handles));

  return rows;
}

function localTemplateDefinitionSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const definition = resource.compilation.definition;
  if (!definition.contributions.some((contribution) =>
    contribution.contributionKind === NamedResourceDefinitionContributionKind.LocalTemplate
  )) {
    return [];
  }
  const rows: SemanticTemplateSemanticTokenRow[] = [];
  const add = (
    tokenType: SemanticTemplateSemanticTokenType,
    tokenModifiers: readonly SemanticTemplateSemanticTokenModifier[],
    sourceAddressHandle: AddressHandle | null,
  ): void => {
    const source = semanticExactSourceReference(describeAddress(store, sourceAddressHandle));
    if (source == null) {
      return;
    }
    rows.push(tokenRow(
      tokenType,
      tokenModifiers,
      definition.name,
      source,
      definition.productHandle,
      sourceAddressHandle,
      handles,
    ));
  };
  add('aureliaElement', ['definition'], definition.nameSourceAddressHandle);
  for (const bindable of definition.bindables) {
    add('property', ['declaration'], bindable.nameSourceAddressHandle);
    add('aureliaBindable', ['declaration'], bindable.attributeSourceAddressHandle);
    add('keyword', [], bindable.modeSourceAddressHandle);
  }
  return rows;
}

function multiBindingSegmentSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  syntaxByProduct: ReadonlyMap<ProductHandle, AttributeSyntax>,
  compilerReachableAttributes: ReadonlySet<ProductHandle>,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  return resource.compilation.bindingCommandLowering.multiBindingSegments.flatMap((segment) => {
    if (
      segment.attribute.productHandle == null
      || !compilerReachableAttributes.has(segment.attribute.productHandle)
    ) {
      return [];
    }
    const syntax = syntaxByProduct.get(segment.syntaxProductHandle) ?? null;
    if (syntax == null) {
      return [];
    }
    const rows: SemanticTemplateSemanticTokenRow[] = [];
    const targetSource = targetSourceForSyntax(store, syntax);
    if (segment.bindable != null && targetSource != null) {
      rows.push(tokenRow(
        'aureliaBindable',
        [],
        resource.compilation.definition.name,
        targetSource,
        segment.productHandle,
        syntax.targetSourceAddressHandle,
        handles,
      ));
    }
    const commandSource = commandSourceForSyntax(store, syntax);
    if (segment.command != null && commandSource != null) {
      rows.push(tokenRow(
        'aureliaCommand',
        [],
        resource.compilation.definition.name,
        commandSource,
        segment.productHandle,
        syntax.commandSourceAddressHandle,
        handles,
      ));
    }
    return rows;
  });
}

function instructionSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  elementsByProduct: ReadonlyMap<ProductHandle, HtmlElement>,
  attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
  syntaxByAttributeProduct: ReadonlyMap<ProductHandle, AttributeSyntax>,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const rows: SemanticTemplateSemanticTokenRow[] = [];
  for (const instruction of resourceLocalTemplateInstructions(store, resource)) {
    switch (instruction.instructionKind) {
      case TemplateInstructionKind.HydrateElement:
        if (instruction.definitionProductHandle == null) {
          break;
        }
        rows.push(...elementTagRows(store, resource, elementsByProduct, instruction.node, 'aureliaElement', instruction.productHandle, handles));
        break;
      case TemplateInstructionKind.HydrateLetElement:
        rows.push(...elementTagRows(store, resource, elementsByProduct, instruction.node, 'aureliaMetaElement', instruction.productHandle, handles));
        break;
      case TemplateInstructionKind.LetBinding:
        rows.push(...attributeTargetAndCommandRows(store, resource, attributesByProduct, syntaxByAttributeProduct, instruction.attribute, {
          targetType: 'variable',
          targetModifiers: ['declaration'],
          semanticProductHandle: instruction.productHandle,
          sourceAddressHandle: instruction.sourceAddressHandle,
        }, handles));
        break;
      case TemplateInstructionKind.RefBinding:
        rows.push(...attributeTargetAndCommandRows(store, resource, attributesByProduct, syntaxByAttributeProduct, instruction.attribute, {
          targetType: null,
          targetModifiers: [],
          semanticProductHandle: instruction.productHandle,
          sourceAddressHandle: instruction.sourceAddressHandle,
        }, handles));
        rows.push(...refTargetSemanticTokenRows(store, resource, syntaxByAttributeProduct, instruction, handles));
        break;
      case TemplateInstructionKind.ListenerBinding:
        rows.push(...listenerSemanticTokenRows(store, resource, instruction, handles));
        break;
      default:
        break;
    }
  }
  return rows;
}

function dynamicInstructionSyntaxSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  return resourceLocalDynamicTemplateInstructions(store, resource).flatMap((instruction) => {
    const syntax = capturedAttributeSyntaxForDynamicInstruction(store, instruction);
    if (syntax == null) {
      return [];
    }
    const rows: SemanticTemplateSemanticTokenRow[] = [];
    const commandSource = commandSourceForSyntax(store, syntax);
    if (commandSource != null) {
      rows.push(tokenRow(
        'aureliaCommand',
        [],
        resource.compilation.definition.name,
        commandSource,
        instruction.productHandle,
        syntax.commandSourceAddressHandle,
        handles,
      ));
    }
    const targetSource = instruction instanceof HydrateAttributeInstruction
      && instruction.definitionProductHandle != null
      ? targetSourceForSyntax(store, syntax)
      : null;
    if (targetSource != null) {
      rows.push(tokenRow(
        'aureliaAttribute',
        [],
        resource.compilation.definition.name,
        targetSource,
        instruction.productHandle,
        syntax.targetSourceAddressHandle,
        handles,
      ));
    }
    return rows;
  });
}

function listenerSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  instruction: ListenerBindingInstruction,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const eventSource = semanticExactSourceReference(describeAddress(store, instruction.eventNameSourceAddressHandle));
  const modifierSource = semanticExactSourceReference(describeAddress(store, instruction.eventModifierSourceAddressHandle));
  return [
    eventSource == null ? null : tokenRow(
      'aureliaEvent',
      [],
      resource.compilation.definition.name,
      { ...eventSource, role: 'listener-event' },
      instruction.productHandle,
      instruction.eventNameSourceAddressHandle,
      handles,
    ),
    modifierSource == null ? null : tokenRow(
      'aureliaModifier',
      [],
      resource.compilation.definition.name,
      { ...modifierSource, role: 'listener-modifier' },
      instruction.productHandle,
      instruction.eventModifierSourceAddressHandle,
      handles,
    ),
  ].filter((row): row is SemanticTemplateSemanticTokenRow => row != null);
}

function refTargetSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  syntaxByAttributeProduct: ReadonlyMap<ProductHandle, AttributeSyntax>,
  instruction: RefBindingInstruction,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const syntax = instruction.attribute.productHandle == null
    ? null
    : syntaxByAttributeProduct.get(instruction.attribute.productHandle) ?? null;
  if (
    syntax == null
    || instruction.targetSourceAddressHandle == null
    || instruction.targetSourceAddressHandle === syntax.commandSourceAddressHandle
  ) {
    return [];
  }
  const source = semanticExactSourceReference(describeAddress(store, instruction.targetSourceAddressHandle));
  if (source == null) {
    return [];
  }
  const operation = resourceLocalBindingSourceOperations(store, resource).find((candidate) =>
    candidate.instructionProductHandle === instruction.productHandle
  ) ?? null;
  const controller = operation == null
    ? null
    : namedRefTargetController(resource.runtimeAnalysis.runtimeRendering, operation);
  const tokenType = controller == null
    ? specialRefTargetTokenType(instruction.target)
    : controller.creationKind === RuntimeControllerCreationKind.CustomElement
      ? 'aureliaElement'
      : controller.creationKind === RuntimeControllerCreationKind.TemplateController
        ? 'aureliaController'
        : 'aureliaAttribute';
  if (tokenType == null) {
    return [];
  }
  const authoredTarget = syntax.patternParts.find((part) =>
    part.sourceAddressHandle === instruction.targetSourceAddressHandle
  )?.value ?? instruction.target;
  return [tokenRow(
    tokenType,
    authoredTarget === 'view-model' ? ['deprecated'] : [],
    resource.compilation.definition.name,
    { ...source, role: 'ref-target' },
    instruction.productHandle,
    instruction.targetSourceAddressHandle,
    handles,
  )];
}

function specialRefTargetTokenType(
  target: string,
): SemanticTemplateSemanticTokenType | null {
  switch (target) {
    case 'element':
    case 'controller':
    case 'component':
    case 'view':
      return 'keyword';
    default:
      return null;
  }
}

function classificationSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
  syntaxByProduct: ReadonlyMap<ProductHandle, AttributeSyntax>,
  compilerReachableAttributes: ReadonlySet<ProductHandle>,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const rows: SemanticTemplateSemanticTokenRow[] = [];
  for (const classification of resource.compilation.attributeClassification.classifications) {
    const syntax = syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
    if (
      syntax?.attribute.productHandle == null
      || !compilerReachableAttributes.has(syntax.attribute.productHandle)
    ) {
      continue;
    }
    const attribute = syntax.attribute.productHandle == null
      ? null
      : attributesByProduct.get(syntax.attribute.productHandle) ?? null;
    if (attribute == null) {
      continue;
    }

    const commandSource = commandSourceForSyntax(store, syntax);
    if (commandSource != null) {
      rows.push(tokenRow(
        'aureliaCommand',
        [],
        resource.compilation.definition.name,
        commandSource,
        classification.productHandle,
        attribute.nameAddressHandle,
        handles,
      ));
    }

    const targetType = tokenTypeForClassification(classification);
    const targetSource = targetSourceForSyntax(store, syntax);
    if (targetType != null && targetSource != null) {
      rows.push(tokenRow(
        targetType,
        [],
        resource.compilation.definition.name,
        targetSource,
        classification.productHandle,
        classification.sourceAddressHandle,
        handles,
      ));
    }
  }
  return rows;
}

function expressionSemanticTokenRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const rows: SemanticTemplateSemanticTokenRow[] = [];
  const parses = resourceLocalAuthoredTemplateExpressionParses(store, resource);
  for (const parse of parses) {
    const parseSource = semanticExactSourceReference(describeAddress(store, parse.sourceAddressHandle));
    const root = expressionRoot(parse.result);
    if (root == null) {
      continue;
    }
    collectExpressionTokens(
      root,
      parseSource,
      resource.compilation.definition.name,
      parse.productHandle,
      parse.sourceAddressHandle,
      bindingScopeForTemplateExpressionParse(resource, parse),
      handles,
      rows,
    );
  }
  return rows;
}

function collectExpressionTokens(
  expression: ExpressionAstNode,
  parseSource: SemanticSourceReference | null,
  definitionName: string,
  semanticProductHandle: ProductHandle,
  sourceAddressHandle: AddressHandle | null,
  scope: BindingScope | null,
  handles: boolean,
  rows: SemanticTemplateSemanticTokenRow[],
): void {
  visitExpression(expression, (node) => {
    switch (node.$kind) {
      case 'AccessScope':
        for (const qualifierSpan of node.authoredScopePath?.qualifierSpans ?? []) {
          pushExpressionToken(rows, 'variable', ['defaultLibrary'], qualifierSpan, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        }
        pushExpressionToken(rows, 'variable', modifiersForScopeName(node.name.name, scope), node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'CallScope':
        for (const qualifierSpan of node.authoredScopePath?.qualifierSpans ?? []) {
          pushExpressionToken(rows, 'variable', ['defaultLibrary'], qualifierSpan, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        }
        pushExpressionToken(rows, 'function', modifiersForScopeName(node.name.name, scope), node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'AccessGlobal':
        pushExpressionToken(rows, 'variable', ['defaultLibrary'], node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'CallGlobal':
        pushExpressionToken(rows, 'function', ['defaultLibrary'], node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'AccessMember':
        pushExpressionToken(rows, 'property', [], node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'CallMember':
        pushExpressionToken(rows, 'function', [], node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'AccessThis':
        for (const qualifierSpan of node.authoredScopePath?.qualifierSpans ?? []) {
          pushExpressionToken(rows, 'variable', ['defaultLibrary'], qualifierSpan, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        }
        break;
      case 'AccessBoundary':
        pushExpressionToken(rows, 'variable', ['defaultLibrary'], sliceExpressionSpan(node.span, node.span.start, node.span.start + '$host'.length), parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'ValueConverter':
        pushExpressionToken(rows, 'aureliaConverter', [], node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'BindingBehavior':
        pushExpressionToken(rows, 'aureliaBehavior', [], node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'BindingIdentifier':
        pushExpressionToken(rows, 'variable', ['declaration'], node.name.span, parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        break;
      case 'Interpolation':
        for (const child of node.expressions) {
          pushExpressionToken(rows, 'aureliaExpression', [], sliceExpressionSpan(child.span, child.span.start - 2, child.span.start), parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
          pushExpressionToken(rows, 'aureliaExpression', [], sliceExpressionSpan(child.span, child.span.end, child.span.end + 1), parseSource, definitionName, semanticProductHandle, sourceAddressHandle, handles);
        }
        break;
      default:
        break;
    }
  });
}

function visitExpression(
  expression: ExpressionAstNode,
  visit: (expression: ExpressionAstNode) => void,
): void {
  visit(expression);
  for (const child of expressionChildren(expression)) {
    visitExpression(child, visit);
  }
}

function expressionChildren(expression: ExpressionAstNode): readonly ExpressionAstNode[] {
  switch (expression.$kind) {
    case 'AccessMember':
      return [expression.object];
    case 'CallMember':
      return [expression.object, ...expression.args];
    case 'Paren':
    case 'Unary':
      return [expression.expression];
    case 'AccessKeyed':
      return [expression.object, expression.key];
    case 'BindingBehavior':
    case 'ValueConverter':
      return [expression.expression, ...expression.args];
    case 'CallFunction':
      return [expression.func, ...expression.args];
    case 'CallScope':
    case 'CallGlobal':
      return expression.args;
    case 'New':
      return [expression.func, ...expression.args];
    case 'TaggedTemplate':
      return [expression.func, ...expression.expressions];
    case 'Binary':
      return [expression.left, expression.right];
    case 'Conditional':
      return [expression.condition, expression.yes, expression.no];
    case 'Assign':
      return [expression.target, expression.value];
    case 'ArrowFunction':
      return [...expression.args, expression.body];
    case 'ArrayLiteral':
      return expression.elements;
    case 'ObjectLiteral':
      return expression.values;
    case 'Template':
    case 'Interpolation':
      return expression.expressions;
    case 'ForOfStatement':
      return [expression.declaration, expression.iterable];
    case 'BindingPatternDefault':
      return [expression.target, expression.default];
    case 'ArrayBindingPattern':
      return [...expression.elements, ...(expression.rest == null ? [] : [expression.rest])];
    case 'ObjectBindingPattern':
      return [
        ...expression.properties.map((property) => property.value),
        ...(expression.rest == null ? [] : [expression.rest]),
      ];
    case 'DestructuringAssignment':
      return [expression.pattern, expression.source];
    case 'AccessThis':
    case 'AccessBoundary':
    case 'AccessScope':
    case 'AccessGlobal':
    case 'PrimitiveLiteral':
    case 'Identifier':
    case 'BindingIdentifier':
    case 'BindingPatternHole':
    case 'Custom':
      return [];
  }
  const exhaustive: never = expression;
  return exhaustive;
}

function elementTagRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  elementsByProduct: ReadonlyMap<ProductHandle, HtmlElement>,
  node: HtmlNodeReference,
  tokenType: SemanticTemplateSemanticTokenType,
  semanticProductHandle: ProductHandle,
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const element = node.productHandle == null ? null : elementsByProduct.get(node.productHandle) ?? null;
  if (element == null) {
    return [];
  }
  return ([
    [element.tagNameAddressHandle, 'tag-name'],
    [element.closingTagNameAddressHandle, 'close-tag-name'],
  ] as const)
    .flatMap(([addressHandle, role]) => {
      const source = semanticExactSourceReference(describeAddress(store, addressHandle));
      return source == null ? [] : [tokenRow(
        tokenType,
        [],
        resource.compilation.definition.name,
        { ...source, role },
        semanticProductHandle,
        addressHandle,
        handles,
      )];
    });
}

function attributeTargetAndCommandRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
  syntaxByAttributeProduct: ReadonlyMap<ProductHandle, AttributeSyntax>,
  attributeRef: HtmlAttributeReference,
  options: {
    readonly targetType: SemanticTemplateSemanticTokenType | null;
    readonly targetModifiers: readonly SemanticTemplateSemanticTokenModifier[];
    readonly semanticProductHandle: ProductHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  },
  handles: boolean,
): readonly SemanticTemplateSemanticTokenRow[] {
  const attribute = attributeRef.productHandle == null
    ? null
    : attributesByProduct.get(attributeRef.productHandle) ?? null;
  const syntax = attributeRef.productHandle == null
    ? null
    : syntaxByAttributeProduct.get(attributeRef.productHandle) ?? null;
  if (attribute == null || syntax == null) {
    return [];
  }

  const rows: SemanticTemplateSemanticTokenRow[] = [];
  const commandSource = commandSourceForSyntax(store, syntax);
  if (commandSource != null) {
    rows.push(tokenRow(
      'aureliaCommand',
      [],
      resource.compilation.definition.name,
      commandSource,
      options.semanticProductHandle,
      attribute.nameAddressHandle,
      handles,
    ));
  }
  const targetSource = targetSourceForSyntax(store, syntax);
  if (options.targetType != null && targetSource != null) {
    rows.push(tokenRow(
      options.targetType,
      options.targetModifiers,
      resource.compilation.definition.name,
      targetSource,
      options.semanticProductHandle,
      options.sourceAddressHandle,
      handles,
    ));
  }
  return rows;
}

function tokenTypeForClassification(
  classification: AttributeClassification,
): SemanticTemplateSemanticTokenType | null {
  switch (classification.classificationKind) {
    case AttributeClassificationKind.TemplateController:
      return 'aureliaController';
    case AttributeClassificationKind.CustomAttribute:
      return 'aureliaAttribute';
    case AttributeClassificationKind.Bindable:
      return 'aureliaBindable';
    default:
      return classification.resourceKind === ResourceDefinitionKind.TemplateController
        ? 'aureliaController'
        : null;
  }
}

function commandSourceForSyntax(
  store: KernelStore,
  syntax: AttributeSyntax,
): SemanticSourceReference | null {
  if (syntax.command == null || syntax.command.length === 0) {
    return null;
  }
  const source = semanticExactSourceReference(describeAddress(store, syntax.commandSourceAddressHandle));
  return source == null ? null : { ...source, role: 'binding-command' };
}

function targetSourceForSyntax(
  store: KernelStore,
  syntax: AttributeSyntax,
): SemanticSourceReference | null {
  const source = semanticExactSourceReference(describeAddress(store, syntax.targetSourceAddressHandle));
  return source == null ? null : { ...source, role: 'attribute-target' };
}

function pushExpressionToken(
  rows: SemanticTemplateSemanticTokenRow[],
  tokenType: SemanticTemplateSemanticTokenType,
  tokenModifiers: readonly SemanticTemplateSemanticTokenModifier[],
  span: SourceSpan | null,
  parseSource: SemanticSourceReference | null,
  definitionName: string,
  semanticProductHandle: ProductHandle,
  sourceAddressHandle: AddressHandle | null,
  handles: boolean,
): void {
  const source = sourceForExpressionSpan(span, parseSource);
  if (source == null) {
    return;
  }
  rows.push(tokenRow(
    tokenType,
    tokenModifiers,
    definitionName,
    source,
    semanticProductHandle,
    sourceAddressHandle,
    handles,
  ));
}

function sourceForExpressionSpan(
  span: SourceSpan | null,
  parseSource: SemanticSourceReference | null,
): SemanticSourceReference | null {
  if (span == null || span.start >= span.end) {
    return null;
  }
  const filePath = span.file?.path ?? sourcePathForReference(parseSource);
  if (filePath == null) {
    return null;
  }
  const start = span.file == null && parseSource?.start != null
    ? parseSource.start + span.start
    : span.start;
  const end = span.file == null && parseSource?.start != null
    ? parseSource.start + span.end
    : span.end;
  if (start >= end) {
    return null;
  }
  return sourceReferenceForParserSpan(filePath, { start, end, file: span.file ?? null }, 'expression-token');
}

function sourcePathForReference(
  source: SemanticSourceReference | null,
): string | null {
  if (source == null) {
    return null;
  }
  return source.path ?? sourcePathForReference(source.anchor ?? null);
}

function sliceExpressionSpan(
  span: SourceSpan,
  start: number,
  end: number,
): SourceSpan | null {
  if (start < span.start || end > span.end || start >= end) {
    return null;
  }
  return { start, end, file: span.file ?? null };
}

function expressionRoot(
  result: ExpressionParseResult,
): ExpressionAstNode | null {
  return ExpressionParseResultInspector.hasCanonicalAst(result) ? result.ast : null;
}

function modifiersForScopeName(
  name: string,
  scope: BindingScope | null,
): readonly SemanticTemplateSemanticTokenModifier[] {
  if (name === '$host') {
    return ['defaultLibrary'];
  }
  const located = scope?.locate(name) ?? null;
  if (located?.slot == null || located.scope == null || !name.startsWith('$')) {
    return [];
  }
  const repeatContextual = located.scope.ownerKind === BindingScopeOwnerKind.RepeatedItem
    && located.context === located.scope.overrideContext;
  const listenerContextual = located.scope.scopeCreators.some((creator) =>
    creator.creatorKind === BindingScopeCreatorKind.ListenerEvent
  );
  return repeatContextual || listenerContextual ? ['defaultLibrary'] : [];
}

function tokenRow(
  tokenType: SemanticTemplateSemanticTokenType,
  tokenModifiers: readonly SemanticTemplateSemanticTokenModifier[],
  definitionName: string | null,
  source: SemanticSourceReference,
  semanticProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  handles: boolean,
): SemanticTemplateSemanticTokenRow {
  return {
    tokenType,
    tokenModifiers,
    definitionName,
    source,
    ...(handles ? {
      handles: {
        semanticProductHandle,
        sourceAddressHandle,
      },
    } : {}),
  };
}

function uniqueSemanticTokenRows(
  rows: readonly SemanticTemplateSemanticTokenRow[],
): readonly SemanticTemplateSemanticTokenRow[] {
  const seen = new Set<string>();
  const unique: SemanticTemplateSemanticTokenRow[] = [];
  for (const row of rows) {
    const source = semanticExactSourceReference(row.source);
    if (source == null || source.start == null || source.end == null) {
      continue;
    }
    const key = [
      source.path ?? '',
      source.start,
      source.end,
      row.tokenType,
      row.tokenModifiers.join(','),
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push({
      ...row,
      source,
    });
  }
  return unique;
}

function compareSemanticTokenRows(
  left: SemanticTemplateSemanticTokenRow,
  right: SemanticTemplateSemanticTokenRow,
): number {
  return (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
    || (left.source?.start ?? -1) - (right.source?.start ?? -1)
    || (left.source?.end ?? -1) - (right.source?.end ?? -1)
    || left.tokenType.localeCompare(right.tokenType)
    || left.tokenModifiers.join(',').localeCompare(right.tokenModifiers.join(','));
}
