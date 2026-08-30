import { resolve } from 'aurelia';
import { Milestone } from './milestone';
import { AppState } from './app-state';

export class MilestoneBrowseState {
  private readonly appState = resolve(AppState);
  readonly milestones = this.appState.milestones;

  findMilestone(id: string): Milestone | null {
    return this.milestones.find((milestone) => String(milestone.id) === id) ?? null;
  }
}
