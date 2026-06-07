import { resolve } from 'aurelia';
import { Milestone } from './milestone';
import { MilestoneService } from './services/milestone-service';

export class MilestoneBrowseState {
  private readonly milestoneService = resolve(MilestoneService);

  listMilestones(): Promise<readonly Milestone[]> {
    return this.milestoneService.listMilestones();
  }

  findMilestone(id: string): Promise<Milestone | null> {
    return this.milestoneService.findMilestone(id);
  }
}
