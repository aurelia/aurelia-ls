import {
  customElement,
  type ICallerContext,
  valueConverter,
} from '@aurelia/runtime-html';
import template from './value-converter-source-value-app.html';

export interface SourceValueProduct {
  readonly id: string;
  readonly label: string;
  readonly featured: boolean;
}

@valueConverter('featuredProducts')
export class FeaturedProductsValueConverter {
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

@customElement({
  name: 'value-converter-source-value-app',
  template,
  dependencies: [FeaturedProductsValueConverter, DynamicContextProductsValueConverter],
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
