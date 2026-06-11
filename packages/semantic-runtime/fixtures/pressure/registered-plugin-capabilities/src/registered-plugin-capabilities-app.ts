export class RegisteredPluginCapabilitiesApp {
  titleKey = 'dashboard.title';
  items = ['alpha', 'beta'];
  errors = [];
  displayName = 'Ada';
  dashboardState = { ready: true };
  dispatchCount = 0;

  dispatch(): void {
    this.dispatchCount++;
  }
}
