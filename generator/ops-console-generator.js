import fs from 'fs';
import path from 'path';

const outDir = 'generated-examples/customer-ops-console';
fs.mkdirSync(outDir, { recursive: true });

// Copy all the previously generated primitive components AND their wireups!
const filesToCopy = [
  { src: 'generated-examples/auth/auth.generated.js', dest: 'auth.generated.js' },
  { src: 'generated-examples/data-grid/data-grid.generated.js', dest: 'data-grid.generated.js' },
  
  { src: 'generated-examples/settings-form/settings-form.generated.js', dest: 'settings-form.generated.js' },
  { src: 'generated-examples/settings-form/settings-form-app-wireup.generated.js', dest: 'settings-form-app-wireup.generated.js' },
  
  { src: 'generated-examples/normalized-kanban/kanban-board.generated.js', dest: 'kanban-board.generated.js' },
  { src: 'generated-examples/normalized-kanban/kanban-column.generated.js', dest: 'kanban-column.generated.js' },
  { src: 'generated-examples/kanban-card/kanban-card.generated.js', dest: 'kanban-card.generated.js' },
  { src: 'generated-examples/normalized-kanban/kanban-state.generated.js', dest: 'kanban-state.generated.js' },
  { src: 'generated-examples/normalized-kanban/kanban-validators.generated.js', dest: 'kanban-validators.generated.js' },
  { src: 'generated-examples/normalized-kanban/kanban-app.generated.js', dest: 'kanban-app.generated.js' },
  
  { src: 'generated-examples/live-dashboard/live-dashboard-app.generated.js', dest: 'live-dashboard-app.generated.js' },
  { src: 'generated-examples/live-dashboard/live-dashboard-widget.generated.js', dest: 'live-dashboard-widget.generated.js' },
  { src: 'generated-examples/live-dashboard/live-dashboard-app-wireup.generated.js', dest: 'live-dashboard-app-wireup.generated.js' }
];

for (const file of filesToCopy) {
  if (fs.existsSync(file.src)) {
    fs.copyFileSync(file.src, path.join(outDir, file.dest));
  } else {
    console.warn(`Warning: Missing source file ${file.src}. Did you run verify:all first?`);
  }
}

// Generate the Shell App
const shellCode = `// GENERATED CODE - DO NOT EDIT
// Source: contracts/customer-ops-console.contract.json

import { createGridApp } from '../data-grid/data-grid-app-wireup.generated.js';
import { createSettingsApp } from '../settings-form/settings-form-app-wireup.generated.js';
import { createKanbanApp } from '../normalized-kanban/kanban-app.generated.js';
import { createDashboard } from '../live-dashboard/live-dashboard-app-wireup.generated.js';
import { globalAuthProvider } from './auth.generated.js';
import { globalRouter } from '../../src/router.js';
import { globalDemandManager } from '../../src/data.js';

export function createCustomerOpsConsole(root, sharedMap) {
  // Wire up generated Auth Provider to Framework Primitives natively
  globalRouter.routeGuard = (path, routeDef) => globalAuthProvider.routeGuard(path, routeDef);
  
  globalDemandManager.setConfig({
    getToken: () => globalAuthProvider.getToken(),
    on401: async (fetcher) => {
      // Generated 401 retry loop
      return await fetcher(globalAuthProvider.getToken());
    }
  });

  const template = document.createElement('template');
  template.innerHTML = \`<div class="ops-console-root">
    <nav class="sidebar">
      <h2>Ops Console</h2>
      <button class="nav-dashboard">Dashboard</button>
      <button class="nav-customers">Customers</button>
      <button class="nav-tickets">Tickets</button>
      <button class="nav-settings">Settings</button>
    </nav>
    <main class="content-area">
      <div class="tab-dashboard tab-content"><div class="dashboard-container"></div></div>
      <div class="tab-customers tab-content" style="display:none;"><div class="grid-container"></div></div>
      <div class="tab-tickets tab-content" style="display:none;"><div class="kanban-container"></div></div>
      <div class="tab-settings tab-content" style="display:none;"><div class="form-container"></div></div>
    </main>
  </div>\`;

  root.appendChild(template.content.cloneNode(true));

  const navDashboard = root.querySelector('.nav-dashboard');
  const navCustomers = root.querySelector('.nav-customers');
  const navTickets = root.querySelector('.nav-tickets');
  const navSettings = root.querySelector('.nav-settings');

  const tabDashboard = root.querySelector('.tab-dashboard');
  const tabCustomers = root.querySelector('.tab-customers');
  const tabTickets = root.querySelector('.tab-tickets');
  const tabSettings = root.querySelector('.tab-settings');

  const tabs = {
    'dashboard': { btn: navDashboard, content: tabDashboard },
    'customers': { btn: navCustomers, content: tabCustomers },
    'tickets': { btn: navTickets, content: tabTickets },
    'settings': { btn: navSettings, content: tabSettings }
  };

  function switchTab(tabId) {
    Object.values(tabs).forEach(t => {
      t.btn.classList.remove('active');
      t.content.style.display = 'none';
    });
    tabs[tabId].btn.classList.add('active');
    tabs[tabId].content.style.display = 'flex';
    sharedMap.set('console:activeTab', tabId);
  }

  Object.entries(tabs).forEach(([id, t]) => {
    t.btn.addEventListener('click', () => switchTab(id));
  });

  // Mount internal apps
  // Data Grid mounts directly to container
  const gridApp = createGridApp(sharedMap);
  root.querySelector('.grid-container').appendChild(gridApp.root);
  // Wireups return { root, dispose }
  const formApp = createSettingsApp(sharedMap);
  root.querySelector('.form-container').appendChild(formApp.root);
  
  const kanbanApp = createKanbanApp(sharedMap);
  root.querySelector('.kanban-container').appendChild(kanbanApp.root);
  
  const dashboardApp = createDashboard(sharedMap);
  root.querySelector('.dashboard-container').appendChild(dashboardApp.root);

  // Sync state changes across apps
  let cleanups = [];
  cleanups.push(sharedMap.onPatch((patch) => {
    if (patch.key === 'grid:selectedRows' && patch.value && patch.value.length > 0) {
      const selectedId = patch.value[0];
      sharedMap.set('console:selectedCustomerId', selectedId);
      
      const formContainer = root.querySelector('.form-container');
      const usernameInput = formContainer.querySelector('input[name="username"]');
      const emailInput = formContainer.querySelector('input[name="email"]');
      
      const name = sharedMap.get(\`grid:cell:\${selectedId}:Name\`) || '';
      const email = sharedMap.get(\`grid:cell:\${selectedId}:Email\`) || '';
      
      if (usernameInput) {
        usernameInput.value = name;
        usernameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
      }
      if (emailInput) {
        emailInput.value = email;
        emailInput.dispatchEvent(new window.Event('input', { bubbles: true }));
      }
    }
  }));

  // When form submits, update the data grid
  root.querySelector('.form-container').addEventListener('submit', () => {
    // Small delay to allow the form signal to process if needed, though we can read direct from DOM
    setTimeout(() => {
      const selectedId = sharedMap.get('console:selectedCustomerId');
    if (selectedId) {
      const formState = sharedMap.get('settings_username'); // The wireup writes here
      // But wait! The wireup writes to settings_username async after 600ms!
      // Better to grab the value directly from the DOM on submit:
      const formContainer = root.querySelector('.form-container');
      const newName = formContainer.querySelector('input[name="username"]').value;
      const newEmail = formContainer.querySelector('input[name="email"]').value;
      console.log('Ops console submit: newName=' + newName);
      sharedMap.set(\`grid:cell:\${selectedId}:Name\`, newName);
      sharedMap.set(\`grid:cell:\${selectedId}:Email\`, newEmail);
      
      // Also update Kanban card title if they have an active ticket
      const existingItem = sharedMap.get(\`kanban:item:\${selectedId}\`);
      if (existingItem) {
        sharedMap.set(\`kanban:item:\${selectedId}\`, { ...existingItem, title: \`Support: \${newName}\` });
      }
    }
    }, 0);
  });

  // Initialize
  switchTab('dashboard');

  return {
    dispose: () => {
      gridApp.dispose();
      formApp.dispose();
      kanbanApp.dispose();
      dashboardApp.dispose();
      cleanups.forEach(c => c());
    }
  };
}
`;

fs.writeFileSync(path.join(outDir, 'customer-ops-console.generated.js'), shellCode);
console.log('Generated:', path.join(outDir, 'customer-ops-console.generated.js'));
