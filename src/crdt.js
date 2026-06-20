/**
 * @typedef {Object} LCPPatch
 * @property {'set'|'delete'} type
 * @property {string} key
 * @property {any} [value]
 * @property {number} clock
 * @property {string} client
 */

/**
 * A Last-Writer-Wins Map (LWW-Map) CRDT utilizing Lamport Clocks.
 * Now equipped with a native Garbage Collector (GC) to prevent enterprise memory bloat.
 */
export class SharedMap {
  constructor(clientId = Math.random().toString(36).slice(2)) {
    this.clientId = clientId;
    this.state = new Map();
    this.clocks = new Map(); // Tracks logical clock per key
    this.clock = 0; // Local Lamport clock
    this.listeners = new Set();
    this.patchListeners = new Set();
    
    // Phase 10: Memory Management
    /** @type {Map<string, number>} */
    this.subscribers = new Map();
    /** @type {Map<string, number>} */
    this.accessLog = new Map();
    this.subscribeListeners = new Set();
    this.evictListeners = new Set();
    
    this.gcIntervalId = null;
  }

  static generateClientId() {
    return Math.random().toString(36).slice(2);
  }

  /**
   * Generates a logical timestamp.
   * @returns {number}
   */
  _tick() {
    this.clock++;
    return this.clock;
  }

  get(key) {
    return this.state.get(key);
  }

  set(key, value) {
    const ts = this._tick();
    this._applySet(key, value, ts, this.clientId);
    
    const patch = {
      type: 'set',
      key,
      value,
      clock: ts,
      client: this.clientId
    };
    
    this._notifyPatch(patch);
  }

  /**
   * @param {string} key 
   * @param {any} value 
   * @param {number} patchClock 
   * @param {string} client 
   */
  _applySet(key, value, patchClock, client) {
    // Lamport clock sync
    this.clock = Math.max(this.clock, patchClock);
    
    const currentClock = this.clocks.get(key) || 0;
    
    if (patchClock > currentClock || (patchClock === currentClock && client > this.clientId)) {
      this.state.set(key, value);
      this.clocks.set(key, patchClock);
      this._notifyLocal(key, value);
    }
  }

  /**
   * Merges an incoming LCP Patch from the network.
   * @param {LCPPatch} patch 
   */
  merge(patch) {
    // Phase 20: Boundary Validation (LLM Contract Enforcement)
    // External data cannot be trusted. We explicitly validate the shape.
    if (!patch || typeof patch !== 'object') {
      console.error('CRDT: Rejected malformed patch (not an object)', patch);
      return;
    }
    if (typeof patch.key !== 'string' || !patch.key) {
      console.error('CRDT: Rejected malformed patch (invalid key)', patch);
      return;
    }
    if (typeof patch.clock !== 'number') {
      console.error('CRDT: Rejected malformed patch (invalid clock)', patch);
      return;
    }
    if (typeof patch.client !== 'string' || !patch.client) {
      console.error('CRDT: Rejected malformed patch (invalid client)', patch);
      return;
    }

    if (patch.type === 'set') {
      this._applySet(patch.key, patch.value, patch.clock, patch.client);
    }
  }

  /**
   * @param {(key: string, value: any) => void} callback 
   * @returns {() => void}
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * @param {(patch: LCPPatch) => void} callback 
   */
  onPatch(callback) {
    this.patchListeners.add(callback);
  }

  _notifyLocal(key, value) {
    for (const listener of this.listeners) {
      listener(key, value);
    }
  }

  _notifyPatch(patch) {
    for (const listener of this.patchListeners) {
      listener(patch);
    }
  }

  // --- PHASE 10: MEMORY GARBAGE COLLECTION ---

  incrementSubscriber(key) {
    const current = this.subscribers.get(key) || 0;
    this.subscribers.set(key, current + 1);
    this.accessLog.set(key, Date.now());
    
    if (current === 0) {
      for (const listener of this.subscribeListeners) {
        listener(key);
      }
    }
  }

  decrementSubscriber(key) {
    const current = this.subscribers.get(key) || 0;
    const next = Math.max(0, current - 1);
    this.subscribers.set(key, next);
    
    // When a component unmounts, log the access time so the eviction timer begins
    if (next === 0) {
      this.accessLog.set(key, Date.now());
    }
  }

  onNetworkSubscribe(callback) {
    this.subscribeListeners.add(callback);
  }

  onEvict(callback) {
    this.evictListeners.add(callback);
  }

  /**
   * Starts the autonomous Garbage Collector Sweeper.
   * @param {number} timeoutMs - Idle time before eviction (e.g. 5 mins = 300000ms)
   * @param {number} intervalMs - How often the sweeper runs (e.g. 1 min = 60000ms)
   */
  startGarbageCollector(timeoutMs = 300000, intervalMs = 60000) {
    if (this.gcIntervalId) clearInterval(this.gcIntervalId);
    
    this.gcIntervalId = setInterval(() => {
      const now = Date.now();
      for (const [key, subs] of this.subscribers.entries()) {
        if (subs === 0) {
          const lastAccess = this.accessLog.get(key) || 0;
          if (now - lastAccess > timeoutMs) {
            this._evict(key);
          }
        }
      }
    }, intervalMs);
  }

  /**
   * Silently evicts the key from local RAM and notifies the network layer to unsubscribe.
   * @param {string} key 
   */
  _evict(key) {
    this.state.delete(key);
    this.clocks.delete(key);
    this.subscribers.delete(key);
    this.accessLog.delete(key);
    
    console.log(`CRDT GC: Evicted "${key}" from local memory.`);
    
    for (const listener of this.evictListeners) {
      listener(key);
    }
  }
}
