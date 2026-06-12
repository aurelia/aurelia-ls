export class TaskDraft {
  constructor(
    public title: string,
    public done: boolean,
  ) {}

  get canSubmit(): boolean {
    return this.title.trim().length > 0;
  }
}

export class TaskDomainBackedSubmitForm {
  taskDraft = new TaskDraft('', false);

  saveDraft() {
    if (!this.taskDraft.canSubmit) {
      return;
    }
    this.taskDraft.title = this.taskDraft.title.trim();
  }
}