import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export type I18nTranslationKeyField =
  | 'key'
  | 'locale'
  | 'namespace'
  | 'source';

/** One translation key admitted from statically visible i18n resource data. */
export class I18nTranslationKey {
  constructor(
    /** Product handle for this translation key. */
    readonly productHandle: ProductHandle,
    /** Identity handle for this translation key. */
    readonly identityHandle: IdentityHandle,
    /** Key as authored in templates, without namespace syntax. */
    readonly key: string,
    /** Locale/language bucket that supplied this key, such as `en`. */
    readonly locale: string | null,
    /** I18next namespace bucket that supplied this key, usually `translation`. */
    readonly namespace: string | null,
    /** Source address for the configuration/resource admission that made the key visible. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<I18nTranslationKeyField>[] = [],
  ) {}
}
