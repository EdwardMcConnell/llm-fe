/**
 * Core Reactivity System for Fe UI.
 * Pure Vanilla JS with JSDoc typing for LLM consumption.
 * Zero build step required.
 */

/** @type {(() => void) | null} */
export let activeEffect = null;

// Phase 20: Memory Leak Annihilation
// To properly dispose of an effect, we must track which signals the active effect is subscribed to.
/** @type {Set<Signal<any>> | null} */
export let activeEffectSignals = null;

/**
 * A reactive signal primitive.
 * @template T
 */
export class Signal {
  /**
   * @param {T} initialValue 
   */
  constructor(initialValue) {
    /** @type {T} */
    this._value = initialValue;
    /** @type {Set<() => void>} */
    this.subscribers = new Set();
  }

  /**
   * Gets the current value and registers the active effect as a subscriber.
   * @returns {T}
   */
  get() {
    if (activeEffect) {
      this.subscribers.add(activeEffect);
      if (activeEffectSignals) {
        activeEffectSignals.add(this);
      }
    }
    return this._value;
  }

  /**
   * Sets a new value and triggers all subscribed effects.
   * @param {T} newValue 
   */
  set(newValue) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.notify();
    }
  }

  /**
   * Updates the value using a mutator function.
   * @param {(prev: T) => T} updater 
   */
  update(updater) {
    this.set(updater(this._value));
  }

  notify() {
    // Clone the set to avoid infinite loops if effects re-subscribe during iteration
    const subs = Array.from(this.subscribers);
    for (const effect of subs) {
      effect();
    }
  }
}

/**
 * Creates a reactive signal.
 * 
 * @template T
 * @param {T} initialValue - The starting value of the signal.
 * @returns {[() => T, (val: T | ((prev: T) => T)) => void]} A tuple containing a getter function and a setter function.
 */
export function createSignal(initialValue) {
  const signal = new Signal(initialValue);
  
  const getter = () => signal.get();
  
  /** @param {T | ((prev: T) => T)} val */
  const setter = (val) => {
    if (typeof val === 'function') {
      signal.update(/** @type {(prev: T) => T} */ (val));
    } else {
      signal.set(val);
    }
  };

  return [getter, setter];
}

/**
 * Creates an effect that automatically re-runs when its dependencies change.
 * 
 * @param {() => void} fn - The function to execute. Any signals read inside this function will become dependencies.
 * @returns {() => void} A disposer function that removes the effect from all signal subscriptions.
 */
export function createEffect(fn) {
  /** @type {Set<Signal<any>>} */
  const signals = new Set();

  const effect = () => {
    activeEffect = effect;
    activeEffectSignals = signals;
    
    // Clear previous dependencies before re-running
    for (const signal of signals) {
      signal.subscribers.delete(effect);
    }
    signals.clear();

    try {
      fn();
    } finally {
      activeEffect = null;
      activeEffectSignals = null;
    }
  };
  
  // Run immediately to establish initial dependencies
  effect();
  
  // Phase 20: Memory Leak Annihilation
  // Return a deterministic disposer
  return () => {
    for (const signal of signals) {
      signal.subscribers.delete(effect);
    }
    signals.clear();
  };
}

/**
 * Creates an effect that wraps DOM mutations in the View Transitions API.
 * Provides hardware-accelerated native morphing.
 * 
 * @param {() => void} fn
 */
export function createTransitionEffect(fn) {
  let isFirstRun = true;

  const effect = () => {
    if (!isFirstRun && document.startViewTransition) {
      // Hardware-accelerated morphing on state change
      try {
        document.startViewTransition(() => {
          activeEffect = effect;
          try { fn(); } finally { activeEffect = null; }
        });
      } catch (err) {
        // Phase 18: Headless Browser / E2E Testing Self-Healing
        // If the document isn't fully active (Puppeteer) and throws InvalidStateError,
        // we natively catch it and fall back to synchronous rendering instantly.
        activeEffect = effect;
        try { fn(); } finally { activeEffect = null; }
      }
    } else {
      // Synchronous run
      activeEffect = effect;
      try { fn(); } finally { activeEffect = null; }
      isFirstRun = false;
    }
  };
  
  effect();
}
