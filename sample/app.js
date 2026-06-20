import './manifest.js';
import { globalRouter } from '/src/router.js';
console.log('Manifest initialized:', globalRouter.manifest);
import { globalAuthProvider } from '/generated-examples/auth/auth.generated.js';
console.log('Is Authenticated?', globalAuthProvider.isAuthenticated());
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
const networkProvider = new LCPSyncProvider(wsUrl, globalSharedMap, {
  getToken: () => globalAuthProvider.getToken()
});

globalAuthProvider.onAuthStateChanged((isAuth) => {
  if (isAuth) {
    if (!networkProvider.connected) networkProvider.connect();
    else networkProvider.sendAuthHandshake();
  } else {
    networkProvider.disconnect();
  }
});

// 2. Configure Auth Persistence & Hydrate Session
globalAuthProvider.persist = {
  read: () => localStorage.getItem('fe_sample_token'),
  write: (token) => localStorage.setItem('fe_sample_token', token),
  clear: () => localStorage.removeItem('fe_sample_token')
};

// 3. Hydrate Session and Unsuspend Router
(async () => {
  await globalAuthProvider.hydrate();
  globalRouter.isHydrating = false;
  globalRouter.triggerRefresh();

  // 4. Mount Router
  await import('/src/router-component.js');
})();
