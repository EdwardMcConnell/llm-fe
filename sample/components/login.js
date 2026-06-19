import { FeElement } from '/src/component.js';
import { createFormSignal } from '/src/form.js';
import { globalAuthManager } from '/src/auth.js';
import { globalRouter } from '/src/router.js';

class SampleLogin extends FeElement {
  template() {
    return `
      <style>
        :host {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .login-box {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 3rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          animation: fadeInSlideUp 0.5s ease-out;
        }

        h2 {
          margin-top: 0;
          margin-bottom: 2rem;
          text-align: center;
          color: var(--brand-primary);
        }

        .form-group {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
        }

        label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        input {
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          color: white;
          font-family: inherit;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        input:focus {
          outline: none;
          border-color: var(--brand-primary);
        }

        input[aria-invalid="true"] {
          border-color: #ef4444;
        }

        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          min-height: 1rem;
        }

        fe-button[type="submit"] {
          width: 100%;
          background: var(--brand-primary);
          color: white;
          padding: 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          transition: background-color 0.2s;
        }

        fe-button[type="submit"]:hover {
          background: oklch(70% 0.25 260);
        }

        fe-button[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }
      </style>

      <div class="login-box">
        <h2>Welcome Back</h2>
        <fe-form id="login-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" autocomplete="off">
            <div class="error-message" data-error-for="username"></div>
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password">
            <div class="error-message" data-error-for="password"></div>
          </div>

          <fe-button type="submit">Access Workspace</fe-button>
        </fe-form>
      </div>
    `;
  }

  bind() {
    const formSignalTuple = createFormSignal(
      { username: '', password: '' },
      (values) => {
        const errors = {};
        if (!values.username || values.username.length < 3) {
          errors.username = 'Username must be at least 3 characters';
        }
        if (!values.password) {
          errors.password = 'Password is required';
        }
        return errors;
      }
    );

    this.bindForm('#login-form', formSignalTuple, async (values) => {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockJwt = btoa(JSON.stringify({ user: values.username, exp: Date.now() + 86400000 }));
      localStorage.setItem('fe_sample_token', mockJwt);
      globalAuthManager.login(mockJwt);
      globalRouter.navigate('/');
    });

    // Workaround: make fe-button manually submit the fe-form if clicked
    this.bindEvent('fe-button[type="submit"]', 'click', () => {
      const form = this.root.querySelector('#login-form');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
  }
}

customElements.define('sample-login', SampleLogin);
