import { bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';

let dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const { FeElement } = await import('../../../src/component.js');
await import('./grid.js');

describe('Gauntlet App: Data Grid Benchmarks', () => {

  const data = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    status: i % 2 === 0 ? 'Active' : 'Inactive',
    score: Math.random() * 100
  }));

  bench('Render first window (10,000 rows virtualized)', () => {
    const grid = document.createElement('sample-grid');
    document.body.appendChild(grid);
    grid.data = data;
    // trigger render
    grid._renderVirtualData(0, 1000); 
    document.body.removeChild(grid);
  }, { time: 500 });

  let scrollGrid;
  let scrollIdx = 0;

  bench('Scroll window (10,000 rows virtualized)', () => {
    if (!scrollGrid) {
      scrollGrid = document.createElement('sample-grid');
      document.body.appendChild(scrollGrid);
      scrollGrid.data = data;
    }
    scrollIdx += 10;
    if (scrollIdx > 5000) scrollIdx = 0;
    scrollGrid._renderVirtualData(scrollIdx, scrollIdx + 1000);
  }, { time: 500 });

  let filterGrid;

  bench('Filter 10,000 rows', () => {
    if (!filterGrid) {
      filterGrid = document.createElement('sample-grid');
      document.body.appendChild(filterGrid);
      filterGrid.data = data;
    }
    const filtered = data.filter(r => r.name.includes('999'));
    filterGrid._renderVirtualData(0, 1000, filtered);
  }, { time: 500 });

});
