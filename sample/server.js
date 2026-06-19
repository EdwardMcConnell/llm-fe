import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve the sample app files (index.html, app.js, components, etc.)
app.use(express.static(__dirname));
// Serve the Fe UI framework files from the src directory
app.use('/src', express.static(path.join(__dirname, '../src')));

// SPA Fallback to index.html for routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/src')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    next();
  }
});

const server = app.listen(port, () => {
  console.log(`Fe UI Sample (Kanban Board) listening at http://localhost:${port}`);
});

// ==========================================
// Fe UI LCP CRDT WebSocket Hub
// ==========================================
const wss = new WebSocketServer({ server });

// Server-side authoritative CRDT state
const crdtState = new Map();
const crdtClocks = new Map();

// Map<key, Set<WebSocket>>
const subscriptions = new Map();

wss.on('connection', (ws) => {
  ws.authenticated = false;
  
  // A unique ID for the server connection (simulating a client ID)
  const serverClientId = 'server_hub_' + Math.random().toString(36).slice(2);

  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(message);
      
      if (payload.type === 'auth') {
        // Mock authentication validation
        if (payload.token) {
          ws.authenticated = true;
          ws.send(JSON.stringify({ type: 'auth_success' }));
        } else {
          ws.send(JSON.stringify({ type: 'auth_error' }));
          ws.close();
        }
        return;
      }

      if (!ws.authenticated) return; // Ignore messages if not authenticated

      switch (payload.type) {
        case 'subscribe': {
          const { key } = payload;
          if (!subscriptions.has(key)) {
            subscriptions.set(key, new Set());
          }
          subscriptions.get(key).add(ws);
          
          // Send the current state to the newly subscribed client
          if (crdtState.has(key)) {
            ws.send(JSON.stringify({
              type: 'set',
              key,
              value: crdtState.get(key),
              clock: crdtClocks.get(key),
              client: serverClientId
            }));
          }
          break;
        }

        case 'unsubscribe': {
          const { key } = payload;
          if (subscriptions.has(key)) {
            subscriptions.get(key).delete(ws);
          }
          break;
        }

        case 'set': {
          const { key, value, clock, client } = payload;
          
          const currentClock = crdtClocks.get(key) || 0;
          
          // CRDT Merge Logic (Lamport Clock + Client ID Tie-breaker)
          // The backend resolves conflicts to ensure eventual consistency
          if (clock > currentClock || (clock === currentClock && client > serverClientId)) {
            crdtState.set(key, value);
            crdtClocks.set(key, clock);
            
            // Broadcast to all OTHER subscribers
            const subs = subscriptions.get(key);
            if (subs) {
              const patchString = JSON.stringify(payload);
              for (const subscriberWs of subs) {
                if (subscriberWs !== ws && subscriberWs.readyState === 1 /* OPEN */) {
                  subscriberWs.send(patchString);
                }
              }
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('WebSocket Error:', e);
    }
  });

  ws.on('close', () => {
    // Cleanup subscriptions
    for (const [key, subs] of subscriptions.entries()) {
      subs.delete(ws);
    }
  });
});
