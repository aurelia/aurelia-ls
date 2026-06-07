interface TaskDraftState {
  title: string;
  done: boolean;
}

export class TaskDraftObject {
  taskDraft: TaskDraftState = {
    title: '',
    done: false,
  };

  saveDraft() {
    this.taskDraft.title = this.taskDraft.title.trim();
  }
}