import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  i18nTranslationBindingGroupProductHandles,
  i18nTranslationBindingGroups,
  type I18nTranslationBindingGroup,
} from '../i18n/translation-binding-groups.js';
import {
  i18nKeyEvaluationResults,
  i18nTranslationTargetsForKeyEvaluation,
} from '../i18n/key-evaluation-result.js';
import type { KernelStore } from '../kernel/store.js';
import {
  type ProductHandle,
} from '../kernel/handles.js';
import { uniqueStrings } from '../kernel/collections.js';
import {
  HtmlElement,
} from '../template/html-ir.js';
import {
  TemplateProductDetails,
} from '../template/product-details.js';
import {
  TranslationBinding,
} from '../template/runtime-binding.js';
import type {
  SemanticI18nTranslationBindingRow,
  SemanticI18nTranslationBindingTargetRow,
  SemanticI18nTranslationKeyRow,
} from './contracts.js';
import { describeAddress } from './source-reference.js';

/** Project static i18n translation-key products into stable API rows. */
export function readI18nTranslationKeyRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticI18nTranslationKeyRow[] {
  return emission.i18n.readTranslationKeys()
    .map((translationKey): SemanticI18nTranslationKeyRow => ({
      projectKey: emission.project.projectKey,
      key: translationKey.key,
      locale: translationKey.locale,
      namespace: translationKey.namespace,
      source: describeAddress(store, translationKey.sourceAddressHandle),
      ...(handles ? {
        handles: {
          productHandle: translationKey.productHandle,
          identityHandle: translationKey.identityHandle,
          sourceAddressHandle: translationKey.sourceAddressHandle,
        },
      } : {}),
    }))
    .sort((left, right) =>
      `${left.locale ?? ''}:${left.namespace ?? ''}:${left.key}:${left.source?.label ?? ''}`
        .localeCompare(`${right.locale ?? ''}:${right.namespace ?? ''}:${right.key}:${right.source?.label ?? ''}`)
    );
}

/** Project rendered i18n TranslationBinding target groups into stable API rows. */
export function readI18nTranslationBindingRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticI18nTranslationBindingRow[] {
  return i18nProjectionResources(emission)
    .flatMap((resource): readonly SemanticI18nTranslationBindingRow[] =>
      i18nTranslationBindingGroups(resource.runtimeAnalysis.runtimeRendering).map((group): SemanticI18nTranslationBindingRow => {
        const keyBinding = effectiveKeyBinding(group);
        const firstBinding = keyBinding ?? group.firstBinding;
        const tagName = targetElementTagName(store, firstBinding.node.productHandle);
        const staticTargets = staticI18nTranslationTargets(keyBinding, tagName);
        const staticKeys = staticTargets.map((target) => target.key);
        const targetProperties = uniqueStrings(staticTargets.flatMap((target) => target.targetProperties));
        const targetKinds = uniqueStrings(staticTargets.flatMap((target) => target.targetKinds));
        const issues = group.bindings.flatMap((binding) =>
          resource.runtimeAnalysis.i18nTranslationBinding.readIssuesForBinding(binding.productHandle)
        );
        const keyExpressionKind = keyBinding == null
          ? 'none'
          : keyBinding.rawExpression != null
            ? 'static'
            : keyBinding.expressionProductHandle != null
              ? 'binding-expression'
              : 'missing-expression';
        return {
          projectKey: emission.project.projectKey,
          definitionName: resource.compilation.definition.name,
          bindingCount: group.bindings.length,
          keyBindingCount: group.keyBindings.length,
          parameterBindingCount: group.parameterBindings.length,
          targetProperty: targetProperties[0] ?? firstBinding.target,
          targetProperties,
          targetKinds,
          targetElementTagName: tagName,
          keyExpressionKind,
          staticKeyExpression: keyBinding?.rawExpression ?? null,
          staticKey: staticKeys[0] ?? keyBinding?.rawExpression ?? null,
          staticKeys,
          staticTargets,
          hasParameterBinding: group.parameterBindings.length > 0,
          issueCount: issues.length,
          frameworkErrorCodes: issues.flatMap((issue) =>
            issue.frameworkErrorCode == null ? [] : [String(issue.frameworkErrorCode)]
          ),
          source: describeAddress(store, firstBinding.sourceAddressHandle),
          ...(handles ? {
            handles: {
              bindingProductHandles: i18nTranslationBindingGroupProductHandles(group),
              firstBindingProductHandle: firstBinding.productHandle,
              firstBindingIdentityHandle: firstBinding.identityHandle,
              sourceAddressHandle: firstBinding.sourceAddressHandle,
            },
          } : {}),
        };
      })
    )
    .sort((left, right) =>
      `${left.definitionName}:${left.staticKey ?? ''}:${left.parameterBindingCount}:${left.source?.label ?? ''}`
        .localeCompare(`${right.definitionName}:${right.staticKey ?? ''}:${right.parameterBindingCount}:${right.source?.label ?? ''}`)
    );
}

function effectiveKeyBinding(group: I18nTranslationBindingGroup): TranslationBinding | null {
  return group.keyBindings[group.keyBindings.length - 1] ?? null;
}

function staticI18nTranslationTargets(
  binding: TranslationBinding | null,
  tagName: string | null,
): readonly SemanticI18nTranslationBindingTargetRow[] {
  if (binding?.rawExpression == null) {
    return [];
  }
  return i18nKeyEvaluationResults(binding.rawExpression).map((evaluation) => {
    const targets = i18nTranslationTargetsForKeyEvaluation(evaluation, tagName);
    return {
      key: evaluation.key,
      attributes: evaluation.attributes,
      targetProperties: targets.map((target) => target.property),
      targetKinds: targets.map((target) => target.targetKind),
    };
  });
}

function i18nProjectionResources(
  emission: AureliaAppWorldProjectEmission,
) {
  return [
    ...emission.templates.resources,
    ...emission.templates.authoringResources,
  ];
}

function targetElementTagName(store: KernelStore, productHandle: ProductHandle | null): string | null {
  if (productHandle == null) {
    return null;
  }
  const node = store.productDetails.read(TemplateProductDetails.HtmlNode, productHandle);
  return node instanceof HtmlElement ? node.tagName : null;
}
