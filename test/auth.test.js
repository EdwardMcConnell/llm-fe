import { describe, it, expect } from 'vitest';
import { AuthProvider } from '../generated-examples/auth/auth.generated.js';

describe('Generated AuthProvider (Contract-First)', () => {
  it('should initialize correctly', () => {
    const provider = new AuthProvider();
    expect(provider.isAuthenticated()).toBe(false);
  });

  it('should login, store token, and notify listeners', async () => {
    const provider = new AuthProvider();
    
    let notifiedAuth = false;
    provider.onAuthStateChanged((isAuth) => {
      notifiedAuth = isAuth;
    });

    await provider.login('mock-token');

    expect(provider.isAuthenticated()).toBe(true);
    expect(provider.getToken()).toBe('mock-token');
    expect(notifiedAuth).toBe(true);
  });

  it('should evaluate routeGuard correctly based on contract rules', async () => {
    const provider = new AuthProvider();
    
    // Guest access to a protected route should redirect
    expect(provider.routeGuard('/dashboard')).toBe('/login');
    // Guest access to an unprotected route should allow
    expect(provider.routeGuard('/login')).toBe(true);

    // After login, protected routes should be allowed
    await provider.login('mock-token');
    expect(provider.routeGuard('/dashboard')).toBe(true);
  });
});
