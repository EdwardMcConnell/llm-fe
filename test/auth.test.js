import { describe, it, expect, vi } from 'vitest';
import { AuthManager } from '../src/auth.js';

describe('Fe AuthManager (Phase 8)', () => {
  it('should initialize and enforce refreshTokenFn contract', () => {
    expect(() => new AuthManager()).toThrow();
    
    const validManager = new AuthManager(async () => 'new-token');
    expect(validManager.isAuthenticated()).toBe(false);
  });

  it('should login, decode mock JWT, and notify listeners', () => {
    const manager = new AuthManager(async () => 'new-token');
    
    let notifiedAuth = false;
    manager.onAuthStateChanged((isAuth) => {
      notifiedAuth = isAuth;
    });

    // Mock a JWT payload: { "exp": 9999999999 } -> base64
    const mockPayload = btoa(JSON.stringify({ exp: 9999999999 }));
    manager.login(`header.${mockPayload}.signature`);

    expect(manager.isAuthenticated()).toBe(true);
    expect(notifiedAuth).toBe(true);
  });

  it('should force refresh on demand', async () => {
    const mockPayload = btoa(JSON.stringify({ exp: 9999999999 }));
    const validMockToken = `header.${mockPayload}.signature`;

    const manager = new AuthManager(async () => validMockToken);
    
    await manager.forceRefresh();
    
    expect(manager.getToken()).toBe(validMockToken);
    expect(manager.isAuthenticated()).toBe(true);
  });
});
