import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { flushMicrotasks } from '../../../src/testing.js';
import './settings.js';

describe('Settings Form', () => {
  let element;

  beforeEach(() => {
    element = document.createElement('sample-settings');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('renders initial form fields correctly', async () => {
    await flushMicrotasks();
    const shadow = element.shadowRoot;
    
    expect(shadow.querySelector('#usernameInput')).toBeTruthy();
    expect(shadow.querySelector('#emailInput')).toBeTruthy();
    expect(shadow.querySelector('#notificationsInput')).toBeTruthy();
    expect(shadow.querySelector('#themeInput')).toBeTruthy();
  });

  it('shows validation errors for invalid inputs', async () => {
    await flushMicrotasks();
    const shadow = element.shadowRoot;
    
    // Type an invalid email
    const emailInput = shadow.querySelector('#emailInput');
    emailInput.value = 'invalidemail';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    await flushMicrotasks();
    
    const emailError = shadow.querySelector('#emailError');
    expect(emailError.classList.contains('visible')).toBe(true);
    expect(emailError.textContent).toBe('A valid email is required.');
  });

  it('clears validation errors when inputs become valid', async () => {
    await flushMicrotasks();
    const shadow = element.shadowRoot;
    
    const emailInput = shadow.querySelector('#emailInput');
    const emailError = shadow.querySelector('#emailError');
    
    // Make invalid
    emailInput.value = 'invalid';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();
    expect(emailError.classList.contains('visible')).toBe(true);

    // Make valid
    emailInput.value = 'test@example.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();
    expect(emailError.classList.contains('visible')).toBe(false);
  });
});
