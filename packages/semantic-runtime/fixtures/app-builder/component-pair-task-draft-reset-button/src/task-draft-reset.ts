export class TaskDraftReset {
  title: string = '';
  done: boolean = false;

  saveDraft() {
    this.title = this.title.trim();
  }

  resetDraft() {
    this.title = '';
    this.done = false;
  }
}