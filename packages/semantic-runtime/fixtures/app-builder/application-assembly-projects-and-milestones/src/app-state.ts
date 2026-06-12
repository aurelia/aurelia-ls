import { Project } from './project';
import { Milestone } from './milestone';
import { TaskItem } from './task-item';
import { ReviewerProfile } from './reviewer-profile';

export class AppState {
  readonly projects: Project[] = [];
  readonly milestones: Milestone[] = [];
  readonly taskItems: TaskItem[] = [];
  readonly reviewerProfiles: ReviewerProfile[] = [];

  public constructor() {
    this.projects.push(...[
      new Project(1, 'Platform refresh', 'Planning'),
      new Project(2, 'Docs cleanup', 'Active'),
    ]);
    this.milestones.push(...[
      new Milestone(1, 'Prototype review', '2026-06-15'),
      new Milestone(2, 'Public preview', '2026-07-01'),
    ]);
    this.taskItems.push(...[
      new TaskItem(1, 'Prepare release notes', false, 1),
      new TaskItem(2, 'Check deployment checklist', true, 2),
      new TaskItem(3, 'Collect preview feedback', false, 1),
    ]);
    this.reviewerProfiles.push(...[
      new ReviewerProfile('ada', 'Ada Lovelace', 'ada@example.test'),
      new ReviewerProfile('grace', 'Grace Hopper', 'grace@example.test'),
    ]);
  }
}
