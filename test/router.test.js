import { describe, it, expect, vi } from 'vitest';
import { RouterEngine } from '../src/router.js';

describe('Fe Router (Phase 6)', () => {
  const manifest = {
    '/': {
      layout: 'fe-dashboard',
      slots: { main: 'fe-home' }
    },
    '/settings': {
      layout: 'fe-dashboard',
      slots: { main: 'fe-settings' }
    }
  };

  it('should initialize with correct path and allow navigation', () => {
    const router = new RouterEngine(manifest);
    // In JSDOM, default location is /
    expect(router.getPath()).toBe('/');

    router.navigate('/settings');
    expect(router.getPath()).toBe('/settings');
  });

  it('should match routes correctly', () => {
    const router = new RouterEngine(manifest);
    expect(router.matchRoute('/')).toEqual({
      layout: 'fe-dashboard',
      slots: { main: 'fe-home' }
    });
    
    expect(router.matchRoute('/404')).toBeNull();
  });

  it('should preload components invisibly in memory to trigger demandData', () => {
    const router = new RouterEngine(manifest);
    
    // Spy on createElement to prove it creates the components in memory
    const createSpy = vi.spyOn(document, 'createElement');
    
    router.preload('/settings');
    
    expect(createSpy).toHaveBeenCalledWith('fe-dashboard');
    expect(createSpy).toHaveBeenCalledWith('fe-settings');
    
    createSpy.mockRestore();
  });
});
