import {
  AppTask,
  AttrMapper as RuntimeAttrMapper,
  Aurelia,
  StandardConfiguration,
  customElement,
} from '@aurelia/runtime-html';

function applyMapping(
  mapper: { useGlobalMapping(mapping: Record<string, string>): void },
  mapping: Record<string, string>,
): void {
  mapper.useGlobalMapping(mapping);
}

function mapperTask(mapping: Record<string, string>) {
  return AppTask.creating(RuntimeAttrMapper, (mapper) => {
    if (false) {
      mapper.useGlobalMapping({ 'dead-branch': 'deadBranch' });
    }
    if (true) {
      const mapperAlias = mapper;
      applyMapping(mapperAlias, mapping);
    }
    if (document.documentElement.dataset.runtimeMapping === 'enabled') {
      mapper.useGlobalMapping({ 'runtime-branch': 'runtimeBranch' });
    }
  });
}

const neverRegistered = {
  register(container: { register(...values: unknown[]): void }): void {
    container.register(
      AppTask.creating(RuntimeAttrMapper, (mapper) => {
        mapper.useGlobalMapping({ 'never-executed': 'neverExecuted' });
      }),
    );
  },
};

@customElement({
  name: 'app-task-execution-order-app',
  template: '<template>AppTask execution order</template>',
})
class AppTaskExecutionOrderApp {}

@customElement({
  name: 'isolated-app-task-execution-app',
  template: '<template>Isolated AppTask execution</template>',
})
class IsolatedAppTaskExecutionApp {}

new Aurelia()
  .register(
    StandardConfiguration,
    mapperTask({ 'first-execution': 'firstExecution' }),
    mapperTask({ 'second-execution': 'secondExecution' }),
  )
  .app({
    host: document.body,
    component: AppTaskExecutionOrderApp,
  })
  .start();

new Aurelia()
  .register(
    StandardConfiguration,
    mapperTask({ 'isolated-execution': 'isolatedExecution' }),
  )
  .app({
    host: document.body,
    component: IsolatedAppTaskExecutionApp,
  })
  .start();

void neverRegistered;
