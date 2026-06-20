// Compiled deterministically from live-dashboard-app App IR
import { createLiveDashboardApp } from './live-dashboard-app.generated.js';
import { createLiveDashboardWidget } from './live-dashboard-widget.generated.js';

export function createDashboard(sharedMap) {
  const app = createLiveDashboardApp({});
  const widgets = new Map();

  function patchWidget(statePatch) {
    const id = statePatch.id;
    let instance = widgets.get(id);
    if (!instance) {
      instance = createLiveDashboardWidget(statePatch);
      widgets.set(id, instance);
      app.insertWidgets(id, instance);
    } else {
      instance.patch(statePatch);
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

  const disposeSub = sharedMap.subscribe((key, val) => {
    if (key.startsWith('dashboard:widget:')) {
      if (val) patchWidget(val);
    } else     if (key === 'dashboard:index') {
      if (val) app.patch({ widgetsIndex: val.itemIds });
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: app.root,
    dispose: () => {
      for (const instance of widgets.values()) instance.dispose();
      widgets.clear();
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
