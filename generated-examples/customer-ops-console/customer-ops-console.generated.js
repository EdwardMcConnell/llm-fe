// GENERATED CODE - DO NOT EDIT
// Source: contracts/customer-ops-console.contract.json

import { createDataGrid } from './data-grid.generated.js';
import { createSettingsApp } from './settings-form-app-wireup.generated.js';
import { createKanbanApp } from './kanban-app.generated.js';
import { createDashboard } from './live-dashboard-app-wireup.generated.js';

export function createCustomerOpsConsole(root, sharedMap) {
  const template = document.createElement('template');
  template.innerHTML = `<div class="ops-console-root">
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
  </div>`;

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
  const gridApp = createDataGrid(sharedMap);
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
      
      const name = sharedMap.get(`grid:cell:${selectedId}:Name`) || '';
      const email = sharedMap.get(`grid:cell:${selectedId}:Email`) || '';
      
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
      sharedMap.set(`grid:cell:${selectedId}:Name`, newName);
      sharedMap.set(`grid:cell:${selectedId}:Email`, newEmail);
      
      // Also update Kanban card title if they have an active ticket
      const existingItem = sharedMap.get(`kanban:item:${selectedId}`);
      if (existingItem) {
        sharedMap.set(`kanban:item:${selectedId}`, { ...existingItem, title: `Support: ${newName}` });
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
