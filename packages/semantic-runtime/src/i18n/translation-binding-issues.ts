import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  EvidenceHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  checkerExpressionTypeLocalKey,
} from '../kernel/local-key.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';
import type {
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import type {
  CheckerExpressionTypeWorld,
} from '../type-system/expression-type-world.js';
import {
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import {
  CheckerTypeShapeKind,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  runtimeAcceptedBindingExpressionAstForParse,
} from '../template/expression-parse-projection.js';
import type {
  TemplateResourceScope,
} from '../template/compiler-world.js';
import {
  TemplateProductDetails,
} from '../template/product-details.js';
import {
  TranslationBinding,
} from '../template/runtime-binding.js';
import type {
  RuntimeRenderingEmission,
} from '../template/runtime-rendering-materializer.js';
import {
  RuntimeBindingIssue,
  RuntimeBindingIssueKind,
  RuntimeBindingIssuePhase,
  RuntimeBindingIssuePublisher,
} from '../template/runtime-binding-issue.js';
import type {
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';
import type {
  TemplateExpressionParse,
} from '../template/value-site.js';
import {
  instructionScopeMap,
} from '../observation/runtime-binding-expression.js';
import {
  I18nTranslationBindingFrameworkErrorCode,
} from './framework-error-code.js';

export class I18nTranslationBindingIssueMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly runtimeRendering: RuntimeRenderingEmission,
    readonly scopes: TemplateScopeConstructionEmission,
    readonly resourceScope: TemplateResourceScope | null,
    readonly expressionWorld: CheckerExpressionTypeWorld,
  ) {}
}

export class I18nTranslationBindingIssueEmission {
  private readonly issuesByBinding = new Map<ProductHandle, RuntimeBindingIssue[]>();

  constructor(
    /** Runtime TranslationBinding lifecycle issues projected from Aurelia i18n semantics. */
    readonly issues: readonly RuntimeBindingIssue[],
    /** Kernel records emitted for issue products and their provenance. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const issue of issues) {
      if (issue.binding.productHandle == null) {
        continue;
      }
      let rows = this.issuesByBinding.get(issue.binding.productHandle);
      if (rows === undefined) {
        rows = [];
        this.issuesByBinding.set(issue.binding.productHandle, rows);
      }
      rows.push(issue);
    }
  }

  readIssuesForBinding(productHandle: ProductHandle): readonly RuntimeBindingIssue[] {
    return this.issuesByBinding.get(productHandle) ?? [];
  }
}

class I18nTranslationBindingIssueSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

interface TranslationBindingIssueContext {
  readonly evaluator: CheckerExpressionTypeEvaluator;
  readonly instructionScopes: ReturnType<typeof instructionScopeMap>;
}

/** Materializes i18n TranslationBinding.create/bind framework failures after renderer and scope handoff. */
export class I18nTranslationBindingIssueMaterializer {
  private readonly publisher: RuntimeBindingIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new RuntimeBindingIssuePublisher(store);
  }

  materialize(input: I18nTranslationBindingIssueMaterializationRequest): I18nTranslationBindingIssueEmission {
    const emission = this.recordsForTranslationBindingIssues(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `i18n-translation-binding:${input.localKey}`));
    }
    for (const issue of emission.issues) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingIssue, issue.productHandle, issue);
    }
    return emission;
  }

  private recordsForTranslationBindingIssues(
    input: I18nTranslationBindingIssueMaterializationRequest,
  ): I18nTranslationBindingIssueEmission {
    const source = this.recordsForSource(input.localKey);
    const records: KernelStoreRecord[] = [...source.records];
    const issues: RuntimeBindingIssue[] = [];
    const context: TranslationBindingIssueContext = {
      evaluator: input.expressionWorld.evaluator(input.resourceScope),
      instructionScopes: instructionScopeMap(input.scopes.instructionScopes),
    };

    let groupIndex = 0;
    for (const group of this.translationBindingGroups(input.runtimeRendering)) {
      this.recordIssuesForGroup(
        `${input.localKey}:translation-binding-group:${groupIndex}`,
        group,
        context,
        source,
        records,
        issues,
      );
      groupIndex++;
    }

    return new I18nTranslationBindingIssueEmission(issues, records);
  }

  private recordIssuesForGroup(
    local: string,
    group: readonly TranslationBinding[],
    context: TranslationBindingIssueContext,
    source: I18nTranslationBindingIssueSourceSet,
    records: KernelStoreRecord[],
    issues: RuntimeBindingIssue[],
  ): void {
    const keyBindings = group.filter((binding) => !binding.isParameterContext);
    const parameterBindings = group.filter((binding) => binding.isParameterContext);

    parameterBindings.slice(1).forEach((binding, index) => {
      this.recordIssue(
        `${local}:parameter:${index + 1}:already-exists`,
        binding,
        RuntimeBindingIssuePhase.TranslationCreate,
        RuntimeBindingIssueKind.TranslationParameterAlreadyExists,
        'TranslationBinding.useParameter can only attach one t-params binding to the same translated element.',
        I18nTranslationBindingFrameworkErrorCode.TranslationParameterExisted,
        source,
        records,
        issues,
      );
    });

    if (keyBindings.length === 0 && parameterBindings.length > 0) {
      this.recordIssue(
        `${local}:missing-key`,
        parameterBindings[0]!,
        RuntimeBindingIssuePhase.TranslationBind,
        RuntimeBindingIssueKind.TranslationKeyNotFound,
        'TranslationBinding.bind would run with parameters but without a translation-key expression on the same element.',
        I18nTranslationBindingFrameworkErrorCode.TranslationKeyNotFound,
        source,
        records,
        issues,
      );
      return;
    }

    keyBindings.forEach((binding, index) => {
      if (!bindingHasKeyExpression(binding)) {
        this.recordIssue(
          `${local}:key:${index}:missing-ast`,
          binding,
          RuntimeBindingIssuePhase.TranslationBind,
          RuntimeBindingIssueKind.TranslationKeyNotFound,
          'TranslationBinding.bind would run without a translation-key expression AST.',
          I18nTranslationBindingFrameworkErrorCode.TranslationKeyNotFound,
          source,
          records,
          issues,
        );
        return;
      }

      if (this.bindingKeyExpressionDefinitelyNonString(binding, context)) {
        this.recordIssue(
          `${local}:key:${index}:invalid-type`,
          binding,
          RuntimeBindingIssuePhase.TranslationBind,
          RuntimeBindingIssueKind.TranslationKeyInvalid,
          'TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.',
          I18nTranslationBindingFrameworkErrorCode.TranslationKeyInvalid,
          source,
          records,
          issues,
        );
      }
    });
  }

  private bindingKeyExpressionDefinitelyNonString(
    binding: TranslationBinding,
    context: TranslationBindingIssueContext,
  ): boolean {
    const expressionProductHandle = binding.expressionProductHandle;
    if (expressionProductHandle == null) {
      return false;
    }
    const parse = this.readParse(expressionProductHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    const scope = context.instructionScopes.get(binding.instructionProductHandle) ?? null;
    if (ast == null || scope == null) {
      return false;
    }
    const evaluation = context.evaluator.evaluateWithScope(
      ast,
      scope,
      checkerExpressionTypeLocalKey(scope.productHandle, binding.productHandle, expressionProductHandle),
      binding.sourceAddressHandle,
      null,
      { connectable: true, strict: null },
    );
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      && this.typeDefinitelyNotString(evaluation.typeReference);
  }

  private typeDefinitelyNotString(typeReference: CheckerTypeReference): boolean {
    if (typeReference.shapeKind === CheckerTypeShapeKind.Any
      || typeReference.shapeKind === CheckerTypeShapeKind.Unknown) {
      return false;
    }
    const shape = typeReference.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, typeReference.productHandle);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return typeReference.shapeKind === CheckerTypeShapeKind.Primitive
        && typeReference.display != null
        && !stringLikeDisplay(typeReference.display);
    }
    return !carrier.checker.isTypeAssignableTo(carrier.type, carrier.checker.getStringType());
  }

  private translationBindingGroups(
    runtimeRendering: RuntimeRenderingEmission,
  ): readonly (readonly TranslationBinding[])[] {
    const groups = new Map<string, TranslationBinding[]>();
    for (const binding of runtimeRendering.bindings) {
      if (!(binding instanceof TranslationBinding)) {
        continue;
      }
      const renderContext = runtimeRendering.readRenderContextForBinding(binding.productHandle);
      const key = [
        renderContext?.targetController.productHandle ?? 'no-target-controller',
        binding.node.productHandle ?? 'no-node',
      ].join(':');
      let group = groups.get(key);
      if (group === undefined) {
        group = [];
        groups.set(key, group);
      }
      group.push(binding);
    }
    return [...groups.values()];
  }

  private recordIssue(
    local: string,
    binding: TranslationBinding,
    phase: RuntimeBindingIssuePhase,
    issueKind: RuntimeBindingIssueKind,
    message: string,
    frameworkErrorCode: I18nTranslationBindingFrameworkErrorCode,
    source: I18nTranslationBindingIssueSourceSet,
    records: KernelStoreRecord[],
    issues: RuntimeBindingIssue[],
  ): void {
    const publication = this.publisher.publish(
      local,
      binding.toReference(),
      binding.identityHandle,
      source.provenanceHandle,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      binding.sourceAddressHandle,
    );
    records.push(...publication.records);
    issues.push(publication.issue);
  }

  private recordsForSource(local: string): I18nTranslationBindingIssueSourceSet {
    const evidenceHandle = this.store.handles.evidence(`i18n-translation-binding:${local}`);
    const provenanceHandle = this.store.handles.provenance(`i18n-translation-binding:${local}`);
    return new I18nTranslationBindingIssueSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'I18n TranslationBinding.create/bind emulation from rendered i18n bindings and runtime Scope handoff.',
          null,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }

  private readParse(productHandle: ProductHandle): TemplateExpressionParse | null {
    return this.store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
  }
}

function bindingHasKeyExpression(binding: TranslationBinding): boolean {
  return binding.rawExpression != null || binding.expressionProductHandle != null;
}

function stringLikeDisplay(display: string): boolean {
  return display === 'string'
    || display.startsWith('"')
    || display.startsWith("'");
}
