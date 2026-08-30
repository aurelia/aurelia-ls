import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { MilestoneBrowseState } from '../milestone-browse-state';
import { Milestone } from '../milestone';

export class MilestoneDetailRoute {
  readonly state = resolve(MilestoneBrowseState);
  readonly milestoneId = resolve(IRouteContext).getRouteParameters<{
    milestoneId: string;
  }>().milestoneId;

  get milestone(): Milestone | null {
    return this.state.findMilestone(this.milestoneId);
  }
}
