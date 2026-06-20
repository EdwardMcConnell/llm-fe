import { Signal, activeEffect } from './reactivity.js';

/**
 * A reactive signal backed by a CRDT SharedMap.
 * Modifying this signal broadcasts JSON LCP patches over the network.
 * @template T
 */
export class SharedSignal extends Signal {
  /**
   * @param {import('./crdt.js').SharedMap} sharedMap 
   * @param {string} key 
   * @param {T} initialValue 
   */
  constructor(sharedMap, key, initialValue) {
    // If the map already has a value, use it. Otherwise, use initial.
    const existing = sharedMap.get(key);
    super(existing !== undefined ? existing : initialValue);
    
    this.sharedMap = sharedMap;
    this.key = key;

    // Listen for remote patches or other local mutations
    this._unsubscribeFromSharedMap = this.sharedMap.subscribe((updatedKey, updatedValue) => {
      if (updatedKey === this.key) {
        // Bypass the local `set` method to avoid re-broadcasting
        super.set(updatedValue);
      }
    });

    // Initialize the CRDT state if it's empty
    if (existing === undefined) {
      this.sharedMap.set(this.key, initialValue);
    }
  }

  /**
   * Overrides the Signal set method to also update the CRDT.
   * @param {T} newValue 
   */
  set(newValue) {
    if (this._value !== newValue) {
      // Update the CRDT (which handles clock increments and triggers broadcasts)
      this.sharedMap.set(this.key, newValue);
      // Update local reactive state
      super.set(newValue);
    }
  }

  /**
   * Detaches this signal from the global CRDT map.
   */
  dispose() {
    if (this._unsubscribeFromSharedMap) {
      this._unsubscribeFromSharedMap();
      this._unsubscribeFromSharedMap = null;
    }
  }
}

/**
 * Creates a reactive signal bound to a network CRDT.
 * 
 * @template T
 * @param {import('./crdt.js').SharedMap} sharedMap 
 * @param {string} key - The unique identifier for this state in the CRDT map.
 * @param {T} initialValue 
 * @returns {[() => T, (val: T | ((prev: T) => T)) => void, () => void]}
 */
export function createSharedSignal(sharedMap, key, initialValue) {
  const signal = new SharedSignal(sharedMap, key, initialValue);
  
  // Phase 10: Active Subscription Pinning
  sharedMap.incrementSubscriber(key);

  const getter = () => signal.get();
  
  /** @param {T | ((prev: T) => T)} val */
  const setter = (val) => {
    if (typeof val === 'function') {
      signal.update(/** @type {(prev: T) => T} */ (val));
    } else {
      signal.set(val);
    }
  };

  const unsubscribe = () => {
    sharedMap.decrementSubscriber(key);
    signal.dispose(); // Fully sever the listener closure
  };

  return [getter, setter, unsubscribe];
}
