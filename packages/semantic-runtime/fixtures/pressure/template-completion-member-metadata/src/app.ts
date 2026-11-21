import { bindable, customElement } from 'aurelia';
import template from './app.html';

@customElement({ name: 'flag-card', template: '<span></span>' })
class FlagCard {
  @bindable enabled: boolean = true;
  @bindable size: 1 | 2 = 1;
  @bindable color: 'red' | 'blue' = 'red';
}

@customElement({
  name: 'app',
  dependencies: [FlagCard],
  template,
})
export class App {
  public title = 'Theme preview';
  public readonly publicCount = 1;

  public get summary(): string {
    return `${this.title}: ${this.publicCount}`;
  }

  public attached(): void {
    this.applyDarkTheme();
  }

  public detached(): void {
    this.resetTheme();
  }

  private applyDarkTheme(): void {}

  protected resetTheme(): void {}
}
