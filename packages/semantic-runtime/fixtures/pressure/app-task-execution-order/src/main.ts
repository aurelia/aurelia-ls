import {
  AppTask,
  AttrMapper as RuntimeAttrMapper,
  Aurelia,
  StandardConfiguration,
  customElement,
} from '@aurelia/runtime-html';

function mapperTask(mapping: Record<string, string>) {
  return AppTask.creating(RuntimeAttrMapper, (mapper) => {
    mapper.useGlobalMapping(mapping);
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

void neverRegistered;
