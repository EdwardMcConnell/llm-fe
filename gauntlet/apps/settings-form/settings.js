import { FeElement } from '/src/component.js';
import { globalSharedMap } from '/src/store.js';
import { createFormSignal } from '/src/form.js';
import { createEffect } from '/src/reactivity.js';
import { globalToast } from '/src/ui.js';
import '/src/primitives.js';

export class SampleSettings extends FeElement {
  static get tag() { return 'sample-settings'; }
  static get observedAttributes() { return []; }

  constructor() {
    super();
    this.nodes = new Map();
  }

  template() {
    return `
      <style>
        :host {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          background: var(--surface-1);
          border-radius: var(--radius-lg);
        }
        h2 {
          margin-top: 0;
          color: var(--text-primary);
        }
        .form-group {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label {
          font-weight: 500;
          color: var(--text-secondary);
        }
        .error-message {
          color: var(--status-error);
          font-size: 0.875rem;
          display: none;
        }
        .error-message.visible {
          display: block;
        }
        .submit-bar {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
        }
        .submit-spinner {
          display: none;
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid var(--text-secondary);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .submit-spinner.visible {
          display: block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>

      <h2>Account Settings</h2>

      <!-- Native Form Wrapping -->
      <fe-form id="settingsForm">
        
        <div class="form-group">
          <label for="usernameInput">Username</label>
          <input type="text" id="usernameInput" name="username" class="fe-input" required minlength="3">
          <div id="usernameError" class="error-message" aria-live="polite"></div>
        </div>

        <div class="form-group">
          <label for="emailInput">Email Address</label>
          <input type="email" id="emailInput" name="email" class="fe-input" required>
          <div id="emailError" class="error-message" aria-live="polite"></div>
        </div>

        <div class="form-group">
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="notificationsInput" name="notificationsEnabled">
            Enable Email Notifications
          </label>
        </div>

        <div class="form-group">
          <label for="themeInput">Preferred Theme</label>
          <select id="themeInput" name="theme" class="fe-input">
            <option value="system">System Default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div class="submit-bar">
          <fe-button type="submit" id="saveBtn" variant="primary">Save Changes</fe-button>
          <div id="saveSpinner" class="submit-spinner"></div>
        </div>

      </fe-form>
    `;
  }

  bind() {
    // Default values if nothing is in shared state yet
    const initialValues = {
      username: '',
      email: '',
      notificationsEnabled: false,
      theme: 'system'
    };

    // Form Validator Function
    const validate = (values) => {
      const errors = {};
      if (!values.username || values.username.length < 3) {
        errors.username = 'Username must be at least 3 characters.';
      }
      if (!values.email || !values.email.includes('@')) {
        errors.email = 'A valid email is required.';
      }
      return errors;
    };

    // 1. Create Form Signal
    const [getForm, formActions] = createFormSignal(initialValues, validate);
    this.getForm = getForm;
    this.formActions = formActions;

    // 2. Hydrate from Shared Map
    const storedUsername = globalSharedMap.get('settings_username');
    const storedEmail = globalSharedMap.get('settings_email');
    const storedNotifications = globalSharedMap.get('settings_notifications');
    const storedTheme = globalSharedMap.get('settings_theme');
    
    if (storedUsername) formActions.setFieldValue('username', storedUsername);
    if (storedEmail) formActions.setFieldValue('email', storedEmail);
    if (storedNotifications !== undefined) formActions.setFieldValue('notificationsEnabled', storedNotifications);
    if (storedTheme) formActions.setFieldValue('theme', storedTheme);

    // 4. Cache Nodes (Compile-In-Prompt)
    this.nodes.set('form', this.root.querySelector('#settingsForm'));
    this.nodes.set('username', this.root.querySelector('#usernameInput'));
    this.nodes.set('usernameError', this.root.querySelector('#usernameError'));
    this.nodes.set('email', this.root.querySelector('#emailInput'));
    this.nodes.set('emailError', this.root.querySelector('#emailError'));
    this.nodes.set('notifications', this.root.querySelector('#notificationsInput'));
    this.nodes.set('theme', this.root.querySelector('#themeInput'));
    this.nodes.set('saveBtn', this.root.querySelector('#saveBtn'));
    this.nodes.set('saveSpinner', this.root.querySelector('#saveSpinner'));

    // 5. Bind fe-form validation routing
    this.bindForm('#settingsForm', [this.getForm, this.formActions], this._submit.bind(this));

    // 6. Reactive Effect for DOM Patching
    const disposer = createEffect(() => {
      this._patchDOM();
    });
    this._cleanups.push(disposer);
  }

  _patchDOM() {
    const state = this.getForm();
    const { values, errors, isSubmitting } = state;

    // Direct Imperative DOM Updates
    const uInput = this.nodes.get('username');
    if (uInput.value !== values.username) uInput.value = values.username;
    
    const uErr = this.nodes.get('usernameError');
    if (errors.username) {
      if (uErr.textContent !== errors.username) uErr.textContent = errors.username;
      uErr.classList.add('visible');
    } else {
      uErr.classList.remove('visible');
    }

    const eInput = this.nodes.get('email');
    if (eInput.value !== values.email) eInput.value = values.email;

    const eErr = this.nodes.get('emailError');
    if (errors.email) {
      if (eErr.textContent !== errors.email) eErr.textContent = errors.email;
      eErr.classList.add('visible');
    } else {
      eErr.classList.remove('visible');
    }

    const nInput = this.nodes.get('notifications');
    if (nInput.checked !== values.notificationsEnabled) nInput.checked = values.notificationsEnabled;

    const tInput = this.nodes.get('theme');
    if (tInput.value !== values.theme) tInput.value = values.theme;

    // Submitting State
    const btn = this.nodes.get('saveBtn');
    const spinner = this.nodes.get('saveSpinner');
    if (isSubmitting) {
      btn.setAttribute('disabled', 'true');
      spinner.classList.add('visible');
    } else {
      btn.removeAttribute('disabled');
      spinner.classList.remove('visible');
    }
  }

  async _submit(values) {
    // Simulate Network Request
    await new Promise(r => setTimeout(r, 600));

    // Persist to CRDT map
    globalSharedMap.set('settings_username', values.username);
    globalSharedMap.set('settings_email', values.email);
    globalSharedMap.set('settings_notifications', values.notificationsEnabled);
    globalSharedMap.set('settings_theme', values.theme);

    globalToast.show('Settings saved successfully', 'success');
  }
}

customElements.define(SampleSettings.tag, SampleSettings);
