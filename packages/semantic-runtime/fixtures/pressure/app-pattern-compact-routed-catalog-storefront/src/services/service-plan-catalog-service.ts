import { ServicePlan } from '../models/service-plan';

interface ServicePlanRecord {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
}

const featuredRecords: readonly ServicePlanRecord[] = [
  { id: 'service-plan-1', name: 'Name 1', summary: 'Summary 1' },
  { id: 'service-plan-2', name: 'Name 2', summary: 'Summary 2' },
  { id: 'service-plan-3', name: 'Name 3', summary: 'Summary 3' },
];

export class ServicePlanCatalogService {
  async loadFeaturedServicePlans(): Promise<readonly ServicePlan[]> {
    return featuredRecords.map(createServicePlan);
  }
}

function createServicePlan(record: ServicePlanRecord): ServicePlan {
  return new ServicePlan(
    record.id,
    record.name,
    record.summary,
  );
}
