// We don't import LCPSyncProvider directly to avoid circular dependencies,
// so we'll allow dependency injection or global event bus.
// For simplicity in this architecture, we will use a CustomEvent on the window 
// to pass data to the Network layer.

export class TelemetryManager {
  constructor() {
    this.batch = [];
    this.batchTimeout = null;
  }

  /**
   * Tracks an event autonomously.
   * @param {string} eventName 
   * @param {Record<string, any>} payload 
   */
  track(eventName, payload = {}) {
    const event = {
      type: eventName,
      timestamp: performance.now(), // High-res hardware timestamp
      ...payload
    };

    this.batch.push(event);

    if (!this.batchTimeout) {
      // Flush batch every 2 seconds
      this.batchTimeout = setTimeout(() => this.flush(), 2000);
    }
  }

  flush() {
    if (this.batch.length === 0) return;

    // Send to the WebSocket layer
    const wsPayload = {
      type: 'telemetry',
      events: [...this.batch]
    };

    // If we're in the browser, dispatch to the network layer
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fe-telemetry-flush', { detail: wsPayload }));
    }

    this.batch = [];
    this.batchTimeout = null;
  }
}

export const globalTelemetry = new TelemetryManager();
