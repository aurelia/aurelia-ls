export class UnregisteredPluginSyntaxApp {
  titleKey = 'dashboard.title';
  dispatchCount = 0;

  dispatch(): void {
    this.dispatchCount++;
  }
}
