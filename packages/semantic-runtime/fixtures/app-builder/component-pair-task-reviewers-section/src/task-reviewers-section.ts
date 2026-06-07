export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    readonly reviewerIds: string[],
  ) {}
}

export class ContactEntry {
  constructor(
    readonly contactId: string,
    readonly fullName: string,
    readonly email: string,
  ) {}
}

export class TaskReviewersSection {
  title: string = '';
  done: boolean = false;
  reviewerIds: string[] = ['ada'];

  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare release notes', false, ['ada', 'grace']),
    new TaskItem(2, 'Check deployment checklist', true, ['grace']),
  ];

  reviewersForTaskItem(taskItem: TaskItem): ContactEntry[] {
    return this.contacts.filter((contactEntry) => taskItem.reviewerIds.includes(contactEntry.contactId));
  }

  reviewersLabelForTaskItem(taskItem: TaskItem): string {
    const contacts = this.reviewersForTaskItem(taskItem);
    return contacts.length === 0 ? '' : contacts.map((contactEntry) => String(contactEntry.fullName)).join(', ');
  }

  create() {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, this.title, this.done, [...this.reviewerIds]));
    this.title = '';
    this.done = false;
    this.reviewerIds = ['ada'];
  }
}