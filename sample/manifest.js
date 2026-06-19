import { globalRouter } from '/src/router.js';

// The routing manifest defines what components map to what slots.
globalRouter.manifest = {
  '/': {
    layout: 'sample-layout',
    slots: {
      content: 'sample-board'
    },
    requiresAuth: true
  },
  '/login': {
    layout: 'sample-layout',
    slots: {
      content: 'sample-login'
    },
    requiresAuth: false
  }
};
