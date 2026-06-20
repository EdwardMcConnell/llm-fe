import { FeElement } from '/src/component.js';
import { globalSharedMap } from '/src/store.js';
import '/src/primitives.js';

export class SampleDashboard extends FeElement {
  static get tag() { return 'sample-dashboard'; }

  constructor() {
    super();
    this.nodes = new Map();
  }

  template() {
    return `
      <style>
        :host {
          display: block;
          padding: 2rem;
          font-family: var(--font-family, sans-serif);
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .metric-card {
          background: var(--surface-1, #fff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .metric-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary, #333);
          margin: 0;
        }
        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--brand-primary, #0052cc);
        }
        .bar-chart {
          width: 100%;
          height: 24px;
          background: var(--surface-2, #f5f5f5);
          border-radius: 12px;
          overflow: hidden;
          margin-top: 1rem;
        }
        .bar-fill {
          height: 100%;
          background: var(--brand-primary, #0052cc);
          width: 0%;
          transition: width 0.1s linear, background-color 0.3s ease;
        }
        .bar-fill.warning {
          background: var(--color-warning, #ff9800);
        }
        .bar-fill.danger {
          background: var(--color-danger, #f44336);
        }
      </style>
      
      <h1>Live System Dashboard</h1>
      <p>Real-time metrics synchronized via Fe UI's CRDT engine.</p>
      
      <div class="dashboard-grid">
        <!-- CPU Usage -->
        <div class="metric-card">
          <div class="metric-header">
            <h2 class="metric-title">CPU Usage</h2>
            <div class="metric-value" id="cpuValue">0%</div>
          </div>
          <div class="bar-chart">
            <div class="bar-fill" id="cpuBar"></div>
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="metric-card">
          <div class="metric-header">
            <h2 class="metric-title">Memory Usage</h2>
            <div class="metric-value" id="memoryValue">0%</div>
          </div>
          <div class="bar-chart">
            <div class="bar-fill" id="memoryBar"></div>
          </div>
        </div>

        <!-- Active Users -->
        <div class="metric-card">
          <div class="metric-header">
            <h2 class="metric-title">Active Users</h2>
            <div class="metric-value" id="usersValue">0</div>
          </div>
          <p style="color: var(--text-secondary, #666); margin: 0; font-size: 0.875rem;">Connected clients in real-time</p>
        </div>
      </div>
    `;
  }

  bind() {
    // 1. Compile-In-Prompt: Cache Nodes
    this.nodes.set('cpuValue', this.root.querySelector('#cpuValue'));
    this.nodes.set('cpuBar', this.root.querySelector('#cpuBar'));
    this.nodes.set('memoryValue', this.root.querySelector('#memoryValue'));
    this.nodes.set('memoryBar', this.root.querySelector('#memoryBar'));
    this.nodes.set('usersValue', this.root.querySelector('#usersValue'));

    // 2. State Accessors (to avoid object allocation in hot paths)
    this.getCpu = () => globalSharedMap.get('dashboard:cpu') || 0;
    this.getMemory = () => globalSharedMap.get('dashboard:memory') || 0;
    this.getUsers = () => globalSharedMap.get('dashboard:users') || 0;

    // 3. Register Subscriptions (Fe UI ensures clean unwiring via _cleanups)
    globalSharedMap.incrementSubscriber('dashboard:cpu');
    globalSharedMap.incrementSubscriber('dashboard:memory');
    globalSharedMap.incrementSubscriber('dashboard:users');

    this._cleanups.push(() => {
      globalSharedMap.decrementSubscriber('dashboard:cpu');
      globalSharedMap.decrementSubscriber('dashboard:memory');
      globalSharedMap.decrementSubscriber('dashboard:users');
    });

    // 4. Reactive Patch Loop
    const unsub = globalSharedMap.subscribe((key) => {
      if (key === 'dashboard:cpu' || key === 'dashboard:memory' || key === 'dashboard:users') {
        this._patchDOM();
      }
    });
    this._cleanups.push(unsub);
    
    // Initial patch
    this._patchDOM();
  }

  _patchDOM() {
    // Read state synchronously
    const cpu = this.getCpu();
    const memory = this.getMemory();
    const users = this.getUsers();

    // Patch DOM using precise mutations
    // CPU
    const cpuText = `${cpu.toFixed(1)}%`;
    const cpuValNode = this.nodes.get('cpuValue');
    if (cpuValNode.textContent !== cpuText) cpuValNode.textContent = cpuText;
    
    const cpuBarNode = this.nodes.get('cpuBar');
    cpuBarNode.style.width = `${cpu}%`;
    if (cpu > 85) {
      cpuBarNode.className = 'bar-fill danger';
    } else if (cpu > 60) {
      cpuBarNode.className = 'bar-fill warning';
    } else {
      cpuBarNode.className = 'bar-fill';
    }

    // Memory
    const memText = `${memory.toFixed(1)}%`;
    const memValNode = this.nodes.get('memoryValue');
    if (memValNode.textContent !== memText) memValNode.textContent = memText;
    
    const memBarNode = this.nodes.get('memoryBar');
    memBarNode.style.width = `${memory}%`;
    if (memory > 85) {
      memBarNode.className = 'bar-fill danger';
    } else if (memory > 60) {
      memBarNode.className = 'bar-fill warning';
    } else {
      memBarNode.className = 'bar-fill';
    }

    // Users
    const usersText = `${Math.floor(users)}`;
    const usersValNode = this.nodes.get('usersValue');
    if (usersValNode.textContent !== usersText) usersValNode.textContent = usersText;
  }
}

customElements.define(SampleDashboard.tag, SampleDashboard);
