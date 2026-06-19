/**
 * Parses the payload of a JWT.
 * @param {string} token 
 * @returns {Record<string, any> | null}
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Global Authentication Manager for Fe UI.
 * Handles proactive token refresh and state broadcasting automatically.
 */
export class AuthManager {
  /**
   * @param {() => Promise<string>} refreshTokenFn - The required function to fetch a new JWT
   * @param {{ read: () => Promise<string|null>|string|null, write: (token: string) => Promise<void>|void, clear: () => Promise<void>|void }} [persist] - Optional persistence callbacks
   */
  constructor(refreshTokenFn, persist = null) {
    if (!refreshTokenFn || typeof refreshTokenFn !== 'function') {
      throw new Error('Fe AuthManager requires a refreshTokenFn to guarantee seamless enterprise session management.');
    }
    
    this.refreshTokenFn = refreshTokenFn;
    this.persist = persist;
    this.token = null;
    this.refreshTimeoutId = null;
    this.listeners = new Set();
  }

  /**
   * Autonomously loads the token from the configured persistence layer.
   * Resolves instantly if no layer is configured or if synchronous storage is used.
   * @returns {Promise<boolean>} True if successfully authenticated.
   */
  async hydrate() {
    if (!this.persist) return false;
    try {
      const savedToken = await this.persist.read();
      if (savedToken) {
        return await this.login(savedToken);
      }
    } catch (err) {
      console.warn('Fe AuthManager: Hydration failed.', err);
    }
    return false;
  }

  /**
   * Validates the JWT, sets the active token, schedules proactive refresh, and persists asynchronously.
   * @param {string} jwtToken 
   * @returns {Promise<boolean>} True if the token was valid.
   */
  async login(jwtToken) {
    const payload = parseJwt(jwtToken);
    
    // Strict Gatekeeping: Reject malformed or corrupted tokens
    if (!payload || !payload.exp) {
      await this.logout();
      return false;
    }

    this.token = jwtToken;
    
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }

    const expiresAtMs = payload.exp * 1000;
    const nowMs = Date.now();
    // Refresh 60 seconds before expiration
    const refreshInMs = expiresAtMs - nowMs - (60 * 1000);
    
    if (refreshInMs > 0) {
      this.refreshTimeoutId = setTimeout(() => this.forceRefresh(), refreshInMs);
    } else {
      // Token already expired or expires in < 60s
      this.forceRefresh();
    }

    // Synchronously notify UI immediately
    this._notify();

    // Asynchronously write to storage (preventing I/O lag from blocking the render thread)
    if (this.persist) {
      try {
        await this.persist.write(jwtToken);
      } catch (err) {
        console.warn('Fe AuthManager: Failed to persist token.', err);
      }
    }

    return true;
  }

  async logout() {
    this.token = null;
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }
    
    // Synchronously notify UI immediately
    this._notify();

    // Asynchronously clear storage
    if (this.persist) {
      try {
        await this.persist.clear();
      } catch (err) {
        console.warn('Fe AuthManager: Failed to clear persisted token.', err);
      }
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  getToken() {
    return this.token;
  }

  /**
   * Used by DemandManager (401 Replay) or internal timer.
   * @returns {Promise<void>}
   */
  async forceRefresh() {
    try {
      const newToken = await this.refreshTokenFn();
      await this.login(newToken);
    } catch (err) {
      console.error('Fe AuthManager: Token refresh failed.', err);
      await this.logout();
      throw err;
    }
  }

  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    for (const listener of this.listeners) {
      listener(this.isAuthenticated());
    }
  }
}

// Example Mock implementation for testing
export const globalAuthManager = new AuthManager(async () => {
  // In a real app, this makes a fetch('/api/refresh')
  return 'mock-refreshed-jwt.token.base64';
});
