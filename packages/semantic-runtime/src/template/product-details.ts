import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  AttributeClassification,
  AttributeParserMachine,
  AttributeParserService,
  AttributeSyntax,
  AttributePatternExecutable,
  CompiledAttributePattern,
} from './attribute-syntax.js';
import type {
  BindingCommandBuildInput,
  BindingCommandExecutable,
  BindingCommandLowering,
  BindingCommandResolverService,
  MultiBindingLowering,
  MultiBindingSegment,
} from './binding-command-execution.js';
import type {
  BuiltInSyntaxCatalog,
  ConfiguredBuiltInSyntaxCatalogSelection,
} from './built-in-syntax.js';
import type {
  TemplateAttributeMapperService,
  TemplateCompilerService,
  TemplateCompilerWorld,
  TemplateExpressionParserService,
  TemplateRenderingService,
  TemplateResourceResolverService,
  TemplateResourceScope,
} from './compiler-world.js';
import type {
  CompiledTemplate,
  TemplateRenderTarget,
} from './compiled-template.js';
import type {
  TemplateCompilationContext,
  TemplateCompilationUnit,
  TemplateSource,
} from './compilation-unit.js';
import type {
  HtmlAttribute,
  HtmlDocument,
  HtmlIrNode,
} from './html-ir.js';
import type {
  TemplateInstruction,
  TemplateInstructionSequence,
} from './instruction-ir.js';
import type { TemplateParseContext } from './parse-context.js';
import type {
  RuntimeBinding,
  RuntimeBindingScopeEffect,
} from './runtime-binding.js';
import type {
  BuiltInRuntimeRendererCatalog,
  ConfiguredBuiltInRuntimeRendererCatalogSelection,
  RuntimeRenderer,
} from './runtime-renderer.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from './value-site.js';

/**
 * Typed detail slots for template/compiler products.
 *
 * These slots intentionally mirror the product-kind vocabulary and auLink-shaped runtime models. They let inquiry and
 * Atlas and tooling hydrate rich in-memory products from handles without putting generic payloads back into kernel records.
 */
export const TemplateProductDetails = {
  Source: defineProductDetailSlot<TemplateSource>(
    KernelVocabulary.Template.Source.key,
    'template.source',
    'Authored template source detail before HTML parsing.',
  ),
  ParseContext: defineProductDetailSlot<TemplateParseContext>(
    KernelVocabulary.Template.ParseContext.key,
    'template.parse-context',
    'Inquiry pressure detail shared by parser and lowering passes.',
  ),
  CompilationUnit: defineProductDetailSlot<TemplateCompilationUnit>(
    KernelVocabulary.Compiler.CompilationUnit.key,
    'compiler.compilation-unit',
    'Compiler-front-door request detail for one authored template source.',
  ),
  CompilationContext: defineProductDetailSlot<TemplateCompilationContext>(
    KernelVocabulary.Compiler.CompilationContext.key,
    'compiler.compilation-context',
    'Runtime-shaped compilation context frame detail.',
  ),
  World: defineProductDetailSlot<TemplateCompilerWorld>(
    KernelVocabulary.Compiler.World.key,
    'compiler.world',
    'Container-scoped compiler world detail.',
  ),
  ResourceScope: defineProductDetailSlot<TemplateResourceScope>(
    KernelVocabulary.Compiler.ResourceScope.key,
    'compiler.resource-scope',
    'Compiler-visible resource and syntax-resource scope detail.',
  ),
  TemplateCompilerService: defineProductDetailSlot<TemplateCompilerService>(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.template-compiler',
    'TemplateCompiler service detail visible through a compiler world.',
  ),
  ResourceResolverService: defineProductDetailSlot<TemplateResourceResolverService>(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.resource-resolver',
    'ResourceResolver service detail visible through a compiler world.',
  ),
  ExpressionParserService: defineProductDetailSlot<TemplateExpressionParserService>(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.expression-parser',
    'Expression parser service detail visible through a compiler world.',
  ),
  AttributeMapperService: defineProductDetailSlot<TemplateAttributeMapperService>(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.attribute-mapper',
    'Attribute mapper service detail visible through a compiler world.',
  ),
  RenderingService: defineProductDetailSlot<TemplateRenderingService>(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.rendering',
    'Runtime Rendering service detail visible through a compiler world.',
  ),
  AttributeParserService: defineProductDetailSlot<AttributeParserService>(
    KernelVocabulary.Compiler.AttributeParser.key,
    'compiler.attribute-parser',
    'Runtime-shaped IAttributeParser service detail.',
  ),
  AttributeParserMachine: defineProductDetailSlot<AttributeParserMachine>(
    KernelVocabulary.Compiler.AttributeParserMachine.key,
    'compiler.attribute-parser-machine',
    'Runtime-shaped SyntaxInterpreter machine detail.',
  ),
  BindingCommandResolver: defineProductDetailSlot<BindingCommandResolverService>(
    KernelVocabulary.Compiler.BindingCommandResolver.key,
    'compiler.binding-command-resolver',
    'Runtime-shaped IBindingCommandResolver service detail.',
  ),
  BuiltInSyntaxCatalog: defineProductDetailSlot<BuiltInSyntaxCatalog>(
    KernelVocabulary.Compiler.BuiltInSyntaxCatalog.key,
    'compiler.built-in-syntax-catalog',
    'Built-in syntax catalog detail.',
  ),
  ConfiguredBuiltInSyntaxCatalogSelection: defineProductDetailSlot<ConfiguredBuiltInSyntaxCatalogSelection>(
    KernelVocabulary.Compiler.ConfiguredSyntaxCatalogSelection.key,
    'compiler.configured-syntax-catalog-selection',
    'Configured built-in syntax catalog selection detail.',
  ),
  BuiltInRuntimeRendererCatalog: defineProductDetailSlot<BuiltInRuntimeRendererCatalog>(
    KernelVocabulary.Compiler.BuiltInRuntimeRendererCatalog.key,
    'compiler.built-in-runtime-renderer-catalog',
    'Built-in runtime renderer catalog detail.',
  ),
  ConfiguredBuiltInRuntimeRendererCatalogSelection: defineProductDetailSlot<ConfiguredBuiltInRuntimeRendererCatalogSelection>(
    KernelVocabulary.Compiler.ConfiguredRuntimeRendererCatalogSelection.key,
    'compiler.configured-runtime-renderer-catalog-selection',
    'Configured built-in runtime renderer catalog selection detail.',
  ),
  RuntimeRenderer: defineProductDetailSlot<RuntimeRenderer>(
    KernelVocabulary.Compiler.RuntimeRenderer.key,
    'compiler.runtime-renderer',
    'Runtime IRenderer detail selected by Rendering.',
  ),
  CompiledAttributePattern: defineProductDetailSlot<CompiledAttributePattern>(
    KernelVocabulary.Compiler.CompiledAttributePattern.key,
    'compiler.compiled-attribute-pattern',
    'Compiled attribute-pattern detail used by the attribute parser machine.',
  ),
  AttributePatternExecutable: defineProductDetailSlot<AttributePatternExecutable>(
    KernelVocabulary.Compiler.AttributePatternExecutable.key,
    'compiler.attribute-pattern-executable',
    'Executable attribute-pattern detail.',
  ),
  BindingCommandExecutable: defineProductDetailSlot<BindingCommandExecutable>(
    KernelVocabulary.Compiler.BindingCommandExecutable.key,
    'compiler.binding-command-executable',
    'Executable binding-command detail.',
  ),
  HtmlDocument: defineProductDetailSlot<HtmlDocument>(
    KernelVocabulary.Template.HtmlDocument.key,
    'template.html-document',
    'Authored HTML document detail.',
  ),
  HtmlNode: defineProductDetailSlot<HtmlIrNode>(
    KernelVocabulary.Template.HtmlNode.key,
    'template.html-node',
    'Authored HTML node detail.',
  ),
  HtmlAttribute: defineProductDetailSlot<HtmlAttribute>(
    KernelVocabulary.Template.HtmlAttribute.key,
    'template.html-attribute',
    'Authored HTML attribute detail.',
  ),
  CompiledTemplate: defineProductDetailSlot<CompiledTemplate>(
    KernelVocabulary.Template.CompiledTemplate.key,
    'template.compiled-template',
    'Compiled template detail after compiler DOM pass-through and instruction-row assembly.',
  ),
  RenderTarget: defineProductDetailSlot<TemplateRenderTarget>(
    KernelVocabulary.Template.RenderTarget.key,
    'template.render-target',
    'Runtime render target detail produced by the compiler marker pass.',
  ),
  AttributeSyntax: defineProductDetailSlot<AttributeSyntax>(
    KernelVocabulary.Template.AttributeSyntax.key,
    'template.attribute-syntax',
    'Runtime AttrSyntax detail.',
  ),
  AttributeClassification: defineProductDetailSlot<AttributeClassification>(
    KernelVocabulary.Template.AttributeClassification.key,
    'template.attribute-classification',
    'Attribute classification detail after resource and command lookup.',
  ),
  ValueSite: defineProductDetailSlot<TemplateValueSite>(
    KernelVocabulary.Template.ValueSite.key,
    'template.value-site',
    'Compiler-owned authored value-site detail.',
  ),
  ExpressionParse: defineProductDetailSlot<TemplateExpressionParse>(
    KernelVocabulary.Template.ExpressionParse.key,
    'template.expression-parse',
    'Expression parser publication detail.',
  ),
  BindingCommandBuildInput: defineProductDetailSlot<BindingCommandBuildInput>(
    KernelVocabulary.Compiler.BindingCommandBuildInput.key,
    'compiler.binding-command-build-input',
    'Runtime-shaped ICommandBuildInfo detail.',
  ),
  BindingCommandLowering: defineProductDetailSlot<BindingCommandLowering>(
    KernelVocabulary.Compiler.BindingCommandLowering.key,
    'compiler.binding-command-lowering',
    'Binding-command lowering result detail.',
  ),
  MultiBindingSegment: defineProductDetailSlot<MultiBindingSegment>(
    KernelVocabulary.Compiler.MultiBindingSegment.key,
    'compiler.multi-binding-segment',
    'Inline custom-attribute multi-binding segment detail.',
  ),
  MultiBindingLowering: defineProductDetailSlot<MultiBindingLowering>(
    KernelVocabulary.Compiler.MultiBindingLowering.key,
    'compiler.multi-binding-lowering',
    'Inline custom-attribute multi-binding lowering result detail.',
  ),
  Instruction: defineProductDetailSlot<TemplateInstruction>(
    KernelVocabulary.Instruction.Instruction.key,
    'instruction.instruction',
    'Lowered rendering instruction detail.',
  ),
  InstructionSequence: defineProductDetailSlot<TemplateInstructionSequence>(
    KernelVocabulary.Instruction.Sequence.key,
    'instruction.sequence',
    'Ordered lowered instruction sequence detail.',
  ),
  RuntimeBinding: defineProductDetailSlot<RuntimeBinding>(
    KernelVocabulary.Binding.RuntimeBinding.key,
    'binding.runtime-binding',
    'Runtime binding instance detail emulated from renderer semantics.',
  ),
  RuntimeBindingScopeEffect: defineProductDetailSlot<RuntimeBindingScopeEffect>(
    KernelVocabulary.Binding.ScopeEffect.key,
    'binding.scope-effect',
    'Runtime binding scope-effect detail consumed by template scope construction.',
  ),
} as const;
