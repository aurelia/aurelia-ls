import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';

export interface CatalogStorefrontSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly productModelPath: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly productCollectionStateClassName: string;
  readonly cartStateClassName: string;
  readonly servicePath: string;
  readonly serviceClassName: string;
  readonly productListComponentPath: string;
  readonly productListTemplatePath: string;
  readonly productListClassName: string;
  readonly productListElementName: string;
  readonly productCardComponentPath: string;
  readonly productCardTemplatePath: string;
  readonly productCardClassName: string;
  readonly productCardElementName: string;
}

export function catalogStorefrontSourcePlan(model: CatalogStorefrontSourcePlanModel): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    catalogStorefrontSourceFiles(model),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/kernel'],
    }),
  );
}

function catalogStorefrontSourceFiles(
  model: CatalogStorefrontSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  return [
    catalogStorefrontEntrypointFile(model),
    catalogStorefrontRootComponentFile(model),
    catalogStorefrontRootTemplateFile(model),
    catalogStorefrontRootStyleFile(model),
    catalogStorefrontProductModelFile(model),
    catalogStorefrontServiceFile(model),
    catalogStorefrontStateFile(model),
    catalogStorefrontProductListComponentFile(model),
    catalogStorefrontProductListTemplateFile(model),
    catalogStorefrontProductCardComponentFile(model),
    catalogStorefrontProductCardTemplateFile(model),
  ];
}

function catalogStorefrontEntrypointFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.entrypointPath,
    'entrypoint',
    'typescript',
    'create-entrypoint',
    fillSourceTemplate(ENTRYPOINT_SOURCE, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
    }),
  );
}

function catalogStorefrontRootComponentFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
      PRODUCT_LIST_CLASS: model.productListClassName,
      PRODUCT_LIST_MODULE: moduleSpecifier(model.rootComponentPath, model.productListComponentPath, false),
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.rootComponentPath, model.statePath, false),
    }),
  );
}

function catalogStorefrontRootTemplateFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(ROOT_TEMPLATE_SOURCE, {
      PRODUCT_LIST_ELEMENT_NAME: model.productListElementName,
    }),
  );
}

function catalogStorefrontRootStyleFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    ROOT_STYLE_SOURCE,
  );
}

function catalogStorefrontProductModelFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.productModelPath,
    'other',
    'typescript',
    'create-service',
    PRODUCT_MODEL_SOURCE,
  );
}

function catalogStorefrontServiceFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.servicePath,
    'service',
    'typescript',
    'create-service',
    fillSourceTemplate(SERVICE_SOURCE, {
      PRODUCT_MODEL_MODULE: moduleSpecifier(model.servicePath, model.productModelPath, false),
      SERVICE_CLASS: model.serviceClassName,
    }),
  );
}

function catalogStorefrontStateFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    fillSourceTemplate(STATE_SOURCE, {
      CART_STATE_CLASS: model.cartStateClassName,
      PRODUCT_COLLECTION_STATE_CLASS: model.productCollectionStateClassName,
      PRODUCT_MODEL_MODULE: moduleSpecifier(model.statePath, model.productModelPath, false),
      SERVICE_CLASS: model.serviceClassName,
      SERVICE_MODULE: moduleSpecifier(model.statePath, model.servicePath, false),
      STATE_CLASS: model.stateClassName,
    }),
  );
}

function catalogStorefrontProductListComponentFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.productListComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(PRODUCT_LIST_COMPONENT_SOURCE, {
      PRODUCT_CARD_CLASS: model.productCardClassName,
      PRODUCT_CARD_MODULE: moduleSpecifier(model.productListComponentPath, model.productCardComponentPath, false),
      PRODUCT_LIST_CLASS: model.productListClassName,
      PRODUCT_LIST_ELEMENT_NAME: model.productListElementName,
      PRODUCT_LIST_TEMPLATE_MODULE: moduleSpecifier(model.productListComponentPath, model.productListTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.productListComponentPath, model.statePath, false),
    }),
  );
}

function catalogStorefrontProductListTemplateFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.productListTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(PRODUCT_LIST_TEMPLATE_SOURCE, {
      PRODUCT_CARD_ELEMENT_NAME: model.productCardElementName,
    }),
  );
}

function catalogStorefrontProductCardComponentFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.productCardComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(PRODUCT_CARD_COMPONENT_SOURCE, {
      PRODUCT_CARD_CLASS: model.productCardClassName,
      PRODUCT_CARD_ELEMENT_NAME: model.productCardElementName,
      PRODUCT_CARD_TEMPLATE_MODULE: moduleSpecifier(model.productCardComponentPath, model.productCardTemplatePath, true),
      PRODUCT_MODEL_MODULE: moduleSpecifier(model.productCardComponentPath, model.productModelPath, false),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.productCardComponentPath, model.statePath, false),
    }),
  );
}

function catalogStorefrontProductCardTemplateFile(model: CatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.productCardTemplatePath,
    'template',
    'html',
    'create-external-template',
    PRODUCT_CARD_TEMPLATE_SOURCE,
  );
}

const ENTRYPOINT_SOURCE = sourceText(`import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: __ROOT_COMPONENT_CLASS__,
  })
  .start();
`);

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __PRODUCT_LIST_CLASS__ } from '__PRODUCT_LIST_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__PRODUCT_LIST_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
  private readonly catalogStatusPromise = Promise.resolve('Featured product availability refreshes daily.');

  get cartProgressPercent(): number {
    return Math.min(100, Math.round((this.state.cart.itemCount / 3) * 100));
  }

  get catalogStatus(): Promise<string> {
    return this.catalogStatusPromise;
  }

  get cartProductNames(): readonly string[] {
    return this.state.cart.productIds.map((productId) =>
      this.state.products.readProduct(productId)?.name ?? productId
    );
  }

  binding(): void {
    void this.state.loadFeaturedProducts();
  }
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main class="catalog-shell \${state.cart.itemCount > 0 ? 'has-selection' : 'empty-selection'}">
  <header>
    <h1>Catalog</h1>
    <p>\${state.cart.itemCount} item(s) selected</p>
    <div class="cart-progress" aria-hidden="true">
      <span style="width: \${cartProgressPercent}%"></span>
    </div>
    <section promise.bind="catalogStatus" aria-label="Catalog status">
      <p pending>Checking catalog status...</p>
      <p then="notice">\${notice}</p>
      <p catch="reason">\${reason}</p>
    </section>
  </header>

  <__PRODUCT_LIST_ELEMENT_NAME__></__PRODUCT_LIST_ELEMENT_NAME__>

  <aside if.bind="state.cart.itemCount > 0" aria-label="Selected products">
    <h2>Selected products</h2>
    <ul>
      <li repeat.for="name of cartProductNames">\${name}</li>
    </ul>
  </aside>
  <p else>Select a featured product to start an order.</p>
</main>
`);

const ROOT_STYLE_SOURCE = sourceText(`.catalog-shell {
  display: grid;
  gap: 1rem;
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem;
}

.product-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  padding: 0;
  list-style: none;
}

.product-card {
  border: 1px solid #d0d7de;
  border-radius: 0.5rem;
  padding: 1rem;
}

.cart-progress {
  background: #eef2f7;
  height: 0.375rem;
}

.cart-progress span {
  background: #0f766e;
  display: block;
  height: 100%;
}

.sale {
  border-color: #0f766e;
}

.new {
  border-color: #7c3aed;
}

.highlighted {
  box-shadow: 0 0 0 0.125rem rgba(15, 118, 110, 0.16);
}
`);

const PRODUCT_MODEL_SOURCE = sourceText(`export type ProductBadge = 'standard' | 'new' | 'sale';

export interface Product {
  id: string;
  name: string;
  summary: string;
  price: number;
  inStock: boolean;
  badge: ProductBadge;
}
`);

const SERVICE_SOURCE = sourceText(`import type { Product, ProductBadge } from '__PRODUCT_MODEL_MODULE__';

export class __SERVICE_CLASS__ {
  async loadFeaturedProducts(): Promise<readonly Product[]> {
    return [
      createProduct('lamp-1', 'Task lamp', 'A focused desk lamp with a warm dimming range.', 48, true, 'new'),
      createProduct('chair-1', 'Reading chair', 'Compact lounge seating for smaller rooms.', 240, true, 'sale'),
      createProduct('shelf-1', 'Wall shelf', 'A shallow shelf for everyday display objects.', 64, false, 'standard'),
    ];
  }
}

function createProduct(
  id: string,
  name: string,
  summary: string,
  price: number,
  inStock: boolean,
  badge: ProductBadge,
): Product {
  return { id, name, summary, price, inStock, badge };
}
`);

const STATE_SOURCE = sourceText(`import { resolve } from '@aurelia/kernel';
import type { Product } from '__PRODUCT_MODEL_MODULE__';
import { __SERVICE_CLASS__ } from '__SERVICE_MODULE__';

export class __PRODUCT_COLLECTION_STATE_CLASS__ {
  private readonly products = new Map<string, Product>();

  isLoading = false;

  get ids(): readonly string[] {
    return [...this.products.keys()];
  }

  get hasProducts(): boolean {
    return this.products.size > 0;
  }

  readProduct(productId: string): Product | null {
    return this.products.get(productId) ?? null;
  }

  replace(products: readonly Product[]): void {
    this.products.clear();
    for (const product of products) {
      this.products.set(product.id, product);
    }
  }
}

export class __CART_STATE_CLASS__ {
  readonly productIds: string[] = [];

  get itemCount(): number {
    return this.productIds.length;
  }

  addProduct(productId: string): void {
    if (!this.productIds.includes(productId)) {
      this.productIds.push(productId);
    }
  }
}

export class __STATE_CLASS__ {
  private readonly catalogService = resolve(__SERVICE_CLASS__);

  readonly products = new __PRODUCT_COLLECTION_STATE_CLASS__();
  readonly cart = new __CART_STATE_CLASS__();

  async loadFeaturedProducts(): Promise<void> {
    if (this.products.hasProducts || this.products.isLoading) {
      return;
    }

    this.products.isLoading = true;
    try {
      this.products.replace(await this.catalogService.loadFeaturedProducts());
    } finally {
      this.products.isLoading = false;
    }
  }

  addToCart(productId: string): void {
    const product = this.products.readProduct(productId);
    if (product?.inStock === true) {
      this.cart.addProduct(productId);
    }
  }
}
`);

const PRODUCT_LIST_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __PRODUCT_CARD_CLASS__ } from '__PRODUCT_CARD_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__PRODUCT_LIST_TEMPLATE_MODULE__';

@customElement({
  name: '__PRODUCT_LIST_ELEMENT_NAME__',
  template,
  dependencies: [__PRODUCT_CARD_CLASS__],
})
export class __PRODUCT_LIST_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);

  binding(): void {
    void this.state.loadFeaturedProducts();
  }
}
`);

const PRODUCT_LIST_TEMPLATE_SOURCE = sourceText(`<section>
  <h2>Featured products</h2>
  <p if.bind="state.products.isLoading">Loading products...</p>
  <div else>
    <p if.bind="!state.products.hasProducts">No featured products are available yet.</p>
    <ul if.bind="state.products.hasProducts" class="product-grid">
      <li repeat.for="productId of state.products.ids">
        <__PRODUCT_CARD_ELEMENT_NAME__ product-id.bind="productId"></__PRODUCT_CARD_ELEMENT_NAME__>
      </li>
    </ul>
  </div>
</section>
`);

const PRODUCT_CARD_COMPONENT_SOURCE = sourceText(`import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import type { Product } from '__PRODUCT_MODEL_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__PRODUCT_CARD_TEMPLATE_MODULE__';

@customElement({
  name: '__PRODUCT_CARD_ELEMENT_NAME__',
  template,
})
export class __PRODUCT_CARD_CLASS__ {
  private readonly state = resolve(__STATE_CLASS__);

  @bindable productId = '';

  get isLoaded(): boolean {
    return this.currentProduct != null;
  }

  get productName(): string {
    return this.currentProduct?.name ?? 'Loading product';
  }

  get productSummary(): string {
    return this.currentProduct?.summary ?? '';
  }

  get priceLabel(): string {
    const price = this.currentProduct?.price ?? 0;
    return '$' + price.toFixed(2);
  }

  get badgeClass(): string {
    return this.currentProduct?.badge ?? 'standard';
  }

  get isHighlighted(): boolean {
    const badge = this.currentProduct?.badge;
    return badge === 'new' || badge === 'sale';
  }

  get cardPadding(): string {
    return this.isHighlighted ? '1.25rem' : '1rem';
  }

  get cardAccentColor(): string {
    switch (this.currentProduct?.badge) {
      case 'new':
        return '#7c3aed';
      case 'sale':
        return '#0f766e';
      default:
        return '#d0d7de';
    }
  }

  get stockLabel(): string {
    return this.canAdd ? 'In stock' : 'Back soon';
  }

  get availability(): string {
    if (this.canAdd) {
      return this.currentProduct?.badge === 'sale' ? 'limited' : 'in-stock';
    }
    return 'backorder';
  }

  get canAdd(): boolean {
    return this.state.products.readProduct(this.productId)?.inStock === true;
  }

  addToCart(): void {
    this.state.addToCart(this.productId);
  }

  private get currentProduct(): Product | null {
    return this.state.products.readProduct(this.productId);
  }
}
`);

const PRODUCT_CARD_TEMPLATE_SOURCE = sourceText(`<article class="product-card" class.bind="badgeClass" highlighted.class="isHighlighted" padding.style="cardPadding" border-color.style="cardAccentColor">
  <template if.bind="isLoaded">
    <h3>\${productName}</h3>
    <p>\${productSummary}</p>
    <p>\${priceLabel}</p>
    <p>\${stockLabel}</p>
    <template switch.bind="availability">
      <p case="in-stock">Ready to ship.</p>
      <p case="limited">Limited stock.</p>
      <p default-case>Available by backorder.</p>
    </template>
    <button type="button" click.trigger="addToCart()" disabled.bind="!canAdd">Add to order</button>
  </template>
  <p else>Loading product...</p>
</article>
`);
