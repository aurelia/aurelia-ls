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

  submitWithButton(button: HTMLButtonElement): boolean {
    this.submittedCount += 1;
    this.lastEventType = button.type;
    return true;
  }
}
