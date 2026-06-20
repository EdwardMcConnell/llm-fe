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
  },
  '/grid': {
    layout: 'sample-layout',
    slots: {
      content: 'sample-grid'
    },
    requiresAuth: true
  },
  '/dashboard': {
    layout: 'sample-layout',
    slots: {
      content: 'sample-dashboard'
    },
    requiresAuth: true
  },
  '/catalog': {
    layout: 'sample-layout',
    slots: {
      content: 'sample-catalog'
    },
    requiresAuth: true
  },
  '/settings': {
    layout: 'sample-layout',
    slots: {
      content: 'sample-settings'
    },
    requiresAuth: true
  }
};
