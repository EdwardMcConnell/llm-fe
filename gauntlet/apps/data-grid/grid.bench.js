import { bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';

let dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
dom.window.requestAnimationFrame = global.requestAnimationFrame;
dom.window.cancelAnimationFrame = global.cancelAnimationFrame;
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.ResizeObserver = global.ResizeObserver;

const { FeElement } = await import('../../../src/component.js');
await import('../../../src/primitives.js');
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
    // Let microtasks run if needed, but connectedCallback is sync enough for initial render scheduling
    document.body.removeChild(grid);
  }, { time: 500 });

  let scrollGrid;
  let scrollY = 0;

  bench('Scroll window (10,000 rows virtualized)', () => {
    if (!scrollGrid) {
      scrollGrid = document.createElement('sample-grid');
      document.body.appendChild(scrollGrid);
    }
    const internalGrid = scrollGrid.nodes?.get('grid')?.root;
    if (internalGrid) {
      scrollY += 500;
      if (scrollY > 50000) scrollY = 0;
      internalGrid.scrollTop = scrollY;
      internalGrid.dispatchEvent(new Event('scroll'));
    }
  }, { time: 500 });

  let filterGrid;

  bench('Filter 10,000 rows', () => {
    if (!filterGrid) {
      filterGrid = document.createElement('sample-grid');
      document.body.appendChild(filterGrid);
    }
    const searchInput = filterGrid.querySelector('input[type="search"]');
    if (searchInput) {
      searchInput.value = 'User 999';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, { time: 500 });

});
