import { bench, describe } from 'vitest';
import { createDashboard } from '../generated-examples/live-dashboard/live-dashboard-app-wireup.generated.js';

class MockSharedMap {
  constructor() {
    this.store = new Map();
    this.listeners = new Set();
  }
  get(k) { return this.store.get(k); }
  set(k, v) { this.store.set(k, v); this.notify(k, v); }
  delete(k) { this.store.delete(k); this.notify(k, undefined); }
  entries() { return this.store.entries(); }
  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  notify(key, value) {
    this.listeners.forEach(cb => cb(key, value));
  }
}

describe('Live Dashboard Architecture Performance', () => {

  bench('create dashboard with 10 widgets', () => {
    const map = new MockSharedMap();
    map.set('dashboard:index', { itemIds: Array.from({length: 10}, (_, i) => `w${i}`) });
    for (let i = 0; i < 10; i++) {
      map.set(`dashboard:widget:w${i}`, { id: `w${i}`, title: `Metric ${i}`, currentValue: 50, history: [10, 20, 30, 40, 50], status: 'normal' });
    }
    createDashboard(map);
  });

  bench('patch one widget 10,000 times (high-frequency stream)', () => {
    const map = new MockSharedMap();
    map.set('dashboard:index', { itemIds: ['w1'] });
    map.set('dashboard:widget:w1', { id: 'w1', title: 'Stream', currentValue: 0, history: [0], status: 'normal' });
    const app = createDashboard(map);
    
    for (let i = 0; i < 10000; i++) {
      map.set('dashboard:widget:w1', { id: 'w1', title: 'Stream', currentValue: i, history: [i-2, i-1, i], status: i % 2 === 0 ? 'normal' : 'warning' });
    }
  });

});
