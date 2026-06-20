import { SharedMap } from '../src/crdt.js';
import { createKanbanApp } from '../generated-examples/normalized-kanban/kanban-app.generated.js';

const appContainer = document.getElementById('app-container');
const promptInput = document.getElementById('prompt-input');
const promptBtn = document.getElementById('prompt-btn');
const statusEl = document.getElementById('status');

// Setup SSE for Live Reload and Status Updates
const sse = new EventSource('/_sse');
sse.onmessage = (event) => {
  if (event.data === 'reload') {
    window.location.reload();
  } else if (event.data.startsWith('msg:')) {
    showStatus(event.data.substring(4));
  } else if (event.data.startsWith('sync:')) {
    sharedMap.merge(JSON.parse(event.data.substring(5)));
  }
};

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.style.opacity = '1';
  if (text.includes('Done')) {
    setTimeout(() => { statusEl.style.opacity = '0'; }, 3000);
  }
}

// Handle Prompts
async function submitPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  promptBtn.disabled = true;
  promptInput.disabled = true;
  showStatus('Sending intent to LLM Hot-Path...');

  try {
    const res = await fetch('/_prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const result = await res.json();
    if (result.error) {
      showStatus('Error: ' + result.error);
      promptBtn.disabled = false;
      promptInput.disabled = false;
    }
  } catch (err) {
    showStatus('Network Error');
    promptBtn.disabled = false;
    promptInput.disabled = false;
  }
}

promptBtn.addEventListener('click', submitPrompt);
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitPrompt();
});

// Initialize Application
const sharedMap = new SharedMap('kanban-demo-' + Math.random().toString(36).slice(2));
window.__SHARED_MAP__ = sharedMap;

// Hook up network sync
sharedMap.onPatch((patch) => {
  // Prevent echo loops: if patch originated from someone else, we don't broadcast it again
  if (patch.client !== sharedMap.clientId) return;

  fetch('/_sync', {
    method: 'POST',
    body: JSON.stringify(patch)
  }).catch(console.error);
});

// Add some sample data so the board isn't empty
sharedMap.set('kanban:item:1', { id: '1', title: 'Implement Hot-Path', status: 'in-progress' });
sharedMap.set('kanban:item:2', { id: '2', title: 'Write tests', status: 'todo' });
sharedMap.set('kanban:item:3', { id: '3', title: 'Setup GitHub Actions', status: 'done' });

sharedMap.set('kanban:column:todo:index', { itemIds: ['2'] });
sharedMap.set('kanban:column:in-progress:index', { itemIds: ['1'] });
sharedMap.set('kanban:column:done:index', { itemIds: ['3'] });

const app = createKanbanApp(sharedMap);
appContainer.appendChild(app.root);
