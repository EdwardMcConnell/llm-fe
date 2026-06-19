import './manifest.js';
import { globalRouter } from '/src/router.js';
console.log('Manifest initialized:', globalRouter.manifest);
import { globalAuthManager } from '/src/auth.js';
console.log('Is Authenticated?', globalAuthManager.isAuthenticated());
import { globalSharedMap } from '/src/store.js';
import { LCPSyncProvider } from '/src/network.js';

// Import core primitives
import '/src/primitives.js';
import '/src/router-component.js';

// Import our custom components
import './components/layout.js';
import './components/login.js';
import './components/board.js';

// 1. Setup global CRDT Map and Network sync via the WebSocket Hub
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}`;
const networkProvider = new LCPSyncProvider(wsUrl, globalSharedMap);

// 2. Restore Session from LocalStorage
const savedToken = localStorage.getItem('fe_sample_token');
if (savedToken) {
  try {
    globalAuthManager.login(savedToken);
  } catch (e) {
    localStorage.removeItem('fe_sample_token');
  }
}

// 3. Trigger initial route render
globalRouter.navigate(window.location.pathname);
