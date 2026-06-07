export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    public assignee: ContactEntry | null,
  ) {}
}

export class ContactEntry {
  constructor(
    readonly contactId: string,
    readonly fullName: string,
    readonly email: string,
  ) {}
}

export class TaskObjectAssignmentSection {
  title: string = '';
  done: boolean = false;

  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare release notes', false, this.contacts.find((contactEntry) => contactEntry.contactId === 'ada') ?? null),
    new TaskItem(2, 'Check deployment checklist', true, this.contacts.find((contactEntry) => contactEntry.contactId === 'grace') ?? null),
  ];

  assignee: ContactEntry | null = this.contacts[0] ?? null;

  assigneeForTaskItem(taskItem: TaskItem): ContactEntry | null {
    return taskItem.assignee;
  }

  assigneeLabelForTaskItem(taskItem: TaskItem): string {
    const contactEntry = this.assigneeForTaskItem(taskItem);
    return contactEntry == null ? '' : String(contactEntry.fullName);
  }

  matchContactEntry(left: ContactEntry | null, right: ContactEntry | null): boolean {
    return left?.contactId === right?.contactId;
  }

  create() {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, this.title, this.done, this.assignee));
    this.title = '';
    this.done = false;
    this.assignee = this.contacts[0] ?? null;
  }
}