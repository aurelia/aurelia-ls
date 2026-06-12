import { resolve } from 'aurelia';
import { MilestoneBrowseState } from '../milestone-browse-state';

export class MilestoneListRoute {
  readonly state = resolve(MilestoneBrowseState);
}