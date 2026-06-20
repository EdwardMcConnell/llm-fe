// Compiled deterministically from Settings Form App IR
import { createSettingsForm } from './settings-form.generated.js';
import { createFormSignal } from '/src/form.js';
import { createEffect } from '/src/reactivity.js';
import { globalSharedMap } from '/src/store.js';
import { globalToast } from '/src/ui.js';

export function createSettingsApp() {
  const initialValues = { username: '', email: '', notificationsEnabled: false, theme: 'system' };
  const validate = (values) => {
    const errors = {};
    if (!values.username || values.username.length < 3) errors.username = 'Username must be at least 3 characters.';
    if (!values.email || !values.email.includes('@')) errors.email = 'A valid email is required.';
    return errors;
  };

  const [getForm, formActions] = createFormSignal(initialValues, validate);
  
  const storedUsername = globalSharedMap.get('settings_username');
  const storedEmail = globalSharedMap.get('settings_email');
  const storedNotifications = globalSharedMap.get('settings_notifications');
  const storedTheme = globalSharedMap.get('settings_theme');
  
  if (storedUsername) formActions.setFieldValue('username', storedUsername);
  if (storedEmail) formActions.setFieldValue('email', storedEmail);
  if (storedNotifications !== undefined) formActions.setFieldValue('notificationsEnabled', storedNotifications);
  if (storedTheme) formActions.setFieldValue('theme', storedTheme);

  let comp;

  function handleEvent(ev) {
    if (ev.type === 'settings:submit') {
       ev.sourceEvent.preventDefault();
       formActions.submit(async (values) => {
         await new Promise(r => setTimeout(r, 600));
         globalSharedMap.set('settings_username', values.username);
         globalSharedMap.set('settings_email', values.email);
         globalSharedMap.set('settings_notifications', values.notificationsEnabled);
         globalSharedMap.set('settings_theme', values.theme);
         globalToast.show('Settings saved successfully', 'success');
       });
    } else if (ev.type === 'settings:input') {
       const target = ev.sourceEvent.target;
       const value = target.type === 'checkbox' ? target.checked : target.value;
       formActions.setFieldValue(target.name, value);
    }
  }

  comp = createSettingsForm({}, handleEvent);

  const cleanups = [];
  cleanups.push(createEffect(() => {
    const state = getForm();
    const patchObj = {
      username: state.values.username || '',
      email: state.values.email || '',
      notificationsEnabled: !!state.values.notificationsEnabled,
      theme: state.values.theme || 'system',
      usernameError: state.errors.username || '',
      usernameErrorVisible: !!state.errors.username,
      emailError: state.errors.email || '',
      emailErrorVisible: !!state.errors.email,
      isSubmitting: !!state.isSubmitting
    };
    comp.patch(patchObj);
  }));

  return {
    root: comp.root,
    dispose: () => {
      comp.dispose();
      cleanups.forEach(c => c());
    }
  };
}
