import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { MilestoneBrowseState } from '../milestone-browse-state';

export class MilestoneDetailRoute {
  readonly state = resolve(MilestoneBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    milestoneId: string;
  }>();
  readonly milestonePromise: ReturnType<MilestoneBrowseState['findMilestone']> = this.state.findMilestone(this.routeParams.milestoneId);
}