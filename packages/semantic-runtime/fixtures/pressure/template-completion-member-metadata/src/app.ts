import { customElement } from 'aurelia';
import template from './app.html';

@customElement({
  name: 'app',
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
