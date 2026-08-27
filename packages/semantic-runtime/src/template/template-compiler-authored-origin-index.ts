import type { ProductHandle } from '../kernel/handles.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  TemplateStructureDerivationAuthority,
  type TemplateStructureDerivation,
  type TemplateStructureReference,
} from './template-structure-derivation.js';

/** Singular authored/browser relation that is safe to spend as compiler row authority. */
export class TemplateCompilerExactAuthoredOrigin {
  constructor(
    readonly derivationProductHandle: ProductHandle,
    readonly authored: TemplateStructureReference,
    readonly browserOutput: TemplateStructureReference,
  ) {}
}

export const enum TemplateCompilerAuthoredOriginRouteKind {
  Singular = 'singular',
  Dropped = 'dropped',
  NonSingular = 'non-singular',
}

/** Complete HtmlTreeBuilder route for one authored node or attribute product. */
export class TemplateCompilerAuthoredOriginRoute {
  constructor(
    readonly routeKind: TemplateCompilerAuthoredOriginRouteKind,
    readonly authored: TemplateStructureReference,
    readonly derivations: readonly TemplateStructureDerivation[],
    readonly browserOutputs: readonly TemplateStructureReference[],
    readonly exactOrigin: TemplateCompilerExactAuthoredOrigin | null,
  ) {}
}

export const enum TemplateCompilerBrowserOriginRouteKind {
  Singular = 'singular',
  NonSingular = 'non-singular',
  /** HtmlTreeBuilder produced the browser structure without an authored structural input. */
  Absent = 'absent',
}

/** Reverse HtmlTreeBuilder cardinality for one browser structural product. */
export class TemplateCompilerBrowserOriginRoute {
  constructor(
    readonly routeKind: TemplateCompilerBrowserOriginRouteKind,
    readonly browser: TemplateStructureReference,
    readonly authoredInputs: readonly TemplateStructureReference[],
    readonly derivations: readonly TemplateStructureDerivation[],
    readonly exactOrigin: TemplateCompilerExactAuthoredOrigin | null,
  ) {}
}

interface AuthoredRouteCandidate {
  readonly authored: TemplateStructureReference;
  readonly derivation: TemplateStructureDerivation;
  readonly browserOutputs: readonly TemplateStructureReference[];
}

interface BrowserRouteCandidate {
  readonly browser: TemplateStructureReference;
  readonly derivation: TemplateStructureDerivation;
  readonly authoredInputs: readonly TemplateStructureReference[];
}

/**
 * Product-free cardinality index over the HtmlTreeBuilder derivation lane.
 *
 * Both authored and browser products are indexed once. Compiler occurrence import consumes the singular output lane;
 * pre-walk accounting consumes the authored route lane, including exact drops and non-singular reconstruction.
 */
export class TemplateCompilerAuthoredOriginIndex {
  private readonly routesByAuthoredProduct = new Map<ProductHandle, TemplateCompilerAuthoredOriginRoute>();
  private readonly routesByBrowserProduct = new Map<ProductHandle, TemplateCompilerBrowserOriginRoute>();
  private readonly exactOriginsByBrowserProduct = new Map<ProductHandle, TemplateCompilerExactAuthoredOrigin>();

  constructor(derivations: readonly TemplateStructureDerivation[]) {
    const candidatesByAuthored = new Map<ProductHandle, AuthoredRouteCandidate[]>();
    const candidatesByBrowser = new Map<ProductHandle, BrowserRouteCandidate[]>();

    for (const derivation of derivations) {
      if (derivation.authority !== TemplateStructureDerivationAuthority.HtmlTreeBuilder) continue;
      this.indexLane(
        derivation,
        KernelVocabulary.Template.HtmlNode.key,
        KernelVocabulary.Template.StructuralNode.key,
        candidatesByAuthored,
        candidatesByBrowser,
      );
      this.indexLane(
        derivation,
        KernelVocabulary.Template.HtmlAttribute.key,
        KernelVocabulary.Template.StructuralAttribute.key,
        candidatesByAuthored,
        candidatesByBrowser,
      );
    }

    for (const [authoredProductHandle, candidates] of candidatesByAuthored) {
      const first = candidates[0]!;
      const singular = candidates.length === 1
        && first.derivation.inputs.length === 1
        && first.derivation.outputs.length === 1
        && first.browserOutputs.length === 1
        && candidatesByBrowser.get(first.browserOutputs[0]!.productHandle)?.length === 1;
      const dropped = candidates.length === 1
        && first.derivation.inputs.length === 1
        && first.derivation.outputs.length === 0
        && first.browserOutputs.length === 0;
      const browserOutputs = distinctStructures(candidates.flatMap((candidate) => candidate.browserOutputs));
      const routeKind = singular
        ? TemplateCompilerAuthoredOriginRouteKind.Singular
        : dropped
          ? TemplateCompilerAuthoredOriginRouteKind.Dropped
          : TemplateCompilerAuthoredOriginRouteKind.NonSingular;
      const exactOrigin = singular
        ? new TemplateCompilerExactAuthoredOrigin(
            first.derivation.productHandle,
            first.authored,
            first.browserOutputs[0]!,
          )
        : null;
      const route = new TemplateCompilerAuthoredOriginRoute(
        routeKind,
        first.authored,
        distinctDerivations(candidates.map((candidate) => candidate.derivation)),
        browserOutputs,
        exactOrigin,
      );
      this.routesByAuthoredProduct.set(authoredProductHandle, route);
      if (exactOrigin != null) {
        this.exactOriginsByBrowserProduct.set(exactOrigin.browserOutput.productHandle, exactOrigin);
      }
    }

    for (const [browserProductHandle, candidates] of candidatesByBrowser) {
      const first = candidates[0]!;
      const authoredInputs = distinctStructures(candidates.flatMap((candidate) => candidate.authoredInputs));
      const exactOrigin = this.exactOriginsByBrowserProduct.get(browserProductHandle) ?? null;
      const exactAbsent = candidates.length === 1
        && first.derivation.inputs.length === 0
        && first.derivation.outputs.length === 1
        && first.authoredInputs.length === 0;
      const routeKind = exactOrigin != null
        ? TemplateCompilerBrowserOriginRouteKind.Singular
        : exactAbsent
          ? TemplateCompilerBrowserOriginRouteKind.Absent
          : TemplateCompilerBrowserOriginRouteKind.NonSingular;
      this.routesByBrowserProduct.set(browserProductHandle, new TemplateCompilerBrowserOriginRoute(
        routeKind,
        first.browser,
        authoredInputs,
        distinctDerivations(candidates.map((candidate) => candidate.derivation)),
        exactOrigin,
      ));
    }
  }

  routeForAuthoredProduct(productHandle: ProductHandle): TemplateCompilerAuthoredOriginRoute | null {
    return this.routesByAuthoredProduct.get(productHandle) ?? null;
  }

  exactOriginForBrowserProduct(productHandle: ProductHandle): TemplateCompilerExactAuthoredOrigin | null {
    return this.exactOriginsByBrowserProduct.get(productHandle) ?? null;
  }

  routeForBrowserProduct(productHandle: ProductHandle): TemplateCompilerBrowserOriginRoute | null {
    return this.routesByBrowserProduct.get(productHandle) ?? null;
  }

  private indexLane(
    derivation: TemplateStructureDerivation,
    authoredKind: string,
    browserKind: string,
    candidatesByAuthored: Map<ProductHandle, AuthoredRouteCandidate[]>,
    candidatesByBrowser: Map<ProductHandle, BrowserRouteCandidate[]>,
  ): void {
    const authoredInputs = derivation.inputs
      .map((term) => term.structure)
      .filter((structure) => structure.productKindKey === authoredKind);
    const browserOutputs = derivation.outputs
      .map((term) => term.structure)
      .filter((structure) => structure.productKindKey === browserKind);
    for (const browser of browserOutputs) {
      appendMap(candidatesByBrowser, browser.productHandle, { browser, derivation, authoredInputs });
    }
    for (const authored of authoredInputs) {
      const candidate: AuthoredRouteCandidate = { authored, derivation, browserOutputs };
      appendMap(candidatesByAuthored, authored.productHandle, candidate);
    }
  }
}

function distinctStructures(
  structures: readonly TemplateStructureReference[],
): readonly TemplateStructureReference[] {
  const byProduct = new Map<ProductHandle, TemplateStructureReference>();
  for (const structure of structures) byProduct.set(structure.productHandle, structure);
  return [...byProduct.values()];
}

function distinctDerivations(
  derivations: readonly TemplateStructureDerivation[],
): readonly TemplateStructureDerivation[] {
  const byProduct = new Map<ProductHandle, TemplateStructureDerivation>();
  for (const derivation of derivations) byProduct.set(derivation.productHandle, derivation);
  return [...byProduct.values()];
}

function appendMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const existing = map.get(key);
  if (existing == null) map.set(key, [value]);
  else existing.push(value);
}
