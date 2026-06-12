import type ts from 'typescript';
import { authoredAssetModuleSpanForNode } from '../evaluation/asset-module.js';
import type { AuthoredSourceTextCache } from '../kernel/authored-source-text.js';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { I18nIdentity } from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { I18nTranslationKey } from './model.js';

export interface I18nTranslationKeyProductSeed {
  readonly key: string;
  readonly locale: string | null;
  readonly namespace: string | null;
  readonly sourceFile: ts.SourceFile;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly sourceNode: ts.Node;
}

export interface I18nTranslationKeyProductEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly key: I18nTranslationKey;
}

interface I18nTranslationKeyProductHandles {
  readonly local: string;
  readonly sourceAddressHandle: AddressHandle;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

export function i18nTranslationKeyProductEmission(
  store: KernelStore,
  projectKey: string,
  seed: I18nTranslationKeyProductSeed,
  index: number,
  sourceTextCache?: AuthoredSourceTextCache,
): I18nTranslationKeyProductEmission {
  const handles = translationKeyProductHandles(store, projectKey, seed, index);
  const key = translationKeyModel(seed, handles);
  return {
    key,
    records: translationKeyRecords(store, seed, handles, sourceTextCache),
  };
}

function translationKeyProductHandles(
  store: KernelStore,
  projectKey: string,
  seed: I18nTranslationKeyProductSeed,
  index: number,
): I18nTranslationKeyProductHandles {
  const local = `i18n-translation-key:${projectKey}:${index}:${localKeyPart(seed.locale ?? 'unknown')}:${localKeyPart(seed.namespace ?? 'translation')}:${localKeyPart(seed.key)}`;
  return {
    local,
    sourceAddressHandle: store.handles.address(`${local}:source`),
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: store.handles.product(local),
    identityHandle: store.handles.identity(local),
  };
}

function translationKeyModel(
  seed: I18nTranslationKeyProductSeed,
  handles: I18nTranslationKeyProductHandles,
): I18nTranslationKey {
  return new I18nTranslationKey(
    handles.productHandle,
    handles.identityHandle,
    seed.key,
    seed.locale,
    seed.namespace,
    handles.sourceAddressHandle,
    [],
  );
}

function translationKeyRecords(
  store: KernelStore,
  seed: I18nTranslationKeyProductSeed,
  handles: I18nTranslationKeyProductHandles,
  sourceTextCache?: AuthoredSourceTextCache,
): readonly KernelStoreRecord[] {
  return [
    translationKeySourceAddress(seed, handles, sourceTextCache),
    translationKeyEvidence(handles),
    new ProvenanceRecord(handles.provenanceHandle, [handles.evidenceHandle]),
    translationKeyIdentity(seed, handles),
    translationKeyProduct(handles),
    translationKeyMaterialization(store, handles),
  ];
}

function translationKeySourceAddress(
  seed: I18nTranslationKeyProductSeed,
  handles: I18nTranslationKeyProductHandles,
  sourceTextCache?: AuthoredSourceTextCache,
): SourceSpanAddress {
  const sourceSpan = translationKeySourceSpan(seed, sourceTextCache);
  return new SourceSpanAddress(
    handles.sourceAddressHandle,
    seed.sourceFileAddressHandle,
    sourceSpan.start,
    sourceSpan.end,
    SourceSpanRole.Value,
  );
}

function translationKeyEvidence(
  handles: I18nTranslationKeyProductHandles,
): EvidenceRecord {
  return new EvidenceRecord(
    handles.evidenceHandle,
    EvidenceKind.ConfigurationFlow,
    [EvidenceRole.Configuration],
    'I18n translation key admitted from static I18nConfiguration init resources.',
    handles.sourceAddressHandle,
  );
}

function translationKeyIdentity(
  seed: I18nTranslationKeyProductSeed,
  handles: I18nTranslationKeyProductHandles,
): I18nIdentity {
  return new I18nIdentity(
    handles.identityHandle,
    KernelVocabulary.I18n.TranslationKey.key,
    null,
    handles.sourceAddressHandle,
    seed.key,
  );
}

function translationKeyProduct(
  handles: I18nTranslationKeyProductHandles,
): MaterializedProduct {
  return new MaterializedProduct(
    handles.productHandle,
    KernelVocabulary.I18n.TranslationKey.key,
    handles.identityHandle,
    handles.sourceAddressHandle,
    handles.provenanceHandle,
  );
}

function translationKeyMaterialization(
  store: KernelStore,
  handles: I18nTranslationKeyProductHandles,
): MaterializationRecord {
  return new MaterializationRecord(
    store.handles.materialization(handles.local),
    handles.identityHandle,
    [handles.productHandle],
    [],
    [],
  );
}

function translationKeySourceSpan(
  seed: I18nTranslationKeyProductSeed,
  sourceTextCache?: AuthoredSourceTextCache,
): { readonly start: number; readonly end: number } {
  return authoredAssetModuleSpanForNode(seed.sourceFile, seed.sourceNode, sourceTextCache) ?? {
    start: seed.sourceNode.getStart(seed.sourceFile),
    end: seed.sourceNode.end,
  };
}
