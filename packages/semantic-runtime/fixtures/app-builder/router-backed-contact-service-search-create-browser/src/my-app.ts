import { route } from '@aurelia/router';
import { ContactEntryListRoute } from './routes/contact-entry-list-route';
import { ContactEntryDetailRoute } from './routes/contact-entry-detail-route';

@route({
  title: 'Contact Service Search Create Browser',
  routes: [
    {
      path: '',
      redirectTo: 'contacts',
    },
    {
      id: 'contacts',
      path: 'contacts',
      component: ContactEntryListRoute,
      title: 'Contacts',
      viewport: 'main',
      routes: [
        {
          id: 'contact-entry-detail',
          path: ':contactId',
          component: ContactEntryDetailRoute,
          title: 'Contact Detail',
          viewport: 'detail',
        },
      ],
    },
  ],
})
export class MyApp {}