import { FeElement } from '/src/component.js';
import { createSignal } from '/src/reactivity.js';

class SampleGrid extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: calc(100vh - 120px);
          background: rgba(30, 41, 59, 0.5);
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          overflow: hidden;
        }

        .header {
          display: flex;
          padding: 1rem;
          background: rgba(10, 15, 30, 0.8);
          border-bottom: 1px solid var(--glass-border);
          font-weight: 600;
          color: var(--text-secondary);
        }

        .header span {
          flex: 1;
          padding: 0 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header span:first-child {
          flex: 0 0 100px;
        }

        fe-grid {
          flex: 1;
          width: 100%;
        }
      </style>

      <div class="header">
        <span>ID</span>
        <span>Name</span>
        <span>Department</span>
        <span>Role</span>
        <span>Status</span>
      </div>
      
      <fe-grid id="massive-grid"></fe-grid>
    `;
  }

  bind() {
    const grid = this.root.querySelector('#massive-grid');
    
    const gridStyles = `
      .row {
        display: flex;
        align-items: center;
        height: 100%;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: background 0.1s;
        color: var(--text-secondary, #94a3b8);
      }

      .row:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .row span {
        flex: 1;
        padding: 0 1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .row span:first-child {
        flex: 0 0 100px;
      }

      .status-badge {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .status-active { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
      .status-pending { background: rgba(234, 179, 8, 0.2); color: #facc15; }
      .status-error { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    `;

    // Generate 100,000 dummy records
    console.log('Generating 100,000 records for the virtual grid...');
    const massiveData = [];
    const depts = ['Engineering', 'Marketing', 'Sales', 'HR', 'Design'];
    const roles = ['Manager', 'Developer', 'Analyst', 'Director', 'Coordinator'];
    const statuses = ['active', 'pending', 'error'];

    for (let i = 0; i < 100000; i++) {
      massiveData.push({
        id: `USR-${10000 + i}`,
        name: `Employee User ${i}`,
        department: depts[Math.floor(Math.random() * depts.length)],
        role: roles[Math.floor(Math.random() * roles.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)]
      });
    }

    const [getData] = createSignal(massiveData);

    grid.bindList(getData, (item, index) => {
      return `
        <div class="row">
          <span>${item.id}</span>
          <span>${item.name}</span>
          <span>${item.department}</span>
          <span>${item.role}</span>
          <span>
            <span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span>
          </span>
        </div>
      `;
    }, { itemHeight: 48, overscan: 10, styles: gridStyles });
  }
}

customElements.define('sample-grid', SampleGrid);
