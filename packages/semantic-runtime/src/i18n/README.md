# I18n Substrate

This folder owns semantic-runtime products for Aurelia i18n concepts that need to be queryable above configuration and
template syntax.

## Current Shape

`translation-catalog-materialization.ts` reads static `I18nConfiguration` `initOptions.resources` contributions after
configuration recognition, including direct `customize(...)` assignments such as
`options.initOptions = { resources: ... }` and `options.initOptions.resources = ...`. When the static evaluator can close the resource object, nested resource entries become
`I18nTranslationKey` products with locale, namespace, key, source address, identity, provenance, and a typed product
detail slot. `translation-key-product-records.ts` owns the kernel record envelope for those products so catalog
discovery stays separate from identity/provenance/materialization emission.

The first catalog consumers are the public `I18nTranslationKeys` app query, authoring verification, and template
authoring completion for the i18n `t` binding command. Completion receives translation key product handles from the
app-world emission and offers `i18n-translation-key` candidates for static `t="..."` values. The query projects compact
rows with project key, locale, namespace, key, source kind, and optional handles; authoring expected effects can use the
same rows to verify plugin-registration recipes without comparing generated source text. This is a product lane, not a
template answer special case: future hover, definition, diagnostics, rename, or translation coverage inquiries should
read the same key products.

`translation-binding-groups.ts` is the shared positive/negative rendering primitive for i18n `TranslationBinding`
lifecycles. It groups rendered `TranslationBinding` products by the same target element to mirror i18n's
`_getBinding(...)` handoff, where `t-params.bind` mutates the target element's translation binding through
`useParameter(...)`. `key-evaluation-result.ts` mirrors the framework `I18nKeyEvaluationResult` parser and
`TranslationBinding._preprocessAttributes(...)` target-defaulting step for static key expressions, including
semicolon-separated segments, `[title]key` attribute targets, `[text]`/`[html]` aliases, and the default
`textContent`/`img.src` target. `api.I18nTranslationBindings` exposes those groups as row facts with the rendered
element tag, static/dynamic key shape, normalized target properties and target kinds, parameter presence, and lifecycle
issue count; authoring verification uses the same rows through `i18n-translation-binding` expected effects.

`translation-binding-issues.ts` owns the framework-grounded `TranslationBinding.create/bind` diagnostic lane. It consumes
the shared groups after runtime rendering and template-scope construction, then emits runtime binding issues for missing
translation keys (`AUR4000`), duplicate parameter binding (`AUR4001`), and non-string dynamic key expressions
(`AUR4002`). Keep this in the i18n folder: the failure boundary is the i18n runtime binding lifecycle, while the API
consumes the resulting `RuntimeBindingIssue` products through the shared template diagnostic lane.

## Boundaries

- I18n syntax visibility remains in `template/built-in-syntax-catalog-materializer.ts`, because translation attribute
  aliases change the compiler syntax catalog.
- Translation-key catalog materialization belongs here, because it is configuration-owned data that later template
  inquiries and authoring verification consume.
- Top-level `I18nConfiguration` option shape belongs to `configuration/configuration-option-shape-issues.ts`. Do not
  make the catalog accept invalid shortcuts such as top-level `resources`; the framework places translation resources
  under `initOptions.resources`.
- Translation-binding lifecycle products and diagnostics belong here, but only after renderer output has established
  the target element and parameter/key bindings that Aurelia would join through `TranslationBinding.useParameter(...)`.
- Dynamic loaders, backend plugins, and runtime language switching should remain open seams until a framework-grounded
  product exists for them.
- Imported JSON resource modules use the evaluator's asset-module source-span helper, so key products can point back to
  authored JSON property spans instead of the generated `export default ...` wrapper. HTML/CSS asset string mappings
  remain out of scope for this folder.
