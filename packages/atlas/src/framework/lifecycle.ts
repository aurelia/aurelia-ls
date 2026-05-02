/** Lifecycle participant lane shared by lifecycle rows, continuations, and relationship filters. */
export const enum FrameworkLifecycleParticipantKind {
  Controller = "controller",
  Binding = "binding",
  Resource = "resource",
  AppTask = "app-task",
  ViewModelHook = "view-model-hook",
  LifecycleHook = "lifecycle-hook",
}

/** Controller lifecycle call lane. */
export const enum FrameworkLifecycleControllerCallKind {
  SelfLifecycle = "self-lifecycle",
  ChildController = "child-controller",
  BindingList = "binding-list",
  StateGate = "state-gate",
  Teardown = "teardown",
}

/** AppTask execution site lane. */
export const enum FrameworkLifecycleAppTaskExecutionKind {
  SlotInvocation = "slot-invocation",
  TaskCollectionLookup = "task-collection-lookup",
  SlotFilter = "slot-filter",
  TaskRun = "task-run",
}

/** Controller/view-model lifecycle hook dispatch lane. */
export const enum FrameworkLifecycleHookDispatchKind {
  ViewModelHook = "view-model-hook",
  RegisteredHookCollection = "registered-hook-collection",
  RegisteredHookCallback = "registered-hook-callback",
}
