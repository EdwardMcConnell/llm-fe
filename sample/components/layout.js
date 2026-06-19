import { FeElement } from '/src/component.js';
import { globalAuthManager } from '/src/auth.js';
import { globalRouter } from '/src/router.js';

class SampleLayout extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: rgba(10, 15, 30, 0.5);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--glass-border);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .brand {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--brand-primary);
          text-decoration: none;
        }

        .nav-links {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        fe-link {
          color: var(--text-secondary);
          transition: color 0.2s ease;
        }

        fe-link:hover {
          color: var(--brand-primary);
        }

        .content {
          flex: 1;
          display: flex;
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
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

      <nav class="navbar">
        <a href="/" class="brand">Fe Kanban</a>
        <div class="nav-links">
          <fe-button id="logout-btn" variant="outline" style="display: none;">Logout</fe-button>
        </div>
      </nav>

      <main class="content">
        <slot name="content"></slot>
      </main>
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
  }
}

customElements.define('sample-layout', SampleLayout);
