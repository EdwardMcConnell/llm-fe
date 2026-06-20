import { createSharedSignal } from './shared.js';

/**
 * The Demand Manager handles in-flight deduplication of API requests.
 * Designed to work invisibly so the LLM doesn't have to worry about race conditions.
 */
class DemandManager {
  /**
   * @param {Object} [config]
   * @param {() => string|null} [config.getToken] - Returns the current auth token
   * @param {(fetcher: () => Promise<any>) => Promise<any>} [config.on401] - Callback to handle 401 retries
   */
  constructor(config = {}) {
    /** @type {Map<string, Promise<any>>} */
    this.inFlight = new Map();
    this.getToken = config.getToken || (() => null);
    this.on401 = config.on401 || null;
  }

  /**
   * Configures auth hooks dynamically (useful for generated wireups)
   * @param {{ getToken?: () => string|null, on401?: (fetcher: () => Promise<any>) => Promise<any> }} config 
   */
  setConfig(config) {
    if (config.getToken) this.getToken = config.getToken;
    if (config.on401) this.on401 = config.on401;
  }

  /**
   * Internal executor that handles 401 replays seamlessly if configured.
   */
  async _executeWithReplay(fetcher) {
    try {
      // Pass the current token to the LLM's fetcher so it doesn't have to look it up
      return await fetcher(this.getToken());
    } catch (err) {
      // Catch 401 Unauthorized errors
      if (err.status === 401 || (err.message && err.message.includes('401'))) {
        if (this.on401) {
          console.warn('DemandManager: 401 Unauthorized caught. Delegating to auth config...');
          return await this.on401(fetcher);
        }
      }
      throw err; // Not a 401, or no retry configured, rethrow
    }
  }

  /**
   * Demands data from the network if it's not already in the CRDT.
   * Deduplicates simultaneous requests for the same key.
   * 
   * @param {import('./crdt.js').SharedMap} sharedMap 
   * @param {string} key 
   * @param {() => Promise<any>} fetcher - The LLM-written pure fetch/transform function.
   * @returns {[() => any, (val: any) => void]} A reactive signal tuple
   */
  demand(sharedMap, key, fetcher) {
    // 1. Check if the CRDT already has the data globally cached.
    const existing = sharedMap.get(key);
    if (existing !== undefined) {
      // Data exists, return a reactive signal immediately.
      return createSharedSignal(sharedMap, key, existing);
    }

    // 2. Data is missing. We must fetch it. Provide an initial 'null' or loading state signal.
    const signalTuple = createSharedSignal(sharedMap, key, null);
    const [, setSignal] = signalTuple;

    // 3. Check if another component is currently fetching this exact key.
    if (this.inFlight.has(key)) {
      // Just wait for the existing fetch to finish; the CRDT will automatically update the signal.
      return signalTuple;
    }

    // 4. Initiate the fetch and track it to prevent duplicates.
    const fetchPromise = this._executeWithReplay(fetcher)
      .then((cleanData) => {
        // Once fetched, update the signal, which updates the CRDT and broadcasts.
        setSignal(cleanData);
      })
      .catch((err) => {
        console.error(`Fe: Failed to fetch demanded data for key "${key}"`, err);
      })
      .finally(() => {
        // Clean up the in-flight tracker.
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, fetchPromise);

    return signalTuple;
  }
}

// Singleton instance for the application
export const globalDemandManager = new DemandManager();
