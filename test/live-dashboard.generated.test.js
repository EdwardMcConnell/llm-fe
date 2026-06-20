import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createDashboard } from '../generated-examples/live-dashboard/live-dashboard-app-wireup.generated.js';
import { SharedMap } from '../src/crdt.js';

describe('Live Dashboard Integration Tests', () => {
  let map;

  beforeEach(() => {
    map = new SharedMap('dashboard-test');
  });

  test('app wireup renders dashboard and observes state', () => {
    map.set('dashboard:index', { itemIds: ['w1', 'w2'] });
    map.set('dashboard:widget:w1', { id: 'w1', title: 'CPU', currentValue: 45, history: [10, 20, 30, 45], status: 'normal' });
    map.set('dashboard:widget:w2', { id: 'w2', title: 'Memory', currentValue: 90, history: [80, 85, 90], status: 'critical' });

    const app = createDashboard(map);
    
    // Check elements
    const widget1 = app.root.querySelector('[data-widget-id="w1"]');
    expect(widget1).toBeDefined();
    expect(widget1.querySelector('.widget-title').textContent).toBe('CPU');
    expect(widget1.className).toContain('status-normal');

    const widget2 = app.root.querySelector('[data-widget-id="w2"]');
    expect(widget2).toBeDefined();
    expect(widget2.querySelector('.widget-title').textContent).toBe('Memory');
    expect(widget2.className).toContain('status-critical');

    // Simulate CRDT update
    map.set('dashboard:widget:w1', { id: 'w1', title: 'CPU', currentValue: 55, history: [10, 20, 30, 45, 55], status: 'warning' });

    // Validate update
    expect(widget1.querySelector('.widget-value').textContent).toBe('55');
    expect(widget1.className).toContain('status-warning');
  });
});
