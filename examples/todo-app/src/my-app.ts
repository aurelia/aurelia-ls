export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export class MyAppCustomElement {
  public title = 'Todo App';
  public newTodoText = '';
  public filter: 'all' | 'active' | 'completed' = 'all';
  public todos: Todo[] = [
    { id: 1, text: 'Learn Aurelia', completed: true },
    { id: 2, text: 'Build awesome app', completed: false },
    { id: 3, text: 'Deploy to production', completed: false },
  ];

  private nextId = 4;

  public get activeTodos(): number {
    return this.todos.filter(t => !t.completed).length;
  }

  public get completedTodos(): number {
    return this.todos.filter(t => t.completed).length;
  }

  public get filteredTodos(): Todo[] {
    switch (this.filter) {
      case 'active':
        return this.todos.filter(t => !t.completed);
      case 'completed':
        return this.todos.filter(t => t.completed);
      default:
        return this.todos;
    }
  }

  public addTodo(): void {
    const text = this.newTodoText.trim();
    if (text) {
      this.todos.push({
        id: this.nextId++,
        text,
        completed: false,
      });
      this.newTodoText = '';
    }
  }

  public removeTodo(todo: Todo): void {
    const index = this.todos.indexOf(todo);
    if (index > -1) {
      this.todos.splice(index, 1);
    }
  }

  public clearCompleted(): void {
    this.todos = this.todos.filter(t => !t.completed);
  }

  public setFilter(filter: 'all' | 'active' | 'completed'): void {
    this.filter = filter;
  }
}
