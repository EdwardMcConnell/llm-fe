import { bench, describe } from 'vitest';
import { createGridApp } from '../generated-examples/data-grid/data-grid-app-wireup.generated.js';
import { SharedMap } from '../src/crdt.js';

describe('Data Grid Benchmarks', () => {
  const map = new SharedMap('gridBench');
  map.set('grid:columns', ['id', 'name', 'status']);
  const rows = [];
  for(let i=0; i<10000; i++) {
    rows.push('r'+i);
    map.set(`grid:cell:r${i}:id`, 'ID-'+i);
    map.set(`grid:cell:r${i}:name`, 'Name '+i);
    map.set(`grid:cell:r${i}:status`, 'active');
  }
  map.set('grid:rows', rows);

  bench('Render first window (10,000 rows virtualized)', () => {
    const app = createGridApp(map);
    app.dispose();
  });

  const app = createGridApp(map);
  const body = app.root.querySelector('#gridBody');
  Object.defineProperty(body, 'clientHeight', { value: 600, writable: true });
  
  bench('Scroll window (10,000 rows virtualized)', () => {
    body.scrollTop = Math.random() * 5000;
    body.dispatchEvent(new window.Event('scroll'));
  });

  bench('Filter 10,000 rows', () => {
    // Just simulate re-rendering a subset
    map.set('grid:rows', rows.slice(0, 100));
    map.set('grid:rows', rows);
  });
});
