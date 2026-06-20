import { bench, describe } from 'vitest';
import { createSettingsApp } from '../generated-examples/settings-form/settings-form-app-wireup.generated.js';
import { flushMicrotasks } from '../src/testing.js';

describe('Settings Form Benchmarks', () => {
  bench('Render Form (Mount)', () => {
    const app = createSettingsApp();
    app.dispose();
  });

  const app = createSettingsApp();
  const input = app.root.querySelector('#usernameInput');
  
  bench('Patch Form Field (Hot Path)', async () => {
    input.value = 'test' + Math.random();
    input.dispatchEvent(new window.Event('input'));
    await flushMicrotasks();
  });
});
