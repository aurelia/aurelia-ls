export interface DashboardState {
  readonly ready: boolean;
  readonly draft: string;
}

export interface ActivityState {
  readonly label: string;
}

export const initialDashboardState: DashboardState = {
  ready: true,
  draft: 'initial',
};

export const initialActivityState: ActivityState = {
  label: 'Ready',
};
