import { SharedMap } from '../src/crdt.js';
import { createDataGrid } from '../generated-examples/data-grid/data-grid.generated.js';

const appContainer = document.getElementById('app-container');
const statusEl = document.getElementById('status');

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.style.opacity = '1';
  setTimeout(() => { statusEl.style.opacity = '0'; }, 3000);
}

const sharedMap = new SharedMap('data-grid-demo-' + Math.random().toString(36).slice(2));

// Setup SSE for Live Sync
const sse = new EventSource('/_sse');
sse.onmessage = (event) => {
  if (event.data === 'reload') {
    window.location.reload();
  } else if (event.data.startsWith('sync:')) {
    sharedMap.merge(JSON.parse(event.data.substring(5)));
  }
};

sharedMap.onPatch((patch) => {
  if (patch.client !== sharedMap.clientId) return;
  fetch('/_sync', {
    method: 'POST',
    body: JSON.stringify(patch)
  }).catch(console.error);
});

// Mock 5,000 rows
const cols = ['ID', 'Name', 'Role', 'Status'];
const rows = [];
for(let i=1; i<=5000; i++) {
  rows.push('r'+i);
  sharedMap.set(`grid:cell:r${i}:ID`, String(i));
  sharedMap.set(`grid:cell:r${i}:Name`, `Employee ${i}`);
  sharedMap.set(`grid:cell:r${i}:Role`, ['Engineer', 'Designer', 'Manager', 'Analyst'][i % 4]);
  sharedMap.set(`grid:cell:r${i}:Status`, i % 3 === 0 ? 'Offline' : 'Online');
}
sharedMap.set('grid:columns', cols);
sharedMap.set('grid:rows', rows);

const app = createDataGrid(sharedMap);
appContainer.appendChild(app.root);

// Expose for e2e
window.__SHARED_MAP__ = sharedMap;
