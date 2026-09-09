/* global HTMLElement */

export class G0App {
  public message = 'alpha';
  public count = 1;
  public enabled = true;
  public visible = true;
  public items = ['A', 'B'];
  public hostRef: HTMLElement | null = null;
  public readonly events: string[] = [];

  public binding(): void { this.events.push('binding'); }
  public bound(): void { this.events.push('bound'); }
  public attaching(): void { this.events.push('attaching'); }
  public attached(): void { this.events.push('attached'); }
  public detaching(): void { this.events.push('detaching'); }
  public unbinding(): void { this.events.push('unbinding'); }

  public increment(): void {
    this.count++;
    this.events.push(`increment:${this.count}`);
  }

  public fromChild(value: string): void {
    this.message = `child:${value}`;
    this.events.push(this.message);
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.events.push(`toggle:${this.visible}`);
  }

  public addItem(): void {
    const value = String.fromCharCode(65 + this.items.length);
    this.items.push(value);
    this.events.push(`add:${value}`);
  }

  public snapshot(): object {
    return {
      message: this.message,
      count: this.count,
      enabled: this.enabled,
      visible: this.visible,
      items: this.items,
      hostRefId: this.hostRef?.id ?? null,
    };
  }
}
