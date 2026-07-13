import {
  customElement,
  type ICallerContext,
  valueConverter,
} from '@aurelia/runtime-html';
import {
  runtimeConverterSignals,
  sharedConverterSignals,
} from './converter-signals';
import template from './value-converter-source-value-app.html';

export interface SourceValueProduct {
  readonly id: string;
  readonly label: string;
  readonly featured: boolean;
}

@valueConverter('featuredProducts')
export class FeaturedProductsValueConverter {
  readonly signals = ['featured-refresh'];

  toView(products: readonly SourceValueProduct[]): readonly SourceValueProduct[] {
    return products.filter((product) => product.featured);
  }
}

@valueConverter('dynamicContextProducts')
export class DynamicContextProductsValueConverter {
  withContext: boolean = true;

  toView(products: readonly SourceValueProduct[], caller: ICallerContext): readonly SourceValueProduct[];
  toView(products: readonly SourceValueProduct[]): readonly SourceValueProduct[];
  toView(products: readonly SourceValueProduct[], _caller?: ICallerContext): readonly SourceValueProduct[] {
    return products.filter((product) => product.featured);
  }
}

@valueConverter('importedSignalProducts')
export class ImportedSignalProductsValueConverter {
  readonly signals = ['local-refresh', ...sharedConverterSignals];

  toView(products: readonly SourceValueProduct[]): readonly SourceValueProduct[] {
    return products;
  }
}

@valueConverter('openSignalProducts')
export class OpenSignalProductsValueConverter {
  readonly signals = ['known-refresh', ...runtimeConverterSignals];

  toView(products: readonly SourceValueProduct[]): readonly SourceValueProduct[] {
    return products;
  }
}

@customElement({
  name: 'value-converter-source-value-app',
  template,
  dependencies: [
    DynamicContextProductsValueConverter,
    FeaturedProductsValueConverter,
    ImportedSignalProductsValueConverter,
    OpenSignalProductsValueConverter,
  ],
  strict: false,
})
export class ValueConverterSourceValueApp {
  readonly products: readonly SourceValueProduct[] = [
    { id: 'featured', label: 'Featured', featured: true },
    { id: 'archived', label: 'Archived', featured: false },
  ];
  readonly fallbackProducts: readonly SourceValueProduct[] = [
    { id: 'fallback', label: 'Fallback', featured: false },
  ];
  readonly maybeCatalog: { readonly products: readonly SourceValueProduct[] } | null = null;
}
