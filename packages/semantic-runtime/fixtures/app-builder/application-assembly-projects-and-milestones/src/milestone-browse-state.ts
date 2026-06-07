import { Milestone } from './milestone';

export class MilestoneBrowseState {
  readonly milestones: Milestone[] = [
    new Milestone(1, 'Prototype review', new Date('2026-06-15')),
    new Milestone(2, 'Public preview', new Date('2026-07-01')),
  ];

  findMilestone(id: string): Milestone | null {
    return this.milestones.find((milestone) => String(milestone.id) === id) ?? null;
  }
}
