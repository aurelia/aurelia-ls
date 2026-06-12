export class TaskDraft {
  title: string = '';
  done: boolean = false;

  saveDraft() {
    this.title = this.title.trim();
  }
}