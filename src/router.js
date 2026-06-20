import { createSignal } from './reactivity.js';
import { globalTelemetry } from './telemetry.js';

/**
 * @typedef {Object} RouteEntry
 * @property {string} layout - The root layout component tag (e.g. 'fe-dashboard')
 * @property {Record<string, string>} slots - Map of slot names to component tags
 * @property {boolean} [requiresAuth] - Whether the route requires authentication
 */

/**
 * @typedef {Record<string, RouteEntry>} RouteManifest
 */

export class RouterEngine {
  /**
   * @param {RouteManifest} manifest 
   * @param {Object} [config]
   * @param {(path: string, route: RouteEntry) => boolean|string} [config.routeGuard] - Callback to intercept navigation. Returns true to proceed, false to halt, or a string to redirect.
   */
  constructor(manifest = {}, config = {}) {
    this.manifest = manifest;
    this.routeGuard = config.routeGuard || null;
    this.isHydrating = true; // Apps should set to false when ready
    
    // The current URL path is a reactive signal
    const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const [getPath, setPath] = createSignal(initialPath);
    
    // Internal reactive trigger to force route re-evaluations (e.g. after auth hydration)
    const [getRefreshTrigger, setRefreshTrigger] = createSignal(0);
    this._getRefreshTrigger = getRefreshTrigger;
    this._setRefreshTrigger = setRefreshTrigger;
    
    this.getPath = getPath;
    this._setPath = setPath;

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this._setPath(window.location.pathname);
      });
    }
  }

  /**
   * Forces the router to re-evaluate the current route (useful after hydration completes)
   */
  triggerRefresh() {
    this._setRefreshTrigger(Math.random());
  }

  /**
   * Navigates to a new path.
   * @param {string} path 
   */
  navigate(path) {
    if (this.getPath() === path) return;
    const start = performance.now();

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    this._setPath(path);

    // Native Telemetry Hook (Phase 9)
    globalTelemetry.track('NAVIGATION', {
      path,
      latencyMs: performance.now() - start
    });
  }

  /**
   * Looks up a route in the manifest. Supports exact matches for now.
   * Future LLMs can easily add regex/param matching here.
   * @param {string} path 
   * @returns {RouteEntry | null}
   */
  matchRoute(path) {
    // Register the refresh trigger as a dependency for the route guard
    this._getRefreshTrigger();
    
    const route = this.manifest[path] || null;
    
    // Phase 18: Hydration-Aware Routing Guard
    // If the app explicitly sets isHydrating to true, we pause routing.
    if (this.isHydrating) {
      return null;
    }

    // Phase 8: Enterprise Route Guard
    // Delegated entirely to the generated app wireup
    if (route && this.routeGuard) {
      const guardResult = this.routeGuard(path, route);
      if (guardResult === false) {
        return null;
      }
      if (typeof guardResult === 'string' && guardResult !== path) {
        this.navigate(guardResult);
        return this.manifest[guardResult] || null;
      }
    }

    return route;
  }

  /**
   * Pre-fetches a route by creating its components in memory.
   * This triggers their constructor/connectedCallback logic, forcing `demandData()`
   * to fire and populate the CRDT invisibly before the user even clicks.
   * @param {string} path 
   */
  preload(path) {
    const route = this.matchRoute(path);
    if (!route) return;

    // Create the layout in memory
    if (typeof document !== 'undefined') {
      try {
        const layoutEl = document.createElement(route.layout);
        const fragment = document.createDocumentFragment();
        fragment.appendChild(layoutEl);
        
        for (const [slotName, tag] of Object.entries(route.slots || {})) {
          const slotEl = document.createElement(tag);
          slotEl.setAttribute('slot', slotName);
          layoutEl.appendChild(slotEl);
        }
      } catch (err) {
        // Ignore errors for unregistered custom elements during preload
      }
    }
  }
}

// Global Singleton Router
export const globalRouter = new RouterEngine();
