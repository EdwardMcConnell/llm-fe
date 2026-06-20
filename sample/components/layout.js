import { FeElement } from '/src/component.js';
import { globalAuthManager } from '/src/auth.js';
import { globalRouter } from '/src/router.js';
import { globalToast } from '/src/ui.js';

class SampleLayout extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: grid;
          grid-template-columns: 250px 1fr;
          min-height: 100vh;
        }

        /* Left Drawer */
        .drawer {
          background: rgba(10, 15, 30, 0.7);
          backdrop-filter: blur(10px);
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          padding: 2rem 1.5rem;
          gap: 2rem;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .brand {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--brand-primary);
          text-decoration: none;
        }

        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        fe-link {
          color: var(--text-secondary);
          transition: color 0.2s ease;
          font-size: 1.1rem;
          font-weight: 500;
          padding: 0.5rem 0;
        }

        fe-link:hover {
          color: var(--brand-primary);
        }

        /* Main Content Area */
        .main-pane {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1rem 2rem;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(10, 15, 30, 0.3);
          backdrop-filter: blur(5px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .content {
          flex: 1;
          display: flex;
          padding: 2rem;
          width: 100%;
        }

        fe-button[variant="outline"] {
          border: 1px solid var(--brand-accent);
          color: var(--brand-accent);
          background: transparent;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }

        fe-button[variant="outline"]:hover {
          background: rgba(255, 105, 180, 0.1);
        }
      </style>

      <aside class="drawer">
        <a href="/" class="brand">Fe UI</a>
        <nav class="nav-links">
          <fe-accordion-group>
            <fe-accordion open>
              <span slot="header">Applications</span>
              <div style="display:flex; flex-direction:column; gap:0.5rem; padding-left:1rem;">
                <fe-link href="/kanban" class="nav-item">Kanban Board</fe-link>
                <fe-link href="/grid" class="nav-item">Data Grid</fe-link>
                <fe-link href="/dashboard" class="nav-item">Live Dashboard</fe-link>
                <fe-link href="/catalog" class="nav-item">Product Catalog</fe-link>
              </div>
            </fe-accordion>
            <fe-accordion>
              <span slot="header">Settings</span>
              <div style="display:flex; flex-direction:column; gap:0.5rem; padding-left:1rem;">
                <fe-link href="/settings" class="nav-item">Profile</fe-link>
              </div>
            </fe-accordion>
          </fe-accordion-group>
        </nav>
      </aside>

      <div class="main-pane">
        <header class="topbar">
          <fe-button id="toast-btn" variant="outline">Test Toast</fe-button>
          
          <fe-button id="settings-btn" variant="outline">Menu</fe-button>
          <fe-menu trigger="settings-btn">
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
               <a href="#" style="color:#000; text-decoration:none;">My Account</a>
               <a href="#" style="color:#000; text-decoration:none;">Theme</a>
            </div>
          </fe-menu>

          <fe-button id="logout-btn" variant="outline" style="display: none;">Logout</fe-button>
          <fe-tooltip trigger="logout-btn">Log out of your session securely</fe-tooltip>
        </header>

        <main class="content">
          <slot name="content"></slot>
        </main>
      </div>
    `;
  }

  bind() {
    const logoutBtn = this.root.querySelector('#logout-btn');

    // Make logout button visible only when authenticated
    const unsub = globalAuthManager.onAuthStateChanged((isAuth) => {
      logoutBtn.style.display = isAuth ? 'inline-flex' : 'none';
    });
    this._cleanups.push(unsub);

    this.bindEvent('#logout-btn', 'click', async () => {
      await globalAuthManager.logout();
      globalRouter.navigate('/login');
    });

    this.bindEvent('#toast-btn', 'click', () => {
      globalToast.show("Test toast message! " + new Date().toLocaleTimeString());
    });
  }
}

customElements.define('sample-layout', SampleLayout);
