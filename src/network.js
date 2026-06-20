import { globalAuthManager } from './auth.js';

/**
 * WebSocket Network Layer for LLM Context Protocol (LCP).
 * Syncs the SharedMap JSON CRDTs across the network, secured by AuthManager.
 */

export class LCPSyncProvider {
  /**
   * @param {string} url - WebSocket server URL
   * @param {import('./crdt.js').SharedMap} sharedMap - The CRDT map to sync
   */
  constructor(url, sharedMap) {
    this.url = url;
    this.sharedMap = sharedMap;
    /** @type {WebSocket | null} */
    this.ws = null;
    this.connected = false;
    this.authenticated = false;
    /** @type {Set<string>} */
    this.pendingSubscriptions = new Set();

    // Listen to local patches and send them to the server securely
    this.sharedMap.onPatch((patch) => {
      this.broadcast(patch);
    });

    // Phase 10: Partial Network Replication (Subscribe)
    this.sharedMap.onNetworkSubscribe((key) => {
      if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'subscribe', key }));
      } else {
        this.pendingSubscriptions.add(key);
      }
    });

    // Phase 10: Partial Network Replication (Unsubscribe)
    this.sharedMap.onEvict((key) => {
      if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'unsubscribe', key }));
      }
    });

    // Phase 8: Secure Handshake trigger
    globalAuthManager.onAuthStateChanged((isAuth) => {
      if (isAuth) {
        if (!this.connected) this.connect();
        else this.sendAuthHandshake(); // Token refreshed, re-authenticate socket
      } else {
        this.disconnect();
      }
    });

    // Phase 9: Telemetry Stream Listener
    if (typeof window !== 'undefined') {
      window.addEventListener('fe-telemetry-flush', (e) => {
        if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
          // Stream the batch securely over the LCP socket!
          this.ws.send(JSON.stringify(e.detail));
        }
      });
    }
  }

  connect() {
    if (!globalAuthManager.isAuthenticated()) return; // Zero-trust constraint

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.connected = true;
      console.log('LCP Socket Opened. Sending Handshake...');
      this.sendAuthHandshake();
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        // Handle Secure Handshake Responses
        if (payload.type === 'auth_success') {
          this.authenticated = true;
          console.log('LCP Secure Handshake Complete. Sync Active.');
          
          // Flush pending subscriptions
          for (const key of this.pendingSubscriptions) {
            this.ws.send(JSON.stringify({ type: 'subscribe', key }));
          }
          this.pendingSubscriptions.clear();
        } else if (payload.type === 'auth_error') {
          console.error('LCP Handshake Failed. Disconnecting.');
          this.disconnect();
        } 
        // Handle CRDT Patches
        else if (this.authenticated && (payload.type === 'set' || payload.type === 'delete') && payload.client !== this.sharedMap.clientId) {
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
      // Reconnect automatically if still logged in
      if (globalAuthManager.isAuthenticated()) {
        setTimeout(() => this.connect(), 2000);
      }
    };
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: globalAuthManager.getToken()
      }));
    }
  }

  /**
   * @param {import('./crdt.js').LCPPatch} patch 
   */
  broadcast(patch) {
    if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(patch));
    }
  }
}
