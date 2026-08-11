import type {
  CancellationToken,
  QuickInputButton,
  QuickPickItem,
} from "vscode";
import {
  type ExtensionHostObservationValue,
} from "../../extension-host-observation.js";
import {
  emitResourceDiscoveryHostObservation,
  nextResourceDiscoveryHostObservationId,
} from "../../resource-discovery-host-control.js";
import type { VscodeApi } from "../../vscode-api.js";

export interface ResourceQuickPickModel<T extends QuickPickItem> {
  readonly title: string;
  readonly placeholder: string;
  readonly items: readonly T[];
  readonly titleActions?: readonly ResourceQuickPickTitleAction[];
  readonly step?: number;
  readonly totalSteps?: number;
}

export const ResourceQuickPickTitleActionKind = {
  OpenOutput: "open-output",
} as const;

export type ResourceQuickPickTitleAction =
  typeof ResourceQuickPickTitleActionKind[keyof typeof ResourceQuickPickTitleActionKind];

export type ResourceQuickPickOutcome<T> =
  | { readonly status: "selected"; readonly value: T }
  | { readonly status: "back" }
  | { readonly status: "cancelled" };

/** Programmatic Quick Pick keeps loading, cancellation, empty, and back states inside the native control. */
export async function showResourceQuickPick<T extends QuickPickItem>(
  vscode: VscodeApi,
  initialTitle: string,
  load: (token: CancellationToken) => Promise<ResourceQuickPickModel<T>>,
  allowBack = false,
  observationId?: string,
  onDidTriggerTitleAction?: (action: ResourceQuickPickTitleAction) => void,
  modelOrdinal = 1,
): Promise<ResourceQuickPickOutcome<T>> {
  const effectiveObservationId = observationId ?? nextResourceDiscoveryHostObservationId("quick-pick");
  const observing = effectiveObservationId != null;
  const observe = (
    phase: string,
    details: Readonly<Record<string, ExtensionHostObservationValue>> = {},
  ): void => {
    if (effectiveObservationId == null) return;
    emitResourceDiscoveryHostObservation({
      ...details,
      source: "resource-quick-pick",
      observationId: effectiveObservationId,
      phase,
      modelOrdinal,
    });
  };
  const cancellation = new vscode.CancellationTokenSource();
  const picker = vscode.window.createQuickPick<T>();
  const titleActionByButton = new Map<QuickInputButton, ResourceQuickPickTitleAction>();
  const setButtons = (
    actions: readonly ResourceQuickPickTitleAction[] = [],
  ): readonly ResourceQuickPickTitleAction[] => {
    titleActionByButton.clear();
    const buttons: QuickInputButton[] = allowBack ? [vscode.QuickInputButtons.Back] : [];
    const dedupedActions = [...new Set(actions)];
    for (const action of dedupedActions) {
      const button = resourceQuickPickTitleButton(vscode, action);
      titleActionByButton.set(button, action);
      buttons.push(button);
    }
    picker.buttons = buttons;
    return dedupedActions;
  };
  picker.title = initialTitle;
  picker.placeholder = "Discovering Aurelia resources...";
  picker.busy = true;
  setButtons();

  let settled = false;
  let finishedStatus: ResourceQuickPickOutcome<T>["status"] | "failed" | undefined;
  let settle!: (outcome: ResourceQuickPickOutcome<T>) => void;
  const outcome = new Promise<ResourceQuickPickOutcome<T>>((resolve) => { settle = resolve; });
  const finish = (value: ResourceQuickPickOutcome<T>): void => {
    if (settled) return;
    settled = true;
    finishedStatus = value.status;
    observe("outcome", { status: value.status });
    settle(value);
    picker.hide();
  };
  const subscriptions = [
    picker.onDidChangeActive((items) => {
      if (!observing) return;
      const active = items[0];
      observe("active-changed", {
        activeLabel: active?.label ?? null,
        itemOrdinal: active == null ? null : picker.items.indexOf(active),
      });
    }),
    picker.onDidAccept(() => {
      const selected = picker.selectedItems[0];
      if (observing) {
        observe("accept", {
          selectedLabel: selected?.label ?? null,
          itemOrdinal: selected == null ? null : picker.items.indexOf(selected),
        });
      }
      if (selected != null) finish({ status: "selected", value: selected });
    }),
    picker.onDidHide(() => {
      observe("hidden");
      cancellation.cancel();
      if (!settled) {
        observe("cancelled");
        finish({ status: "cancelled" });
      }
    }),
    picker.onDidTriggerButton((button: QuickInputButton) => {
      if (allowBack && button === vscode.QuickInputButtons.Back) {
        observe("back");
        finish({ status: "back" });
        return;
      }
      const action = titleActionByButton.get(button);
      if (action == null) return;
      observe("title-action", { action });
      onDidTriggerTitleAction?.(action);
    }),
  ];
  observe("model-start", {
    title: initialTitle,
    placeholder: picker.placeholder,
    allowBack,
  });
  picker.show();
  observe("shown");

  try {
    let loading: Promise<
      | { readonly status: "loaded"; readonly model: ResourceQuickPickModel<T> }
      | { readonly status: "failed"; readonly error: unknown }
    >;
    try {
      loading = load(cancellation.token).then(
        (model) => ({ status: "loaded" as const, model }),
        (error: unknown) => ({ status: "failed" as const, error }),
      );
    } catch (error: unknown) {
      loading = Promise.resolve({ status: "failed", error });
    }
    const first = await Promise.race([
      loading,
      outcome.then((value) => ({ status: "outcome" as const, value })),
    ]);
    if (first.status === "outcome") return first.value;
    if (first.status === "failed") {
      observe("load-failed");
      if (cancellation.token.isCancellationRequested) {
        finish({ status: "cancelled" });
        return await outcome;
      }
      settled = true;
      finishedStatus = "failed";
      picker.hide();
      throw first.error;
    }
    const model = first.model;
    picker.title = model.title;
    picker.placeholder = model.placeholder;
    picker.items = model.items;
    picker.busy = false;
    picker.matchOnDescription = true;
    picker.matchOnDetail = true;
    picker.step = model.step;
    picker.totalSteps = model.totalSteps;
    const titleActions = setButtons(model.titleActions);
    if (observing) {
      let itemOrdinal = 0;
      for (const item of model.items) {
        const itemKind = "kind" in item && typeof item.kind === "number" ? "separator" : "item";
        observe("model-item", {
          itemOrdinal: itemOrdinal++,
          itemKind,
          label: item.label,
          description: item.description ?? null,
          detail: item.detail ?? null,
        });
      }
      if (allowBack) observe("model-button", { buttonKind: "back", buttonOrdinal: 0 });
      for (const [index, action] of titleActions.entries()) {
        observe("model-button", {
          buttonKind: action,
          buttonOrdinal: index + (allowBack ? 1 : 0),
        });
      }
    }
    observe("model-ready", {
      itemCount: model.items.length,
      title: model.title,
      placeholder: model.placeholder,
      step: model.step ?? null,
      totalSteps: model.totalSteps ?? null,
      matchOnDescription: picker.matchOnDescription,
      matchOnDetail: picker.matchOnDetail,
      buttonCount: picker.buttons.length,
    });
    return await outcome;
  } finally {
    if (finishedStatus != null) observe("finished", { status: finishedStatus });
    for (const subscription of subscriptions) subscription.dispose();
    cancellation.dispose();
    picker.dispose();
    observe("disposed");
  }
}

function resourceQuickPickTitleButton(
  vscode: VscodeApi,
  action: ResourceQuickPickTitleAction,
): QuickInputButton {
  switch (action) {
    case ResourceQuickPickTitleActionKind.OpenOutput:
      return {
        iconPath: new vscode.ThemeIcon("output"),
        tooltip: "Open Aurelia Output",
      };
  }
}
