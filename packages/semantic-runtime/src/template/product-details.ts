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
  TemplateCompilerIssue,
} from './compiler-issue.js';
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
  RuntimeBindingSourceOperation,
  RuntimeBindingTargetAccess,
  RuntimeBindingTargetOperation,
} from './runtime-binding.js';
import type { RuntimeWatcher } from './runtime-watcher.js';
import type {
  RuntimeBindingIssue as RuntimeBindingIssueProduct,
} from './runtime-binding-issue.js';
import type {
  RuntimeBindingBehaviorApplication as RuntimeBindingBehaviorApplicationProduct,
  RuntimeBindingBehaviorIssue as RuntimeBindingBehaviorIssueProduct,
} from './runtime-binding-behavior.js';
import type {
  RuntimeValueConverterApplication as RuntimeValueConverterApplicationProduct,
  RuntimeValueConverterIssue as RuntimeValueConverterIssueProduct,
} from './runtime-value-converter.js';
import type {
  RuntimeBindingScopeIssue as RuntimeBindingScopeIssueProduct,
} from './runtime-binding-scope-issue.js';
import type { RuntimeControllerIssue } from './runtime-controller-issue.js';
import type {
  CompositionContext,
  CompositionController,
} from './runtime-composition.js';
import type {
  BuiltInRuntimeRendererCatalog,
  ConfiguredBuiltInRuntimeRendererCatalogSelection,
  RuntimeRenderer,
} from './runtime-renderer.js';
import type { RuntimeRendererIssue } from './runtime-renderer-issue.js';
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
  RuntimeRendererIssue: defineProductDetailSlot<RuntimeRendererIssue>(
    KernelVocabulary.Compiler.RuntimeRendererIssue.key,
    'compiler.runtime-renderer-issue',
    'Framework-runtime issue discovered while a runtime IRenderer spends a lowered instruction.',
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
  CompilerIssue: defineProductDetailSlot<TemplateCompilerIssue>(
    KernelVocabulary.Compiler.Issue.key,
    'compiler.issue',
    'Source-backed template-compiler issue detail.',
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
  RuntimeWatcher: defineProductDetailSlot<RuntimeWatcher>(
    KernelVocabulary.Binding.RuntimeWatcher.key,
    'binding.runtime-watcher',
    'Controller-owned ComputedWatcher or ExpressionWatcher detail created from resource watch metadata.',
  ),
  RuntimeBindingIssue: defineProductDetailSlot<RuntimeBindingIssueProduct>(
    KernelVocabulary.Binding.RuntimeBindingIssue.key,
    'binding.runtime-binding-issue',
    'Framework-runtime issue discovered while a modeled runtime binding executes its own lifecycle.',
  ),
  RuntimeBindingBehaviorApplication: defineProductDetailSlot<RuntimeBindingBehaviorApplicationProduct>(
    KernelVocabulary.Binding.BehaviorApplication.key,
    'binding.behavior-application',
    'Runtime binding-behavior application detail over a rendered binding and bind-time target facts.',
  ),
  RuntimeBindingBehaviorIssue: defineProductDetailSlot<RuntimeBindingBehaviorIssueProduct>(
    KernelVocabulary.Binding.BehaviorIssue.key,
    'binding.behavior-issue',
    'Framework-runtime issue discovered while applying a binding behavior.',
  ),
  RuntimeValueConverterApplication: defineProductDetailSlot<RuntimeValueConverterApplicationProduct>(
    KernelVocabulary.Binding.ValueConverterApplication.key,
    'binding.value-converter-application',
    'Runtime value-converter application detail over a rendered binding expression.',
  ),
  RuntimeValueConverterIssue: defineProductDetailSlot<RuntimeValueConverterIssueProduct>(
    KernelVocabulary.Binding.ValueConverterIssue.key,
    'binding.value-converter-issue',
    'Framework-runtime issue discovered while invoking a value converter.',
  ),
  RuntimeBindingScopeEffect: defineProductDetailSlot<RuntimeBindingScopeEffect>(
    KernelVocabulary.Binding.ScopeEffect.key,
    'binding.scope-effect',
    'Runtime binding scope-effect detail consumed by template scope construction.',
  ),
  RuntimeBindingScopeIssue: defineProductDetailSlot<RuntimeBindingScopeIssueProduct>(
    KernelVocabulary.Binding.ScopeIssue.key,
    'binding.scope-issue',
    'Framework-runtime issue discovered while spending a runtime binding scope effect.',
  ),
  RuntimeControllerIssue: defineProductDetailSlot<RuntimeControllerIssue>(
    KernelVocabulary.Configuration.ControllerIssue.key,
    'configuration.controller-issue',
    'Framework-runtime issue discovered while constructing or hydrating a controller.',
  ),
  CompositionContext: defineProductDetailSlot<CompositionContext>(
    KernelVocabulary.Configuration.CompositionContext.key,
    'configuration.composition-context',
    'Runtime-html AuCompose CompositionContext detail produced from component/template/model inputs.',
  ),
  CompositionController: defineProductDetailSlot<CompositionController>(
    KernelVocabulary.Configuration.CompositionController.key,
    'configuration.composition-controller',
    'Runtime-html AuCompose CompositionController detail with resolved component candidates and model handoff state.',
  ),
  RuntimeBindingTargetAccess: defineProductDetailSlot<RuntimeBindingTargetAccess>(
    KernelVocabulary.Binding.TargetAccess.key,
    'binding.target-access',
    'Runtime binding target-side accessor or observer detail consumed by observation and data-flow emulation.',
  ),
  RuntimeBindingTargetOperation: defineProductDetailSlot<RuntimeBindingTargetOperation>(
    KernelVocabulary.Binding.TargetOperation.key,
    'binding.target-operation',
    'Runtime renderer or binding direct target update operation detail consumed by query, value-channel, and data-flow emulation.',
  ),
  RuntimeBindingSourceOperation: defineProductDetailSlot<RuntimeBindingSourceOperation>(
    KernelVocabulary.Binding.SourceOperation.key,
    'binding.source-operation',
    'Runtime binding source-side update detail consumed by value-channel and data-flow emulation.',
  ),
} as const;
