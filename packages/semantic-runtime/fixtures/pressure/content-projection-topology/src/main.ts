import Aurelia from 'aurelia';
import { ContentProjectionTopologyApp } from './content-projection-topology-app';
import { ProjectionReceiver } from './projection-receiver';
import { ProjectionRelay } from './projection-relay';
import { ShadowSlotReceiver } from './shadow-slot-receiver';
import { SlotReachabilityReceiver } from './slot-reachability-receiver';

void Aurelia
  .register(ProjectionReceiver, ProjectionRelay, ShadowSlotReceiver, SlotReachabilityReceiver)
  .app({
    host: document.querySelector('app-root')!,
    component: ContentProjectionTopologyApp,
  })
  .start();
