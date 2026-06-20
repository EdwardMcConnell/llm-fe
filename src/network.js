/**
 * WebSocket Network Layer for LLM Context Protocol (LCP).
 * Syncs the SharedMap JSON CRDTs across the network.
 */

export class LCPSyncProvider {
  /**
   * @param {string} url - WebSocket server URL
   * @param {import('./crdt.js').SharedMap} sharedMap - The CRDT map to sync
   * @param {Object} [config]
   * @param {() => string|null} [config.getToken] - Returns the current auth token for handshake
   * @param {() => void} [config.onAuthError] - Callback invoked when the socket handshake fails
   */
  constructor(url, sharedMap, config = {}) {
    this.url = url;
    this.sharedMap = sharedMap;
    this.getToken = config.getToken || (() => null);
    this.onAuthError = config.onAuthError || null;
    
    /** @type {WebSocket | null} */
    this.ws = null;
    this.connected = false;
    this.authenticated = false; // We assume true if no token is required, else we wait for handshake
    this.needsAuth = !!config.getToken; 
    
    /** @type {Set<string>} */
    this.pendingSubscriptions = new Set();

    // Listen to local patches and send them to the server
    this.sharedMap.onPatch((patch) => {
      this.broadcast(patch);
    });

    // Phase 10: Partial Network Replication (Subscribe)
    this.sharedMap.onNetworkSubscribe((key) => {
      if (this.canSend()) {
        this.ws.send(JSON.stringify({ type: 'subscribe', key }));
      } else {
        this.pendingSubscriptions.add(key);
      }
    });

    // Phase 10: Partial Network Replication (Unsubscribe)
    this.sharedMap.onEvict((key) => {
      if (this.canSend()) {
        this.ws.send(JSON.stringify({ type: 'unsubscribe', key }));
      }
    });

    // Phase 9: Telemetry Stream Listener
    if (typeof window !== 'undefined') {
      window.addEventListener('fe-telemetry-flush', (e) => {
        if (this.canSend()) {
          // Stream the batch securely over the LCP socket!
          this.ws.send(JSON.stringify(e.detail));
        }
      });
    }
  }

  canSend() {
    return this.ws?.readyState === WebSocket.OPEN && (!this.needsAuth || this.authenticated);
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.connected = true;
      if (this.needsAuth) {
        console.log('LCP Socket Opened. Sending Handshake...');
        this.sendAuthHandshake();
      } else {
        console.log('LCP Socket Opened (Unauthenticated). Sync Active.');
        this.authenticated = true;
        this.flushPendingSubscriptions();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        // Handle Secure Handshake Responses
        if (payload.type === 'auth_success') {
          this.authenticated = true;
          console.log('LCP Secure Handshake Complete. Sync Active.');
          this.flushPendingSubscriptions();
        } else if (payload.type === 'auth_error') {
          console.error('LCP Handshake Failed. Disconnecting.');
          if (this.onAuthError) this.onAuthError();
          this.disconnect();
        } 
        // Handle CRDT Patches
        else if (this.canSend() && (payload.type === 'set' || payload.type === 'delete') && payload.client !== this.sharedMap.clientId) {
          this.sharedMap.merge(payload);
        }
      } catch (e) {
        console.error('Failed to parse LCP payload:', e);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.authenticated = false;
      console.log('LCP Socket Closed.');
      // The generated app layer should manage reconnection logic based on app state
    };
  }

  flushPendingSubscriptions() {
    for (const key of this.pendingSubscriptions) {
      this.ws.send(JSON.stringify({ type: 'subscribe', key }));
    }
    this.pendingSubscriptions.clear();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
  }

  sendAuthHandshake() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.getToken) {
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: this.getToken()
      }));
    }
  }

  /**
   * @param {import('./crdt.js').LCPPatch} patch 
   */
  broadcast(patch) {
    if (this.canSend()) {
      this.ws.send(JSON.stringify(patch));
    }
  }
}
