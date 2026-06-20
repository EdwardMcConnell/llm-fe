// Compiled deterministically from live-dashboard-app App IR
import { createLiveDashboardApp } from './live-dashboard-app.generated.js';
import { createLiveDashboardWidget } from './live-dashboard-widget.generated.js';

export function createDashboard(sharedMap) {
  const app = createLiveDashboardApp({});
  const widgetInstances = new Map();

  function patchWidget(statePatch) {
    const id = statePatch.id;
    let instance = widgetInstances.get(id);
    if (!instance) {
      instance = createLiveDashboardWidget(statePatch);
      widgetInstances.set(id, instance);
      if (instance.root) instance.root.dataset.id = id;
    } else {
      instance.patch(statePatch);
    }
    app.insertWidgets(id, instance);
  }

  function removeWidget(id) {
    const instance = widgetInstances.get(id);
    if (instance) {
      instance.dispose();
      if (app.removeWidgets) app.removeWidgets(id);
      widgetInstances.delete(id);
    }
  }

  const cleanups = [];

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key.startsWith('dashboard:widget:')) {
        patchWidget(val);
      } else       if (key === 'dashboard:index') {
        app.patch({ widgetsIndex: val.itemIds });
      }
    }
  };

  const disposeSub = sharedMap.onPatch((patch) => {
    const key = patch.key;
    const val = patch.value;
    if (key.startsWith('dashboard:widget:')) {
      if (val !== undefined) patchWidget(val);
      else removeWidget(key.split(':')[2]);
    } else     if (key === 'dashboard:index') {
      if (val !== undefined) app.patch({ widgetsIndex: val.itemIds });
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: app.root,
    dispose: () => {
      for (const instance of widgetInstances.values()) instance.dispose();
      widgetInstances.clear();
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
