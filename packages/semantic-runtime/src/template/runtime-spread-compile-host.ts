import { SemanticClaim } from '../kernel/claim.js';
import type { ProductHandle } from '../kernel/handles.js';
import { InstructionIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import type { KernelStore, KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { ExpressionType } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import { camelCaseAttributeName } from './attribute-mapper.js';
import type { AttributeSyntax } from './attribute-syntax.js';
import {
  BindingCommandBuildInfo,
  BindingCommandInstructionAllocation,
  BindingCommandIteratorParse,
  BindingCommandTailSyntax,
  type BindingCommandBuildContext,
  type BindingCommandExecutable,
} from './binding-command-execution.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  TemplateCompilerSpreadCompileRequest,
  type TemplateCompilerSpreadCompileHost,
  TemplateCompilerSpreadCompileResult,
  type TemplateCompilerService,
} from './compiler-world.js';
import type { TemplateBindableReference } from './compiler-world-reference.js';
import { HtmlElement, type HtmlNodeReference } from './html-ir.js';
import {
  HydrateAttributeInstruction,
  InterpolationInstruction,
  SetAttributeInstruction,
  SetClassAttributeInstruction,
  SetPropertyInstruction,
  SetStyleAttributeInstruction,
  SpreadElementPropBindingInstruction,
  SpreadTransferedBindingInstruction,
  TemplateInstructionKind,
  type TemplateInstruction,
} from './instruction-ir.js';
import { instructionKindKeyFor } from './instruction-vocabulary.js';
import { TemplateProductDetails } from './product-details.js';
import {
  TemplateExpressionParse,
  TemplateValueSite,
  TemplateValueSiteKind,
} from './value-site.js';
import {
  TemplateValueSitePublicationRequest,
  TemplateValueSitePublisher,
} from './value-site-publication.js';
import type { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import {
  RuntimeHtmlBindingFrameworkErrorCode,
  TemplateCompilerFrameworkErrorCode,
} from './framework-error-code.js';
import {
  TemplateCompilerIssueKind,
  TemplateCompilerIssuePhase,
} from './compiler-issue.js';
import {
  TemplateCompilerIssuePublisher,
} from './compiler-issue-publication.js';
import {
  RuntimeBindingIssueKind,
  RuntimeBindingIssuePhase,
  RuntimeBindingIssuePublisher,
} from './runtime-binding-issue.js';
import type { RuntimeBindingIssue } from './runtime-binding-issue.js';
import type {
  SpreadBinding,
} from './runtime-binding.js';

export class RuntimeTemplateCompilerSpreadCompileHost implements TemplateCompilerSpreadCompileHost {
  private readonly valueSitePublisher: TemplateValueSitePublisher;
  private readonly compilerIssuePublisher: TemplateCompilerIssuePublisher;
  private instructionIndex = 0;
  private expressionIndex = 0;

  constructor(
    private readonly store: KernelStore,
    private readonly world: TemplateCompilerWorldEmission,
    private readonly source: RuntimeRenderingSourceSet,
    private readonly bindingIssuePublisher: RuntimeBindingIssuePublisher,
    private readonly bindingOwner: SpreadBinding,
    private readonly records: KernelStoreRecord[],
    private readonly bindingIssues: RuntimeBindingIssue[],
    private readonly dynamicInstructions: TemplateInstruction[],
    private readonly dynamicValueSites: TemplateValueSite[],
    private readonly dynamicExpressionParses: TemplateExpressionParse[],
  ) {
    this.valueSitePublisher = new TemplateValueSitePublisher(store);
    this.compilerIssuePublisher = new TemplateCompilerIssuePublisher(store);
  }

  compileSpread(
    request: TemplateCompilerSpreadCompileRequest,
    _compiler: TemplateCompilerService,
  ): TemplateCompilerSpreadCompileResult {
    const targetNode = this.targetNode(request);
    if (targetNode == null) {
      return TemplateCompilerSpreadCompileResult.open(
        request,
        'TemplateCompiler.compileSpread could not hydrate the target HTMLElement for captured attribute compilation.',
      );
    }

    const targetDefinition = this.targetDefinition(request, targetNode);
    const rootInstructions: TemplateInstruction[] = [];
    const createdInstructions: TemplateInstruction[] = [];
    for (const syntax of request.capturedSyntaxes) {
      const compiled = this.compileCapturedSyntax(request, syntax, targetNode, targetDefinition);
      if (typeof compiled === 'string') {
        return TemplateCompilerSpreadCompileResult.open(request, compiled);
      }
      rootInstructions.push(...compiled.rootInstructions);
      createdInstructions.push(...compiled.createdInstructions);
    }
    return TemplateCompilerSpreadCompileResult.compiled(
      request,
      rootInstructions,
      createdInstructions,
    );
  }

  private compileCapturedSyntax(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    targetNode: HtmlElement,
    targetDefinition: CustomElementDefinition | null,
  ): SpreadCompileInstructionSet | string {
    const target = syntax.target.toLowerCase();
    if (target === '...$attrs') {
      const instruction = this.createInstruction(request, syntax, TemplateInstructionKind.SpreadTransferedBinding, 'spread-transfered-binding',
        (allocation) => new SpreadTransferedBindingInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          targetNode.toReference(),
          syntax.attribute,
          syntax.sourceAddressHandle,
        ));
      return instructionSet([instruction]);
    }

    const command = this.commandMatch(syntax);
    if (command != null && command.executable.ignoreAttr) {
      return this.commandInstructions(request, syntax, targetNode, null, null, command);
    }

    if (targetDefinition != null) {
      const bindable = this.world.resourceResolver.bindables(targetDefinition).attr(target);
      if (bindable != null) {
        const inner = command == null
          ? instructionSet([this.bindableValueInstruction(request, syntax, targetNode, bindable.definition.name)])
          : this.commandInstructions(request, syntax, targetNode, bindable, targetDefinition.productHandle, command);
        if (typeof inner === 'string') {
          return inner;
        }
        return this.wrapSpreadElementPropInstructions(request, syntax, targetNode, inner.rootInstructions);
      }
    }

    const attributeResolution = this.world.resourceResolver.attr(target);
    const attributeDefinition = attributeResolution?.definition instanceof CustomAttributeDefinition
      ? attributeResolution.definition
      : null;
    if (attributeDefinition != null) {
      if (attributeDefinition.isTemplateController) {
        this.publishSpreadTemplateControllerIssue(request, syntax, target, targetNode);
        return `SpreadBinding.addChild does not allow captured template controller '${target}' to be spread onto '${targetNode.tagName}'.`;
      }
      const props = command == null
        ? instructionSet([this.customAttributeValueInstruction(request, syntax, targetNode, attributeDefinition.defaultProperty)])
        : this.commandInstructions(request, syntax, targetNode, null, attributeDefinition.productHandle, command);
      if (typeof props === 'string') {
        return props;
      }
      const instruction = this.createInstruction(request, syntax, TemplateInstructionKind.HydrateAttribute, 'hydrate-attribute',
        (allocation) => new HydrateAttributeInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          targetNode.toReference(),
          syntax.attribute,
          target,
          this.world.templateCompiler.resolveResources ? attributeDefinition.productHandle : null,
          props.rootInstructions.map((prop) => prop.productHandle),
          syntax.sourceAddressHandle,
        ));
      return {
        rootInstructions: [instruction],
        createdInstructions: [instruction, ...props.createdInstructions],
      };
    }

    if (command != null) {
      return this.commandInstructions(request, syntax, targetNode, null, null, command);
    }

    return instructionSet([this.plainAttributeInstruction(request, syntax, targetNode)]);
  }

  private commandInstructions(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    targetNode: HtmlElement,
    bindable: TemplateBindableReference | null,
    definitionProductHandle: ProductHandle | null,
    command: SpreadCommandMatch,
  ): SpreadCompileInstructionSet | string {
    const context = new RuntimeSpreadCommandBuildContext(
      this.world,
      request,
      syntax,
      targetNode,
      command.executable,
      bindable,
      this,
    );
    const info = new BindingCommandBuildInfo(
      targetNode.toReference(),
      syntax.attribute,
      syntax,
      bindable?.definition ?? null,
      null,
      bindable?.reference.ownerDefinitionProductHandle ?? null,
      definitionProductHandle,
      syntax.sourceAddressHandle,
      syntax.sourceAddressHandle,
    );
    const build = command.handler.build(info, context);
    if (build.state !== 'complete') {
      return build.message ?? `TemplateCompiler.compileSpread could not lower captured binding command '${syntax.command ?? '(unknown)'}'.`;
    }
    for (const instruction of build.instructions) {
      this.registerInstructionDetail(request, instruction, syntax);
    }
    return instructionSet(build.instructions);
  }

  private bindableValueInstruction(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    targetNode: HtmlElement,
    targetProperty: string,
  ): TemplateInstruction {
    const parse = this.publishExpressionParse(request, syntax, targetNode, syntax.rawValue, 'Interpolation', null, null);
    if (parse.resultKind === ExpressionParseResultKind.InterpolationAbsent) {
      return this.createInstruction(request, syntax, TemplateInstructionKind.SetProperty, 'set-property',
        (allocation) => new SetPropertyInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          targetNode.toReference(),
          syntax.attribute,
          targetProperty,
          syntax.rawValue,
          syntax.sourceAddressHandle,
        ));
    }
    return this.createInstruction(request, syntax, TemplateInstructionKind.Interpolation, 'interpolation',
      (allocation) => new InterpolationInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        targetNode.toReference(),
        syntax.attribute,
        targetProperty,
        [parse.productHandle],
        syntax.sourceAddressHandle,
      ));
  }

  private customAttributeValueInstruction(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    targetNode: HtmlElement,
    targetProperty: string,
  ): TemplateInstruction {
    const parse = this.publishExpressionParse(request, syntax, targetNode, syntax.rawValue, 'Interpolation', null, null);
    if (parse.resultKind === ExpressionParseResultKind.InterpolationAbsent) {
      return this.createInstruction(request, syntax, TemplateInstructionKind.SetProperty, 'custom-attribute-set-property',
        (allocation) => new SetPropertyInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          targetNode.toReference(),
          syntax.attribute,
          targetProperty,
          syntax.rawValue,
          syntax.sourceAddressHandle,
        ));
    }
    return this.createInstruction(request, syntax, TemplateInstructionKind.Interpolation, 'custom-attribute-interpolation',
      (allocation) => new InterpolationInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        targetNode.toReference(),
        syntax.attribute,
        targetProperty,
        [parse.productHandle],
        syntax.sourceAddressHandle,
      ));
  }

  private plainAttributeInstruction(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    targetNode: HtmlElement,
  ): TemplateInstruction {
    const parse = this.publishExpressionParse(request, syntax, targetNode, syntax.rawValue, 'Interpolation', null, null);
    if (parse.resultKind !== ExpressionParseResultKind.InterpolationAbsent) {
      const mappedTarget = this.world.attributeMapper.map(targetNode, syntax.target) ?? camelCaseAttributeName(syntax.target);
      return this.createInstruction(request, syntax, TemplateInstructionKind.Interpolation, 'plain-attribute-interpolation',
        (allocation) => new InterpolationInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          targetNode.toReference(),
          syntax.attribute,
          mappedTarget,
          [parse.productHandle],
          syntax.sourceAddressHandle,
        ));
    }
    if (syntax.target === 'class') {
      return this.createInstruction(request, syntax, TemplateInstructionKind.SetClassAttribute, 'set-class-attribute',
        (allocation) => new SetClassAttributeInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          targetNode.toReference(),
          syntax.attribute,
          syntax.rawValue,
          syntax.sourceAddressHandle,
        ));
    }
    if (syntax.target === 'style') {
      return this.createInstruction(request, syntax, TemplateInstructionKind.SetStyleAttribute, 'set-style-attribute',
        (allocation) => new SetStyleAttributeInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          targetNode.toReference(),
          syntax.attribute,
          syntax.rawValue,
          syntax.sourceAddressHandle,
        ));
    }
    return this.createInstruction(request, syntax, TemplateInstructionKind.SetAttribute, 'set-attribute',
      (allocation) => new SetAttributeInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        targetNode.toReference(),
        syntax.attribute,
        syntax.target,
        syntax.rawValue,
        syntax.sourceAddressHandle,
      ));
  }

  private wrapSpreadElementPropInstructions(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    targetNode: HtmlElement,
    innerInstructions: readonly TemplateInstruction[],
  ): SpreadCompileInstructionSet {
    const wrappers = innerInstructions.map((inner) =>
      this.createInstruction(request, syntax, TemplateInstructionKind.SpreadElementPropBinding, 'spread-element-prop',
        (allocation) => new SpreadElementPropBindingInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          targetNode.toReference(),
          syntax.attribute,
          inner.productHandle,
          syntax.sourceAddressHandle,
        ))
    );
    return {
      rootInstructions: wrappers,
      createdInstructions: [...wrappers, ...innerInstructions],
    };
  }

  private publishSpreadTemplateControllerIssue(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    target: string,
    targetNode: HtmlElement,
  ): void {
    const compilerIssue = this.compilerIssuePublisher.publish(
      `${request.localKey}:issue:template-compiler:no-spread-template-controller:${syntax.productHandle}`,
      this.world.templateCompiler.identityHandle,
      this.source.provenanceHandle,
      TemplateCompilerIssuePhase.SpreadCompile,
      TemplateCompilerIssueKind.NoSpreadTemplateController,
      `TemplateCompiler.compileSpread cannot admit captured template controller "${target}" on "${targetNode.tagName}".`,
      TemplateCompilerFrameworkErrorCode.NoSpreadTemplateController,
      syntax.sourceAddressHandle,
    );
    const publication = this.bindingIssuePublisher.publish(
      `${request.localKey}:issue:no-spread-template-controller:${syntax.productHandle}`,
      this.bindingOwner.toReference(),
      this.bindingOwner.identityHandle,
      this.source.provenanceHandle,
      RuntimeBindingIssuePhase.SpreadChildAdmission,
      RuntimeBindingIssueKind.SpreadTemplateControllerUnsupported,
      `SpreadBinding.addChild cannot admit captured template controller "${target}" on "${targetNode.tagName}".`,
      RuntimeHtmlBindingFrameworkErrorCode.NoSpreadTemplateController,
      syntax.sourceAddressHandle,
    );
    this.records.push(...compilerIssue.records);
    this.records.push(...publication.records);
    this.store.productDetails.add(
      TemplateProductDetails.CompilerIssue,
      compilerIssue.issue.productHandle,
      compilerIssue.issue,
    );
    this.bindingIssues.push(publication.issue);
  }

  allocateInstruction(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    kind: TemplateInstructionKind,
    local: string,
  ): BindingCommandInstructionAllocation {
    const instructionLocal = `runtime-rendering:${request.localKey}:spread-compile:instruction:${this.instructionIndex++}:${local}:${syntax.productHandle}`;
    const allocation = new BindingCommandInstructionAllocation(
      this.store.handles.product(instructionLocal),
      this.store.handles.identity(instructionLocal),
    );
    this.records.push(
      new InstructionIdentity(
        allocation.identityHandle,
        request.spreadInstruction.identityHandle,
        instructionKindKeyFor(kind),
      ),
      new MaterializedProduct(
        allocation.productHandle,
        KernelVocabulary.Instruction.Instruction.key,
        allocation.identityHandle,
        syntax.sourceAddressHandle,
        this.source.provenanceHandle,
      ),
    );
    return allocation;
  }

  createInstruction<TInstruction extends TemplateInstruction>(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    kind: TemplateInstructionKind,
    local: string,
    factory: (allocation: BindingCommandInstructionAllocation) => TInstruction,
  ): TInstruction {
    const instruction = factory(this.allocateInstruction(request, syntax, kind, local));
    this.registerInstructionDetail(request, instruction, syntax);
    return instruction;
  }

  publishExpressionParse(
    request: TemplateCompilerSpreadCompileRequest,
    syntax: AttributeSyntax,
    targetNode: HtmlElement,
    expression: string,
    entryFamily: ExpressionType,
    command: BindingCommandExecutable | null,
    bindable: TemplateBindableReference | null,
  ): TemplateExpressionParse {
    const siteLocal = `runtime-rendering:${request.localKey}:spread-compile:value-site:${this.expressionIndex++}:${syntax.productHandle}`;
    const parseLocal = `${siteLocal}:expression-parse`;
    const publication = this.valueSitePublisher.publish(new TemplateValueSitePublicationRequest(
      siteLocal,
      parseLocal,
      this.world.expressionParser,
      this.source.provenanceHandle,
      TemplateValueSiteKind.CapturedValue,
      expression,
      entryFamily,
      targetNode.toReference(),
      syntax.attribute,
      syntax,
      null,
      command?.toReference() ?? null,
      bindable,
      syntax.sourceAddressHandle,
      syntax.identityHandle,
      `spread:${entryFamily}`,
      null,
      (result) => `spread:${result.kind}`,
    ));
    if (publication.parse == null) {
      throw new Error('Spread-compiled expression parsing must publish an expression parse.');
    }
    this.records.push(...publication.records);
    this.dynamicValueSites.push(publication.site);
    this.dynamicExpressionParses.push(publication.parse);
    return publication.parse;
  }

  private registerInstructionDetail(
    request: TemplateCompilerSpreadCompileRequest,
    instruction: TemplateInstruction,
    syntax: AttributeSyntax,
  ): void {
    if (!this.dynamicInstructions.some((candidate) => candidate.productHandle === instruction.productHandle)) {
      this.dynamicInstructions.push(instruction);
      this.records.push(new SemanticClaim(
        this.store.handles.claim(`${request.localKey}:spread-compile:instruction-origin:${instruction.productHandle}:${syntax.productHandle}`),
        instruction.productHandle,
        KernelVocabulary.Instruction.DynamicInstructionOriginatesFromCapturedAttributeSyntax.key,
        syntax.productHandle,
        this.source.provenanceHandle,
      ));
    }
  }

  private commandMatch(syntax: AttributeSyntax): SpreadCommandMatch | null {
    if (syntax.command == null) {
      return null;
    }
    const executable = this.world.bindingCommandResolver.get(syntax.command);
    if (executable == null) {
      return null;
    }
    const command = this.world.bindingCommands.find((candidate) =>
      candidate.executable.productHandle === executable.productHandle
    ) ?? null;
    return command == null ? null : { executable, handler: command.handler };
  }

  private targetNode(request: TemplateCompilerSpreadCompileRequest): HtmlElement | null {
    const productHandle = request.target.htmlNode?.productHandle ?? null;
    if (productHandle == null) {
      return null;
    }
    const node = this.store.productDetails.read(TemplateProductDetails.HtmlNode, productHandle);
    return node instanceof HtmlElement ? node : null;
  }

  private targetDefinition(
    request: TemplateCompilerSpreadCompileRequest,
    targetNode: HtmlElement,
  ): CustomElementDefinition | null {
    if (request.targetDefinitionProductHandle != null) {
      const definition = this.store.productDetails.read(ResourceProductDetails.Definition, request.targetDefinitionProductHandle);
      return definition instanceof CustomElementDefinition ? definition : null;
    }
    const resolution = this.world.resourceResolver.el(this.elementLookupName(targetNode));
    return resolution?.definition instanceof CustomElementDefinition ? resolution.definition : null;
  }

  private elementLookupName(targetNode: HtmlElement): string {
    const asElement = targetNode.attributes
      .map((attribute) => attribute.productHandle == null
        ? null
        : this.store.productDetails.read(TemplateProductDetails.HtmlAttribute, attribute.productHandle))
      .find((attribute) => attribute?.rawName.toLowerCase() === 'as-element') ?? null;
    return asElement == null || asElement.rawValue === ''
      ? targetNode.tagName.toLowerCase()
      : asElement.rawValue.toLowerCase();
  }

}

interface SpreadCommandMatch {
  readonly executable: BindingCommandExecutable;
  readonly handler: {
    build(
      info: BindingCommandBuildInfo,
      context: BindingCommandBuildContext,
    ): { readonly state: string; readonly instructions: readonly TemplateInstruction[]; readonly message: string | null };
  };
}

interface SpreadCompileInstructionSet {
  readonly rootInstructions: readonly TemplateInstruction[];
  readonly createdInstructions: readonly TemplateInstruction[];
}

function instructionSet(instructions: readonly TemplateInstruction[]): SpreadCompileInstructionSet {
  return { rootInstructions: instructions, createdInstructions: instructions };
}

class RuntimeSpreadCommandBuildContext implements BindingCommandBuildContext {
  constructor(
    private readonly world: TemplateCompilerWorldEmission,
    private readonly request: TemplateCompilerSpreadCompileRequest,
    private readonly syntax: AttributeSyntax,
    private readonly targetNode: HtmlElement,
    private readonly command: BindingCommandExecutable,
    private readonly bindable: TemplateBindableReference | null,
    private readonly host: RuntimeTemplateCompilerSpreadCompileHost,
  ) {}

  allocateInstruction(
    kind: TemplateInstructionKind,
    _info: BindingCommandBuildInfo,
    local: string,
  ): BindingCommandInstructionAllocation {
    return this.host.allocateInstruction(this.request, this.syntax, kind, local);
  }

  parsePropertyExpression(expression: string, _info: BindingCommandBuildInfo): ProductHandle | null {
    return this.host.publishExpressionParse(this.request, this.syntax, this.targetNode, expression, 'IsProperty', this.command, this.bindable).productHandle;
  }

  parseFunctionExpression(expression: string, _info: BindingCommandBuildInfo): ProductHandle | null {
    return this.host.publishExpressionParse(this.request, this.syntax, this.targetNode, expression, 'IsFunction', this.command, this.bindable).productHandle;
  }

  parseIteratorExpression(expression: string, _info: BindingCommandBuildInfo): BindingCommandIteratorParse {
    const parse = this.host.publishExpressionParse(this.request, this.syntax, this.targetNode, expression, 'IsIterator', this.command, this.bindable);
    return new BindingCommandIteratorParse(parse.productHandle, [], null);
  }

  parseAttributeSyntax(_rawName: string, _rawValue: string, _info: BindingCommandBuildInfo): BindingCommandTailSyntax | null {
    return null;
  }

  mapAttribute(_node: HtmlNodeReference, attr: string): string | null {
    return this.world.attributeMapper.map(this.targetNode, attr);
  }

  isTwoWay(_node: HtmlNodeReference, attr: string): boolean {
    return this.world.attributeMapper.isTwoWay(this.targetNode, attr);
  }
}
