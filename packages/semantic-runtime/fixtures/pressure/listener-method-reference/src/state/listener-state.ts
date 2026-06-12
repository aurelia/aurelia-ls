export class ListenerState {
  submittedCount = 0;
  lastEventType = '';

  submitWithEvent(event: Event): boolean {
    this.submittedCount += 1;
    this.lastEventType = event.type;
    return true;
  }

  makeSubmitHandler(): (event: Event) => boolean {
    return (event: Event) => this.submitWithEvent(event);
  }

  overloadedSubmit(value: string): number;
  overloadedSubmit(event: Event): boolean;
  overloadedSubmit(value: string | Event): number | boolean {
    if (typeof value === 'string') {
      return value.length;
    }
    this.submittedCount += 1;
    this.lastEventType = value.type;
    return true;
  }

  submitWithButton(button: HTMLButtonElement): boolean {
    this.submittedCount += 1;
    this.lastEventType = button.type;
    return true;
  }
}
