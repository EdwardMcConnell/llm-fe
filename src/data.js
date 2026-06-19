import { createSharedSignal } from './shared.js';
import { globalAuthManager } from './auth.js';

/**
 * The Demand Manager handles in-flight deduplication of API requests.
 * Designed to work invisibly so the LLM doesn't have to worry about race conditions.
 */
class DemandManager {
  constructor() {
    /** @type {Map<string, Promise<any>>} */
    this.inFlight = new Map();
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * Internal executor that handles 401 replays seamlessly.
   */
  async _executeWithReplay(fetcher) {
    // If a refresh is currently happening, wait for it before even trying
    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise;
    }

    try {
      // Pass the current token to the LLM's fetcher so it doesn't have to look it up
      return await fetcher(globalAuthManager.getToken());
    } catch (err) {
      // Catch 401 Unauthorized errors
      if (err.status === 401 || (err.message && err.message.includes('401'))) {
        console.warn('DemandManager: 401 Unauthorized caught. Triggering Replay Engine...');
        
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          this.refreshPromise = globalAuthManager.forceRefresh().finally(() => {
            this.isRefreshing = false;
          });
        }
        
        // Wait for the new token
        await this.refreshPromise;
        
        // Replay the exact same fetcher seamlessly with the NEW token
        console.log('DemandManager: Replaying fetch...');
        return await fetcher(globalAuthManager.getToken());
      }
      throw err; // Not a 401, rethrow
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
