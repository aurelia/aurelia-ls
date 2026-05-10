# I18n Substrate

This folder owns semantic-runtime products for Aurelia i18n concepts that need to be queryable above configuration and
template syntax.

## Current Shape

`translation-catalog-materialization.ts` reads static `I18nConfiguration` `initOptions.resources` contributions after
configuration recognition. When the static evaluator can close the resource object, nested resource entries become
`I18nTranslationKey` products with locale, namespace, key, source address, identity, provenance, and a typed product
detail slot. `translation-key-product-records.ts` owns the kernel record envelope for those products so catalog
discovery stays separate from identity/provenance/materialization emission.

The first consumer is template authoring completion for the i18n `t` binding command. Completion receives translation
key product handles from the app-world emission and offers `i18n-translation-key` candidates for static `t="..."`
values. This is a product lane, not a template answer special case: future hover, definition, diagnostics, rename, or
translation coverage inquiries should read the same key products.

## Boundaries

- I18n syntax visibility remains in `template/built-in-syntax-catalog-materializer.ts`, because translation attribute
  aliases change the compiler syntax catalog.
- Translation-key catalog materialization belongs here, because it is configuration-owned data that later template
  inquiries consume.
- Dynamic loaders, backend plugins, and runtime language switching should remain open seams until a framework-grounded
  product exists for them.
- Imported JSON resource modules use the evaluator's asset-module source-span helper, so key products can point back to
  authored JSON property spans instead of the generated `export default ...` wrapper. HTML/CSS asset string mappings
  remain out of scope for this folder.
