import { bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';

let dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Set up the harness
const { SharedMap } = await import('../../../src/crdt.js');
const { createCustomerOpsConsole } = await import('../../../generated-examples/customer-ops-console/customer-ops-console.generated.js');

describe('Gauntlet App: Customer Ops Console Benchmarks', () => {
  let sharedMap;
  let root;
  let app;
  let counter = 0;

  bench('Mount Full Console', () => {
    const localMap = new SharedMap('client-1');
    const tempRoot = document.createElement('div');
    const localApp = createCustomerOpsConsole(tempRoot, localMap);
    localApp.dispose();
  }, { time: 500 });

  bench('Cross-Component Patch (Select Row & Update Form)', () => {
    if (!app) {
      sharedMap = new SharedMap('client-1');
      root = document.getElementById('root');
      
      // Seed data
      sharedMap.set('grid:columns', ['ID', 'Name']);
      sharedMap.set('grid:rows', ['c1']);
      sharedMap.set('grid:cell:c1:ID', 'C-101');
      sharedMap.set('grid:cell:c1:Name', 'Alice');
      
      sharedMap.set('kanban:item:c1', { id: 'c1', title: 'Alice', status: 'todo' });
      sharedMap.set('kanban:column:todo:index', { itemIds: ['c1'] });

      app = createCustomerOpsConsole(root, sharedMap);
      
      // Force selection
      sharedMap.set('grid:selectedRows', ['c1']);
    }

    // Edit the customer (triggering both form and grid reactivity)
    sharedMap.set('grid:cell:c1:Name', 'Alice ' + counter++);
  }, { time: 500 });

});
