import { resolve } from 'aurelia';
import type { ServicePlan } from '../models/service-plan';
import { ServicePlanCatalogService } from '../services/service-plan-catalog-service';

export class ServicePlanCollectionState {
  private readonly servicePlans = new Map<string, ServicePlan>();

  searchText = '';
  isLoading = false;

  get items(): readonly ServicePlan[] {
    const query = this.searchText.trim().toLowerCase();
    return [...this.servicePlans.values()].filter((servicePlan) =>
      query.length === 0 || servicePlan.name.toLowerCase().includes(query) || servicePlan.summary.toLowerCase().includes(query)
    );
  }

  get hasServicePlans(): boolean {
    return this.servicePlans.size > 0;
  }

  get hasVisibleServicePlans(): boolean {
    return this.items.length > 0;
  }

  readServicePlan(entityId: string): ServicePlan | null {
    return this.servicePlans.get(entityId) ?? null;
  }

  replace(collection: readonly ServicePlan[]): void {
    this.servicePlans.clear();
    for (const servicePlan of collection) {
      this.servicePlans.set(servicePlan.id, servicePlan);
    }
  }
}

export class CatalogState {
  private readonly catalogService = resolve(ServicePlanCatalogService);

  readonly servicePlans = new ServicePlanCollectionState();

  async loadFeaturedServicePlans(): Promise<void> {
    if (this.servicePlans.hasServicePlans || this.servicePlans.isLoading) {
      return;
    }

    this.servicePlans.isLoading = true;
    try {
      this.servicePlans.replace(await this.catalogService.loadFeaturedServicePlans());
    } finally {
      this.servicePlans.isLoading = false;
    }
  }
}
