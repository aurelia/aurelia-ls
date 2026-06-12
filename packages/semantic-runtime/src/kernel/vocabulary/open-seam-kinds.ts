import {
  defineVocabulary,
  KernelVocabularyNamespace,
  KernelVocabularySlot,
} from './core.js';

export const KernelOpenSeamKinds = {
  Evaluation: {
    /** Evaluation stopped because recursion protection prevented deeper interpretation. */
    DepthLimit: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'depth-limit',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation stopped because recursion protection prevented deeper interpretation.',
    ),

    /** Evaluation stopped because statement protection prevented more interpretation. */
    StatementLimit: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'statement-limit',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation stopped because statement protection prevented more interpretation.',
    ),

    /** The evaluator reached a statement kind with runtime effects it does not model. */
    UnsupportedStatement: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unsupported-statement',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a statement kind with runtime effects it does not model.',
    ),

    /** The evaluator reached an expression kind with runtime effects it does not model. */
    UnsupportedExpression: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unsupported-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached an expression kind with runtime effects it does not model.',
    ),

    /** A binding pattern could not be represented in the environment record. */
    UnsupportedBindingPattern: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unsupported-binding-pattern',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a binding pattern that is not represented in environment records yet.',
    ),

    /** A referenced identifier was not present in the current environment record. */
    UnresolvedIdentifier: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unresolved-identifier',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation could not resolve an identifier in the current environment record.',
    ),

    /** A module specifier could not be resolved to a source module. */
    UnresolvedModule: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'unresolved-module',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation could not resolve a module specifier to a source module.',
    ),

    /** A call expression was not a known evaluator intrinsic or simple local function. */
    DynamicCall: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-call',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a call expression that should not be guessed.',
    ),

    /** A branch condition could not be reduced without guessing which path executes. */
    DynamicBranch: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-branch',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a branch condition that could not be reduced without guessing.',
    ),

    /** A loop could not be reduced to a known finite set of iterations. */
    DynamicLoop: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-loop',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a loop that could not be reduced to a known finite iteration set.',
    ),

    /** A mutation could not be represented without executing user behavior. */
    DynamicMutation: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-mutation',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a mutation that could not be represented without executing user behavior.',
    ),

    /** A dynamic import or non-literal module edge could not be linked statically. */
    DynamicImport: defineVocabulary(
      KernelVocabularyNamespace.Evaluation,
      'dynamic-import',
      KernelVocabularySlot.OpenSeamKind,
      'Static evaluation reached a dynamic import or non-literal module edge that could not be linked statically.',
    ),
  },
  TypeSystem: {
    /** TypeChecker projection could not close the type or member surface. */
    OpenTypeProjection: defineVocabulary(
      KernelVocabularyNamespace.TypeSystem,
      'open-type-projection',
      KernelVocabularySlot.OpenSeamKind,
      'TypeChecker projection could not close the type or member surface without guessing.',
    ),
  },
  Resource: {
    /** Resource recognition could not close a resource kind from the carrier shape. */
    OpenKindExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-kind-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Resource recognition could not close a resource kind from the carrier shape.',
    ),

    /** Resource recognition could not close a resource name from the carrier shape. */
    OpenNameExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-name-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Resource recognition could not close a resource name from the carrier shape.',
    ),

    /** Resource recognition could not close every alias from the carrier shape. */
    OpenAliasExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-alias-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Resource recognition could not close every alias from the carrier shape.',
    ),

    /** Resource recognition could not close the class, function, or object target from the carrier shape. */
    OpenTargetExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-target-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Resource recognition could not close the class, function, or object target from the carrier shape.',
    ),

    /** Syntax-resource recognition could not close every attribute pattern entry from the carrier shape. */
    OpenPatternExpression: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-pattern-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Syntax-resource recognition could not close every attribute pattern entry from the carrier shape.',
    ),

    /** Resource definition convergence saw metadata fields it cannot safely materialize yet. */
    OpenDefinitionField: defineVocabulary(
      KernelVocabularyNamespace.Resource,
      'open-definition-field',
      KernelVocabularySlot.OpenSeamKind,
      'Resource definition convergence saw metadata fields it cannot safely materialize yet.',
    ),
  },
  Di: {
    /** DI world construction could not spend a registration admission into concrete container effects. */
    OpenRegistrationSpending: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'open-registration-spending',
      KernelVocabularySlot.OpenSeamKind,
      'DI world construction could not spend a registration admission into concrete container effects.',
    ),

    /** DI world construction reached an IRegistry body that has not been interpreted yet. */
    OpenRegistryBody: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'open-registry-body',
      KernelVocabularySlot.OpenSeamKind,
      'DI world construction reached an IRegistry body that has not been interpreted yet.',
    ),

    /** Renderer/controller emulation reached a runtime child container that has not been materialized. */
    OpenChildContainer: defineVocabulary(
      KernelVocabularyNamespace.Di,
      'open-child-container',
      KernelVocabularySlot.OpenSeamKind,
      'Renderer/controller emulation reached a runtime child, attribute, or template-controller container that has not been materialized.',
    ),
  },
  Registration: {
    /** Registration recognition could not close the target key. */
    OpenKeyExpression: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-key-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not close the target key expression.',
    ),

    /** Registration recognition could not close the registered value. */
    OpenValueExpression: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-value-expression',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not close the registered value expression.',
    ),

    /** Registration recognition could not classify the registration strategy. */
    OpenStrategy: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-strategy',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not classify the registration strategy.',
    ),

    /** Registration recognition saw a spread argument or spread member that could not close. */
    OpenSpread: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-spread',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition saw a spread argument or spread member that could not close.',
    ),

    /** Registration recognition could not close the target of an alias registration. */
    OpenAliasTarget: defineVocabulary(
      KernelVocabularyNamespace.Registration,
      'open-alias-target',
      KernelVocabularySlot.OpenSeamKind,
      'Registration recognition could not close the target of an alias registration.',
    ),
  },
  Configuration: {
    /** Configuration recognition could not close the call receiver or target. */
    OpenConfigurationTarget: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'open-configuration-target',
      KernelVocabularySlot.OpenSeamKind,
      'Configuration recognition could not close a call receiver, configuration export, or plugin target.',
    ),

    /** Configuration recognition could not close an option contribution. */
    OpenConfigurationOption: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'open-configuration-option',
      KernelVocabularySlot.OpenSeamKind,
      'Configuration recognition could not close a configuration option path or value.',
    ),

    /** Configuration recognition saw a callback body that must not be executed in this layer. */
    OpenConfigurationCallback: defineVocabulary(
      KernelVocabularyNamespace.Configuration,
      'open-configuration-callback',
      KernelVocabularySlot.OpenSeamKind,
      'Configuration recognition saw a callback whose body must stay available to later evaluation or DI spending.',
    ),

  },
  Framework: {
    /** Source service-root evidence exists, but the semantic runtime cannot promote it to a positive root yet. */
    OpenServiceRootCandidate: defineVocabulary(
      KernelVocabularyNamespace.Framework,
      'open-service-root-candidate',
      KernelVocabularySlot.OpenSeamKind,
      'Source service-root evidence exists, but the semantic runtime cannot promote it to a positive framework service-root product yet.',
    ),
  },
  Router: {
    /** Router instruction materialization could not close a NavigationInstruction or related option without guessing. */
    OpenInstruction: defineVocabulary(
      KernelVocabularyNamespace.Router,
      'open-instruction',
      KernelVocabularySlot.OpenSeamKind,
      'Router instruction materialization could not close a NavigationInstruction, params, context, or href classification without guessing.',
    ),
  },
  Compiler: {
    /** Executable command or pattern body stayed opaque. */
    OpenExecutableBody: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'open-executable-body',
      KernelVocabularySlot.OpenSeamKind,
      'Compiler reached a custom executable body that should be preserved rather than guessed.',
    ),

    /** A custom element processContent hook owns child DOM transformation that tooling has not executed. */
    OpenProcessContentHook: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'open-process-content-hook',
      KernelVocabularySlot.OpenSeamKind,
      'Compiler reached a custom element processContent hook and cannot safely guess the transformed child DOM.',
    ),

    /** Projection, containerless child content, or slot extraction stayed open at compiled-template assembly. */
    OpenContentProjection: defineVocabulary(
      KernelVocabularyNamespace.Compiler,
      'open-content-projection',
      KernelVocabularySlot.OpenSeamKind,
      'Compiler could not close child content projection, containerless content, or slot extraction semantics.',
    ),
  },
  Template: {
  },
  Binding: {
    /** Runtime binding target-side accessor or observer selection stayed open. */
    OpenTargetAccess: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'open-target-access',
      KernelVocabularySlot.OpenSeamKind,
      'Runtime binding target-side accessor or observer selection could not close without guessing.',
    ),

    /** Runtime binding direct target operation selection stayed open. */
    OpenTargetOperation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'open-target-operation',
      KernelVocabularySlot.OpenSeamKind,
      'Runtime binding direct target update operation could not close without guessing.',
    ),

    /** Runtime binding source-side update operation stayed open. */
    OpenSourceOperation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'open-source-operation',
      KernelVocabularySlot.OpenSeamKind,
      'Runtime binding source-side update operation could not close without guessing.',
    ),

    /** Runtime binding observer/accessor value channel stayed open. */
    OpenValueChannel: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'open-value-channel',
      KernelVocabularySlot.OpenSeamKind,
      'Runtime binding observer or accessor value channel could not close without guessing.',
    ),

    /** Runtime binding source/target data-flow stayed open. */
    OpenDataFlow: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'open-data-flow',
      KernelVocabularySlot.OpenSeamKind,
      'Runtime binding source/target data-flow could not close without guessing.',
    ),
  },
  Instruction: {
    OpenInstruction: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'open-instruction',
      KernelVocabularySlot.OpenSeamKind,
      'Template lowering could not close the rendering instruction shape.',
    ),
  },
} as const;
