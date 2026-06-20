import './manifest.js';
import { globalRouter } from '/src/router.js';
console.log('Manifest initialized:', globalRouter.manifest);
import { globalAuthManager } from '/src/auth.js';
console.log('Is Authenticated?', globalAuthManager.isAuthenticated());
import { globalSharedMap } from '/src/store.js';
import { LCPSyncProvider } from '/src/network.js';

// Import core primitives
import '/src/primitives.js';
import '/src/ui.js';

// Import our custom components
import './components/layout.js';
import './components/login.js';
import '../gauntlet/apps/normalized-kanban/board.js';
import '../gauntlet/apps/data-grid/grid.js';
import '../gauntlet/apps/settings-form/settings.js';
import '../gauntlet/apps/live-dashboard/dashboard.js';
import '../gauntlet/apps/product-catalog/catalog.js';

// 1. Setup global CRDT Map and Network sync via the WebSocket Hub
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}`;
const networkProvider = new LCPSyncProvider(wsUrl, globalSharedMap);

// 2. Configure Auth Persistence & Hydrate Session
globalAuthManager.persist = {
  read: () => localStorage.getItem('fe_sample_token'),
  write: (token) => localStorage.setItem('fe_sample_token', token),
  clear: () => localStorage.removeItem('fe_sample_token')
};

// 3. Hydrate Session
// RouterEngine will automatically wait for this to finish before evaluating routes
globalAuthManager.hydrate();

// 4. Mount Router (Dynamically imported to prevent hoisting race conditions with Auth Hydration)
import('/src/router-component.js');
