import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  AttributeClassification,
  AttributeParserMachine,
  AttributeParserService,
  AttributePatternExecutable,
  AttributeSyntax,
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
import type { TemplateCompilerIssue } from './compiler-issue.js';
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
import type {
  RuntimeBindingBehaviorApplication,
  RuntimeBindingBehaviorIssue,
} from './runtime-binding-behavior.js';
import type { RuntimeBindingIssue } from './runtime-binding-issue.js';
import type { RuntimeBindingScopeIssue } from './runtime-binding-scope-issue.js';
import type {
  CompositionContext,
  CompositionController,
} from './runtime-composition.js';
import type { RuntimeControllerIssue } from './runtime-controller-issue.js';
import type {
  BuiltInRuntimeRendererCatalog,
  ConfiguredBuiltInRuntimeRendererCatalogSelection,
  RuntimeRenderer,
} from './runtime-renderer.js';
import type { RuntimeRendererIssue } from './runtime-renderer-issue.js';
import type {
  RuntimeValueConverterApplication,
  RuntimeValueConverterIssue,
} from './runtime-value-converter.js';
import type { RuntimeWatcher } from './runtime-watcher.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from './value-site.js';

/** Inert identities for template/compiler detail occupancies, safe to import without projector dependencies. */
export const TemplateDetailDescriptors = {
  Source: defineProductDetailDescriptor<
    TemplateSource,
    typeof KernelVocabulary.Template.Source.key
  >(
    KernelVocabulary.Template.Source.key,
    'template.source',
    'Authored template source detail before HTML parsing.',
  ),
  ParseContext: defineProductDetailDescriptor<
    TemplateParseContext,
    typeof KernelVocabulary.Template.ParseContext.key
  >(
    KernelVocabulary.Template.ParseContext.key,
    'template.parse-context',
    'Inquiry pressure detail shared by parser and lowering passes.',
  ),
  CompilationUnit: defineProductDetailDescriptor<
    TemplateCompilationUnit,
    typeof KernelVocabulary.Compiler.CompilationUnit.key
  >(
    KernelVocabulary.Compiler.CompilationUnit.key,
    'compiler.compilation-unit',
    'Compiler-front-door request detail for one authored template source.',
  ),
  CompilationContext: defineProductDetailDescriptor<
    TemplateCompilationContext,
    typeof KernelVocabulary.Compiler.CompilationContext.key
  >(
    KernelVocabulary.Compiler.CompilationContext.key,
    'compiler.compilation-context',
    'Runtime-shaped compilation context frame detail.',
  ),
  World: defineProductDetailDescriptor<
    TemplateCompilerWorld,
    typeof KernelVocabulary.Compiler.World.key
  >(
    KernelVocabulary.Compiler.World.key,
    'compiler.world',
    'Container-scoped compiler world detail.',
  ),
  ResourceScope: defineProductDetailDescriptor<
    TemplateResourceScope,
    typeof KernelVocabulary.Compiler.ResourceScope.key
  >(
    KernelVocabulary.Compiler.ResourceScope.key,
    'compiler.resource-scope',
    'Compiler-visible resource and syntax-resource scope detail.',
  ),
  TemplateCompilerService: defineProductDetailDescriptor<
    TemplateCompilerService,
    typeof KernelVocabulary.Compiler.Service.key
  >(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.template-compiler',
    'TemplateCompiler service detail visible through a compiler world.',
  ),
  ResourceResolverService: defineProductDetailDescriptor<
    TemplateResourceResolverService,
    typeof KernelVocabulary.Compiler.Service.key
  >(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.resource-resolver',
    'ResourceResolver service detail visible through a compiler world.',
  ),
  ExpressionParserService: defineProductDetailDescriptor<
    TemplateExpressionParserService,
    typeof KernelVocabulary.Compiler.Service.key
  >(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.expression-parser',
    'Expression parser service detail visible through a compiler world.',
  ),
  AttributeMapperService: defineProductDetailDescriptor<
    TemplateAttributeMapperService,
    typeof KernelVocabulary.Compiler.Service.key
  >(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.attribute-mapper',
    'Attribute mapper service detail visible through a compiler world.',
  ),
  RenderingService: defineProductDetailDescriptor<
    TemplateRenderingService,
    typeof KernelVocabulary.Compiler.Service.key
  >(
    KernelVocabulary.Compiler.Service.key,
    'compiler.service.rendering',
    'Runtime Rendering service detail visible through a compiler world.',
  ),
  AttributeParserService: defineProductDetailDescriptor<
    AttributeParserService,
    typeof KernelVocabulary.Compiler.AttributeParser.key
  >(
    KernelVocabulary.Compiler.AttributeParser.key,
    'compiler.attribute-parser',
    'Runtime-shaped IAttributeParser service detail.',
  ),
  AttributeParserMachine: defineProductDetailDescriptor<
    AttributeParserMachine,
    typeof KernelVocabulary.Compiler.AttributeParserMachine.key
  >(
    KernelVocabulary.Compiler.AttributeParserMachine.key,
    'compiler.attribute-parser-machine',
    'Runtime-shaped SyntaxInterpreter machine detail.',
  ),
  BindingCommandResolver: defineProductDetailDescriptor<
    BindingCommandResolverService,
    typeof KernelVocabulary.Compiler.BindingCommandResolver.key
  >(
    KernelVocabulary.Compiler.BindingCommandResolver.key,
    'compiler.binding-command-resolver',
    'Runtime-shaped IBindingCommandResolver service detail.',
  ),
  BuiltInSyntaxCatalog: defineProductDetailDescriptor<
    BuiltInSyntaxCatalog,
    typeof KernelVocabulary.Compiler.BuiltInSyntaxCatalog.key
  >(
    KernelVocabulary.Compiler.BuiltInSyntaxCatalog.key,
    'compiler.built-in-syntax-catalog',
    'Built-in syntax catalog detail.',
  ),
  ConfiguredBuiltInSyntaxCatalogSelection: defineProductDetailDescriptor<
    ConfiguredBuiltInSyntaxCatalogSelection,
    typeof KernelVocabulary.Compiler.ConfiguredSyntaxCatalogSelection.key
  >(
    KernelVocabulary.Compiler.ConfiguredSyntaxCatalogSelection.key,
    'compiler.configured-syntax-catalog-selection',
    'Configured built-in syntax catalog selection detail.',
  ),
  BuiltInRuntimeRendererCatalog: defineProductDetailDescriptor<
    BuiltInRuntimeRendererCatalog,
    typeof KernelVocabulary.Compiler.BuiltInRuntimeRendererCatalog.key
  >(
    KernelVocabulary.Compiler.BuiltInRuntimeRendererCatalog.key,
    'compiler.built-in-runtime-renderer-catalog',
    'Built-in runtime renderer catalog detail.',
  ),
  ConfiguredBuiltInRuntimeRendererCatalogSelection: defineProductDetailDescriptor<
    ConfiguredBuiltInRuntimeRendererCatalogSelection,
    typeof KernelVocabulary.Compiler.ConfiguredRuntimeRendererCatalogSelection.key
  >(
    KernelVocabulary.Compiler.ConfiguredRuntimeRendererCatalogSelection.key,
    'compiler.configured-runtime-renderer-catalog-selection',
    'Configured built-in runtime renderer catalog selection detail.',
  ),
  RuntimeRenderer: defineProductDetailDescriptor<
    RuntimeRenderer,
    typeof KernelVocabulary.Compiler.RuntimeRenderer.key
  >(
    KernelVocabulary.Compiler.RuntimeRenderer.key,
    'compiler.runtime-renderer',
    'Runtime IRenderer detail selected by Rendering.',
  ),
  RuntimeRendererIssue: defineProductDetailDescriptor<
    RuntimeRendererIssue,
    typeof KernelVocabulary.Compiler.RuntimeRendererIssue.key
  >(
    KernelVocabulary.Compiler.RuntimeRendererIssue.key,
    'compiler.runtime-renderer-issue',
    'Framework-runtime issue discovered while a runtime IRenderer spends a lowered instruction.',
  ),
  CompiledAttributePattern: defineProductDetailDescriptor<
    CompiledAttributePattern,
    typeof KernelVocabulary.Compiler.CompiledAttributePattern.key
  >(
    KernelVocabulary.Compiler.CompiledAttributePattern.key,
    'compiler.compiled-attribute-pattern',
    'Compiled attribute-pattern detail used by the attribute parser machine.',
  ),
  AttributePatternExecutable: defineProductDetailDescriptor<
    AttributePatternExecutable,
    typeof KernelVocabulary.Compiler.AttributePatternExecutable.key
  >(
    KernelVocabulary.Compiler.AttributePatternExecutable.key,
    'compiler.attribute-pattern-executable',
    'Executable attribute-pattern detail.',
  ),
  BindingCommandExecutable: defineProductDetailDescriptor<
    BindingCommandExecutable,
    typeof KernelVocabulary.Compiler.BindingCommandExecutable.key
  >(
    KernelVocabulary.Compiler.BindingCommandExecutable.key,
    'compiler.binding-command-executable',
    'Executable binding-command detail.',
  ),
  HtmlDocument: defineProductDetailDescriptor<
    HtmlDocument,
    typeof KernelVocabulary.Template.HtmlDocument.key
  >(
    KernelVocabulary.Template.HtmlDocument.key,
    'template.html-document',
    'Authored HTML document detail.',
  ),
  HtmlNode: defineProductDetailDescriptor<
    HtmlIrNode,
    typeof KernelVocabulary.Template.HtmlNode.key
  >(
    KernelVocabulary.Template.HtmlNode.key,
    'template.html-node',
    'Authored HTML node detail.',
  ),
  HtmlAttribute: defineProductDetailDescriptor<
    HtmlAttribute,
    typeof KernelVocabulary.Template.HtmlAttribute.key
  >(
    KernelVocabulary.Template.HtmlAttribute.key,
    'template.html-attribute',
    'Authored HTML attribute detail.',
  ),
  CompiledTemplate: defineProductDetailDescriptor<
    CompiledTemplate,
    typeof KernelVocabulary.Template.CompiledTemplate.key
  >(
    KernelVocabulary.Template.CompiledTemplate.key,
    'template.compiled-template',
    'Compiled template detail after compiler DOM pass-through and instruction-row assembly.',
  ),
  RenderTarget: defineProductDetailDescriptor<
    TemplateRenderTarget,
    typeof KernelVocabulary.Template.RenderTarget.key
  >(
    KernelVocabulary.Template.RenderTarget.key,
    'template.render-target',
    'Runtime render target detail produced by the compiler marker pass.',
  ),
  AttributeSyntax: defineProductDetailDescriptor<
    AttributeSyntax,
    typeof KernelVocabulary.Template.AttributeSyntax.key
  >(
    KernelVocabulary.Template.AttributeSyntax.key,
    'template.attribute-syntax',
    'Runtime AttrSyntax detail.',
  ),
  AttributeClassification: defineProductDetailDescriptor<
    AttributeClassification,
    typeof KernelVocabulary.Template.AttributeClassification.key
  >(
    KernelVocabulary.Template.AttributeClassification.key,
    'template.attribute-classification',
    'Attribute classification detail after resource and command lookup.',
  ),
  ValueSite: defineProductDetailDescriptor<
    TemplateValueSite,
    typeof KernelVocabulary.Template.ValueSite.key
  >(
    KernelVocabulary.Template.ValueSite.key,
    'template.value-site',
    'Compiler-owned authored value-site detail.',
  ),
  ExpressionParse: defineProductDetailDescriptor<
    TemplateExpressionParse,
    typeof KernelVocabulary.Template.ExpressionParse.key
  >(
    KernelVocabulary.Template.ExpressionParse.key,
    'template.expression-parse',
    'Expression parser publication detail.',
  ),
  BindingCommandBuildInput: defineProductDetailDescriptor<
    BindingCommandBuildInput,
    typeof KernelVocabulary.Compiler.BindingCommandBuildInput.key
  >(
    KernelVocabulary.Compiler.BindingCommandBuildInput.key,
    'compiler.binding-command-build-input',
    'Runtime-shaped ICommandBuildInfo detail.',
  ),
  BindingCommandLowering: defineProductDetailDescriptor<
    BindingCommandLowering,
    typeof KernelVocabulary.Compiler.BindingCommandLowering.key
  >(
    KernelVocabulary.Compiler.BindingCommandLowering.key,
    'compiler.binding-command-lowering',
    'Binding-command lowering result detail.',
  ),
  CompilerIssue: defineProductDetailDescriptor<
    TemplateCompilerIssue,
    typeof KernelVocabulary.Compiler.Issue.key
  >(
    KernelVocabulary.Compiler.Issue.key,
    'compiler.issue',
    'Source-backed template-compiler issue detail.',
  ),
  MultiBindingSegment: defineProductDetailDescriptor<
    MultiBindingSegment,
    typeof KernelVocabulary.Compiler.MultiBindingSegment.key
  >(
    KernelVocabulary.Compiler.MultiBindingSegment.key,
    'compiler.multi-binding-segment',
    'Inline custom-attribute multi-binding segment detail.',
  ),
  MultiBindingLowering: defineProductDetailDescriptor<
    MultiBindingLowering,
    typeof KernelVocabulary.Compiler.MultiBindingLowering.key
  >(
    KernelVocabulary.Compiler.MultiBindingLowering.key,
    'compiler.multi-binding-lowering',
    'Inline custom-attribute multi-binding lowering result detail.',
  ),
  Instruction: defineProductDetailDescriptor<
    TemplateInstruction,
    typeof KernelVocabulary.Instruction.Instruction.key
  >(
    KernelVocabulary.Instruction.Instruction.key,
    'instruction.instruction',
    'Lowered rendering instruction detail.',
  ),
  InstructionSequence: defineProductDetailDescriptor<
    TemplateInstructionSequence,
    typeof KernelVocabulary.Instruction.Sequence.key
  >(
    KernelVocabulary.Instruction.Sequence.key,
    'instruction.sequence',
    'Ordered lowered instruction sequence detail.',
  ),
  RuntimeBinding: defineProductDetailDescriptor<
    RuntimeBinding,
    typeof KernelVocabulary.Binding.RuntimeBinding.key
  >(
    KernelVocabulary.Binding.RuntimeBinding.key,
    'binding.runtime-binding',
    'Runtime binding instance detail emulated from renderer semantics.',
  ),
  RuntimeWatcher: defineProductDetailDescriptor<
    RuntimeWatcher,
    typeof KernelVocabulary.Binding.RuntimeWatcher.key
  >(
    KernelVocabulary.Binding.RuntimeWatcher.key,
    'binding.runtime-watcher',
    'Controller-owned ComputedWatcher or ExpressionWatcher detail created from resource watch metadata.',
  ),
  RuntimeBindingIssue: defineProductDetailDescriptor<
    RuntimeBindingIssue,
    typeof KernelVocabulary.Binding.RuntimeBindingIssue.key
  >(
    KernelVocabulary.Binding.RuntimeBindingIssue.key,
    'binding.runtime-binding-issue',
    'Framework-runtime issue discovered while a modeled runtime binding executes its own lifecycle.',
  ),
  RuntimeBindingBehaviorApplication: defineProductDetailDescriptor<
    RuntimeBindingBehaviorApplication,
    typeof KernelVocabulary.Binding.BehaviorApplication.key
  >(
    KernelVocabulary.Binding.BehaviorApplication.key,
    'binding.behavior-application',
    'Runtime binding-behavior application detail over a rendered binding and bind-time target facts.',
  ),
  RuntimeBindingBehaviorIssue: defineProductDetailDescriptor<
    RuntimeBindingBehaviorIssue,
    typeof KernelVocabulary.Binding.BehaviorIssue.key
  >(
    KernelVocabulary.Binding.BehaviorIssue.key,
    'binding.behavior-issue',
    'Framework-runtime issue discovered while applying a binding behavior.',
  ),
  RuntimeValueConverterApplication: defineProductDetailDescriptor<
    RuntimeValueConverterApplication,
    typeof KernelVocabulary.Binding.ValueConverterApplication.key
  >(
    KernelVocabulary.Binding.ValueConverterApplication.key,
    'binding.value-converter-application',
    'Runtime value-converter application detail over a rendered binding expression.',
  ),
  RuntimeValueConverterIssue: defineProductDetailDescriptor<
    RuntimeValueConverterIssue,
    typeof KernelVocabulary.Binding.ValueConverterIssue.key
  >(
    KernelVocabulary.Binding.ValueConverterIssue.key,
    'binding.value-converter-issue',
    'Framework-runtime issue discovered while invoking a value converter.',
  ),
  RuntimeBindingScopeEffect: defineProductDetailDescriptor<
    RuntimeBindingScopeEffect,
    typeof KernelVocabulary.Binding.ScopeEffect.key
  >(
    KernelVocabulary.Binding.ScopeEffect.key,
    'binding.scope-effect',
    'Runtime binding scope-effect detail consumed by template scope construction.',
  ),
  RuntimeBindingScopeIssue: defineProductDetailDescriptor<
    RuntimeBindingScopeIssue,
    typeof KernelVocabulary.Binding.ScopeIssue.key
  >(
    KernelVocabulary.Binding.ScopeIssue.key,
    'binding.scope-issue',
    'Framework-runtime issue discovered while constructing a runtime binding Scope.',
  ),
  RuntimeControllerIssue: defineProductDetailDescriptor<
    RuntimeControllerIssue,
    typeof KernelVocabulary.Configuration.ControllerIssue.key
  >(
    KernelVocabulary.Configuration.ControllerIssue.key,
    'configuration.controller-issue',
    'Framework-runtime issue discovered while constructing or hydrating a controller.',
  ),
  CompositionContext: defineProductDetailDescriptor<
    CompositionContext,
    typeof KernelVocabulary.Configuration.CompositionContext.key
  >(
    KernelVocabulary.Configuration.CompositionContext.key,
    'configuration.composition-context',
    'Runtime-html AuCompose CompositionContext detail produced from component/template/model inputs.',
  ),
  CompositionController: defineProductDetailDescriptor<
    CompositionController,
    typeof KernelVocabulary.Configuration.CompositionController.key
  >(
    KernelVocabulary.Configuration.CompositionController.key,
    'configuration.composition-controller',
    'Runtime-html AuCompose CompositionController detail with resolved component candidates and model handoff state.',
  ),
  RuntimeBindingTargetAccess: defineProductDetailDescriptor<
    RuntimeBindingTargetAccess,
    typeof KernelVocabulary.Binding.TargetAccess.key
  >(
    KernelVocabulary.Binding.TargetAccess.key,
    'binding.target-access',
    'Runtime binding target-side accessor or observer detail consumed by observation and data-flow emulation.',
  ),
  RuntimeBindingTargetOperation: defineProductDetailDescriptor<
    RuntimeBindingTargetOperation,
    typeof KernelVocabulary.Binding.TargetOperation.key
  >(
    KernelVocabulary.Binding.TargetOperation.key,
    'binding.target-operation',
    'Runtime renderer or binding direct target update operation detail consumed by query, value-channel, and data-flow emulation.',
  ),
  RuntimeBindingSourceOperation: defineProductDetailDescriptor<
    RuntimeBindingSourceOperation,
    typeof KernelVocabulary.Binding.SourceOperation.key
  >(
    KernelVocabulary.Binding.SourceOperation.key,
    'binding.source-operation',
    'Runtime binding source-side update detail consumed by value-channel and data-flow emulation.',
  ),
} as const;
