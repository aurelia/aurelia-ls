/* global document, window, Window */

import { CustomElement, type Aurelia } from '@aurelia/runtime-html';
import {
  BuiltInProduct,
  DigitalBuiltInProduct,
  type TemplateControllerBuiltInsApp,
} from './template-controller-built-ins-app.js';

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/** Browser-test controls alter ordinary VM inputs; both build lanes execute the same source. */
export function attachControllerAssurance(aurelia: Pick<Aurelia, 'stop' | 'dispose'>): void {
  const host = document.querySelector('template-controller-built-ins')!;
  const vm = CustomElement.for(host).viewModel as Mutable<Omit<TemplateControllerBuiltInsApp, 'repeatCount'>> & {
    repeatCount: number;
  };
  let resolveProduct: (product: BuiltInProduct) => void;
  let rejectProduct: (reason: unknown) => void;
  const selectedIds: string[] = [];
  const originalSelectProduct = vm.selectProduct;
  vm.selectProduct = function (id) {
    selectedIds.push(id);
    return originalSelectProduct.call(this, id);
  };

  (window as Window & { __controllerAssurance?: unknown }).__controllerAssurance = {
    ready: true,
    advance(stage: 'collections' | 'replace' | 'branches' | 'restore' | 'pending' | 'resolve' | 'reject') {
      switch (stage) {
        case 'collections': {
          const third = new BuiltInProduct('third', 'Third product');
          (vm.products as BuiltInProduct[]).splice(0, 1, third);
          vm.productEntries.delete('first');
          vm.productEntries.set('third', third);
          vm.productSet.delete(vm.selectedProduct!);
          vm.productSet.add(third);
          (vm.productTriples as (readonly [string, string, BuiltInProduct])[]).reverse();
          vm.repeatCount = 3;
          break;
        }
        case 'replace': {
          const replacement = new BuiltInProduct('replacement', 'Replacement');
          vm.products = [replacement];
          vm.productEntries = new Map([['replacement', replacement]]);
          vm.productSet = new Set([replacement]);
          vm.productTriples = [['replacement', 'primary', replacement]];
          vm.nestedProducts = [[replacement], [new BuiltInProduct('nested', 'Nested product')]];
          vm.nullableProducts = null;
          vm.repeatCount = 0;
          vm.selectedProduct = replacement;
          vm.maybeProduct = null;
          break;
        }
        case 'branches':
          vm.currentItem = { kind: 'service', title: 'Service branch', hourlyRate: 75 };
          vm.secondaryItem = { kind: 'archived', title: 'Archived branch', archivedAt: '2026-09-09' };
          vm.probedItem = { kind: 'book', title: 'Book probe', pages: 42 };
          vm.mixedProduct = new DigitalBuiltInProduct('download', 'Digital product', '/download');
          vm.currentPrimitive = 42;
          vm.mode = 'other';
          vm.modeGroup = 'other';
          vm.fallMode = 'other';
          vm.overlapMode = 'other';
          break;
        case 'restore':
          vm.selectedProduct = vm.products[0]!;
          vm.maybeProduct = vm.products[0]!;
          vm.nullableProducts = vm.products;
          vm.mode = 'list';
          vm.modeGroup = 'detail';
          vm.fallMode = 'detail';
          vm.overlapMode = 'c';
          break;
        case 'pending':
          vm.productPromise = new Promise<BuiltInProduct>((resolve, reject) => {
            resolveProduct = resolve;
            rejectProduct = reject;
          });
          break;
        case 'resolve':
          resolveProduct(new BuiltInProduct('async', 'Async product'));
          break;
        case 'reject':
          rejectProduct('Product unavailable');
          break;
      }
    },
    readWriteback() {
      return {
        resolvedProduct: vm.resolvedProduct?.label ?? null,
        rejectedReason: vm.rejectedReason ?? null,
        selectedIds,
      };
    },
    async stop() {
      await aurelia.stop(true);
      aurelia.dispose();
    },
  };
}
