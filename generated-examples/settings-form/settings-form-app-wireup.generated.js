// Compiled deterministically from settings-form App IR
import { createSettingsForm } from './settings-form.generated.js';
import { createFormSignal } from '/src/form.js';
import { createEffect } from '/src/reactivity.js';
import { globalSharedMap } from '/src/store.js';
import { globalToast } from '/src/ui.js';

export function createSettingsApp(sharedMap = globalSharedMap) {
  const validatesettings = (values) => {
    const errors = {};
    if (!values.email || !values.email.includes('@')) errors.email = 'A valid email is required.';
    return errors;
  };
  const [getsettingsForm, settingsFormActions] = createFormSignal({ username: '', email: '', notificationsEnabled: false, theme: 'system' }, validatesettings);
  const stored_username = sharedMap.get('settings_username');
  if (stored_username !== undefined) settingsFormActions.setFieldValue('username', stored_username);
  const stored_email = sharedMap.get('settings_email');
  if (stored_email !== undefined) settingsFormActions.setFieldValue('email', stored_email);
  const stored_notificationsEnabled = sharedMap.get('settings_notifications');
  if (stored_notificationsEnabled !== undefined) settingsFormActions.setFieldValue('notificationsEnabled', stored_notificationsEnabled);
  const stored_theme = sharedMap.get('settings_theme');
  if (stored_theme !== undefined) settingsFormActions.setFieldValue('theme', stored_theme);

  function handleEvent(ev) {
    if (ev.type === 'settings:submit') {
      ev.sourceEvent.preventDefault();
      settingsFormActions.submit(async (values) => {
         await new Promise(r => setTimeout(r, 600));
         sharedMap.set('settings_username', values.username);
         sharedMap.set('settings_email', values.email);
         sharedMap.set('settings_notifications', values.notificationsEnabled);
         sharedMap.set('settings_theme', values.theme);
         globalToast.show('Settings saved successfully', 'success');
       });
    } else if (ev.type === 'settings:input') {
      const target = ev.sourceEvent.target;
       const value = target.type === 'checkbox' ? target.checked : target.value;
      settingsFormActions.setFieldValue(target.name, value);
    }
  }

  const app = createSettingsForm({}, handleEvent);

  const cleanups = [];
  cleanups.push(createEffect(() => {
    const state = getsettingsForm();
    app.patch({
      username: state.values.username || '',
      email: state.values.email || '',
      notificationsEnabled: !!state.values.notificationsEnabled,
      theme: state.values.theme || 'system',
      usernameError: state.errors.username || '',
      usernameErrorVisible: !!state.errors.username,
      emailError: state.errors.email || '',
      emailErrorVisible: !!state.errors.email,
      isSubmitting: !!state.isSubmitting
    });
  }));

  return {
    root: app.root,
    dispose: () => {
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
