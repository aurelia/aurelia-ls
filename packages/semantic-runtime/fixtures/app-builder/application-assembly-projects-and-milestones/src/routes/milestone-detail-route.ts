import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { MilestoneBrowseState } from '../milestone-browse-state';
import { Milestone } from '../milestone';

export class MilestoneDetailRoute {
  readonly state = resolve(MilestoneBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    milestoneId: string;
  }>();

  get milestone(): Milestone | null {
    return this.state.findMilestone(this.routeParams.milestoneId);
  }
}