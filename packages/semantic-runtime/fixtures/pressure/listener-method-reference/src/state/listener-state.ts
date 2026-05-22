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
}
