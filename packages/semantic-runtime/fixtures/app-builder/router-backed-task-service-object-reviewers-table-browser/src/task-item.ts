import type { ContactEntry } from './contact-entry';

export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    public reviewers: ContactEntry[],
  ) {}
}
