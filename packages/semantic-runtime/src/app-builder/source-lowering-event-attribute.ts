import { AppBuilderBindingPartId } from './binding-part-catalog.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartSlotKind,
} from './part-application.js';
import { AppBuilderPartKind } from './part-catalog.js';
import {
  lowerAppBuilderPartSourceInvocation,
  type AppBuilderPartSourceLowering,
} from './part-source-lowering.js';
import type {
  AppBuilderPartSourceInvocation,
  AppBuilderTemplateAttributePartSourceFragment,
} from './part-source-invocation.js';
import {
  AppBuilderPartSourceFragmentKind,
} from './part-source-invocation.js';

/** Lower a named DOM event and handler expression into an Aurelia template event attribute. */
export function lowerAppBuilderEventAttribute(
  eventName: string,
  handlerExpression: string,
): {
  readonly invocation: AppBuilderPartSourceInvocation;
  readonly lowering: AppBuilderPartSourceLowering;
  readonly attributeFragment: AppBuilderTemplateAttributePartSourceFragment | null;
} {
  const invocation: AppBuilderPartSourceInvocation = {
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.EventListener,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.EventName, value: eventName },
      { slotKind: AppBuilderPartSlotKind.HandlerExpression, value: handlerExpression },
    ],
  };
  const lowering = lowerAppBuilderPartSourceInvocation(invocation);
  return {
    invocation,
    lowering,
    attributeFragment: lowering.fragments.find((fragment): fragment is AppBuilderTemplateAttributePartSourceFragment =>
      fragment.kind === AppBuilderPartSourceFragmentKind.TemplateAttribute
    ) ?? null,
  };
}
