import { createSignal } from './reactivity.js';
import { globalAuthManager } from './auth.js';
import { globalTelemetry } from './telemetry.js';

/**
 * @typedef {Object} RouteEntry
 * @property {string} layout - The root layout component tag (e.g. 'fe-dashboard')
 * @property {Record<string, string>} slots - Map of slot names to component tags
 */

/**
 * @typedef {Record<string, RouteEntry>} RouteManifest
 */

export class RouterEngine {
  /**
   * @param {RouteManifest} manifest 
   */
  constructor(manifest = {}) {
    this.manifest = manifest;
    
    // The current URL path is a reactive signal
    const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const [getPath, setPath] = createSignal(initialPath);
    
    this.getPath = getPath;
    this._setPath = setPath;

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this._setPath(window.location.pathname);
      });
    }
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
    const route = this.manifest[path] || null;
    
    // Phase 8: Enterprise Route Guard
    if (route && route.requiresAuth && !globalAuthManager.isAuthenticated()) {
      // Force redirect to login
      console.warn(`Fe Router: Access to ${path} denied. Redirecting to /login.`);
      this.navigate('/login');
      // Return the login route so the UI paints it immediately
      return this.manifest['/login'] || null;
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
        // We don't need to append it to the body; just creating it 
        // might be enough to trigger constructor data demands.
        // If components use connectedCallback for demands, we can append to a detached fragment.
        const fragment = document.createDocumentFragment();
        fragment.appendChild(layoutEl);
        
        // Also preload slot components
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
